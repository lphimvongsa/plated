# plated. frontend prototype

A responsive Next.js + TypeScript + Tailwind prototype for a collaborative dinner-party planning app. The design uses the supplied disposable-camera dinner photography and a playful vintage editorial visual system.

## Run locally

Prerequisites: Docker Desktop (for local Supabase).

```bash
npm install
npx supabase start
```

Copy the `API_URL` and `ANON_KEY` from `npx supabase status` into `.env.local` (see `.env.example`), then:

```bash
npm run dev
```

Open `http://localhost:3000`.

For a production build:

```bash
npm run build
npm start
```

## Main routes

- `/` — editorial marketing landing page
- `/auth/login` — email/password and Google OAuth (Supabase Auth)
- `/onboarding` — measurement, skill, and pantry setup (persisted)
- `/app` — account dashboard (live parties)
- `/app/parties/new` — party creation flow
- `/app/parties/[partyId]` — party overview and planning tabs (menu, recipes, guests, shopping, timeline, costs, settings)
- `/invite/[token]` — durable per-guest invitation + RSVP (no account) with Google Calendar / `.ics`

## Implemented in this slice

- Supabase Auth (email/password + Google OAuth hookup)
- Postgres schema, RLS, and invite RPCs (local via `supabase/`)
- Persisted onboarding, parties, menu, recipes, guests, shopping, timeline, costs
- Dynamic `/app/parties/[partyId]` routes replacing the hardcoded demo party
- Durable per-guest `/invite/[token]` pages (revisit + edit while active)
- Soft-expire 7 days after party end; `cleanup_expired_parties()` for 30-day hard-delete
- Google Calendar + `.ics` on invite pages
- Demo “Last Light Supper” seeded on first onboarding completion

## Still required for a functional production MVP

- Realtime collaboration
- Real recipe URL parsing, PDF extraction, image extraction, and normalization
- Reliable unit conversion and recipe scaling engine
- AI integrations for substitutions, cost estimation, kitchen analysis, dependency extraction, scheduling, and delegation
- Resend or equivalent email integration
- Twilio or equivalent SMS integration
- OCR and receipt reconciliation
- Production-grade offline caching and push notifications
- Automated testing, analytics, error monitoring, accessibility audit, privacy, and security work
- Hosted Supabase project + Google OAuth provider credentials in the dashboard

See `PRODUCT_SPEC.md` for the full product specification.
