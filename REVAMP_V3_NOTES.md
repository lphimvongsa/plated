# Plated Revamp V3 — correction pass

This iteration repairs the V2 regressions while preserving the performance and interaction work that was already working.

## What changed

- Party palettes now theme the entire Plated app shell while a party is active, then transition smoothly back to the default Plated palette when leaving that party.
- The invitation keeps the original full experience: hero/introduction, menu, dress code, items to bring, RSVP, plus-one count, dietary preference, allergies, notes, calendar links, and footer.
- Invitation menu items are populated from the real party menu. Invite-only title/description overrides do not rename the underlying recipes.
- Invitation photos use a real non-destructive crop editor. Cover-photo crops and invitation-photo crops are stored separately.
- Cookbook search again uses the animated modular recipe-index overlay.
- "Whole recipe" fans every physical cookbook page horizontally at its normal page size. Long recipes scroll sideways only; the pages do not stack or shrink.
- Timeline zoom is continuous (1–12 visible hours) with +/- controls and trackpad pinch / Ctrl-or-Cmd + wheel zoom. Hash marks adapt with zoom: fine 5/10-minute detail close in, then 10/30, 15/30, and 30/60-minute detail farther out.
- Timeline recipe groups are tinted by recipe color. Delegation helper containers are tinted by helper color, while their recipe rows are tinted by recipe color.
- Recipe, delegation, and timeline tasks all open the same compact anchored task inspector. Timeline task X buttons were removed; unscheduling and unassignment live in the inspector.
- Party cover crops are now respected on the party overview and party list.

## Database migration

Apply the new Supabase migration before deploying this revision against an existing database:

```bash
npx supabase db push
```

The migration adds non-destructive crop metadata and invite-only menu copy overrides, and updates `get_invite_by_token` so the public invitation receives those values while retaining the full original invitation payload.

## Validation

`npm run typecheck` passes with no TypeScript errors.

A full `next build` could not run in the editing environment because the uploaded dependency tree contains the Windows Next.js SWC binary and the environment cannot access npm to download the Linux SWC package. Vercel will install platform-correct dependencies from `package-lock.json` during deployment.
