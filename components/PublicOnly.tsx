"use client";

import { usePathname } from "next/navigation";

/** Masque un bloc du site public (pied de page…) dans l'administration. */
export default function PublicOnly({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/admin") ? null : <>{children}</>;
}
