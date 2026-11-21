import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { SERVER_RPC_TOKEN } from "./env";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function clientIpHash(req: Request): string | null {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || SERVER_RPC_TOKEN();
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function parseLatLng(v: unknown): { lat: number; lng: number } | null {
  if (!v || typeof v !== "object") return null;
  const { lat, lng } = v as { lat: unknown; lng: unknown };
  if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) return null;
  return { lat, lng };
}

export function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
