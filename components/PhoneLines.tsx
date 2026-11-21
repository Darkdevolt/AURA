import { formatSenegalPhone } from "@/lib/phone";
import type { ContactLine } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

export function PhoneIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zM12 0a12 12 0 0 0-10.3 18L0 24l6.2-1.6A12 12 0 1 0 12 0z" />
    </svg>
  );
}

/** Lignes « Appeler pour réserver » : une ligne par numéro, séparées par un filet. */
export default function PhoneLines({ lines, tone = "light" }: { lines: ContactLine[]; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <ul className={`divide-y border-y ${dark ? "divide-white/10 border-white/10" : "divide-line border-line"}`}>
      {lines.map((l) => (
        <li key={l.phone} className="flex items-center gap-3 py-4">
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${dark ? "text-gold-light" : "text-gold-dark"}`}>{l.label}</p>
            <a href={`tel:${l.phone}`} className={`mt-0.5 block truncate text-xl font-semibold tabular-nums tracking-wide ${dark ? "text-white" : "text-ink"}`}>
              {formatSenegalPhone(l.phone)}
            </a>
          </div>
          <a
            href={`tel:${l.phone}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center bg-gold-grad text-ink"
            aria-label={`Appeler ${l.label} au ${formatSenegalPhone(l.phone)}`}
          >
            <PhoneIcon />
          </a>
          {l.whatsapp && (
            <a
              href={waLink(l.phone, "Bonjour Luxus Asaad, je souhaite réserver une course.")}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-12 w-12 shrink-0 items-center justify-center border ${dark ? "border-white/25 text-white hover:bg-white hover:text-ink" : "border-ink text-ink hover:bg-ink hover:text-white"} transition`}
              aria-label={`Écrire sur WhatsApp à ${l.label}`}
            >
              <WhatsAppIcon />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
