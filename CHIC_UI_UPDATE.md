# plated. — Chic Editorial UI Update

This update shifts the prototype away from a rounded SaaS/dashboard look and toward the original editorial reference:

- warm cream paper backgrounds
- high-contrast red serif typography
- small uppercase navigation and metadata
- thin rules instead of floating cards
- square, magazine-like image crops
- lighter shadows and minimal rounding
- disposable-camera photos used as the visual focus
- a cleaner dashboard that still feels playful and social

## Fastest option: replace the whole project

Use the full updated project archive, then run:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

For production mode:

```powershell
npm run build
npm start
```

## Patch option: overwrite only the changed files

Extract the patch archive directly into the inner project folder—the folder that contains `package.json`—and allow Windows to replace the existing files.

The update replaces:

```text
app/globals.css
app/layout.tsx
app/page.tsx
app/auth/login/page.tsx
app/onboarding/page.tsx
app/app/page.tsx
app/app/parties/new/page.tsx
app/app/parties/summer-table/page.tsx
components/app-shell.tsx
components/party-shell.tsx
components/brand.tsx
components/photo-frame.tsx
tailwind.config.ts
```

No new npm package is required. The typography uses `next/font/google`, which is built into Next.js.

## Important folder note

Run commands from the folder that directly contains `package.json`:

```text
C:\Users\Lukas\Downloads\plated-frontend-prototype\plated-frontend-prototype
```

For development, use `npm run dev`, not `npm start`. `npm start` requires a completed production build first.

## Visual system

The new typography uses:

- Cormorant Garamond for editorial headlines and the plated. wordmark
- DM Sans for interface text
- Caveat for handwritten annotations

The primary palette is:

- paper: `#F4F0E7`
- secondary paper: `#E8E1D5`
- ink: `#29231F`
- editorial red: `#C84432`
- olive: `#687056`

## Validation

All TypeScript and TSX files in the updated project were parsed successfully. A full dependency install/build could not be run in the artifact environment because its npm mirror did not contain the required packages; run `npm run build` locally after extracting the update.
