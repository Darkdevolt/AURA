import Link from "next/link";
import BookingCard from "@/components/admin/BookingCard";
import DayNav from "@/components/admin/DayNav";
import { SITE_URL } from "@/lib/env";
import { waveEnabled } from "@/lib/wave";
import { formatFcfa } from "@/lib/pricing";
import { requireAdmin } from "@/lib/supabase/server";
import { addDays, dakarDate, dakarTime, dakarToUtc, formatDateLong, timeToMinutes, weekdayOf } from "@/lib/time";
import { STATUS_LABELS, type Booking, type BookingStatus } from "@/lib/types";

const BAR: Record<BookingStatus, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-sky-500",
  in_progress: "bg-violet-500",
  completed: "bg-emerald-500",
  cancelled: "bg-neutral-300",
  no_show: "bg-rose-400",
};

function Stat({ label, count, revenue }: { label: string; count: number; revenue: number }) {
  return (
    <div className="border border-line bg-white px-2 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold leading-tight">{count}</p>
      <p className="text-[11px] text-neutral-500">course{count > 1 ? "s" : ""}</p>
      <p className="mt-1 text-[12px] font-bold tabular-nums text-gold-dark">{formatFcfa(revenue)}</p>
    </div>
  );
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase } = (await requireAdmin())!;
  const today = dakarDate(Date.now());
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const dayStart = new Date(dakarToUtc(date, "00:00")).toISOString();
  const dayEnd = new Date(dakarToUtc(addDays(date, 1), "00:00")).toISOString();

  // Bornes des statistiques (heure de Dakar)
  const wd = weekdayOf(today);
  const weekStart = addDays(today, wd === 0 ? -6 : 1 - wd);
  const monthStart = `${today.slice(0, 8)}01`;
  const statsFrom = weekStart < monthStart ? weekStart : monthStart;

  const [dayRes, statsRes, pendingRes, settingsRes, blocksRes, vehRes, drvRes] = await Promise.all([
    supabase.from("luxus_bookings").select("*").gte("start_at", dayStart).lt("start_at", dayEnd).order("start_at"),
    supabase
      .from("luxus_bookings")
      .select("start_at, final_price, estimated_price")
      .eq("status", "completed")
      .gte("start_at", new Date(dakarToUtc(statsFrom, "00:00")).toISOString())
      .lt("start_at", new Date(dakarToUtc(addDays(today, 1), "00:00")).toISOString()),
    supabase.from("luxus_bookings").select("*").eq("status", "pending").gte("start_at", new Date().toISOString()).order("start_at").limit(30),
    supabase.from("luxus_settings").select("open_time, close_time").single(),
    supabase.from("luxus_blocked_slots").select("*").lt("start_at", dayEnd).gt("end_at", dayStart),
    supabase.from("luxus_vehicles").select("id, name").eq("active", true).order("created_at"),
    supabase.from("luxus_drivers").select("id, name").eq("active", true).order("created_at"),
  ]);

  const bookings = (dayRes.data ?? []) as Booking[];
  const fleet = { vehicles: vehRes.data ?? [], drivers: drvRes.data ?? [], siteUrl: SITE_URL(), waveEnabled: waveEnabled() };
  const pendingOther = ((pendingRes.data ?? []) as Booking[]).filter((b) => dakarDate(Date.parse(b.start_at)) !== date);
  const stats = (from: string) => {
    const rows = (statsRes.data ?? []).filter((r) => dakarDate(Date.parse(r.start_at)) >= from);
    return { count: rows.length, revenue: rows.reduce((s, r) => s + (r.final_price ?? r.estimated_price ?? 0), 0) };
  };
  const sToday = stats(today), sWeek = stats(weekStart), sMonth = stats(monthStart);

  const open = timeToMinutes(settingsRes.data?.open_time ?? "08:00");
  const close = timeToMinutes(settingsRes.data?.close_time ?? "20:00") + 60;
  const span = close - open;
  const pos = (iso: string) => {
    const m = (Date.parse(iso) - dakarToUtc(date, "00:00")) / 60000;
    return Math.min(100, Math.max(0, ((m - open) / span) * 100));
  };
  const hours = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => open / 60 + i);

  const csvFrom = monthStart;
  const csvTo = today;

  return (
    <div className="space-y-5">
      <section aria-label="Statistiques" className="grid grid-cols-3 gap-2">
        <Stat label="Aujourd'hui" {...sToday} />
        <Stat label="Semaine" {...sWeek} />
        <Stat label="Mois" {...sMonth} />
      </section>
      <p className="-mt-3 text-xs text-neutral-600">Courses terminées. Chiffre d&apos;affaires = prix payé (ou estimé s&apos;il n&apos;a pas été saisi).</p>

      <section className="card space-y-3">
        <DayNav date={date} prev={addDays(date, -1)} next={addDays(date, 1)} />
        <h1 className="text-center text-[15px] font-bold capitalize">
          {formatDateLong(Date.parse(dayStart))} {date === today && <span className="text-gold-dark">(aujourd&apos;hui)</span>}
        </h1>
        {date !== today && <p className="text-center"><Link href="/admin" className="text-sm underline">Revenir à aujourd&apos;hui</Link></p>}

        {/* Vue chronologique */}
        <div aria-label="Vue chronologique" className="relative mt-2 h-16 overflow-hidden bg-neutral-100">
          {hours.map((h) => (
            <div key={h} className="absolute top-0 h-full border-l border-neutral-300" style={{ left: `${((h * 60 - open) / span) * 100}%` }}>
              {h < hours[hours.length - 1] && <span className="absolute -top-0.5 left-0.5 text-[10px] text-neutral-500">{h}h</span>}
            </div>
          ))}
          {(blocksRes.data ?? []).map((s) => (
            <div key={s.id} title={`Bloqué : ${s.reason ?? ""}`} className="absolute bottom-1 h-5 bg-[repeating-linear-gradient(45deg,#999_0,#999_4px,#ccc_4px,#ccc_8px)]"
              style={{ left: `${pos(s.start_at)}%`, width: `${Math.max(1, pos(s.end_at) - pos(s.start_at))}%` }} />
          ))}
          {bookings.map((b) => (
            <a key={b.id} href={`#${b.reference}`} title={`${b.reference} ${dakarTime(Date.parse(b.start_at))} ${STATUS_LABELS[b.status]}`}
              className={`absolute top-5 h-5 ${BAR[b.status]} ring-1 ring-white`}
              style={{ left: `${pos(b.start_at)}%`, width: `${Math.max(1.5, pos(b.blocked_until) - pos(b.start_at))}%` }} />
          ))}
        </div>
        <p className="text-xs text-neutral-600">Barres colorées : réservations (durée bloquée). Hachures : plages bloquées.</p>
      </section>

      <section className="grid items-start gap-3 lg:grid-cols-2" aria-label="Réservations du jour">
        {bookings.length === 0 && <p className="card text-center text-neutral-700 lg:col-span-2">Aucune réservation ce jour-là.</p>}
        {bookings.map((b) => <BookingCard key={b.id} b={b} {...fleet} />)}
      </section>

      {pendingOther.length > 0 && (
        <section className="grid items-start gap-3 lg:grid-cols-2">
          <h2 className="text-[15px] font-bold uppercase tracking-[0.05em] lg:col-span-2">À confirmer (autres jours)</h2>
          {pendingOther.map((b) => <BookingCard key={b.id} b={b} showDate {...fleet} />)}
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">Export CSV</h2>
        <form action="/api/admin/export" method="get" className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div><label className="label text-sm" htmlFor="from">Du</label><input id="from" type="date" name="from" defaultValue={csvFrom} className="input" /></div>
          <div><label className="label text-sm" htmlFor="to">Au</label><input id="to" type="date" name="to" defaultValue={csvTo} className="input" /></div>
          <button className="btn-primary col-span-2 sm:col-span-1">Télécharger</button>
        </form>
      </section>
    </div>
  );
}
