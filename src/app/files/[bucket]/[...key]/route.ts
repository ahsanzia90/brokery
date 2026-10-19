import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businessDocuments, businessMembers, businesses, listingDocuments, listings } from "@/db/schema";
import { getStorage } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/authz/permissions";

export const dynamic = "force-dynamic";

/**
 * Serves stored files.
 *  - /files/public/<key>  → approved listing images, logos, category images (cacheable)
 *  - /files/private/<key> → verification documents; only the owning business members
 *                           and verification reviewers / super admins may read them.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ bucket: string; key: string[] }> }) {
  const { bucket, key } = await ctx.params;
  const objectKey = key.join("/");
  if (!/^[a-z0-9/_.-]+$/i.test(objectKey) || objectKey.includes("..")) return new NextResponse("Not found", { status: 404 });

  if (bucket === "public") {
    const obj = await getStorage().get("public", objectKey);
    if (!obj) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(new Uint8Array(obj.data), { headers: { "Content-Type": obj.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  }

  if (bucket !== "private") return new NextResponse("Not found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Which record owns this key?
  const [doc] = await db.select().from(businessDocuments).where(eq(businessDocuments.storagePath, objectKey)).limit(1);
  let allowed = false;
  if (doc) {
    if (hasPermission(user.roles, "verification.review")) allowed = true;
    else {
      const [biz] = await db.select({ ownerId: businesses.ownerId }).from(businesses).where(eq(businesses.id, doc.businessId)).limit(1);
      if (biz?.ownerId === user.id) allowed = true;
      else {
        const [member] = await db
          .select({ id: businessMembers.id })
          .from(businessMembers)
          .where(and(eq(businessMembers.businessId, doc.businessId), eq(businessMembers.userId, user.id), eq(businessMembers.status, "active")))
          .limit(1);
        if (member) allowed = true;
      }
    }
  } else {
    const [ldoc] = await db.select({ d: listingDocuments, l: listings }).from(listingDocuments).innerJoin(listings, eq(listings.id, listingDocuments.listingId)).where(eq(listingDocuments.storagePath, objectKey)).limit(1);
    if (ldoc) {
      if (ldoc.d.isPublic || hasPermission(user.roles, "listings.moderate")) allowed = true;
      else {
        const [biz] = await db.select({ ownerId: businesses.ownerId }).from(businesses).where(eq(businesses.id, ldoc.l.businessId)).limit(1);
        if (biz?.ownerId === user.id) allowed = true;
      }
    }
  }
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const obj = await getStorage().get("private", objectKey);
  if (!obj) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(obj.data), {
    headers: { "Content-Type": obj.contentType, "Cache-Control": "private, no-store", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" },
  });
}
