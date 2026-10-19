import { NextResponse } from "next/server";
import { track, type AnalyticsEventName } from "@/lib/analytics/track";

const ALLOWED: AnalyticsEventName[] = ["home_buy_click", "home_sell_click", "contact_click", "listing_view", "supplier_view"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; entityType?: string; entityId?: string; properties?: Record<string, unknown> };
    if (!body.name || !ALLOWED.includes(body.name as AnalyticsEventName)) return NextResponse.json({ ok: false }, { status: 400 });
    await track(body.name as AnalyticsEventName, { entityType: body.entityType, entityId: body.entityId, properties: body.properties });
  } catch {}
  return NextResponse.json({ ok: true });
}
