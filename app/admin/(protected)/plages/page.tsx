import BlockForm from "@/components/admin/BlockForm";
import { deleteBlock } from "../../actions";
import { requireAdmin } from "@/lib/supabase/server";
import { dakarDate, dakarTime, formatDateLong } from "@/lib/time";

export default async function BlocksPage() {
  const { supabase } = (await requireAdmin())!;
  const { data } = await supabase
    .from("blocked_slots")
    .select("*")
    .gte("end_at", new Date().toISOString())
    .order("start_at");
  const fmt = (iso: string) => {
    const t = Date.parse(iso);
    return `${formatDateLong(t)} ${dakarTime(t).replace(":", "h")}`;
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Plages bloquées</h1>
      <BlockForm today={dakarDate(Date.now())} />
      <section className="space-y-2">
        <h2 className="text-lg font-bold">À venir</h2>
        {(data ?? []).length === 0 && <p className="card text-neutral-700">Aucune plage bloquée à venir.</p>}
        {(data ?? []).map((s) => (
          <div key={s.id} className="card flex items-center justify-between gap-3">
            <div className="text-[15px]">
              <p className="font-semibold capitalize">{fmt(s.start_at)}</p>
              <p className="text-neutral-700">→ {fmt(s.end_at)}</p>
              {s.reason && <p className="text-neutral-600">{s.reason}</p>}
            </div>
            <form action={deleteBlock}>
              <input type="hidden" name="id" value={s.id} />
              <button className="btn-outline border-rose-300 px-3 text-rose-800">Supprimer</button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
