# Plated Revamp V4 — Mobile, Timeline, Receipts & Allergies

This iteration is based on the latest user-edited source archive and focuses on stabilization rather than redesign.

## Mobile standardization
- Normalized page overflow and responsive sizing across authenticated views.
- Added a dedicated mobile guest-card layout instead of forcing the desktop guest table off-screen.
- Made costs, receipt review, invitation RSVP, and timeline controls responsive down to 375px.
- Inputs use mobile-safe sizing to avoid iOS focus zoom.
- Timeline keeps a compact helper rail while the time canvas pans horizontally.

## Timeline
- Ruler labels and hash marks are positioned from the same time-to-pixel axis, so labels are centered on their hashes.
- Adaptive detail by zoom level:
  - close (~1h): 5-minute hashes, 10-minute labels
  - ~3h: 10-minute hashes, 30-minute labels
  - medium: 15-minute hashes, 30-minute labels
  - wide: 30-minute hashes, hourly labels
- Trackpad pinch / Ctrl-or-Cmd + wheel zoom is pointer-anchored: the time under the pointer remains under the pointer after zoom.
- Existing drag/drop, live now line, dinner line, panning, and Jump to now behavior are preserved.

## Receipt scanning
- Shopping and Costs include **Scan receipt**.
- Desktop supports **Upload photo** and **Use camera**; mobile can use the camera or photo library through the same flow.
- Camera mode includes a receipt fitting guide and capture/retake workflow.
- Receipt images are sent to the configured AI model for structured extraction.
- Receipt names and grocery names are normalized, then matched using AI plus deterministic fuzzy matching.
- Confident matches are preselected; uncertain matches are highlighted for review.
- Before saving, the host can edit item names, prices, grocery matches, and whether each item should be marked bought.
- Applied items mark grocery rows purchased and add the full receipt line price to actual cost.
- Receipt history and parsed line items are stored in Supabase.

## Invitation photos
The existing invitation format is preserved while supporting all five photo slots:
1. Overview primary
2. Overview detail
3. Menu photo 1
4. Menu photo 2
5. RSVP photo

Sections reflow when fewer than five photos are selected rather than leaving blank placeholders.

## Structured allergies
- Added canonical allergen support for Milk/Dairy, Egg, Fish, Crustacean Shellfish, Tree Nuts, Peanut, Wheat, Soy, Sesame, and Gluten.
- Recipe AI import is instructed to infer allergens from ingredient identity (for example tofu → Soy and tahini → Sesame).
- Deterministic inference supplements AI output for common ingredients.
- Existing ingredient rows are backfilled for common allergen relationships by the migration.
- RSVP allergy entry is now menu-aware autocomplete instead of unrestricted free text.
- Guests can search by allergen or by actual menu ingredient. Ingredient suggestions show derived allergens (for example **Tofu — Contains Soy**).
- Choosing an ingredient also stores its derived canonical allergens so recipe conflicts can be detected reliably later.
- The party Menu page surfaces guest allergy conflicts using ingredient names and canonical allergen tags.

## Required deployment step
Apply the new database migration before testing receipts/allergy autocomplete:

```bash
npx supabase db push
```

Receipt parsing also requires the same AI configuration used by recipe parsing:
- `AI_API_KEY`
- optional `AI_BASE_URL`
- optional `AI_MODEL`

The receipt camera requires a secure browser context (HTTPS), which Vercel provides.

## Validation
- `npm run typecheck` passes.
- Tailwind successfully compiles `app/globals.css`.
- A full `next build` could not be completed in the editing sandbox because the uploaded dependency bundle contains a Windows Next.js SWC binary while the sandbox is Linux and cannot access npm to download the Linux binary. A normal Vercel install resolves platform-specific SWC dependencies.
