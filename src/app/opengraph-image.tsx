import { ImageResponse } from "next/og";
import { getBrand } from "@/lib/config/settings";

export const runtime = "nodejs";
export const alt = "Pakistan Commodity Market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const brand = await getBrand();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#faf8f3", color: "#1d1f1a", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, background: "#1f6b3a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 800 }}>{brand.name.slice(0, 1)}</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#174f2b" }}>{brand.name}</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 44, fontWeight: 700 }}>{brand.productName}</div>
        <div style={{ marginTop: 16, fontSize: 32, color: "#5c6157" }}>{brand.tagline}</div>
        <div style={{ marginTop: 48, fontSize: 24, color: "#b7791f", fontWeight: 600 }}>Free B2B marketplace · No commission · PKR</div>
      </div>
    ),
    { ...size },
  );
}
