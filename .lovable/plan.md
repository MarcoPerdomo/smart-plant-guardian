# Update tab favicon to Verdant logo

## Goal
Replace the default Lovable favicon with a Verdant-branded tab icon.

## Steps
1. Generate a simple, square Verdant brand mark (leaf/plant motif) optimized for 16–32 px tab display.
2. Save it as `public/favicon.png` at 64×64 px with transparent background where appropriate.
3. Update `src/routes/__root.tsx` head links to reference `/favicon.png` instead of `/favicon.ico`.
4. Delete the old `public/favicon.ico` so nothing serves the Lovable icon at the legacy path.
5. Verify the new icon appears in the browser tab.
