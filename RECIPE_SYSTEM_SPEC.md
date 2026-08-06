# plated. — Recipe System Specification

**Version:** 1.0  
**Date:** August 6, 2026  
**Status:** Locked decisions for implementation  
**Related:** Supersedes conflicting guidance in `PRODUCT_SPEC.md` §§7–8, §14–15, §17 for the recipe / import / shopping / timeline / cost slice described here. Broader product context remains in `PRODUCT_SPEC.md`.

---

## 1. Goals

Recipes are the source of structured cooking data that drives:

- Scaled shopping lists
- Party timelines (task-level bars with steps inside)
- Cost estimates

This document defines ownership, import, storage, scaling, shopping regeneration, timeline sync, and cost behavior for v1.

---

## 2. Recipe ownership model

### 2.1 Two separate recipe worlds

| World | Purpose | Route (indicative) |
|--------|---------|----------------------|
| **Cookbook recipe** | User’s reusable library | `/app/recipes/[id]` |
| **Party recipe** | Party-specific copy used by menu, shopping, timeline, costs | `/app/parties/[partyId]/recipes/[id]` |

Cookbook and party recipes are **separate rows**. List UIs (cookbook grid, party recipes tab, menu) link to the appropriate **full recipe detail/edit page**.

### 2.2 Adding a cookbook recipe to a party

1. Create a **party copy** of the recipe (ingredients, tasks with steps, equipment, times, image, etc.).
2. Store `cookbook_recipe_id` on the party copy pointing at the parent cookbook recipe.
3. Edits on the party copy are **local to the party** until the host explicitly pushes them.

### 2.3 Update cookbook

- Party recipe detail/edit exposes **Update cookbook**.
- Push **only fields that differ** from the parent (diff-based overwrite of changed fields only).
- Unchanged parent fields stay as-is.

### 2.4 Recipes that start on a party

If a recipe is created/imported on a party and was not already in the cookbook:

1. Save a **cookbook** recipe, and
2. Save the **party copy** linked to it,

in one save after review (see import flow).

### 2.5 Import entry points

| Entry point | Result |
|-------------|--------|
| Party recipes / party import | Cookbook recipe + party copy |
| Global cookbook import | Cookbook recipe only; added to a party later via menu |

---

## 3. Party servings (single source of truth)

- Each party has **one host-set serving size**.
- It is easy to edit in party settings / planning UI.
- It does **not** change automatically with RSVPs.
- **Every menu dish scales to this same number** (no per-dish serving override in this slice).
- Cookbook / base recipe `servings` are unchanged unless the user edits that recipe explicitly.
- When a recipe is first copied into a party (or created and also saved to cookbook), the cookbook row keeps the **initial servings at add/import time**; the party uses party serving size for scaling display and downstream systems.

---

## 4. Recipe data model (logical)

### 4.1 Recipe fields (store and show in editor)

All of the following are in scope for the detail/edit page:

- Title, description, image, source URL (URL imports only; no author/site name required)
- Servings (base recipe servings)
- Prep time, cook time, total time as available
- Difficulty, cuisine, course, dietary tags, allergy tags
- Ingredients (see below)
- Instructions as **named tasks containing ordered steps** (see §4.3 / §6)
- Required equipment
- Make-ahead, storage, reheating, personal notes
- Pantry-related flags on ingredients
- Coarse and/or rolled-up `estimated_cost` (see §9)
- Import completeness status (e.g. complete vs incomplete draft)

### 4.2 Ingredients

Each ingredient supports:

- Canonical name
- Quantity (numeric; required — vague/unitless source amounts are forced to a best-estimate number at import)
- Canonical unit (see §5)
- Optional **secondary measurement** (quantity + unit) when preferred display conflicts with stored/original dimension (e.g. volume vs weight)
- Preparation note
- Section / group (preserved in v1, e.g. “For the dressing”)
- Category (for shopping grouping)
- Allergen tags
- Pantry flag
- Sort order
- Estimated unit cost (from price table / AI fill; see §9)

### 4.3 Tasks and steps (on the recipe)

Recipes store **tasks** (e.g. Prep Work, Make the Chowder). Each task contains ordered **steps**.

- Steps live in `recipe_steps` with a `task` name, title, description, `duration_minutes`, and sort order.
- The party timeline shows **one bar per task** (duration = sum of its steps). Steps appear only when opening that task.
- Dependencies are sequential order only in v1.

AI may **split or merge** source instruction lines into steps under tasks at import. Durations are set at import (and editable later). **Task/step durations do not scale with party serving size.**

---

## 5. Units and display preferences

### 5.1 Canonical units

- Persist ingredients in a **canonical unit system** with reliable US ↔ metric conversion (e.g. cup ↔ ml).
- Do **not** simplify to “nice” cooking fractions (no forcing `1.37 cups` → `1½ cups`).

### 5.2 User preferences

