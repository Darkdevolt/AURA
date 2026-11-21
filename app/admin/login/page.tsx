import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Connexion admin", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <Logo variant="full-dark" height={120} alt="Luxus Asaad" className="mx-auto mb-6" />
      <h1 className="mb-4 font-display text-3xl font-bold">Espace administrateur</h1>
      <LoginForm />
    </div>
  );
}
