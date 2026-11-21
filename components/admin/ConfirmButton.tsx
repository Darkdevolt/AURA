"use client";

/** Bouton d'envoi de formulaire qui demande confirmation avant une suppression. */
export default function ConfirmButton({ message, className, children, label }: { message: string; className?: string; children: React.ReactNode; label?: string }) {
  return (
    <button className={className} aria-label={label} title={label} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
