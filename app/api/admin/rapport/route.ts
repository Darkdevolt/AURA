import { loadReport, parsePeriod } from "@/lib/report";
import { buildReportWorkbook } from "@/lib/report-xlsx";
import { requireAdmin } from "@/lib/supabase/server";
import { dakarDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Accès refusé", { status: 401 });
  const url = new URL(req.url);
  const today = dakarDate(Date.now());
  const period = parsePeriod({ du: url.searchParams.get("du") ?? undefined, au: url.searchParams.get("au") ?? undefined, periode: url.searchParams.get("periode") ?? undefined }, today);
  const vehicleId = url.searchParams.get("vehicule") || null;
  const r = await loadReport(admin.supabase, period, vehicleId);
  const buf = await buildReportWorkbook(r, vehicleId);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="luxus-asaad-rapport-${period.from}-au-${period.to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
