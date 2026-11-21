function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export const SUPABASE_URL = () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = () =>
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
/** Jeton partagé entre les routes serveur et les fonctions Postgres (serveur uniquement). */
export const SERVER_RPC_TOKEN = () => required("SERVER_RPC_TOKEN", process.env.SERVER_RPC_TOKEN);
export const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
