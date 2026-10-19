import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz/guards";
import { csvTemplate } from "@/lib/prices/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("prices.edit");
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(csvTemplate(), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="market-prices-template.csv"' },
  });
}
