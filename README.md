# Studio Nails Pro

SaaS mobile-first per centri estetici (piano free): prenotazioni online senza account per le clienti, agenda quotidiana per l'operatore. Volutamente essenziale — niente automazioni, niente analytics — per sostituire carta/WhatsApp e preparare il passaggio al piano a pagamento.

Estetica beauty premium (crema / rosa cipria / bianco), layout responsive da iPhone a desktop. Base tipografica 16px su mobile, 20px da tablet e 22px su schermi larghi (`src/styles.css`).

## Funzionalità (piano free)

**Area pubblica (nessun account richiesto)**
- `/` — home editoriale: hero a tutto schermo con foto ad arco e badge rotante, nastro infinito dei trattamenti, portfolio asimmetrico, "prenoti in tre gesti", menu servizi, recensioni, CTA finale scura. Rivelazioni animate allo scroll (`Reveal` + IntersectionObserver)
- `/servizi` — listino con foto, prezzo e durata, CTA prenotazione per servizio
- `/prenota` — wizard a 4 step animati (uno visibile alla volta, avanzamento automatico alla scelta): 1 trattamento → 2 giorno → 3 orario in tempo reale → 4 dati (nome, telefono, email per la conferma, note). Barra di avanzamento, chip di riepilogo modificabili, senza footer per restare concentrata
- `/appuntamento/$token` — pagina di conferma con link personale per consultare, spostare o cancellare l'appuntamento (`manage_token` UUID)

**Dashboard operatore (login richiesto, 1 solo operatore)**
- `/dashboard` — agenda con viste giorno / settimana; unico dato: numero appuntamenti di oggi
- Nuovo appuntamento manuale (telefono / walk-in) con stessi controlli anti-overlap del booking pubblico
- Scheda appuntamento: cliente, telefono (tap-to-call), servizio, note — niente prezzi, niente fatturato
- Azioni: conferma, completa, cancella, sposta (data + ora)
- `/disponibilita` — orari settimanali con pausa, giorni di chiusura puntuali con motivo
- `/clienti` — rubrica base: ricerca per nome/telefono, numero visite, ultima visita
- `/gestionale` — solo Servizi (nome, prezzo, durata) e dati Attività; niente analytics, niente gestione utenti

**Notifiche**
- SOLO email di conferma prenotazione (via EmailJS, best-effort). Niente reminder, niente WhatsApp, niente follow-up.

**Limitazioni strategiche del free**
- 1 operatore, nessuna automazione, nessuna integrazione marketing, nessuna dashboard avanzata

## Stack

- **App:** TanStack Start + TanStack Router + React 19 + Vite 8
- **Dati:** Supabase (Postgres + Auth), React Query, server function TanStack (`src/lib/*.functions.ts`), validazione Zod
- **UI:** Tailwind CSS 4, shadcn/ui + Radix, lucide-react, sonner (toast)
- **Motion:** keyframes propri in `src/styles.css` (wizard direzionale, pop-in scaglionato, marquee, float, ken-burns, shimmer, ring-pulse) + rispetto di `prefers-reduced-motion`
- **Timezone:** tutto il calcolo slot in `Europe/Rome`, storage in UTC (`src/lib/time.ts`)

## Struttura

```
src/
  routes/                    # route TanStack Router
    index.tsx                # homepage pubblica
    servizi.tsx              # listino
    prenota.tsx              # booking senza account
    appuntamento.$token.tsx  # gestione appuntamento via token
    auth.tsx                 # login/registrazione staff
    _authenticated/          # area staff (guard: redirect a /auth se non loggato)
      dashboard.tsx          # agenda operatore (giorno/sett, creazione manuale)
      clienti.tsx            # rubrica base
      disponibilita.tsx      # orari + chiusure
      gestionale.tsx         # servizi + attività (solo owner)
  lib/
    booking.functions.ts     # serverFn pubbliche (service_role): studio, disponibilità, slot, CRUD via token
    email.server.ts          # SOLO server: invio email di conferma via EmailJS (best-effort)
    staff.functions.ts       # serverFn staff (JWT utente): agenda, clienti, regole, servizi, ruoli, settings
    time.ts                  # TZ Europe/Rome, STUDIO_ID, format price/duration/date
  integrations/supabase/     # client pubblico (anon), client server (service_role), middleware auth
  components/                # site-header, staff-shell, booking-calendar, ui/*
supabase/migrations/         # migrazione SQL canonica (tabelle + RLS + seed)
drizzle/                     # schema.ts + migrations mirror per drizzle-kit
public/                      # manifest.webmanifest, icone PWA, favicon, robots.txt
```

## Avvio rapido

Requisiti: Node.js 20+, un progetto Supabase.

```sh
npm i
cp .env.example .env   # poi compila i valori (vedi sotto)
npm run dev
```

Build / anteprima / qualità:

```sh
npm run build
npm run preview
npm run lint
npm run format
```

> Non riscrivere la history git pubblicata (no force-push / rebase su commit pushati): il repo è collegato a Lovable e la riscrittura fa perdere la history lato editor.

## Variabili d'ambiente

