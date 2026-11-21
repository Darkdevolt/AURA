import type { Metadata } from "next";
import AdminBar from "@/components/admin/AdminBar";
import { requireAdmin, supabaseSession } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) {
    const { data } = await (await supabaseSession()).auth.getUser();
    return (
      <div className="wrap mt-6 card space-y-3">
        <h1 className="text-xl font-bold">Accès refusé</h1>
        <p className="text-[15px]">
          Le compte <strong>{data.user?.email ?? "?"}</strong> n&apos;est pas administrateur. Ajoutez-le à la table
          <code className="mx-1 bg-neutral-100 px-1">luxus_admins</code> (voir README).
        </p>
        <form action={signOut}><button className="btn-outline">Se déconnecter</button></form>
      </div>
    );
  }
  return (
    <>
      <AdminBar email={admin.user.email ?? ""} signOut={signOut} />
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">{children}</div>
    </>
  );
}
