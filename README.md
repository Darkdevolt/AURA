# Luxus Asaad — Réservation VTC à Dakar

Site de réservation de courses pour **Luxus Asaad** (VTC électrique, Dakar).
Mobile-first, en français, sans paiement en ligne (paiement à la fin de la course : espèces, Wave, Orange Money).

- **Stack** : Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth) · Leaflet/OpenStreetMap · Nominatim · OSRM · Vercel
- **Fuseau horaire** : tout est calculé et affiché en `Africa/Dakar` (UTC+0).

## Fonctionnalités

**Client**
- Départ : « Utiliser ma position », recherche d'adresse (Nominatim, Sénégal uniquement, 1 requête/s max) ou repère sur la carte ; champ « Repère / indications ».
- Destination : recherche ou carte.
- Estimation distance / durée / prix (OSRM, repli : vol d'oiseau × 1,3 à 20 km/h).
- Créneaux de 30 min disponibles uniquement (lun.–sam., 8h–20h, ≥ 60 min à l'avance, ≤ 14 jours).
- Confirmation avec numéro `LA-0001` et bouton « Envoyer sur WhatsApp » (message prérempli + lien Google Maps du départ).
- « Ma réservation » : consulter / annuler avec numéro + téléphone.

**Admin (`/admin`)**
- Tableau de bord du jour (liste + vue chronologique), navigation par date, réservations « à confirmer ».
- Par réservation : appeler, WhatsApp, Google Maps, Waze, statut, prix payé, moyen de paiement.
- Plages bloquées (recharge, pause, jour off).
- Réglages : tarifs, forfait AIBD, horaires, jours, nombre de véhicules, numéros, anti-spam.
- Export CSV (séparateur `;`, s'ouvre directement dans Excel).
- Statistiques : courses terminées et chiffre d'affaires du jour, de la semaine, du mois.

## Règles métier

| Règle | Valeur par défaut (modifiable dans Réglages) |
| --- | --- |
| Prise en charge | 500 FCFA |
| Prix par km | 300 FCFA |
| Course minimum | 1 000 FCFA |
| Arrondi | aux 100 FCFA supérieurs |
| Forfait Aéroport AIBD | 15 000 FCFA (si départ ou arrivée à moins de 3 km de l'AIBD) |
| Durée bloquée par une course | durée estimée + 30 min d'approche + 15 min de marge |
| Délai minimum / maximum | 60 min / 14 jours |
| Véhicules | 1 (un créneau est libre si le nombre de courses simultanées < nombre de véhicules) |

La disponibilité est vérifiée **côté serveur** à l'enregistrement, dans une fonction Postgres protégée par un verrou
(`pg_advisory_xact_lock`), ce qui rend les doubles réservations impossibles même en cas de clics simultanés.
Le prix et la durée sont **recalculés côté serveur** : le navigateur ne peut pas les modifier.

## Sécurité

- RLS activé sur toutes les tables. Le rôle public (`anon`) **n'a aucun accès direct** aux tables.
- Le public passe par des routes serveur Next.js (`/api/...`) qui appellent des fonctions Postgres `SECURITY DEFINER`
  (`luxus_create_booking`, `luxus_get_booking`, `luxus_cancel_booking`, `luxus_get_busy`, `luxus_get_settings`).
  Ces fonctions exigent un **jeton serveur** (`SERVER_RPC_TOKEN`), connu uniquement de Vercel et de la base.
- Tous les objets de base de données sont préfixés `luxus_` (schéma secret : `luxus_private`) : l'application peut partager un projet Supabase avec une autre sans conflit.
- L'admin est un utilisateur Supabase Auth inscrit dans la table `luxus_admins` ; les politiques RLS lui donnent accès à tout.
- Anti-spam : champ caché (pot de miel), limite de réservations actives par numéro (3) et par connexion IP sur 24 h (6).
  L'IP n'est jamais stockée en clair (empreinte SHA-256 salée).

## Installation locale

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
npm test                     # tests des créneaux, des prix et du téléphone
npm run build                # build de production
```

### Base de données

Appliquer dans l'ordre `supabase/migrations/0001_init.sql` puis `0002_contact_lines.sql` sur le projet Supabase (SQL Editor → coller → Run, ou `supabase db push`).

## Variables d'environnement

**Une seule variable est obligatoire** sur Vercel (Project → Settings → Environment Variables) :

| Nom | Où la trouver | Secret ? |
| --- | --- | --- |
| `SERVER_RPC_TOKEN` | SQL : `select server_token from luxus_private.app_secrets;` | **oui** (type *Sensitive*) |

Facultatives (des valeurs par défaut sont dans `lib/env.ts`) :

| Nom | Valeur par défaut |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase utilisé |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé *publishable* du projet (publique par conception) |
| `NEXT_PUBLIC_SITE_URL` | `https://luxus-asaad.vercel.app` |
| `IP_HASH_SALT` | le jeton serveur sert de sel |

Aucune clé `service_role` n'est nécessaire. Ne mettez jamais de secret dans le code.

## Créer le compte admin

1. Supabase → **Authentication → Users → Add user → Create new user** : votre email + un mot de passe solide,
   cochez **Auto Confirm User**.
2. Supabase → **SQL Editor**, exécutez (avec votre email) :
   ```sql
   insert into public.luxus_admins (user_id)
   select id from auth.users where email = 'votre-email@exemple.com';
   ```
3. Recommandé : Authentication → Sign In / Providers → désactivez **Allow new users to sign up**
   (même sans cela, un compte non listé dans `luxus_admins` n'a accès à rien).
4. Connectez-vous sur `/admin/login`.

## Modifier les tarifs, horaires et numéros

Connectez-vous à `/admin` → **Réglages**. Les changements s'appliquent immédiatement (estimation, créneaux, WhatsApp).
**Premiers réglages à faire :**
- les lignes « Appeler pour réserver » (ex. « Asaad 1 » + son numéro ; ajoutez « Asaad 2 » le jour où une deuxième voiture arrive) ;
- la case « WhatsApp » de chaque ligne : la première ligne WhatsApp reçoit les réservations (par défaut Asaad 1 : +221 77 296 64 62).

Pour passer à 2 ou 3 voitures : Réglages → « Nombre de véhicules ».

## Logo et couleurs

- `public/logo.png` : logo d'origine (fond transparent), pour fond clair
- `public/logo-light.png` : logo en version claire pour fond noir (pied de page)
- `public/logo-mark-light.png` : lion + couronne, version claire (en-tête) ; `public/lion-light.png` : filigrane de l'accueil
- `app/icon.png`, `app/apple-icon.png` : favicon et icône d'écran d'accueil
- `app/opengraph-image.jpg` : image affichée quand on partage le lien (WhatsApp, Facebook…)
- Police : **Goldman** (celle du logo), chargée via `next/font` dans `app/layout.tsx`
- Palette noir / blanc / or tirée du logo : variables `--color-*` et dégradés `--gold-grad` / `--ink-grad` en haut de `app/globals.css`

## Structure

```
app/                 pages (accueil, ma-reservation, a-propos, contact, mentions-legales, admin) et routes API
components/          formulaire de réservation, carte, recherche d'adresse, composants admin
lib/                 logique métier : slots.ts (créneaux), pricing.ts (prix), time.ts (fuseau), phone.ts, geo.ts…
supabase/migrations  schéma SQL, RLS et fonctions
tests/               tests Vitest
```

---

## V2 : finances, flotte, chauffeurs, suivi, notifications

### Finances (admin uniquement)
- **/admin/finances** : chiffre d'affaires, dépenses, bénéfice, marge, recette et coût au km, comparaison avec le mois
  précédent, évolution sur 6 mois, dépenses par catégorie, rentabilité et remboursement de chaque véhicule.
- **/admin/depenses** : saisie des dépenses (recharge, entretien, salaire…) et des revenus hors site (Yango, clients
  directs). **Scanner un reçu** : photo d'un ticket, d'une facture, d'une capture Wave / Orange Money ou d'un relevé
  Yango → montant, date, catégorie remplis automatiquement par Claude. La photo est conservée (stockage privé).
- Les courses réservées sur le site et terminées sont comptées automatiquement (prix payé, sinon prix estimé).

**Activer la lecture automatique des reçus** : créer une clé sur https://console.anthropic.com (Settings → API Keys,
ajouter quelques dollars de crédit), puis dans Vercel ajouter `ANTHROPIC_API_KEY` (type *Sensitive*) et redéployer.
Coût indicatif : quelques FCFA par photo (modèle `claude-opus-5-5`, effort `low`). Sans clé, la photo est seulement
enregistrée et la saisie se fait à la main.

### Flotte et chauffeurs (/admin/flotte)
- Véhicules : nom (Asaad 1, Asaad 2…), immatriculation, modèle, prix et date d'achat (pour le suivi du remboursement).
  Le nombre de véhicules **en service** fixe automatiquement le nombre de courses simultanées possibles.
- Chauffeurs : nom, téléphone, véhicule, **code de connexion** (4 à 8 chiffres, stocké sous forme d'empreinte).
- Chaque réservation peut être attribuée à un véhicule et à un chauffeur depuis le tableau de bord.

### Page chauffeur (/chauffeur)
Connexion téléphone + code. Le chauffeur voit ses courses des 7 prochains jours (et celles non attribuées), appelle
ou écrit au client, ouvre Waze / Maps, passe la course en « acceptée », « client à bord », « terminée » (prix et moyen
de paiement) ou « client absent », et **partage sa position** pendant la course.

### Suivi client (/suivi/LA-0001?k=…)
Lien secret propre à chaque réservation, affiché sur l'écran de confirmation, dans « Ma réservation », dans le message
WhatsApp, et envoyé par l'admin avec le bouton « Confirmer + lien de suivi ». Le client voit le chauffeur, le véhicule,
sa position sur la carte et un temps d'arrivée estimé.

### Espace client
Dans « Ma réservation », après avoir saisi un numéro de réservation et le téléphone, le client voit tout son historique
et peut **réserver à nouveau** le même trajet en un geste. Prénom et téléphone sont mémorisés sur son téléphone.

### Notifications des nouvelles réservations
- **Gratuit, actif** : application **ntfy** (Android / iPhone) → s'abonner au sujet affiché dans Réglages.
- **WhatsApp automatique** (Meta WhatsApp Cloud API, payant à l'usage, compte Meta Business vérifié) : définir
  `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_NOTIFY_TO` (ex. `221772966462`) et faire approuver un modèle
  `nouvelle_reservation` en français à 5 paramètres (référence, nom, date, départ, prix) ; `WHATSAPP_TEMPLATE` pour un
  autre nom.

### Paiement Wave en ligne (désactivé tant que le compte n'existe pas)
Avec un compte **Wave Business** et l'accès API : définir `WAVE_API_KEY` et `WAVE_WEBHOOK_SECRET` dans Vercel, et
déclarer chez Wave le webhook `https://luxus-asaad.vercel.app/api/webhooks/wave` (événement
`checkout.session.completed`). Le bouton « Envoyer un lien Wave » apparaît alors sur chaque réservation ; le paiement
reçu marque la course payée automatiquement.

### Variables d'environnement V2 (toutes facultatives)
| Nom | Rôle |
| --- | --- |
| `ANTHROPIC_API_KEY` | Lecture automatique des reçus |
| `WAVE_API_KEY`, `WAVE_WEBHOOK_SECRET` | Paiement Wave |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_NOTIFY_TO`, `WHATSAPP_TEMPLATE` | Notification WhatsApp automatique |

Migration SQL correspondante : `supabase/migrations/0003_v2_flotte_finances.sql`.