- Preferred measurement **system**: US customary vs metric (existing onboarding direction).
- Preferred **dimension**: volume vs weight (new user preference).

### 5.3 Display rules

- UI displays the host’s preferred system and volume/weight preference.
- When conversion between volume and weight is unavailable or conflicting for an ingredient, store a **secondary measurement** so the original is not lost; still **display** the preferred measurement when possible.
- Weight ↔ volume conversion only when density (or equivalent) is known for that ingredient; otherwise keep the stored dimension and expose the secondary/original.

---

## 6. Recipe import

### 6.1 v1 sources

| Source | v1 |
|--------|----|
| Manual entry | Yes |
| Paste plain text | Yes |
| URL | Yes |
| PDF upload | Yes |
| Photo / screenshot | No |

### 6.2 Pipeline (hybrid)

1. **Fetch / read on the server** (never rely on the browser to scrape arbitrary URLs).
2. **Structured data first** — JSON-LD / schema.org `Recipe` (and similar) when present.
3. **AI for normalization and gaps** — canonical names/units, vague amounts → numbers, ingredient sections, split/merge into timed tasks/steps, fill missing fields.
4. **PDF** — use text extraction; image-only scans with no usable text land as incomplete drafts (photos-of-recipes are out of v1).

Provider is behind a server adapter; do not hard-wire a vendor into the schema.

### 6.3 Quality gate (sites that “parse cleanly” + salvage)

| Outcome | Behavior |
|---------|----------|
| No recipe signal (paywall, empty, non-recipe) | **Hard fail** — do not create a draft |
| Partial extract | **Incomplete draft** — salvage what was extracted; mark incomplete; user cleans up |
| Full structured / high-quality extract | Normal **review** screen → user edits → save |

- Block **paywalled** (and similarly unusable login-walled) URLs.
- Store **`source_url` only** on save (no separate source site/author field required).

### 6.4 Review → save

1. User submits source (or opens manual form).
2. Show **draft recipe editor**: title, servings, ingredients + units, tasks with steps + durations, equipment, times, image, etc.
3. User edits freely.
4. Save per §2.4 / §2.5.

Import is **one-shot**. There is no “refresh from URL.” Later edits are manual (plus **Update cookbook** from a party copy).

### 6.5 Minimum successful import shape

Before treating an import as complete (incomplete drafts may lack some of these):

- Title + servings
- Ingredients with quantity + canonical unit (sections when present)
- Steps grouped under named tasks with durations
- Total prep time (and cook/total when available)
- Equipment when available

### 6.6 Images

- Pull hero image from URL when possible.
- User may upload a different recipe image.
- Retain only the **chosen** recipe image.
- Do **not** retain source PDFs (or other extract-only uploads) after extraction.

### 6.7 Vague amounts

Always map to canonical name + unit. Force a numeric quantity with a best estimate when the source is unitless or vague (“a handful”, “to taste” → estimated number + unit, editable in review).

---

## 7. Shopping list

### 7.1 Generation timing

- Generate / regenerate when the **Shopping** tab is opened **and** the party shopping list is **dirty**.
- Do not continuously regenerate in the background.

### 7.2 Dirty triggers

Shopping is dirty when:

- Menu add / remove
- Party serving size change
- Party recipe **ingredient** edits

(“Update cookbook” alone does not dirty shopping if the party copy is unchanged.)

### 7.3 Preserve on regenerate

When regenerating from menu recipes:

- Preserve **purchased**, **already owned**, and **actual cost** for matching lines where possible.
- **Manual grocery lines** (not derived from a recipe) are kept forever across regenerations.

### 7.4 Display

- Consolidate ingredients across dishes using canonical identity.
- Each grocery row shows **which dishes** require it.
- Group by ingredient category.
- Pantry / already-owned handling feeds cost exclusion (§9).

---

## 8. Timeline

### 8.1 Derivation

- **Imported recipes:** derive tasks + steps from instructions at import (AI may split/merge; each step gets `duration_minutes`; grouped under a `task` name).
- **Manual recipes:** host can enter tasks and steps in the recipe editor; can also create dish-scoped steps from the timeline (§8.3).
- Party timeline rows are one bar per recipe **task** (+ unscoped manual tasks), scheduled against the party.

### 8.2 Sync on Timeline open

Use stable IDs so description-only edits do not imply a schedule rebuild.

| Change type | UX |
|-------------|----|
| Description / title-only changes on existing task IDs | **Auto-apply** when Timeline is opened (no confirm banner) |
| Insertions, deletions, duration / time changes | Show **confirm banner** (“timeline out of date — update?”) before applying |

On accepted structural sync:

- Update duration/schedule for existing task bars
- Add timeline bars for new recipe tasks
- Remove timeline bars whose recipe tasks were deleted
- Leave **unscoped** manual timeline tasks untouched

Serving size changes may mark timeline dirty for scheduling review, but **do not scale task durations**.

