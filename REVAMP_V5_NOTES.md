# plated. Revamp V5 — release notes

This release finishes the invitation layout, vertical timeline, native PWA notifications, settings, and previously unfinished controls.

## Database

Apply the new migration to the Supabase project:

```bash
npx supabase db push
```

The V5 migrations add notification preferences, in-app notifications, Web Push subscriptions, profile/privacy settings, timeline support, invitation photo-slot metadata, and a database-level no-overlap constraint for helper schedules. Existing conflicting scheduled rows are safely unscheduled while their helper delegation is preserved.

## Native Web Push

Deploy the Edge Function:

```bash
npx supabase functions deploy push-notifications
```

Generate a VAPID keypair (for example with `npx web-push generate-vapid-keys`) and configure the Edge Function:

```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY="<public key>" \
  VAPID_PRIVATE_KEY="<private key>" \
  VAPID_SUBJECT="mailto:you@example.com" \
  NOTIFICATION_DISPATCH_SECRET="<long random secret>"
```

Configure the web deployment with the same public key and dispatch secret:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
NOTIFICATION_DISPATCH_SECRET=<same long random secret>
```

On iPhone/iPad, install plated. to the Home Screen first. The app only asks for notification permission when the user explicitly enables native notifications in Account Settings.

Notification routing:
- RSVP received → party owner + co-owners
- Collaborator invitation → invited Plated user
- Collaborator accepted → inviter + party owner

There is a master notification toggle plus independent RSVP, collaborator-invite, and collaborator-accept toggles.

## Invitation

- The editor/preview uses the available desktop viewport and scrolls naturally on mobile.
- Photos are assigned explicitly to seven layout slots: Overview left/right/wide, Menu left/right/wide, and RSVP bottom.
- A single photo can be placed directly into any slot; it does not depend on array order.
- Overview/Menu wide is mutually exclusive with the corresponding left/right pair.
- Up to five photos can be used at once and every invitation image keeps the Polaroid treatment.
- Apple/Outlook `.ics` calendar output was removed. Google Calendar is the only calendar action in the invitation.

## Timeline

- Time runs vertically on the Y axis; helpers are columns across the X axis.
- Tasks occupy the helper column and use duration to determine vertical height.
- A helper can never have overlapping scheduled tasks; this is enforced in both the UI and server actions.
- Zoom is continuous and anchored to the pointer/finger focal point, with adaptive hash/label density.
- Reset Timeline clears scheduled times while preserving helper delegation.

## Previously unfinished controls

This version also wires the previously placeholder/disabled areas: profile photo/name/email, password reset, measurements, pantry, privacy controls, Shopping Add Item, party duplicate/archive/restore, cost-split options and cost summary, Menu service style, receipt-image retention, notification Inbox, and dynamic sidebar/account data. Saved host pantry staples now automatically mark matching generated grocery lines as already owned. The old mocked kitchen-analysis/substitution controls were also replaced with live menu analysis and practical allergy-aware replacement guidance that links back to the recipe editor.

## Service worker privacy/freshness

The service worker now caches only static assets. Authenticated pages and dynamic API responses are deliberately not cached, preventing stale party/timeline data and avoiding private user content in the offline cache.
