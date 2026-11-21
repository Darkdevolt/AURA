import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SERVER_RPC_TOKEN } from "./env";

/** Le code PIN n'est jamais stocké : seulement cette empreinte salée. */
export function hashPin(phone: string, pin: string): string {
  return createHash("sha256").update(`${SERVER_RPC_TOKEN()}:pin:${phone}:${pin}`).digest("hex");
}

const COOKIE = "la_driver";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

function sign(value: string): string {
  return createHmac("sha256", SERVER_RPC_TOKEN()).update(`driver:${value}`).digest("hex").slice(0, 32);
}

export async function setDriverSession(driverId: string, name: string) {
  const payload = Buffer.from(JSON.stringify({ id: driverId, name })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearDriverSession() {
  (await cookies()).delete(COOKIE);
}

export async function getDriverSession(): Promise<{ id: string; name: string } | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id: string; name: string };
    return typeof v.id === "string" ? v : null;
  } catch {
    return null;
  }
}
