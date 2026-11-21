import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";

/** Client sans session : n'a accès qu'aux fonctions publiques protégées par jeton. */
export function supabasePublic() {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client avec la session de l'admin (cookies) : soumis aux politiques RLS. */
export async function supabaseSession() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Appelé depuis un Server Component : le proxy rafraîchit la session.
        }
      },
    },
  });
}

/** Retourne le client si l'utilisateur connecté est admin, sinon null. */
export async function requireAdmin() {
  const supabase = await supabaseSession();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: ok } = await supabase.rpc("is_admin");
  if (!ok) return null;
  return { supabase, user: auth.user };
}
