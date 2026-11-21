import ExcelJS from "exceljs";
import type { ReportData } from "./report";
import { dakarDate, dakarTime } from "./time";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, MONEY_LABELS, PAYMENT_LABELS, STATUS_LABELS } from "./types";

const FCFA = '#,##0 "FCFA"';
const BLACK = "FF0A0A0A";
const GOLD = "FFC48A16";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFE5B33A" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}

function table(ws: ExcelJS.Worksheet, columns: { header: string; key: string; width: number; money?: boolean }[], rows: Record<string, unknown>[]) {
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.money ? { numFmt: FCFA } : {} }));
  styleHeader(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const r of rows) ws.addRow(r);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

/** Classeur Excel du rapport : Synthèse, Mensuel, Véhicules, Courses, Dépenses, Revenus hors site. */
export async function buildReportWorkbook(r: ReportData, vehicleId: string | null): Promise<ArrayBuffer> {
  const period = r.period;
  const today = dakarDate(Date.now());
  const vName = (id: string | null) => r.vehicles.find((v) => v.id === id)?.name ?? "";
  const fr = (d: string) => d.split("-").reverse().join("/");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Luxus Asaad";
  wb.created = new Date();

  // 1. Synthèse
  const ws = wb.addWorksheet("Synthèse", { properties: { tabColor: { argb: GOLD } } });
  ws.columns = [{ width: 34 }, { width: 24 }];
  ws.mergeCells("A1:B1");
  ws.getCell("A1").value = "LUXUS ASAAD — Rapport d'activité";
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFE5B33A" } };
  ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };
  ws.getRow(1).height = 30;
  ws.addRow(["Période", `${fr(period.from)} au ${fr(period.to)}`]);
  ws.addRow(["Périmètre", vehicleId ? vName(vehicleId) : "Toute la flotte"]);
  ws.addRow(["Édité le", `${fr(today)} à ${dakarTime(Date.now()).replace(":", "h")}`]);
  ws.addRow([]);
  const s = r.summary;
  const kpis: [string, number | string | null, boolean?][] = [
    ["Chiffre d'affaires total", s.revenue, true],
    ["  dont réservations du site", s.revenueSite, true],
    ["  dont autres revenus", s.revenueOther, true],
    ["Dépenses", s.expenses, true],
    ["Résultat", s.profit, true],
    ["Marge (%)", s.margin],
    ["Courses réalisées", s.trips],
    ["Kilomètres parcourus (site)", s.km],
    ["Recette par km", s.revenuePerKm, true],
    ["Coût par km", s.costPerKm, true],
    ["Panier moyen (site)", r.activity.avgTicket, true],
    ["Demandes de réservation", r.activity.requested],
    ["Taux de réalisation (%)", r.activity.completionRate],
  ];
  for (const [k, v, money] of kpis) {
    const row = ws.addRow([k, v ?? "—"]);
    if (money) row.getCell(2).numFmt = FCFA;
    row.getCell(1).font = { bold: !k.startsWith("  ") };
  }

  // 2. Mensuel
  table(
    wb.addWorksheet("Mensuel"),
    [
      { header: "Mois", key: "month", width: 12 },
      { header: "CA site", key: "revenueSite", width: 16, money: true },
      { header: "Autres revenus", key: "revenueOther", width: 16, money: true },
      { header: "CA total", key: "revenue", width: 16, money: true },
      { header: "Dépenses", key: "expenses", width: 16, money: true },
      { header: "Résultat", key: "profit", width: 16, money: true },
      { header: "Marge %", key: "margin", width: 10 },
      { header: "Courses", key: "trips", width: 10 },
    ],
    r.monthly.map((m) => ({ ...m, margin: m.margin ?? "" })),
  );

  // 3. Véhicules
  table(
    wb.addWorksheet("Véhicules"),
    [
      { header: "Véhicule", key: "name", width: 16 },
      { header: "Modèle", key: "model", width: 18 },
      { header: "Immatriculation", key: "plate", width: 16 },
      { header: "Prix d'achat", key: "price", width: 16, money: true },
      { header: "CA période", key: "revenue", width: 16, money: true },
      { header: "Dépenses période", key: "expenses", width: 16, money: true },
      { header: "Résultat période", key: "profit", width: 16, money: true },
      { header: "Résultat cumulé", key: "allProfit", width: 16, money: true },
      { header: "Amorti %", key: "payback", width: 10 },
      { header: "Mois restants", key: "left", width: 12 },
    ],
    r.perVehicle.map(({ vehicle: v, period: p, allTime, payback, monthsLeft }) => ({
      name: v.name, model: v.model ?? "", plate: v.plate ?? "", price: v.purchase_price ?? "",
      revenue: p.revenue, expenses: p.expenses, profit: p.profit, allProfit: allTime.profit, payback: payback ?? "", left: monthsLeft ?? "",
    })),
  );

  // 4. Courses
  table(
    wb.addWorksheet("Courses"),
    [
      { header: "Référence", key: "ref", width: 10 },
      { header: "Date", key: "date", width: 11 },
      { header: "Heure", key: "time", width: 7 },
      { header: "Statut", key: "status", width: 13 },
      { header: "Client", key: "name", width: 16 },
      { header: "Téléphone", key: "phone", width: 15 },
      { header: "Départ", key: "from", width: 30 },
      { header: "Destination", key: "to", width: 30 },
      { header: "Km", key: "km", width: 7 },
      { header: "Prix estimé", key: "est", width: 14, money: true },
      { header: "Prix payé", key: "paid", width: 14, money: true },
      { header: "Paiement", key: "pm", width: 13 },
      { header: "Véhicule", key: "veh", width: 12 },
    ],
    r.bookings.map((b) => {
      const t = Date.parse(b.start_at);
      return {
        ref: b.reference, date: fr(dakarDate(t)), time: dakarTime(t), status: STATUS_LABELS[b.status], name: b.customer_name,
        phone: b.customer_phone, from: b.pickup_address, to: b.dropoff_address, km: Number(b.distance_km), est: b.estimated_price,
        paid: b.final_price ?? "", pm: b.payment_method ? PAYMENT_LABELS[b.payment_method] : "", veh: vName(b.vehicle_id),
      };
    }),
  );

  // 5. Dépenses
  table(
    wb.addWorksheet("Dépenses"),
    [
      { header: "Date", key: "date", width: 11 },
      { header: "Catégorie", key: "cat", width: 22 },
      { header: "Montant", key: "amount", width: 14, money: true },
      { header: "Fournisseur", key: "supplier", width: 20 },
      { header: "Véhicule", key: "veh", width: 12 },
      { header: "Paiement", key: "pm", width: 13 },
      { header: "Note", key: "note", width: 36 },
      { header: "Justificatif", key: "proof", width: 12 },
    ],
    r.expenses.map((e) => ({
      date: fr(e.spent_on), cat: EXPENSE_CATEGORIES[e.category], amount: e.amount, supplier: e.supplier ?? "", veh: vName(e.vehicle_id),
      pm: e.payment_method ? MONEY_LABELS[e.payment_method] : "", note: e.note ?? "", proof: e.receipt_path ? "Photo" : "",
    })),
  );

  // 6. Revenus hors site
  table(
    wb.addWorksheet("Revenus hors site"),
    [
      { header: "Date", key: "date", width: 11 },
      { header: "Source", key: "src", width: 24 },
      { header: "Montant", key: "amount", width: 14, money: true },
      { header: "Courses", key: "trips", width: 9 },
      { header: "Véhicule", key: "veh", width: 12 },
      { header: "Paiement", key: "pm", width: 13 },
      { header: "Note", key: "note", width: 36 },
    ],
    r.incomes.map((i) => ({
      date: fr(i.earned_on), src: INCOME_SOURCES[i.source], amount: i.amount, trips: i.trips, veh: vName(i.vehicle_id),
      pm: i.payment_method ? MONEY_LABELS[i.payment_method] : "", note: i.note ?? "",
    })),
  );

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
