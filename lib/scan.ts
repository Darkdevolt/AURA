import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from "./types";

/** Lecture d'une photo de reçu / capture Wave / Orange Money par Claude (vision). */
export const scanEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

const expenseKeys = Object.keys(EXPENSE_CATEGORIES) as [keyof typeof EXPENSE_CATEGORIES, ...(keyof typeof EXPENSE_CATEGORIES)[]];
const incomeKeys = Object.keys(INCOME_SOURCES) as [keyof typeof INCOME_SOURCES, ...(keyof typeof INCOME_SOURCES)[]];

export const ScanResult = z.object({
  kind: z.enum(["depense", "revenu"]).describe("depense = argent sorti, revenu = argent reçu"),
  date: z.string().nullable().describe("Date de l'opération au format YYYY-MM-DD, null si illisible"),
  amount: z.number().int().nullable().describe("Montant total payé ou reçu, en FCFA, entier, null si illisible"),
  expense_category: z.enum(expenseKeys).nullable().describe("Catégorie si dépense, sinon null"),
  income_source: z.enum(incomeKeys).nullable().describe("Source si revenu, sinon null"),
  trips: z.number().int().nullable().describe("Nombre de courses si c'est un relevé de revenus (Yango…), sinon null"),
  payment_method: z.enum(["cash", "wave", "orange_money", "carte", "autre"]).nullable(),
  supplier: z.string().nullable().describe("Commerçant, station, garage ou plateforme"),
  odometer_km: z.number().int().nullable().describe("Kilométrage du compteur s'il apparaît, sinon null"),
  description: z.string().describe("Résumé en français, 12 mots maximum"),
  confidence: z.enum(["haute", "moyenne", "basse"]),
});
export type ScanResult = z.infer<typeof ScanResult>;

const SYSTEM = `Tu aides le gérant d'une petite société de VTC à Dakar (Sénégal) à tenir sa comptabilité.
On te donne la photo d'un justificatif : ticket de caisse, facture, reçu de recharge électrique ou de carburant,
reçu de péage, capture d'écran Wave ou Orange Money, ou relevé de gains d'une plateforme (Yango, Heetch).
Extrais les informations demandées. La monnaie est le franc CFA (FCFA / XOF) : renvoie le montant en entier,
sans séparateur ni décimales. Prends le montant TOTAL effectivement payé (TTC), pas un sous-total.
Une capture Wave/Orange Money d'un envoi ou d'un paiement fait par le gérant est une dépense ;
un paiement reçu d'un client, ou des gains de plateforme, sont un revenu.
Les dates au format JJ/MM/AAAA sont françaises. Si une information est illisible, mets null plutôt que deviner,
et baisse la confiance.`;

export async function scanReceipt(imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<ScanResult> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(ScanResult) },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Analyse ce justificatif." },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("Lecture refusée pour cette image.");
  if (!response.parsed_output) throw new Error("Le reçu n'a pas pu être lu.");
  return response.parsed_output;
}
