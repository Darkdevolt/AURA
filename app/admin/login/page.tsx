import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Connexion admin", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-4 font-display text-3xl font-bold">Espace administrateur</h1>
      <LoginForm />
    </div>
  );
}
