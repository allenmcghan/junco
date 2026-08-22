# Junco session handoff

**Date:** 2026-08-14
**One-line:** Redesigned the Junco PFD web mockup into a round-gauge cockpit
layout (responsive landscape/portrait) and added a Synthetic Vision terrain
overlay to the artificial horizon; SVS build is written but **not yet verified or
deployed**. Also added a reusable `/handoff` slash command.

## Current state
- **Branch:** `main` (verified).
- **Uncommitted:** `app/mockup/index.html` modified (+1195 / −830, ~1351 lines).
  Untracked: `.wrangler/` (build cache, ignorable), `app/mockup/HANDOFF.md`
  (mockup-specific handoff), and this file `HANDOFF.md` (repo-root handoff).
- **Live URL:** https://junco-pfd.pages.dev (Cloudflare Pages project `junco-pfd`).
  ⚠️ Live site does **not** include the SVS overlay — SVS edits are local only.
- **Remote:** github.com/allenmcghan/junco.

## What this is
`app/mockup/index.html` is a single-file PWA mockup of the Junco Primary Flight
Display — a round-gauge cockpit layout for tablets/phones in landscape or
portrait. Layout prototype only, not the shipping client. See `app/mockup/README.md`.

## Done this session (verifiable)
1. **Round-gauge redesign** — attitude indicator (AI) + HSI/compass as circles,
   arc-gauge airspeed/altitude, engine strip (EIS).
2. **Live deploy** to Cloudflare Pages (worked around a stale GitHub token — do
   NOT use GitHub Pages; the vault GitHub token returns 401).
3. **Responsive layout** — `relayout()` switches viewBox between landscape
   (1000×660) and portrait (660×980); portrait hides the full EIS strip and uses
   `buildEisCompact()` + `COMPACT_ROWS` refs (avoids ID collisions).
4. **GPS map inside the compass** — 3×3 OSM tile grid, heading-up, clipped to the
   HSI circle (`updateMapTiles`).
5. **VSI / climb rate** moved into the left side of the AI (cyan up / amber down).
6. **Synthetic Vision (SVS) terrain overlay** — three polygons in `#horizon`
   (`svsTerrain` brown=safe, `svsHazard` amber=<500 m, `svsPullup` red). Decodes
   AWS Terrarium PNGs via canvas `getImageData`
   (`height_m = R*256 + G + B/256 - 32768`). Button `#btnSvs` at index.html:235;
   toggle :1307; frame wiring :920; `SVS_ON` :1158; `svsEnsureTiles` :1196;
   `svsRender` :1246.
7. **`/handoff` slash command** created at `~/.claude/commands/handoff.md`
   (user-level, all projects). Uses `$ARGUMENTS` for an optional target path,
   defaults to `HANDOFF.md` in cwd. (This file was produced by the no-arg default.)

## Pending / next steps (in order)
1. **Verify SVS renders.** `python3 -m http.server 8744 -d app/mockup`, open
   `http://localhost:8744`, click "Terrain (SVS)". Demo flies flat Tennessee
   (`demoLat=35.9582, demoLon=-86.5206`, near Smyrna KMQY) so terrain is a flat
   brown baseline. **Check the console for CORS errors** — canvas `getImageData`
   taints on cross-origin tiles lacking `access-control-allow-origin`; fix that
   first if present.
2. **(Optional)** seed a mountainous demo position to show the SVS effect.
3. **Deploy SVS** (creds from Vaultwarden item **"Cloudflare"** — never inline):
   ```
   CLOUDFLARE_API_KEY="<vault: Cloudflare>" CLOUDFLARE_EMAIL="admin@keylinkit.com" \
   CLOUDFLARE_ACCOUNT_ID="dbeca84267e7e82da494570a659e467a" \
   npx wrangler@4 pages deploy app/mockup --project-name junco-pfd \
     --branch main --commit-dirty=true \
     --commit-message "Add synthetic vision terrain overlay to AI"
   ```
4. **Commit** `app/mockup/index.html` once verified — branch off `main` first;
   do not commit `.wrangler/`. Decide whether the two HANDOFF.md files should be
   committed or git-ignored.
5. Consider adding SVS to `app/mockup/README.md`'s "What is real / invented".

## Gotchas / lessons
- Use `npx wrangler@4`, not bare `wrangler` (not on PATH → exit 127).
- Use `CLOUDFLARE_ACCOUNT_ID` env var, not the `--account-id` flag (rejected).
- Pages project `junco-pfd` already exists; don't re-create.
- Cloudflare creds: `bw get item "Cloudflare"`. Vault GitHub token is stale (401).
- Device orientation / geolocation need a top-level HTTPS context — real sensors
  work only on the deployed HTTPS URL or the Android APK, not `file://`/iframe.
- Slash-command args: use `$ARGUMENTS`, not `$1` (the positional didn't substitute).

## Key references
- File under work: `app/mockup/index.html` (single-file PWA: HTML+CSS+JS).
- Mockup-specific handoff with more geometry detail: `app/mockup/HANDOFF.md`.
- Geometry (set by `relayout()`):
  - Landscape: AI_CX=302, AI_CY=307, AI_R=175; HSI_CX=712, HSI_CY=307, HSI_R=165.
  - Portrait: AI_CX=330, AI_CY=225, AI_R=172; HSI_CX=330, HSI_CY=672, HSI_R=164.
- Speed arc: red 0–22 (stall), green 22–38, red 38–50 (Vne); SPD_MAX=50.
- Alt arc: amber 0–300, green 300–2500, amber 2500–3000; ALT_MAX=3000.
- Terrarium: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
- OSM: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- `/handoff` command source: `~/.claude/commands/handoff.md`.
