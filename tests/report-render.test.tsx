import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import ReportDocument from "@/components/admin/ReportDocument";
import { loadReport } from "@/lib/report";
import { buildReportWorkbook } from "@/lib/report-xlsx";
import { fakeSupabase } from "./fixtures";

// Rendu HTML du rapport avec les données d'exemple (activé avec RENDER_REPORT=chemin.html)
describe.skipIf(!process.env.RENDER_REPORT)("rendu du rapport", () => {
  it("écrit le HTML", async () => {
    const r = await loadReport(fakeSupabase(), { from: "2026-09-01", to: "2026-11-30", label: "test" });
    writeFileSync(process.env.RENDER_REPORT!, renderToStaticMarkup(<ReportDocument r={r} vehName={null} />));
    writeFileSync(process.env.RENDER_REPORT!.replace(/\.html$/, ".xlsx"), Buffer.from(await buildReportWorkbook(r, null)));
  });
});
