/**
 * Calculs de gestion de flotte (sans accès à la base : facilement testables).
 */

/** Ajoute n jours à une date AAAA-MM-JJ */
export function plusDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates AAAA-MM-JJ (b − a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

export type DocStatus = "expire" | "bientot" | "ok" | "sans_date";

/** État d'un document : expiré, expire bientôt (≤ 30 jours) ou valide */
export function docStatus(expiresOn: string | null, today: string, warnDays = 30): DocStatus {
  if (!expiresOn) return "sans_date";
  const left = daysBetween(today, expiresOn);
  if (left < 0) return "expire";
  if (left <= warnDays) return "bientot";
  return "ok";
}

/** Jours ouvrés (lundi → samedi) entre deux dates incluses */
export function workingDays(from: string, to: string): number {
  let n = 0;
  for (let d = from; d <= to; d = plusDays(d, 1)) {
    if (new Date(`${d}T12:00:00Z`).getUTCDay() !== 0) n++;
  }
  return n;
}

/** Jours ouvrés (lundi → samedi) d'un mois AAAA-MM */
export function workingDaysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return workingDays(`${month}-01`, `${month}-${String(last).padStart(2, "0")}`);
}

export interface DayCash {
  cashCollected: number; // encaissé passagers
  recharges: number; // recharges à la borne payées par le chauffeur
  yangoTopup: number; // recharge du solde Yango
  otherExpenses: number; // police, lavage… (péage perso exclu)
  vaultOut: number; // envoyé au chauffeur depuis le coffre
  vaultIn: number; // versé au coffre par le chauffeur
}

/**
 * Écart de caisse du jour : ce que le chauffeur devrait encore avoir en main.
 * 0 = tout est expliqué. Positif = espèces gardées / non versées. Négatif = il manque une sortie.
 */
export function dayGap(c: DayCash): number {
  return c.cashCollected - c.recharges - c.yangoTopup - c.otherExpenses + c.vaultOut - c.vaultIn;
}

/** Format FCFA sans décimales : 1 234 567 */
export function fcfa(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
}
