import SettingsForm from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/types";

export default async function SettingsPage() {
  const { supabase } = (await requireAdmin())!;
  const { data } = await supabase.from("settings").select("*").single();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Réglages</h1>
      <SettingsForm s={{ ...DEFAULT_SETTINGS, ...(data as Settings | null) }} />
    </div>
  );
}
