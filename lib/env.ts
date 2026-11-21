/**
 * Configuration.
 * L'URL Supabase et la clé publishable sont publiques par conception (envoyées au navigateur) :
 * elles ont une valeur par défaut ici, surchargeable par variable d'environnement.
 * Le jeton serveur, lui, est secret : uniquement en variable d'environnement (Vercel).
 */
export const PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://otsiwiwlnowxeolbbgvm.supabase.co";
export const PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_MhaI5b-kMmb5liIMOJ4P3Q_xGTsJAFJ";

export const SUPABASE_URL = () => PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = () => PUBLIC_SUPABASE_ANON_KEY;

/** Jeton partagé entre les routes serveur et les fonctions Postgres (serveur uniquement). */
export const SERVER_RPC_TOKEN = () => {
  const v = process.env.SERVER_RPC_TOKEN;
  if (!v) throw new Error("Variable d'environnement manquante : SERVER_RPC_TOKEN");
  return v;
};

export const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || "https://luxus-asaad.vercel.app";