### 8.3 Bidirectional dish-scoped manual tasks

1. In the **Timeline** tab, the host can create a manual step and mark it as belonging to a **specific dish** (party recipe) and task.
2. That step is **written into that party recipe’s `recipe_steps`** and appears in the recipe editor.
3. If the host later edits or deletes it in the **recipe editor**, Timeline picks this up on next open (auto for description-only; banner for insert/delete/time).
4. Manual timeline items **without** a dish stay timeline-only and are never stored on a recipe.

Cookbook parent recipes are not updated by timeline edits unless the host uses **Update cookbook**.

### 8.4 Initial materialization

When a recipe is on the party menu, its tasks are available to the party timeline. First open / add-to-menu should create one timeline bar per recipe task; subsequent opens use the dirty/sync rules above.

---

## 9. Costs

### 9.1 Approach

- Currency: **USD only** for v1.
- Maintain an **ingredient price table** (canonical ingredient key → estimated unit price). Prefer DB/cache over a giant checked-in JSON.
- On miss: one AI (or mocked) estimate → **write back** into the price table.
- Recipe cost = sum of (scaled ingredient quantities × unit prices) for items not excluded.
- When party servings ≠ recipe base servings, **linearly scale** the estimate.
- Persist/display coarse `recipe.estimated_cost` as the rolled-up figure as needed by UI.

### 9.2 Exclusions

Omit from estimated cost:

- Ingredients flagged as pantry (as product rules dictate), and/or
- Grocery lines marked **already owned**

(Aligned with: already owned / pantry-flagged items removed from estimate.)

### 9.3 Out of scope for this slice

- Multi-currency
- Receipt OCR reconciliation (still future per product spec)
- Per-guest cost splitting polish beyond existing product directions

---

## 10. Editor and navigation scope

- Ship a **full recipe detail/edit page** (not modal-only).
- Party Recipes and Cookbook cards/rows are links into that page (party vs cookbook route).
- Store the full field set in §4 in the editor even if some surfaces show a subset.

---

## 11. Explicit non-goals (this slice)

- Photo / screenshot recipe import
- Re-import / refresh-from-URL
- RSVP-driven serving size changes
- Per-dish serving overrides
- “Nice” unit rounding / culinary fraction simplification
- AI-first HTML scraping without structured-data preference
- Retaining source PDFs after extract
- Task duration scaling with servings
- Auto-rewriting cookbook recipes when party copies change (must use Update cookbook)

---

## 12. Implementation notes (schema deltas to expect)

Indicative; exact migration names/columns to be decided in implementation:

- Distinguish cookbook vs party recipes (`party_id`, `cookbook_recipe_id` / parent link).
- Party-level `serving_size` (host-owned).
- Ingredient sections; canonical unit; optional secondary quantity/unit; unit cost fields.
- `recipe_steps` on recipes with stable IDs, durations, and a `task` name grouping steps into timeline bars.
- Party `tasks`: one bar per recipe task (`task` name + optional `recipe_id`); support unscoped manual tasks.
- Grocery lines: provenance to dishes/recipes; dirty flag or content hash for shopping regen; preserve manual rows and purchase/owned/actual fields.
- User prefs: measurement system + volume vs weight.
- `ingredient_prices` (USD) table with AI-backfill path.
- Import job metadata: source type, `source_url`, completeness status.

---

## 13. Decision log (summary)

| Topic | Decision |
|-------|----------|
| Cookbook vs party | Separate copies; party edits local; Update cookbook = diff push |
| New party recipe | Also added to cookbook |
| Servings | One host party size; all dishes scale to it; not RSVP-linked |
| Import sources | Manual, text, URL, PDF |
| Extract | Structured first, AI normalize/gaps |
| Quality gate | No signal → fail; partial → incomplete draft; full → review |
| Tasks / steps | Tasks group steps on recipe; timeline shows tasks; no duration scaling |
| Timeline sync | Auto description; banner for insert/delete/time |
| Dish-scoped manual tasks | Timeline ↔ party recipe bidirectional |
| Shopping | Dirty regen on tab open; preserve purchased/owned/actual; manual forever; show dishes |
| Units | Canonical; host system; volume/weight pref; secondary measure on conflict; no nice rounding |
| Cost | USD price table + AI miss fill; linear scale; exclude pantry/already owned |

---

## 14. Next implementation slices (suggested order)

1. Schema + types for recipes, ingredients, recipe steps/tasks, party serving size, prices, dirty flags  
2. Recipe detail/edit pages (cookbook + party) and list links  
3. Manual create + paste-text import path through review/save  
4. URL (structured + AI) and PDF import with quality gate  
5. Menu ↔ party copy, Update cookbook  
6. Shopping dirty regen + dish provenance  
7. Timeline materialization + sync banner / auto description  
8. Cost rollup from price table  

---

*End of recipe system specification.*
