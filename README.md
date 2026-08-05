# plated. frontend prototype

A responsive Next.js + TypeScript + Tailwind prototype for a collaborative dinner-party planning app. The design uses the supplied disposable-camera dinner photography and a playful vintage editorial visual system.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production build:

```bash
npm run build
npm start
```

## Main prototype routes

- `/` — editorial marketing landing page
- `/auth/login` — email/password and mocked Google authentication
- `/onboarding` — measurement, skill, and pantry setup
- `/app` — account dashboard
- `/app/parties/new` — four-step party creation flow
- `/app/parties/summer-table` — party overview
- `/app/parties/summer-table/menu` — menu builder, scaling, units, allergy substitutions, kitchen analysis
- `/app/parties/summer-table/recipes` — party cookbook and recipe import
- `/app/parties/summer-table/guests` — guest list and invitation flow
- `/app/parties/summer-table/shopping` — consolidated grocery list and pantry adjustments
- `/app/parties/summer-table/timeline` — dependency-aware task timeline and mocked recovery
- `/app/parties/summer-table/costs` — estimates, splits, and mocked receipt extraction
- `/invite/summer-table` — custom guest invitation and RSVP page

## Implemented in the frontend prototype

- Complete desktop and mobile layouts
- Editorial landing and invitation experiences
- Dashboard and party navigation
- Recipe import entry points for URL, text, PDF/image, and manual entry
- Portion scaling controls and US/metric display states
- Allergy warnings and explicit mocked substitution requests
- Menu structure, reordering, and mocked AI kitchen analysis
- Consolidated grocery list, pantry toggles, purchase tracking, and cost updates
- Guest RSVP states, allergy profiles, email/SMS send mock, and invitation preview
- Timeline completion, locking, delegation mock, and delay recovery mock
- Cost splitting and receipt extraction/matching mock
- PWA manifest, app icons, and a basic production service worker
- Supplied stock images optimized to WEBP and bundled locally

## Still required for a functional production MVP

- Supabase Auth and Google OAuth
- Database schema, persistence, row-level security, and realtime collaboration
- Real recipe URL parsing, PDF extraction, image extraction, and normalization
- Reliable unit conversion and recipe scaling engine
- AI integrations for substitutions, cost estimation, kitchen analysis, dependency extraction, scheduling, and delegation
- Resend or equivalent email integration
- Twilio or equivalent SMS integration
- Secure invitation tokens and RSVP persistence
- OCR and receipt reconciliation
- Production-grade offline caching and push notifications
- Automated testing, analytics, error monitoring, accessibility audit, privacy, and security work

See `PRODUCT_SPEC.md` for the full product specification.
