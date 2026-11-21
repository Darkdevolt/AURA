import { NextResponse } from "next/server";
import { estimateRoute, isInSenegal } from "@/lib/geo";
import { jsonError } from "@/lib/http";
import { computePrice } from "@/lib/pricing";
import { getSettings } from "@/lib/server-data";

export const dynamic = "force-dynamic";

function parse(v: string | null) {
  const [lat, lng] = (v ?? "").split(",").map(Number);
  return isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const a = parse(url.searchParams.get("from"));
  const b = parse(url.searchParams.get("to"));
  if (!a || !b || !isInSenegal(a) || !isInSenegal(b)) return jsonError("Adresses invalides.");
  const [route, settings] = await Promise.all([estimateRoute(a, b), getSettings()]);
  const { price, airport } = computePrice(route.distanceKm, settings, a, b);
  // Même trajet = même réponse : gardée en cache par Vercel (les réglages de prix changent rarement)
  return NextResponse.json(
    { ...route, price, airport },
    { headers: { "Cache-Control": route.source === "osrm" ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store" } },
  );
}
