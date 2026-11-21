import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { scanEnabled, scanReceipt } from "@/lib/scan";
import { requireAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function POST(req: Request) {
  if (!(await requireAdmin())) return jsonError("Accès refusé.", 401);
  if (!scanEnabled()) return jsonError("Lecture automatique non configurée (clé ANTHROPIC_API_KEY manquante).", 501);
  const body = (await req.json().catch(() => ({}))) as { image?: string; mediaType?: string };
  const media = TYPES.find((t) => t === body.mediaType);
  if (!media || typeof body.image !== "string" || body.image.length < 100) return jsonError("Image invalide.");
  if (body.image.length > 5_500_000) return jsonError("Image trop lourde.");
  try {
    return NextResponse.json(await scanReceipt(body.image, media));
  } catch (e) {
    console.error("scan", e);
    return jsonError(e instanceof Error ? e.message : "Lecture impossible.", 502);
  }
}