| Variabile | Dove | A cosa serve |
|---|---|---|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | server + client | URL progetto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | server + client | chiave anon/publishable |
| `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_...`) | solo server, mai nel client | prenotazioni pubbliche + bootstrap profili staff |
| `DATABASE_URL` | solo locale/CI | connection string Postgres per `drizzle-kit push/migrate` |
| `EMAILJS_SERVICE_ID` / `EMAILJS_TEMPLATE_ID` / `EMAILJS_PUBLIC_KEY` / `EMAILJS_PRIVATE_KEY` | solo server | sola notifica free: email di conferma (senza, la prenotazione funziona ma non parte l'email) |

Senza `SUPABASE_SERVICE_ROLE_KEY` le server function pubbliche rispondono con errore di configurazione.

## Database

Tabelle: `studios`, `profiles`, `user_roles` (`owner` | `artist`), `services`, `clients` (con `email`), `availability_rules` (orari settimanali + pausa), `closures` (giorni di chiusura), `appointments` (con `price_cents` snapshot, `status`, `manage_token`, `client_email`).

- Migrazione canonica: `supabase/migrations/20260906120000_studio_nails_core.sql` (include RLS + seed studio demo + servizi + orari).
- `supabase/migrations/20260907000000_saas_free_tier_email.sql`: aggiunge `clients.email` e `appointments.client_email` per la conferma via email.
- `drizzle/` è un mirror per chi usa drizzle-kit: prima di modificare lo schema, allineare le due cartelle per evitare drift.
- Studio seed: id fisso `11111111-1111-1111-1111-111111111111` (`STUDIO_ID` in `src/lib/time.ts`). Lo schema è già multi-tenant via `studio_id`, predisposto per futuri multi-artist / SaaS.

## Autenticazione e ruoli

- Clienti: nessun account, gestione via link con `manage_token`.
- Staff: Supabase Auth (email/password + Google) su `/auth`. Al primo accesso `ensureStaffProfile` crea profilo + ruolo: il primo utente in assoluto diventa `owner`, i successivi `artist`.
- Le route `/dashboard`, `/clienti`, `/disponibilita`, `/gestionale` richiedono login; il tab gestionale è visibile solo agli `owner` (controllo anche lato server in `setUserRole`).
- Le server function pubbliche usano `service_role` così i dati personali non sono mai esposti al ruolo `anon`.

## Logica prenotazioni

- Slot generati da `availability_rules` (apertura/chiusura/pausa) + `closures` + appuntamenti non `cancelled`, con passo `studios.slot_interval_minutes`.
- Anti-doppia-prenotazione via controllo overlap su `[starts_at, ends_at)` in creazione e spostamento.
- Il prezzo è copiato sul record al momento della prenotazione: cambi listino futuri non alterano lo storico.

## Compliance (GDPR, piano free)

- **Minimizzazione:** solo nome, telefono, email (facoltativa) e note. Niente dati sanitari (hint dedicato), niente profilazione, niente marketing.
- **Base giuridica:** esecuzione del servizio prenotato — nessun checkbox nel flusso; avviso non bloccante con link a Termini/Privacy prima della conferma.
- **Pagine legali:** `/privacy` (titolare = centro estetico, responsabile = piattaforma; diritti, conservazione UE, solo cookie tecnici) e `/termini` (uso, responsabilità limitata, nessuna garanzia uptime). Linkate da footer e prenotazione.
- **Cookie:** solo tecnici (sessione operatore), nessuna analytics → nessun banner.
- **Sicurezza:** HTTPS in produzione, Auth Supabase, dashboard protetta da login, isolamento per `studio_id`, RLS attiva su tutte le tabelle.
- **Diritti utente:** lo staff può eliminare definitivamente clienti (con i loro appuntamenti) e singoli appuntamenti; il cliente può cancellare dal link personale o chiedere cancellazione al titolare.
- **Email:** solo conferma, con riferimento privacy nel piè di pagina. Niente promozionali.

## Multisito: più frontend, stesso backend

Stesso codice, un deploy per sito. Ogni sito punta allo stesso progetto Supabase e serve uno studio diverso, con tema e brand propri — **zero env per-sito**.

- **Tenant runtime:** `src/lib/tenant.ts` risolve lo studio dall'hostname (match su `studios.domains`, altrimenti slug contenuto nell'host). Override `STUDIO_SLUG` solo per il locale. Lo slug non arriva mai dal client. Il primo utente *dello studio* diventa owner.
- **Tema runtime:** `studios.theme` (`nails` default, `estetica` = font Fraunces + palette salvia/botanico via `[data-theme]`), applicato pre-pittura da loader root. Nuova palette = solo override di token.
- **Brand runtime:** `studios.brand` (JSON: tagline, hero, CTA, rating, badge, didascalie) via context `useBrand()`; SEO dinamica con `useDocTitle()`. Servizi/orari/contatti già dal DB.
- **Email runtime:** link e nome studio derivati dalla request (`requestBaseUrl()`), non da `APP_URL`.
- **Deploy:** `vercel.json` contiene le env pubbliche condivise (solo `SUPABASE_SERVICE_ROLE_KEY` + `EMAILJS_*` da dashboard per progetto). Nuovo sito = riga in `studios` (theme/brand/domains) + nuovo progetto Vercel dallo stesso repo.
- **Isolamento:** ogni query è filtrata per `studio_id` + RLS. Nota: le policy di lettura pubblica (`services`, `availability_rules`, `closures`, `studios`) usano `using (true)`, quindi i listini sono leggibili cross-studio via API anon — accettabile (dati pubblici), da stringere se serve.
- **Foto:** per ora condivise tra i siti; shoot dedicato per vertical come step futuro.

## PWA

`public/manifest.webmanifest` + icone 192/512 (+ maskable) + `apple-touch-icon` + `theme-color`. Installabile da "Aggiungi a Home" su iPhone. Nessun service worker: niente funzionamento offline (miglioria futura, es. `vite-plugin-pwa`).

## Deploy

App Lovable live (legacy): https://studio-nails-pro.lovable.app — continua a funzionare dall'editor Lovable; ogni push sul branch collegato si sincronizza con l'editor, quindi tenere il branch in stato funzionante.
