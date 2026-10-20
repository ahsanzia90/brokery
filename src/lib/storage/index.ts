import "server-only";
import { mkdir, readFile, unlink, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type Bucket = "public" | "private";

export interface StorageProvider {
  readonly name: string;
  put(bucket: Bucket, key: string, data: Buffer, contentType: string): Promise<void>;
  get(bucket: Bucket, key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(bucket: Bucket, key: string): Promise<void>;
  /** Public URL for public bucket objects. Private objects are always served via /files/private/… */
  publicUrl(key: string): string;
}

function safeKey(key: string): string {
  const normalized = path.posix.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.includes("..") || normalized.startsWith("/")) throw new Error("Invalid storage key");
  return normalized;
}

class LocalStorageProvider implements StorageProvider {
  name = "local";
  private root = path.resolve(process.env.STORAGE_LOCAL_ROOT ?? "./storage");
  private filePath(bucket: Bucket, key: string) {
    return path.join(this.root, bucket, safeKey(key));
  }
  async put(bucket: Bucket, key: string, data: Buffer, contentType: string) {
    const fp = this.filePath(bucket, key);
    await mkdir(path.dirname(fp), { recursive: true });
    await writeFile(fp, data);
    await writeFile(fp + ".meta.json", JSON.stringify({ contentType }));
  }
  async get(bucket: Bucket, key: string) {
    const fp = this.filePath(bucket, key);
    try {
      await stat(fp);
      const data = await readFile(fp);
      let contentType = "application/octet-stream";
      try {
        contentType = JSON.parse(await readFile(fp + ".meta.json", "utf8")).contentType ?? contentType;
      } catch {}
      return { data, contentType };
    } catch {
      return null;
    }
  }
  async delete(bucket: Bucket, key: string) {
    const fp = this.filePath(bucket, key);
    await unlink(fp).catch(() => {});
    await unlink(fp + ".meta.json").catch(() => {});
  }
  publicUrl(key: string) {
    return `/files/public/${safeKey(key)}`;
  }
}

/**
 * S3-compatible provider (AWS S3, Cloudflare R2, MinIO, Supabase Storage S3 endpoint).
 * Implemented with AWS Signature V4 over fetch to avoid a heavy SDK dependency.
 */
class S3StorageProvider implements StorageProvider {
  name = "s3";
  private endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
  private region = process.env.S3_REGION ?? "auto";
  private buckets = { public: process.env.S3_BUCKET_PUBLIC ?? "", private: process.env.S3_BUCKET_PRIVATE ?? "" };
  private accessKey = process.env.S3_ACCESS_KEY_ID ?? "";
  private secretKey = process.env.S3_SECRET_ACCESS_KEY ?? "";

  private async sign(method: string, bucket: string, key: string, body: Buffer | null, contentType?: string) {
    const { createHash, createHmac } = await import("node:crypto");
    const url = new URL(`${this.endpoint}/${bucket}/${key}`);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");
    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    if (contentType) headers["content-type"] = contentType;
    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k}:${headers[k].trim()}\n`)
      .join("");
    const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
    const kDate = createHmac("sha256", "AWS4" + this.secretKey).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(this.region).digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
    headers.Authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    delete headers.host;
    return { url, headers };
  }
  async put(bucket: Bucket, key: string, data: Buffer, contentType: string) {
    const { url, headers } = await this.sign("PUT", this.buckets[bucket], safeKey(key), data, contentType);
    const res = await fetch(url, { method: "PUT", headers, body: new Uint8Array(data) });
    if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
  }
  async get(bucket: Bucket, key: string) {
    const { url, headers } = await this.sign("GET", this.buckets[bucket], safeKey(key), null);
    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`S3 GET failed: ${res.status}`);
    return { data: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
  }
  async delete(bucket: Bucket, key: string) {
    const { url, headers } = await this.sign("DELETE", this.buckets[bucket], safeKey(key), null);
    await fetch(url, { method: "DELETE", headers });
  }
  publicUrl(key: string) {
    return `/files/public/${safeKey(key)}`;
  }
}

let provider: StorageProvider | null = null;
export function getStorage(): StorageProvider {
  if (provider) return provider;
  provider = (process.env.STORAGE_PROVIDER ?? "local") === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
  return provider;
}

export function newObjectKey(prefix: string, ext: string): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${prefix}/${yyyy}/${mm}/${randomBytes(12).toString("hex")}.${ext.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
}
