import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paiement Wave (API Checkout de Wave Business).
 * Actif uniquement si WAVE_API_KEY est défini (clé fournie par Wave Business).
 */
export const waveEnabled = () => Boolean(process.env.WAVE_API_KEY);

export async function createWaveCheckout(opts: { amount: number; reference: string; siteUrl: string }) {
  const res = await fetch("https://api.wave.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WAVE_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${opts.reference}-${opts.amount}`,
    },
    body: JSON.stringify({
      amount: String(Math.round(opts.amount)),
      currency: "XOF",
      client_reference: opts.reference,
      success_url: `${opts.siteUrl}/ma-reservation?ref=${opts.reference}&paye=1`,
      error_url: `${opts.siteUrl}/ma-reservation?ref=${opts.reference}`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; wave_launch_url?: string; message?: string };
  if (!res.ok || !data.wave_launch_url) throw new Error(data.message || `Wave ${res.status}`);
  return { id: data.id!, url: data.wave_launch_url };
}

/** Vérifie l'en-tête « Wave-Signature: t=…,v1=… » (HMAC-SHA256 de t + corps). */
export function verifyWaveSignature(header: string | null, body: string): boolean {
  const secret = process.env.WAVE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t;
  const sigs = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(t + body).digest("hex");
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}
