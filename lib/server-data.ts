import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { SERVER_RPC_TOKEN } from "./env";
import { supabasePublic } from "./supabase/server";
import type { BusyInterval } from "./slots";
import { DEFAULT_SETTINGS, type Settings } from "./types";

export const SETTINGS_TAG = "luxus-settings";

/** Réglages mis en cache 5 min (vidé immédiatement quand l'admin les modifie). */
const fetchSettings = unstable_cache(
  async (): Promise<Settings> => {
    const { data, error } = await supabasePublic().rpc("luxus_get_settings", { p_token: SERVER_RPC_TOKEN() });
    if (error || !data) throw error ?? new Error("settings vides");
    return { ...DEFAULT_SETTINGS, ...(data as Settings) };
  },
  ["luxus-settings-v1"],
  { revalidate: 300, tags: [SETTINGS_TAG] },
);

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    return await fetchSettings();
  } catch (e) {
    console.error("getSettings", e);
    return DEFAULT_SETTINGS;
  }
});

export async function getBusy(from: number, to: number): Promise<BusyInterval[]> {
  const { data, error } = await supabasePublic().rpc("luxus_get_busy", {
    p_token: SERVER_RPC_TOKEN(),
    p_from: new Date(from).toISOString(),
    p_to: new Date(to).toISOString(),
  });
  if (error) throw error;
  return ((data ?? []) as { start_at: string; end_at: string; kind: "booking" | "blocked" }[]).map((r) => ({
    start: Date.parse(r.start_at),
    end: Date.parse(r.end_at),
    kind: r.kind,
  }));
}

/** Paramètres publics transmis au navigateur (sans limites anti-spam). */
export function publicSettings(s: Settings) {
  const { max_active_per_phone: _a, max_per_ip_per_day: _b, ntfy_topic: _c, ...rest } = s;
  return rest;
}
export type PublicSettings = ReturnType<typeof publicSettings>;
