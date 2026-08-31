# Plated revamp v2

This iteration includes:

- Timeline task widths proportional to duration, scrollable task rails, helper-color outlines, editable helper/recipe colors, one-row-per-helper delegation grouped by recipe, ordered task execution, 5-minute snapping, zoom-aware time hashes, Jump to now, and Undo.
- Party cover upload/selection/focal-point controls in creation and settings.
- Ten synchronized party/invitation color schemes with smooth in-party theme transitions.
- Invitation draft editor with live preview, editable copy, 1–5 reorderable photos, photo focal points, and theme editing before invitations are sent.
- Two-page, viewport-fitted cookbook with fixed recipe positions, image/title cover pages, magazine-style ingredient + method pages, forward/back search travel, and fanned physical pages for Whole Recipe.

## Existing Supabase project

Apply migrations before using the build:

```bash
npx supabase db push
```

The newest migration creates the `party-media` storage bucket and adds the party/invitation/cookbook fields required by this UI.
