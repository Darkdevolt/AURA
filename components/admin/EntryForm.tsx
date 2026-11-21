"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveEntry, type ActionResult } from "@/app/admin/actions";
import { compressImage } from "@/lib/image";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, MONEY_LABELS, type Vehicle } from "@/lib/types";

interface Scan {
  kind: "depense" | "revenu";
  date: string | null;
  amount: number | null;
  expense_category: string | null;
  income_source: string | null;
  trips: number | null;
  payment_method: string | null;
  supplier: string | null;
  odometer_km: number | null;
  description: string;
  confidence: "haute" | "moyenne" | "basse";
}

export default function EntryForm({ vehicles, today, scanEnabled }: { vehicles: Vehicle[]; today: string; scanEnabled: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveEntry, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"depense" | "revenu">("depense");
  const [values, setValues] = useState<Record<string, string>>({ date: today });
  const [receiptPath, setReceiptPath] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [scanState, setScanState] = useState<"idle" | "upload" | "scan" | "done" | "error">("idle");
  const [scanMsg, setScanMsg] = useState("");
  const [formKey, setFormKey] = useState(0);
  const active = vehicles.filter((v) => v.active);

  useEffect(() => {
    if (state?.ok) {
      setValues({ date: today });
      setReceiptPath("");
      setPreview(null);
      setScanState("idle");
      setScanMsg("");
      setFormKey((k) => k + 1);
    }
  }, [state, today]);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setScanMsg("");
    setScanState("upload");
    try {
      const { blob, base64 } = await compressImage(file);
      setPreview(URL.createObjectURL(blob));
      const path = `${today.slice(0, 7)}/${crypto.randomUUID()}.jpg`;
      const upload = supabaseBrowser().storage.from("luxus-receipts").upload(path, blob, { contentType: "image/jpeg" });
      let scan: Scan | null = null;
      if (scanEnabled) {
        setScanState("scan");
        const res = await fetch("/api/admin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) scan = data as Scan;
        else setScanMsg(data.error || "Lecture automatique impossible : complétez à la main.");
      }
      const up = await upload;
      if (up.error) throw up.error;
      setReceiptPath(path);
      if (scan) {
        setKind(scan.kind);
        setValues({
          date: scan.date && /^\d{4}-\d{2}-\d{2}$/.test(scan.date) ? scan.date : today,
          amount: scan.amount ? String(scan.amount) : "",
          category: scan.expense_category ?? "autre",
          source: scan.income_source ?? "autre",
          trips: scan.trips ? String(scan.trips) : "",
          payment_method: scan.payment_method ?? "",
          supplier: scan.supplier ?? "",
          odometer_km: scan.odometer_km ? String(scan.odometer_km) : "",
          note: scan.description,
          scanned: "1",
        });
        setFormKey((k) => k + 1);
        setScanMsg(
          scan.confidence === "haute"
            ? "Reçu lu. Vérifiez puis enregistrez."
            : "Reçu lu avec un doute : vérifiez bien le montant et la date avant d'enregistrer.",
        );
      }
      setScanState("done");
    } catch (e) {
      console.error(e);
      setScanState("error");
      setScanMsg("La photo n'a pas pu être envoyée. Vérifiez la connexion et réessayez.");
    }
  };

  const v = (k: string) => values[k] ?? "";

  return (
    <div className="space-y-5">
      <div className="relative bg-ink-grad p-5 text-white">
        <div aria-hidden className="gold-rule absolute inset-x-0 top-0" />
        <p className="font-brand text-[15px]">Scanner un reçu</p>
        <p className="mt-1 text-sm text-neutral-400">
          {scanEnabled
            ? "Photo d'un ticket, d'une facture, d'une capture Wave / Orange Money ou d'un relevé Yango : le montant, la date et la catégorie sont remplis automatiquement."
            : "Photo du justificatif, conservée avec la dépense. (Lecture automatique : ajoutez ANTHROPIC_API_KEY dans Vercel, voir README.)"}
        </p>
        <label className="btn-gold mt-4 w-full cursor-pointer">
          {scanState === "upload" ? "Envoi de la photo…" : scanState === "scan" ? "Lecture du reçu…" : "Prendre / choisir une photo"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={scanState === "upload" || scanState === "scan"}
            onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Reçu" className="mt-3 max-h-48 border border-white/20 object-contain" />
        )}
        {scanMsg && <p className={`mt-3 text-sm ${scanState === "error" ? "text-rose-300" : "text-gold-light"}`} role="status">{scanMsg}</p>}
      </div>

      <form ref={formRef} action={action} key={formKey} className="space-y-4">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="receipt_path" value={receiptPath} />
        <input type="hidden" name="scanned" value={v("scanned")} />
        <div className="cells grid-cols-2" role="radiogroup" aria-label="Type">
          {(["depense", "revenu"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={`chip text-[13px] font-semibold uppercase tracking-[0.05em] ${kind === k ? "chip-on" : "chip-off"}`}>
              {k === "depense" ? "Dépense" : "Revenu"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="e-date">Date</label><input id="e-date" type="date" name="date" defaultValue={v("date")} className="input" required /></div>
          <div><label className="label" htmlFor="e-amount">Montant (FCFA)</label><input id="e-amount" name="amount" inputMode="numeric" defaultValue={v("amount")} className="input" required /></div>
        </div>
        {kind === "depense" ? (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="e-cat">Catégorie</label>
              <select id="e-cat" name="category" defaultValue={v("category") || "recharge"} className="input">
                {Object.entries(EXPENSE_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select></div>
            <div><label className="label" htmlFor="e-sup">Fournisseur</label><input id="e-sup" name="supplier" defaultValue={v("supplier")} className="input" placeholder="Station, garage…" /></div>
            <div><label className="label" htmlFor="e-km">Compteur (km)</label><input id="e-km" name="odometer_km" inputMode="numeric" defaultValue={v("odometer_km")} className="input" placeholder="Facultatif" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="e-src">Source</label>
              <select id="e-src" name="source" defaultValue={v("source") || "direct"} className="input">
                {Object.entries(INCOME_SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select></div>
            <div><label className="label" htmlFor="e-trips">Nombre de courses</label><input id="e-trips" name="trips" inputMode="numeric" defaultValue={v("trips") || "1"} className="input" /></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="e-veh">Véhicule</label>
            <select id="e-veh" name="vehicle_id" defaultValue={active.length === 1 ? active[0].id : ""} className="input">
              <option value="">— Général —</option>
              {vehicles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select></div>
          <div><label className="label" htmlFor="e-pm">Paiement</label>
            <select id="e-pm" name="payment_method" defaultValue={v("payment_method")} className="input">
              <option value="">—</option>
              {Object.entries(MONEY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></div>
        </div>
        <div><label className="label" htmlFor="e-note">Note</label><input id="e-note" name="note" defaultValue={v("note")} className="input" maxLength={500} /></div>
        {state && <p role="status" className={state.ok ? "alert-info" : "alert-error"}>{state.message}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Enregistrement…" : kind === "depense" ? "Enregistrer la dépense" : "Enregistrer le revenu"}</button>
      </form>
    </div>
  );
}
