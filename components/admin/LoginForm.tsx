"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setError(error.message.includes("Invalid") ? "Email ou mot de passe incorrect." : error.message);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password" className="label">Mot de passe</label>
        <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
