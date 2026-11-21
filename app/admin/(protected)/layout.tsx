import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, supabaseSession } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Réservations" },
  { href: "/admin/plages", label: "Plages bloquées" },
  { href: "/admin/reglages", label: "Réglages" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) {
    const { data } = await (await supabaseSession()).auth.getUser();
    return (
      <div className="wrap mt-6 card space-y-3">
        <h1 className="text-xl font-bold">Accès refusé</h1>
        <p className="text-[15px]">
          Le compte <strong>{data.user?.email ?? "?"}</strong> n&apos;est pas administrateur. Ajoutez-le à la table
          <code className="mx-1 rounded bg-neutral-100 px-1">admins</code> (voir README).
        </p>
        <form action={signOut}><button className="btn-outline">Se déconnecter</button></form>
      </div>
    );
  }
  return (
    <div className="wrap py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Administration" className="flex flex-wrap gap-1.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="chip border-neutral-300 bg-white hover:border-ink">{n.label}</Link>
          ))}
        </nav>
        <form action={signOut}>
          <button className="chip border-neutral-300 bg-white text-neutral-700 hover:border-ink" title={admin.user.email}>Déconnexion</button>
        </form>
      </div>
      {children}
    </div>
  );
}
