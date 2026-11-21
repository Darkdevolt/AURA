import type { ContactLine } from "./types";

/**
 * Numéros mobiles sénégalais : +221 7X XXX XX XX (70, 71, 75, 76, 77, 78).
 * Retourne le format E.164 « +2217XXXXXXXX » ou null.
 */
export function normalizeSenegalPhone(input: string): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("221")) d = d.slice(3);
  if (!/^7[015678]\d{7}$/.test(d)) return null;
  return `+221${d}`;
}

/** "+221771234567" → "+221 77 123 45 67" */
export function formatSenegalPhone(e164: string): string {
  const m = /^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}

/** Chiffres seuls pour wa.me */
export function waDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}


/** Lignes valides uniquement (numéro sénégalais correct) */
export function validLines(lines: unknown): ContactLine[] {
  if (!Array.isArray(lines)) return [];
  return lines
    .map((l) => ({ label: String(l?.label ?? "").trim().slice(0, 40), phone: normalizeSenegalPhone(String(l?.phone ?? "")) }))
    .filter((l): l is ContactLine => !!l.phone && !!l.label);
}
