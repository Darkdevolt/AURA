import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Connexion admin", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-extrabold">Espace administrateur</h1>
      <LoginForm />
    </div>
  );
}
