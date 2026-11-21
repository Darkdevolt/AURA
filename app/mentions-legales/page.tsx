import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Mentions légales et confidentialité" };

export default function LegalPage() {
  return (
    <>
    <PageHero eyebrow="Informations" title="Mentions légales et confidentialité" />
    <div className="wrap prose-la mt-4">

      <h2>Éditeur du site</h2>
      <p>Luxus Asaad — service de transport de personnes avec chauffeur (VTC), Dakar, Sénégal.</p>
      <p>Contact : voir la page Contact (WhatsApp et téléphone).</p>

      <h2>Hébergement</h2>
      <p>Site hébergé par Vercel Inc. (États-Unis). Base de données hébergée par Supabase (Union européenne).</p>

      <h2>Données collectées</h2>
      <ul>
        <li>Votre prénom et votre numéro de téléphone ;</li>
        <li>Les adresses et positions de départ et d&apos;arrivée, la date et l&apos;heure de la course ;</li>
        <li>Le nombre de passagers et votre éventuel commentaire ;</li>
        <li>Une empreinte anonymisée de votre adresse IP, uniquement pour lutter contre les abus.</li>
      </ul>

      <h2>Utilisation des données</h2>
      <p>
        Ces données servent <strong>uniquement</strong> à organiser et réaliser votre course, à vous contacter à son
        sujet et à tenir notre comptabilité. Elles ne sont jamais vendues ni utilisées à des fins publicitaires.
      </p>
      <p>
        La recherche d&apos;adresse et la carte utilisent les services OpenStreetMap (Nominatim, fonds de carte), Esri (fonds de carte et satellite) et OSRM : les termes
        recherchés et les positions leur sont transmis pour afficher les résultats et calculer l&apos;itinéraire.
      </p>

      <h2>Géolocalisation</h2>
      <p>
        Votre position n&apos;est utilisée que si vous touchez « Utiliser ma position », et seulement pour définir le
        point de départ de la course.
      </p>

      <h2>Durée de conservation</h2>
      <p>Les réservations sont conservées le temps nécessaire au suivi des courses et aux obligations comptables.</p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi sénégalaise n° 2008-12 sur la protection des données à caractère personnel, vous pouvez
        demander l&apos;accès, la rectification ou la suppression de vos données en nous écrivant sur WhatsApp.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site n&apos;utilise aucun cookie publicitaire ni de mesure d&apos;audience. Votre dernier numéro de
        réservation peut être mémorisé sur votre téléphone pour vous éviter de le ressaisir.
      </p>
    </div>
    </>
  );
}
