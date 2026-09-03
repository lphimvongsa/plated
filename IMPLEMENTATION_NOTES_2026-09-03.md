# plated. prototype update — 2026-09-03

Implemented in this source ZIP:

## Invitation and sharing
- Invitation and Party Settings use the full available page height.
- Invitation photos use four direct placement slots: one Overview photo, Menu left, Menu right, and RSVP bottom.
- The single Overview photo uses the same dimensions/treatment as the previous Overview Wide design (`h-[610px]`, `md:h-[730px]` in the guest invitation; matching 470px editor preview).
- Menu left remains a Polaroid but its frame is 25% smaller than before; Menu right is unchanged.
- Every invitation image uses the Polaroid treatment without a photo glow.
- Every invitation photo has its own editable Polaroid caption, stored alongside crop metadata.
- Legacy Overview Wide/Overview Right assignments normalize into the one Overview slot; legacy Menu Wide normalizes into Menu left.
- Guest invitation delivery is group-link only. Host email/text send controls and per-guest/private link flows are removed.
- Apple/Outlook/.ics invitation UI remains removed. Google Calendar remains available.

## Timeline
- Time is on the Y axis and helpers are columns across the X axis.
- The viewport shows approximately four hours of timeline at once, but the underlying board is scrollable.
- The board begins 24 hours before dinner and continues through the saved dinner end time plus one additional hour.
- It initially opens on the four hours leading into dinner; users can scroll backward or forward across the full range.
- Drops snap to five-minute increments, dashed five-minute guides remain visible, and a dashed drag silhouette previews the landing position.
- Server-side and client-side validation reject helper overlaps across the full timeline range.
- Auto Place can use the full 24 hours before dinner while still packing tasks backward from dinner.
- Scheduled task bars are rounded and display only the task name.
- Clicking a pool task or scheduled task opens its detailed task view.
- Task-pool cards are recipe-colored, with an All tab plus a color-matched tab for each recipe.
- Recipe colors and helper colors are editable.
- Reset Timeline clears scheduled times while preserving helper assignments.

## Recipe/task duration scaling
- Added `base_duration_minutes` and `duration_scaling_mode` to party timeline tasks via migration `20260903070000_timeline_duration_scaling.sql`.
- Recipe-backed tasks always recalculate from the original/base duration, so repeatedly changing party servings never compounds scaling.
- Automatic modes:
  - `fixed`: oven/rest/chill/simmer-style time stays unchanged.
  - `quantity`: hands-on prep uses `base × scaleFactor^0.8`, rounded up to the next five minutes when scaling above the base recipe.
  - `batch`: pan/equipment-limited work repeats by `ceil(scaleFactor)` batches.
- Task action text is used to infer a default mode when a recipe task is first synchronized.
- If a serving-size change makes a scheduled task collide with the next task (or overflow the timeline), that task is returned to the unscheduled pool while its helper assignment is preserved, maintaining the no-overlap invariant.
- The task-detail modal exposes the scaling mode so the host can override the automatic classification.
- Editing a duration directly changes that task to `manual`, protecting the host's custom duration from future serving-size recalculation.
- Example: a 3-minute chopping task at 4× servings becomes about 9.1 minutes and schedules as 10 minutes.

## Previously unfinished controls retained from the prior revision
- Account notification settings and PWA push infrastructure.
- Password reset, profile fields/photo, measurements, pantry, notifications, privacy.
- Shopping Add Item.
- Duplicate Party and Archive Party.
- Cost split calculation controls and downloadable cost summary.
- Persistent Menu service-style selector.

## Deployment / validation
- Apply all Supabase migrations, including `20260903070000_timeline_duration_scaling.sql`, before using the new scaling controls.
- `npm run typecheck` passes.
- `next build` cannot finish in this environment because the bundled dependencies do not include Next.js's Linux SWC binary. The failure occurs before application compilation.
