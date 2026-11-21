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
  (`public_create_booking`, `public_get_booking`, `public_cancel_booking`, `public_get_busy`, `public_get_settings`).
  Ces fonctions exigent un **jeton serveur** (`SERVER_RPC_TOKEN`), connu uniquement de Vercel et de la base.
- L'admin est un utilisateur Supabase Auth inscrit dans la table `admins` ; les politiques RLS lui donnent accès à tout.
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

| Nom | Où la trouver | Secret ? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | non |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → clé `anon` / *publishable* | non (publique par conception) |
| `SERVER_RPC_TOKEN` | SQL : `select server_token from private.app_secrets;` | **oui** (type *Sensitive* sur Vercel) |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site, ex. `https://luxus-asaad.vercel.app` | non |
| `IP_HASH_SALT` | facultatif : chaîne aléatoire (sinon le jeton serveur sert de sel) | oui |

Aucune clé `service_role` n'est nécessaire. Ne mettez jamais de secret dans le code : uniquement dans Vercel
(Project → Settings → Environment Variables) ou dans `.env.local` (ignoré par git).

Pour changer le jeton serveur :
```sql
update private.app_secrets set server_token = encode(gen_random_bytes(32), 'hex');
select server_token from private.app_secrets;
```
puis mettre la nouvelle valeur dans Vercel et redéployer.

## Créer le compte admin

1. Supabase → **Authentication → Users → Add user → Create new user** : votre email + un mot de passe solide,
   cochez **Auto Confirm User**.
2. Supabase → **SQL Editor**, exécutez (avec votre email) :
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'votre-email@exemple.com';
   ```
3. Recommandé : Authentication → Sign In / Providers → désactivez **Allow new users to sign up**
   (même sans cela, un compte non listé dans `admins` n'a accès à rien).
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
