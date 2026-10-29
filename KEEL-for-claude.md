# KEEL — one file for Claude

Everything below is the handoff plus the source. The zip is the same tree, if that download opens. Ignore `src/routes/` — those files only exist for the Grok shell.


----- FILE: HANDOFF.md -----

```markdown
# KEEL — handoff

Finish this as a **static site**. Do not put it back on a live Vite dev preview. That is why it keeps going blank.

## What this is

KEEL is a build dossier for a Roomba 900 used as a telepresence base.

- Collapsed selfie stick (butt section only), three pretensioned Dyneema guys.
- Phone is the face: screen and front camera face the bumper. Video stays on the phone. The ESP32 never touches the camera.
- ESP32 on the 7-pin service port drives only. Safe mode (opcode 131 after 128). Vacuum and brushes off (opcode 138, data 0). Dead-man: no packet for 250 ms and velocity goes to zero.
- Drawing number in the UI: DWG 900-TP · REV A.

It is a single page with six tabs: Assembly, Blueprints, Wiring, BOM, Motion, Stability.

Reference screenshot of the intended Assembly view: `reference/assembly.png`.

## Why the Grok preview is not stable

The preview is not a hosted app. It is a Vite **dev** server. The browser loads hundreds of separate ES modules through a reverse proxy, then the session rebinds and does it again.

Observed failure, repeated:

1. Cold load of the Three.js prebundle (`node_modules/.vite/deps/react-three-fiber.esm-*.js`, about 2.3 MB) took ~4 seconds. The proxy reset the connection while writing the body (`ECONNRESET`, status recorded as 200 anyway).
2. `@react-three/drei` was a second prebundle, about 3.15 MB, and did the same thing. It is **already removed**. Do not add it back.
3. `ContactShadows` from drei calls `ReadPixels` every frame. The iframe logged GPU stalls and froze. Replaced with a flat ground disc. Do not add shadow maps, contact shadows, or any readback.
4. The 3D view is a dynamic `import("./scene")`. If that module's network request dies, the promise rejected with no `.catch` and the stage sat on "Building the model…" forever. `stage.tsx` now retries five times, then shows the drawings-only message. Keep that.
5. A new preview session (the host id changes) throws the iframe away and cold-loads again. `curl` against the dev server can still return 200 while the user's pane is gone. A green process is not a stable preview.
6. SSR (TanStack Start) makes the shell render, then the client has to fetch Three before the model exists. The page looks finished and then the picture vanishes when the module fails.

A production `vite build` emits a few hashed files. That is the stable artifact. Open `dist/index.html` from any static host. No websocket, no module waterfall, no proxy.

## What to build

Vite + React 19 + TypeScript. **No** TanStack Start, **no** Nitro, **no** auth, **no** database, **no** SSR.

Pinned versions that already ran this UI (from `versions.json`):

- `react` / `react-dom` ^19.2.0
- `three` ^0.186.1
- `@react-three/fiber` ^9.8.2
- do **not** install `@react-three/drei`

Entry:

```tsx
// src/main.tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { KeelApp } from "./components/keel/app"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KeelApp />
  </StrictMode>,
)
```

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KEEL</title>
    <meta name="description" content="Roomba 900 telepresence: guyed mast, phone face, ESP32 motion link." />
    <meta name="theme-color" content="#12110f" />
    <link rel="icon" href="/favicon.svg" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`vite.config.ts`: `build.chunkSizeWarningLimit` can stay high. Do not set `build.rollupOptions` to split Three into many chunks. One Three chunk is better than twenty.

Copy `reference/favicon.svg` to `public/favicon.svg`.

Ignore `src/routes/__root.tsx` and `src/routes/index.tsx`. They exist only because the Grok sandbox required TanStack Start, `AuthProvider`, and `PreviewHostBridge`. None of that belongs in the static app. `index.tsx` is just `KeelApp` on `/`.

## Files that are the product

| Path | Role |
| --- | --- |
| `src/components/keel/app.tsx` | All tabs, state, copy, rules, drive pad |
| `src/components/keel/scene.tsx` | WebGL model. Fiber + Three only |
| `src/components/keel/stage.tsx` | Dynamic import, retry, error boundary |
| `src/components/keel/sheets.tsx` | SVG elevation, plan, saddle. Download as SVG |
| `src/components/keel/wiring.tsx` | Service-port wiring diagram |
| `src/lib/keel/data.ts` | Geometry, tip math, BOM, Open Interface bytes, ESP32 sketch |
| `src/styles.css` | The whole visual system. Do not restyle it |

`app.tsx` imports only from `@/lib/keel/data` and the local keel components. Point `@` at `src` (`vite-tsconfig-paths` or a `resolve.alias`).

## Behavior to keep

State (all local, nothing persisted):

- Tab starts on Assembly.
- Selected part starts on saddle.
- Exploded slider 0–1, default 0.12.
- Mast (deck to phone center) 280–1100 mm, step 10, default **460**.
- Phone mass default 190 g (Stability tab).
- Guy lines default on.

Assembly: orbit the model (drag, scroll/pinch, no pan). Click a mesh to select the matching part. Part list on the side. Six rules under the stage.

Blueprints: Elevation / Plan / Saddle, each an SVG with a download button. Shop callouts A–J live in `SHOP` in `data.ts`.

Wiring: ESP32 DevKit powered from its own USB power bank. Signal ground joins the Roomba only on the service-port ground. Do not back-feed the DevKit pin labeled 5V. Roomba TX → ESP RX, Roomba RX → ESP TX, 115200 8N1. Mini-DIN / 7-pin under the rear-right trim on a 980-class robot.

BOM: tags `owned` | `print` | `buy` | `later`. `bomTotals()` sums estimated buy+print vs later. Do not invent prices that are `null`.

Motion: on-screen pad. `toDrive(x, y, vmax)` → `{ v, r, mode }` where `r === 32768` means straight (Open Interface opcode 137). `packetBytes` is `[137, vHi, vLo, rHi, rLo]`. `toHex` shows the frame. `vmax` comes from `recommend()`. Copy button copies the hex. The embedded `FIRMWARE` string is an Arduino-ESP32 sketch (WebSockets by Markus Sattler, port 81, text frames `"v r"`). It is source to read and copy, not something this page flashes.

Stability: `verdict(mastMm, guys)` and `recommend()`. Picture shake is the limit, not tip-over. Butt section + guys = "Build this". Extended stick = wobble. Speed cap and slew come from shake, not from a fixed 180 mm/s once the mast grows.

`GEO_FLOOR` is local to `app.tsx`: `92 + mastMm`. Lens height, not a second physics model.

## Numbers — do not "correct" these without a measured robot

From `GEO` in `data.ts`. Several are stated assumptions, and the footer already says so.

- Disc 353 mm, shell 92 mm, mass 3.94 kg, base CG 42 mm.
- Pitch lever 150 mm (caster, not the rim).
- Stud 120 mm behind center. Side guy anchors ±150 mm X, −30 mm Z. Aft anchor −162 mm Z.
- Spine 100 × 110 mm, arms 300 × 16 mm.
- Phone 148 × 72 × 8 mm. Stick 0.16 kg. Saddle 0.1 kg.
- Wheel track 230 mm, wheel diameter 72 mm, wheel Z −15 mm.
- Joint model: 0 open sections ≤520 mm, then +1 per 220 mm. Lash 0.28° + 0.75° per joint; guys multiply lash by 0.18.
- Tip accel is statics only: `g * (totalMass * L) / (baseMass * hBase + phoneMass * h + stickMass * 0.45 * h)`.

Footer copy must stay: service-port notes follow 2016–2018 bench reports on the 980; opcode 137 still has to be proved on the actual robot with the wheels-down procedure; measure the handle before closing the hook.

## 3D scene rules

`scene.tsx` is the version that should ship.

- `Canvas` from `@react-three/fiber`. Camera `[0.58, 0.4, 0.46]`, fov 32. `dpr={[1, 1.5]}`. No shadow maps.
- Orbit: `three/addons/controls/OrbitControls.js`, constructed in `Cam`. Target `[0, 0.18, 0]`, pan off, auto-rotate 0.45 unless `prefers-reduced-motion`, polar 0.25–1.35, distance 0.35–1.8. `useFrame` must call `controls.update()` or auto-rotate never runs.
- Guys are `THREE.Line` + `LineBasicMaterial`, not drei's `Line` (that pulls the whole library and wants `lineWidth`, which is a no-op on most Windows GPUs anyway).
- Ground is a dark transparent circle. Not `ContactShadows`.
- Scale is metres. `R = diameterMm/2000`, `H = heightMm/1000`.
- If WebGL is blocked, the rest of the page still works. Do not let a canvas error unmount the tabs.

## Visual system

Already in `styles.css`. Keep it.

- Background `#12110f`-class, paper and copper (`#d4783a`), not purple-gradient SaaS.
- Type: Outfit for UI, IBM Plex Mono for drawing marks, opcodes, hex.
- Buttons use `cursor: pointer` (already in the base rule).
- Must work at 390×844: no horizontal overflow, tabs wrap, stage can drop to ~420 px tall. The CSS already has that breakpoint. Do not remove it.
- Do not add a "Created with …" banner, auth wall, or sign-in button.

## Out of scope

- Driving a real Roomba from this page. The serial link is the ESP32. The page only shows the packet.
- WebRTC, phone mirroring, or a video tile.
- Accounts, saving projects, a database.
- Opening the Roomba shell, Full mode (opcode 132), or running the vacuum.
- A taller "standing" mast on a multi-joint stick. The Stability copy already rejects that. An unbroken carbon tube is the only allowed exception, and it is text, not a second model.

## Done when

1. `npm run build` succeeds.
2. `npm run preview` (or any static server on `dist/`) shows all six tabs with the copy above.
3. Assembly shows the robot within about 2 seconds, guy lines visible, orbit works, clicking the saddle highlights it.
4. Throttling the network does not leave the page blank. The chrome and the SVG sheets render before Three arrives, and a failed WebGL load shows the existing fallback sentence.
5. Motion pad at center is stop (`137 … 00 00 80 00`). Full forward at the default mast is opcode 137 with velocity ≤ the recommended cap (180 mm/s at 460 mm, guyed) and radius `80 00`.
6. No dependency on `@react-three/drei`, TanStack Start, or a dev-server websocket.

Do not redesign. Port it, build it, and hand back `dist/` plus this source.
```


----- FILE: versions.json -----

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "three": "^0.186.1",
    "@react-three/fiber": "^9.8.2",
    "@react-three/drei": "^10.7.9"
  }
}
```


----- FILE: src/styles.css -----

```css
@import "tailwindcss";

@theme {
  --color-bg: #12110f;
  --color-raised: #1c1916;
  --color-surface: #26221d;
  --color-line: #3c362e;
  --color-fg: #ece6db;
  --color-muted: #a39888;
  --color-faint: #746c60;
  --color-copper: #d4783a;
  --color-copper-dim: #8a4e28;
  --color-sage: #8ea184;
  --color-sage-dim: #243028;
  --color-danger: #d4654a;
  --color-danger-dim: #3a221c;
  --color-paper: #efe8d8;
  --color-paper-ink: #1c1914;
  --color-paper-muted: #5e584c;
  --color-paper-body: #e3d9c6;
  --color-paper-metal: #cfc6b4;
  --color-paper-dark: #2c2924;
  --color-screen: #3e6270;
  --font-sans: "Outfit", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
}

@layer base {
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color-scheme: dark;
  }
  body {
    margin: 0;
    background: var(--color-bg);
    color: var(--color-fg);
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.5;
  }
  button:not(:disabled),
  [role="button"]:not(:disabled) {
    cursor: pointer;
  }
  h1, h2, h3 { text-wrap: balance; }
  p { text-wrap: pretty; }
}

.shell {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 3rem;
}

.top { margin-bottom: 1.25rem; }

.brand {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.mark {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1;
}

.dwg {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-faint);
  letter-spacing: 0.06em;
}

.lede {
  margin: 0.85rem 0 0;
  max-width: 42rem;
  color: var(--color-muted);
  font-size: 1.05rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.9rem;
}

.chip {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--color-fg);
  border: 1px solid var(--color-line);
  background: var(--color-raised);
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
}

.tabs {
  display: flex;
  gap: 0.15rem;
  margin-top: 1.1rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--color-line);
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }

.tabs button {
  appearance: none;
  background: transparent;
  color: var(--color-muted);
  border: 0;
  border-bottom: 2px solid transparent;
  min-height: 44px;
  padding: 0 0.85rem;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  white-space: nowrap;
}
.tabs button[aria-selected="true"] {
  color: var(--color-fg);
  border-bottom-color: var(--color-copper);
}

.assembly {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.75fr);
  gap: 1rem;
  align-items: start;
}

@media (max-width: 860px) {
  .assembly { grid-template-columns: 1fr; }
}

.stage {
  position: relative;
  height: min(68vh, 640px);
  min-height: 320px;
  background: var(--color-raised);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  overflow: hidden;
  touch-action: none;
}

@media (max-width: 860px) {
  .stage { height: 420px; }
}

.stage canvas { display: block; }

.stage-pending {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.stage-hint {
  position: absolute;
  left: 0.75rem;
  bottom: 0.6rem;
  margin: 0;
  pointer-events: none;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--color-faint);
}

.panel {
  background: var(--color-raised);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 0.85rem 0.9rem 1rem;
}

.panel h2 {
  margin: 0 0 0.6rem;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.part-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 240px;
  overflow: auto;
}

.part-list button {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  text-align: left;
  background: transparent;
  color: var(--color-muted);
  border: 0;
  border-radius: var(--radius-sm);
  min-height: 36px;
  padding: 0.3rem 0.4rem;
  font: inherit;
}
.part-list button[aria-pressed="true"] {
  background: var(--color-surface);
  color: var(--color-fg);
}
.part-list .idx {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-copper);
  width: 1.4rem;
}

.part-body {
  margin: 0.75rem 0 0;
  color: var(--color-fg);
  font-size: 0.95rem;
}

.sliders { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }

.slider {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.15rem 0.75rem;
  align-items: center;
}
.slider span { color: var(--color-muted); font-size: 0.85rem; }
.slider b {
  font-family: var(--font-mono);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
}
.slider input[type="range"] {
  grid-column: 1 / -1;
  width: 100%;
  accent-color: var(--color-copper);
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 44px;
  color: var(--color-fg);
  font-size: 0.95rem;
}
.toggle input { accent-color: var(--color-copper); width: 1rem; height: 1rem; }

.rules {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}
@media (max-width: 800px) {
  .rules { grid-template-columns: 1fr; }
}

.rule {
  border-top: 1px solid var(--color-line);
  padding-top: 0.55rem;
}
.rule .n {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--color-copper);
}
.rule h3 { margin: 0.15rem 0; font-size: 0.98rem; font-weight: 500; }
.rule p { margin: 0; color: var(--color-muted); font-size: 0.88rem; }

.sheet-wrap {
  background: var(--color-paper);
  color: var(--color-paper-ink);
  border-radius: var(--radius-md);
  overflow: auto;
  border: 1px solid var(--color-line);
}
.sheet-wrap svg { display: block; min-width: 720px; width: 100%; height: auto; }

.sheet .ink { fill: none; stroke: var(--color-paper-ink); stroke-width: 1.6; }
.sheet .thin { fill: none; stroke: var(--color-paper-muted); stroke-width: 1; }
.sheet .body { fill: var(--color-paper-body); stroke: var(--color-paper-ink); stroke-width: 1.6; }
.sheet .metal { fill: var(--color-paper-metal); stroke: var(--color-paper-ink); stroke-width: 1.4; }
.sheet .phone { fill: var(--color-paper-dark); stroke: var(--color-paper-ink); stroke-width: 1.2; }
.sheet .screen { fill: var(--color-screen); }
.sheet .guy { stroke: var(--color-copper); stroke-width: 1.5; fill: none; }
.sheet .keep { fill: none; stroke: var(--color-sage); stroke-width: 1.2; stroke-dasharray: 5 4; }
.sheet .danger-arc { fill: none; stroke: var(--color-danger); stroke-width: 1.4; }
.sheet .center { fill: none; stroke: var(--color-copper); stroke-width: 0.8; stroke-dasharray: 8 3 1.5 3; }
.sheet .dim line { stroke: var(--color-copper); stroke-width: 1; }
.sheet .dim text {
  fill: var(--color-copper);
  font-family: var(--font-mono);
  font-size: 12px;
}
.sheet .label {
  fill: var(--color-paper-ink);
  font-family: var(--font-sans);
  font-size: 13px;
}
.sheet .label-dim {
  fill: var(--color-paper-muted);
  font-family: var(--font-mono);
  font-size: 11px;
}
.sheet .title {
  fill: var(--color-paper-ink);
  font-family: var(--font-sans);
  font-size: 18px;
  font-weight: 600;
}
.sheet .block line { stroke: var(--color-paper-ink); stroke-width: 1; }
.sheet .block text {
  fill: var(--color-paper-ink);
  font-family: var(--font-mono);
  font-size: 11px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.7rem;
  align-items: center;
}
.toolbar button, .ghost {
  appearance: none;
  background: var(--color-raised);
  color: var(--color-fg);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  min-height: 40px;
  padding: 0 0.8rem;
  font: inherit;
  font-size: 0.9rem;
}
.toolbar button[aria-pressed="true"] {
  border-color: var(--color-copper);
  color: var(--color-copper);
}

.note {
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.85rem;
  margin: 0.8rem 0 0;
  border: 1px solid var(--color-line);
}
.note h3 { margin: 0 0 0.25rem; font-size: 0.95rem; font-weight: 600; }
.note p { margin: 0; color: var(--color-muted); font-size: 0.9rem; }
.note.danger { background: var(--color-danger-dim); border-color: #6a3328; }
.note.danger h3 { color: var(--color-danger); }
.note.sage { background: var(--color-sage-dim); }
.note.sage h3 { color: var(--color-sage); }
.note.copper h3 { color: var(--color-copper); }
.note p + p { margin-top: 0.4rem; }

.table-wrap { overflow-x: auto; border: 1px solid var(--color-line); border-radius: var(--radius-md); }
table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
th, td { text-align: left; padding: 0.55rem 0.7rem; vertical-align: top; border-bottom: 1px solid var(--color-line); }
th {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
  font-weight: 500;
  background: var(--color-raised);
}
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--font-mono); font-size: 0.8rem; }
tr:last-child td { border-bottom: 0; }
.tag {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-copper);
}

.totals {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin: 0.8rem 0;
}
.totals b {
  display: block;
  font-family: var(--font-mono);
  font-size: 1.35rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.totals span { color: var(--color-muted); font-size: 0.85rem; }

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
}
@media (max-width: 860px) {
  .split { grid-template-columns: 1fr; }
}

pre.code {
  margin: 0;
  padding: 0.9rem 1rem;
  overflow: auto;
  max-height: 520px;
  background: var(--color-raised);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--color-fg);
}

.pad-wrap { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
.pad {
  width: 220px;
  height: 220px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
  background:
    linear-gradient(var(--color-line), var(--color-line)) center/1px 100% no-repeat,
    linear-gradient(var(--color-line), var(--color-line)) center/100% 1px no-repeat,
    var(--color-raised);
  position: relative;
  touch-action: none;
}
.knob {
  position: absolute;
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border-radius: 50%;
  background: var(--color-copper);
  pointer-events: none;
}
.bytes {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
}
.bytes b { font-weight: 500; color: var(--color-copper); }

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}
@media (max-width: 700px) {
  .stats { grid-template-columns: 1fr; }
}
.stat {
  background: var(--color-raised);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: 0.8rem 0.9rem;
}
.stat .k {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.stat .v {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 1.6rem;
  line-height: 1.2;
  margin: 0.2rem 0;
}
.stat .s { color: var(--color-muted); font-size: 0.85rem; margin: 0; }

.steps { margin: 0.4rem 0 0; padding: 0; list-style: none; counter-reset: step; }
.steps li {
  counter-increment: step;
  display: grid;
  grid-template-columns: 1.6rem 1fr;
  gap: 0.45rem;
  margin: 0.55rem 0;
  color: var(--color-muted);
  font-size: 0.92rem;
}
.steps li::before {
  content: counter(step, decimal-leading-zero);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-copper);
  padding-top: 0.15rem;
}

.wire-svg { width: 100%; height: auto; display: block; background: var(--color-paper); border-radius: var(--radius-md); }
.wire-svg text { font-family: var(--font-mono); }
.colophon {
  margin-top: 2rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-line);
  color: var(--color-faint);
  font-size: 0.8rem;
  max-width: 46rem;
}

.narrow { max-width: 34rem; margin-top: 1rem; }
.mt { margin-top: 1rem; }
.shop td:first-child { font-family: var(--font-mono); color: var(--color-copper); width: 2rem; }
```


----- FILE: src/lib/keel/data.ts -----

```ts
export const GEO = {
  diameterMm: 353,
  heightMm: 92,
  massKg: 3.94,
  /** Pitch fulcrum used in the tip calc — inside the shell, about the caster. */
  leverMm: 150,
  baseCgMm: 42,
  saddleKg: 0.1,
  stickKg: 0.16,
  studBehindCenterMm: 120,
  sideAnchorXmm: 150,
  sideAnchorZmm: -30,
  aftAnchorZmm: -162,
  spineWmm: 100,
  spineLmm: 110,
  spineCenterZmm: -115,
  armWmm: 300,
  armDepthMm: 16,
  phoneWmm: 148,
  phoneHmm: 72,
  phoneTmm: 8,
  wheelTrackMm: 230,
  wheelDiaMm: 72,
  wheelZmm: -15,
} as const

export type PartId =
  | "shell"
  | "bumper"
  | "wheels"
  | "caster"
  | "brush"
  | "camera"
  | "saddle"
  | "pod"
  | "mast"
  | "phone"
  | "guys"

export const PARTS: { id: PartId; index: string; label: string; body: string }[] = [
  {
    id: "shell",
    index: "01",
    label: "Roomba 900 shell",
    body: "353 mm disc, 92 mm tall, 3.94 kg. The pack sits in the bottom tray, so the base center of gravity is about 42 mm off the floor. That is why a phone cannot tip this robot. Do not open the shell for this build.",
  },
  {
    id: "bumper",
    index: "02",
    label: "Bumper",
    body: "Spring-loaded front shell. If a zip tie or the saddle bridges the bumper to the body, obstacle detection dies and the plastic cracks. Leave the whole front arc free, including a few millimeters of travel.",
  },
  {
    id: "wheels",
    index: "03",
    label: "Drive wheels",
    body: "Differential drive, about 230 mm track, axis just behind center. Safe mode refuses to drive if either wheel drops — which is why a propped-up bench test will not move. First motion test is on the floor, slow, with the e-stop in hand.",
  },
  {
    id: "caster",
    index: "04",
    label: "Front caster",
    body: "This caster, not the outer rim, is the pitch fulcrum when the robot brakes. The tip math uses a 150 mm lever on purpose, inside the 176 mm radius.",
  },
  {
    id: "brush",
    index: "05",
    label: "Side brush",
    body: "Right-front. Pop it off so it cannot grab the guy lines. Either way, opcode 138 with data 0 keeps it stopped. This build does not vacuum.",
  },
  {
    id: "camera",
    index: "06",
    label: "Camera and RCON",
    body: "Leave the iAdapt window and the front infrared dome uncovered. Dock-seek (opcode 143) still uses them. The saddle stays behind both.",
  },
  {
    id: "saddle",
    index: "07",
    label: "Saddle",
    body: "The printed part. A PETG spine hooks the rear handle and carries the 1/4-20 stud. Two arms reach the side guy anchors. Everything stays inside the 353 mm planform so door frames only ever see the robot, not the rig.",
  },
  {
    id: "pod",
    index: "08",
    label: "Electronics",
    body: "ESP32 DevKit, powered through its own USB port from a flat power bank. Signal ground meets the Roomba only on the service-port ground wire. Do not back-feed the pin labeled 5V — on many DevKits that pin is downstream of a diode.",
  },
  {
    id: "mast",
    index: "09",
    label: "Selfie stick",
    body: "Butt section only. Every slip joint you open is a hinge, and that hinge is the whole stability problem. The foot must be a 1/4-20 female thread. A TPU washer under the foot takes out buzz.",
  },
  {
    id: "phone",
    index: "10",
    label: "Phone",
    body: "Landscape. Screen and front camera face the bumper — the remote person is the face, the front camera is their eyes. The rear camera looks the wrong way. Add a retainer under the clamp; clamps open.",
  },
  {
    id: "guys",
    index: "11",
    label: "Guy lines",
    body: "Three lengths of 1.2 mm dyneema, lightly pretensioned. At a 460 mm mast the angle off vertical is only about 20°. They are not a tower. They take the lash out of the clamp and the joints so the picture does not ring when the wheels start and stop.",
  },
]

export function jointsForMast(mastMm: number) {
  if (mastMm <= 520) return 0
  if (mastMm <= 740) return 1
  if (mastMm <= 960) return 2
  return 3
}

/** Degrees of free play at the phone. Guy pretension kills most of the deadband. */
export function lashDeg(mastMm: number, guyed: boolean) {
  const joints = jointsForMast(mastMm)
  const open = 0.28 + joints * 0.75
  return guyed ? open * 0.18 : open
}

export function shakeMm(mastMm: number, guyed: boolean) {
  const rad = (lashDeg(mastMm, guyed) * Math.PI) / 180
  return Math.tan(rad) * mastMm
}

export function guyAngleDeg(mastMm: number) {
  const radial = GEO.sideAnchorXmm
  return (Math.atan(radial / Math.max(mastMm, 1)) * 180) / Math.PI
}

/** Horizontal accel that lifts the rear (or the nose) — statics only. */
export function tipAccelMs2(mastMm: number, phoneG: number) {
  const g = 9.81
  const mb = GEO.massKg + GEO.saddleKg
  const mp = phoneG / 1000
  const ms = GEO.stickKg
  const L = GEO.leverMm / 1000
  const hb = GEO.baseCgMm / 1000
  const h = mastMm / 1000
  const num = (mb + mp + ms) * L
  const den = mb * hb + mp * h + ms * 0.45 * h
  return (g * num) / den
}

export function recommend(mastMm: number, guyed: boolean) {
  const shake = shakeMm(mastMm, guyed)
  const v = shake < 3.5 ? 180 : shake < 7 ? 140 : shake < 12 ? 100 : 70
  const slew = guyed && shake < 7 ? 400 : 250
  return { v, slew, shake }
}

export function verdict(mastMm: number, guyed: boolean) {
  const joints = jointsForMast(mastMm)
  if (joints === 0 && guyed)
    return {
      tone: "sage" as const,
      title: "Build this",
      body: "Butt section, three guys, speed held at the cap below. Static tip-over is not the limit. Picture shake is, and this is the minimum of it.",
    }
  if (joints === 0 && !guyed)
    return {
      tone: "copper" as const,
      title: "Add the guys",
      body: "The collapsed stick is already stiff. What is left is clamp and foot lash, and a taut line is what takes it out.",
    }
  if (guyed)
    return {
      tone: "copper" as const,
      title: "Close a section",
      body: "Guys help a jointed stick. They do not make a slip joint into a tube. Drop back to the butt section unless you swap the stick for one unbroken carbon tube.",
    }
  return {
    tone: "danger" as const,
    title: "This will wobble",
    body: "An extended selfie stick is a stack of hinges with a camera on top. Collapse it, then guy what remains.",
  }
}

export type BomTag = "owned" | "print" | "buy" | "later"

export type BomItem = {
  qty: string
  part: string
  spec: string
  why: string
  est: number | null
  tag: BomTag
}

export const BOM: BomItem[] = [
  {
    qty: "1",
    part: "Roomba 900",
    spec: "960 / 980 / 981 / 985",
    why: "The base. Mass, cliff sensors, and a service serial port.",
    est: null,
    tag: "owned",
  },
  {
    qty: "1",
    part: "Phone",
    spec: "Front camera, speaker, modern browser",
    why: "Face, eyes, ears, and echo cancellation. The ESP32 does not touch video.",
    est: null,
    tag: "owned",
  },
  {
    qty: "1",
    part: "Selfie stick",
    spec: "1/4-20 female foot, stiffest stick you have",
    why: "Used collapsed. Full extension is the failure mode.",
    est: null,
    tag: "owned",
  },
  {
    qty: "1",
    part: "Multimeter",
    spec: "Any DC voltmeter",
    why: "Confirm the service-port idle line is ~3.3 V before the ESP32 touches it.",
    est: null,
    tag: "owned",
  },
  {
    qty: "1",
    part: "ESP32 DevKit",
    spec: "WROOM-32, 30-pin, USB port",
    why: "Hardware UART to the robot. Wi-Fi only for motion packets.",
    est: 9,
    tag: "buy",
  },
  {
    qty: "1",
    part: "Flat power bank",
    spec: "5 000 mAh, USB-A out",
    why: "Powers the DevKit through its USB socket. Isolates the robot pack from the controller.",
    est: 14,
    tag: "buy",
  },
  {
    qty: "1",
    part: "Micro-USB pigtail",
    spec: "Sacrificial cable, cut and probed",
    why: "The 980 service port is a micro-USB under the rear-right trim. Do not assume a random UART dongle is 3.3 V.",
    est: 4,
    tag: "buy",
  },
  {
    qty: "2",
    part: "220 Ω resistors",
    spec: "1/4 W, series, one per data line",
    why: "Limits fault current if a pin is wrong. Not a level shifter.",
    est: 1,
    tag: "buy",
  },
  {
    qty: "1",
    part: "E-stop switch",
    spec: "Momentary or toggle, normally open to ground",
    why: "GPIO 4, internal pull-up. Opening the software watchdog is not a substitute for a finger.",
    est: 4,
    tag: "buy",
  },
  {
    qty: "2 m",
    part: "Dyneema line",
    spec: "1.0–1.4 mm, plus 3 cord locks",
    why: "Guy lines. Spectra/dyneema does not creep the way nylon does.",
    est: 8,
    tag: "buy",
  },
  {
    qty: "1",
    part: "1/4-20 stud",
    spec: "Stainless, 16–20 mm, plus a hex nut",
    why: "Trapped in the saddle. Matches the stick foot.",
    est: 3,
    tag: "buy",
  },
  {
    qty: "1",
    part: "M3 inserts and screws",
    spec: "Heat-set inserts, 8 mm, a handful of screws",
    why: "Pod lid and arm joints, if the arms are printed separate.",
    est: 6,
    tag: "buy",
  },
  {
    qty: "1",
    part: "Tape, ties, heat-shrink",
    spec: "VHB, 4 zip ties, 3 mm heat-shrink",
    why: "Strain-relief on the service cable. The cable is not a structural member.",
    est: 6,
    tag: "buy",
  },
  {
    qty: "~90 g",
    part: "Saddle and ring",
    spec: "PETG, 4 walls, 40% gyroid, 0.2 mm",
    why: "Spine, arms, guy ring, pod. Support-free if printed flat.",
    est: 4,
    tag: "print",
  },
  {
    qty: "~15 g",
    part: "Pads and washer",
    spec: "TPU 95A",
    why: "Foot pads so the plate does not polish the shell. Washer under the stick.",
    est: 2,
    tag: "print",
  },
  {
    qty: "1",
    part: "Buck module",
    spec: "5 V, ≥2 A, 7–24 V in, plus a 1 A fuse",
    why: "Later, if you want one battery. Not the first build — a wiring mistake here kills the pack.",
    est: 8,
    tag: "later",
  },
  {
    qty: "1",
    part: "Carbon tube",
    spec: "16 mm × 600 mm, one piece, no joints",
    why: "Only if you outgrow tabletop height. Replaces the stick. Keep the guys and the speed cap.",
    est: 18,
    tag: "later",
  },
]

export function bomTotals() {
  const buy = BOM.filter((i) => i.tag === "buy" || i.tag === "print").reduce(
    (s, i) => s + (i.est ?? 0),
    0,
  )
  const later = BOM.filter((i) => i.tag === "later").reduce((s, i) => s + (i.est ?? 0), 0)
  return { buy, later }
}

export function toDrive(x: number, y: number, vmax: number) {
  const vRaw = Math.round(y * vmax)
  const turn = x
  if (Math.abs(vRaw) < 8 && Math.abs(turn) < 0.08) {
    return { v: 0, r: 32768, mode: "stop" as const }
  }
  if (Math.abs(vRaw) < 14 && Math.abs(turn) >= 0.08) {
    const spin = Math.round(Math.min(1, Math.abs(turn)) * 100)
    const right = turn > 0
    return { v: spin, r: right ? -1 : 1, mode: "spin" as const }
  }
  const yaw = turn * 1.15
  if (Math.abs(yaw) < 0.05) return { v: vRaw, r: 32768, mode: "straight" as const }
  let r = Math.round(vRaw / yaw)
  if (!Number.isFinite(r) || Math.abs(r) > 2000) {
    return { v: vRaw, r: 32768, mode: "straight" as const }
  }
  if (r === 0) r = yaw > 0 ? 1 : -1
  return { v: vRaw, r, mode: "arc" as const }
}

export function packetBytes(v: number, r: number) {
  const hi = (n: number) => {
    const u = n < 0 ? (n + 0x10000) & 0xffff : n & 0xffff
    return [(u >> 8) & 0xff, u & 0xff]
  }
  return [137, ...hi(v), ...hi(r)]
}

export function toHex(bytes: number[]) {
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")
}

export const FIRMWARE = `// KEEL motion — Roomba 900 service port
// Board: ESP32 Dev Module. Arduino-ESP32 2.x or 3.x.
// Library: "WebSockets" by Markus Sattler (Library Manager).
//
// Bench: laptop on the same Wi-Fi opens ws://<ip>:81
// and sends text frames "v r" in millimetres, e.g. "80 32768".
// Remote: keep this loop and swap the server for an outbound
// MQTT client. The phone call never carries drive bytes.

#include <WiFi.h>
#include <WebSocketsServer.h>

const char* WIFI_SSID = "your-ssid";
const char* WIFI_PASS = "your-pass";

static const int PIN_RX = 16;   // GPIO16 <- Roomba TX, through 220 ohm
static const int PIN_TX = 17;   // GPIO17 -> Roomba RX, through 220 ohm
static const int PIN_ESTOP = 4; // to GND when pressed. Internal pull-up.

static const int VCAP = 180;          // mm/s  — from the stability sheet
static const int SLEW_PER_TICK = 8;   // mm/s per 20 ms tick = 400 mm/s^2
static const uint32_t DEADMAN_MS = 250;
static const uint32_t BUMP_HOLD_MS = 400;

WebSocketsServer ws(81);

int16_t tgtV = 0;
int16_t tgtR = (int16_t)0x8000; // 0x8000 is the OI "straight" radius
int16_t curV = 0;
uint32_t lastCmd = 0;
uint32_t bumpUntil = 0;
bool linked = false;

void roombaStart() {
  uint8_t startSafe[] = {128, 131};     // Start, Safe. Never Full.
  Serial2.write(startSafe, 2);
  delay(80);
  uint8_t motorsOff[] = {138, 0};        // vacuum, main brush, side brush off
  Serial2.write(motorsOff, 2);
}

void drive(int16_t v, int16_t r) {
  uint8_t p[5];
  p[0] = 137;
  p[1] = (uint8_t)((v >> 8) & 0xFF);
  p[2] = (uint8_t)(v & 0xFF);
  p[3] = (uint8_t)((r >> 8) & 0xFF);
  p[4] = (uint8_t)(r & 0xFF);
  Serial2.write(p, 5);
}

void noteCommand(int16_t v, int16_t r) {
  if (v > VCAP) v = VCAP;
  if (v < -VCAP) v = -VCAP;
  tgtV = v;
  tgtR = r;
  lastCmd = millis();
}

void onWs(uint8_t, WStype_t type, uint8_t* payload, size_t len) {
  if (type == WStype_CONNECTED) {
    linked = true;
    lastCmd = millis();
    return;
  }
  if (type == WStype_DISCONNECTED) {
    linked = false;
    tgtV = 0;
    tgtR = 32768;
    return;
  }
  if (type != WStype_TEXT || len == 0 || len > 32) return;
  char buf[33];
  memcpy(buf, payload, len);
  buf[len] = 0;
  int v = 0, r = 32768;
  if (sscanf(buf, "%d %d", &v, &r) == 2) noteCommand((int16_t)v, (int16_t)r);
}

void setup() {
  pinMode(PIN_ESTOP, INPUT_PULLUP);
  Serial.begin(115200);
  // Native UART. No DTR, so opening it does not pulse a reset the way a
  // USB-serial adapter can.
  Serial2.begin(115200, SERIAL_8N1, PIN_RX, PIN_TX);
  delay(300);
  roombaStart();
  drive(0, 32768);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(250);
  Serial.println(WiFi.localIP());

  ws.begin();
  ws.onEvent(onWs);
  lastCmd = millis();
}

void loop() {
  ws.loop();
  const uint32_t now = millis();

  if (digitalRead(PIN_ESTOP) == LOW || !linked || (now - lastCmd) > DEADMAN_MS) {
    tgtV = 0;
    tgtR = 32768;
  }

  // Packet 7 — bumps and wheel drops. One byte.
  static uint32_t lastPoll = 0;
  if (now - lastPoll > 200) {
    lastPoll = now;
    uint8_t q[] = {142, 7};
    Serial2.write(q, 2);
  }
  if (Serial2.available()) {
    int b = Serial2.read();
    if (b >= 0 && (b & 0x03)) bumpUntil = now + BUMP_HOLD_MS;
  }

  int16_t goal = (now < bumpUntil) ? 0 : tgtV;
  if (curV < goal) curV = min<int16_t>(goal, curV + SLEW_PER_TICK);
  else if (curV > goal) curV = max<int16_t>(goal, curV - SLEW_PER_TICK);

  static uint32_t lastTx = 0;
  if (now - lastTx >= 20) {
    lastTx = now;
    drive(curV, curV == 0 ? 32768 : tgtR);
  }
}
`

export const SHOP: { call: string; mm: string; note: string }[] = [
  { call: "A", mm: "353", note: "Robot diameter. Nothing you print may exceed this." },
  { call: "B", mm: "92", note: "Shell height. Floor to deck." },
  { call: "C", mm: "100 × 110 × 6", note: "Spine. Width × fore-aft × thick. Hook the rear edge to the handle." },
  { call: "D", mm: "300 × 16 × 5", note: "Arm, centered 30 mm behind robot center." },
  { call: "E", mm: "120", note: "Stud behind geometric center, on centerline. 1/4-20." },
  { call: "F", mm: "Ø14 / Ø36", note: "Guy ring. Slides up the butt section, sits under the clamp." },
  { call: "G", mm: "460", note: "Recommended deck-to-phone-center. Butt section, no slip joint open." },
  { call: "H", mm: "148 × 72", note: "Phone, landscape, screen toward the bumper." },
  { call: "J", mm: "3 × 120°", note: "Guys. Side anchors ±150 mm, aft anchor 162 mm behind center." },
]
```


----- FILE: src/components/keel/app.tsx -----

```tsx
import { useMemo, useRef, useState, type ReactNode } from "react"
import {
  BOM,
  FIRMWARE,
  PARTS,
  SHOP,
  bomTotals,
  guyAngleDeg,
  lashDeg,
  packetBytes,
  recommend,
  tipAccelMs2,
  toDrive,
  toHex,
  verdict,
  type PartId,
} from "@/lib/keel/data"
import { Stage } from "./stage"
import { ElevationSheet, PlanSheet, SaddleSheet } from "./sheets"
import { Wiring } from "./wiring"

type Tab = "assembly" | "drawings" | "wiring" | "bom" | "motion" | "stability"

const TABS: { id: Tab; label: string }[] = [
  { id: "assembly", label: "Assembly" },
  { id: "drawings", label: "Blueprints" },
  { id: "wiring", label: "Wiring" },
  { id: "bom", label: "BOM" },
  { id: "motion", label: "Motion" },
  { id: "stability", label: "Stability" },
]

const RULES = [
  {
    n: "01",
    t: "Safe mode only",
    d: "Opcode 131 after 128. Full mode (132) disables the cliffs. There is no reason to send it on a robot that shares a floor with people.",
  },
  {
    n: "02",
    t: "The bumper floats",
    d: "The saddle hooks the rear handle and stays inside the disc. A strap across the bumper turns the robot into a blind wedge.",
  },
  {
    n: "03",
    t: "Butt section only",
    d: "A selfie stick’s slip joints are hinges. The picture shakes long before the robot can tip. Leave every extension locked down.",
  },
  {
    n: "04",
    t: "Phone faces the bumper",
    d: "Screen and front camera look where the robot drives. The rear camera faces the wrong way. The phone does video; the ESP32 never does.",
  },
  {
    n: "05",
    t: "Brushes stay off",
    d: "Opcode 138, data 0. A spinning side brush eats guy lines and adds 15 W of noise you do not want on a call.",
  },
  {
    n: "06",
    t: "250 ms and it stops",
    d: "The ESP32, not the phone, enforces the dead-man. No packet, lost Wi-Fi, or the e-stop: velocity zero, radius straight.",
  },
]

function downloadSvg(id: string, name: string) {
  const el = document.getElementById(id)
  if (!el) return
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${el.outerHTML}`], {
    type: "image/svg+xml",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function Note({
  tone,
  title,
  children,
}: {
  tone: "sage" | "copper" | "danger"
  title: string
  children: ReactNode
}) {
  return (
    <div className={`note ${tone}`}>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

function Pad({
  x,
  y,
  set,
}: {
  x: number
  y: number
  set: (x: number, y: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef(false)

  function fromEvent(clientX: number, clientY: number) {
    const el = ref.current
    if (!el) return
    const b = el.getBoundingClientRect()
    const nx = Math.min(1, Math.max(-1, ((clientX - b.left) / b.width) * 2 - 1))
    const ny = Math.min(1, Math.max(-1, -(((clientY - b.top) / b.height) * 2 - 1)))
    set(nx, ny)
  }

  return (
    <div
      ref={ref}
      className="pad"
      onPointerDown={(e) => {
        drag.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        fromEvent(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (drag.current) fromEvent(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        drag.current = false
        e.currentTarget.releasePointerCapture(e.pointerId)
        set(0, 0)
      }}
      onPointerCancel={() => {
        drag.current = false
        set(0, 0)
      }}
    >
      <div className="knob" style={{ left: `${((x + 1) / 2) * 100}%`, top: `${((1 - y) / 2) * 100}%` }} />
    </div>
  )
}

export function KeelApp() {
  const [tab, setTab] = useState<Tab>("assembly")
  const [part, setPart] = useState<PartId>("saddle")
  const [explode, setExplode] = useState(0.12)
  const [mastMm, setMastMm] = useState(460)
  const [phoneG, setPhoneG] = useState(190)
  const [guys, setGuys] = useState(true)
  const [sheet, setSheet] = useState<"elev" | "plan" | "saddle">("elev")
  const [stick, setStick] = useState({ x: 0, y: 0 })
  const [copied, setCopied] = useState(false)

  const selected = PARTS.find((p) => p.id === part) ?? PARTS[0]
  const rec = useMemo(() => recommend(mastMm, guys), [mastMm, guys])
  const tip = tipAccelMs2(mastMm, phoneG)
  const call = useMemo(() => verdict(mastMm, guys), [mastMm, guys])
  const drive = useMemo(() => toDrive(stick.x, stick.y, rec.v), [stick, rec.v])
  const bytes = packetBytes(drive.v, drive.r)
  const totals = bomTotals()
  const floorLens = GEO_FLOOR(mastMm)

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <div className="mark">KEEL</div>
          <div className="dwg">DWG 900-TP · REV A</div>
        </div>
        <p className="lede">
          A Roomba 900 telepresence base that does not wobble. Collapsed selfie stick, three
          pretensioned guys, the phone as the face, and an ESP32 that only drives — Safe mode,
          slew-limited, dead-man at a quarter second.
        </p>
        <div className="chips">
          <span className="chip">SAFE 131</span>
          <span className="chip">MAST {mastMm} mm</span>
          <span className="chip">CAP {rec.v} mm/s</span>
          <span className="chip">VACUUM OFF</span>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === "assembly" && (
          <>
            <div className="assembly">
              <Stage
                explode={explode}
                mastMm={mastMm}
                guys={guys}
                selected={part}
                onSelect={setPart}
              />
              <aside className="panel">
                <h2>Parts</h2>
                <div className="part-list">
                  {PARTS.map((p) => (
                    <button
                      key={p.id}
                      aria-pressed={p.id === part}
                      onClick={() => setPart(p.id)}
                    >
                      <span className="idx">{p.index}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="part-body">{selected.body}</p>
                <div className="sliders">
                  <label className="slider">
                    <span>Exploded</span>
                    <b>{explode.toFixed(2)}</b>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={explode}
                      onChange={(e) => setExplode(Number(e.target.value))}
                    />
                  </label>
                  <label className="slider">
                    <span>Deck to phone center</span>
                    <b>{mastMm} mm</b>
                    <input
                      type="range"
                      min={280}
                      max={1100}
                      step={10}
                      value={mastMm}
                      onChange={(e) => setMastMm(Number(e.target.value))}
                    />
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={guys}
                      onChange={(e) => setGuys(e.target.checked)}
                    />
                    Guy lines on
                  </label>
                </div>
              </aside>
            </div>
            <div className="rules">
              {RULES.map((r) => (
                <article key={r.n} className="rule">
                  <div className="n">{r.n}</div>
                  <h3>{r.t}</h3>
                  <p>{r.d}</p>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "drawings" && (
          <>
            <div className="toolbar">
              <button aria-pressed={sheet === "elev"} onClick={() => setSheet("elev")}>
                Elevations
              </button>
              <button aria-pressed={sheet === "plan"} onClick={() => setSheet("plan")}>
                Plan
              </button>
              <button aria-pressed={sheet === "saddle"} onClick={() => setSheet("saddle")}>
                Saddle
              </button>
              <button
                className="ghost"
                onClick={() =>
                  downloadSvg(
                    sheet === "elev" ? "sheet-elev" : sheet === "plan" ? "sheet-plan" : "sheet-saddle",
                    `keel-${sheet}.svg`,
                  )
                }
              >
                Download SVG
              </button>
            </div>
            <div className="sheet-wrap">
              {sheet === "elev" && <ElevationSheet mastMm={mastMm} guys={guys} />}
              {sheet === "plan" && <PlanSheet />}
              {sheet === "saddle" && <SaddleSheet />}
            </div>
            <div className="table-wrap shop">
              <table>
                <thead>
                  <tr>
                    <th>Call</th>
                    <th className="num">mm</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {SHOP.map((row) => (
                    <tr key={row.call}>
                      <td>{row.call}</td>
                      <td className="num">{row.mm}</td>
                      <td>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "wiring" && (
          <>
            <Wiring />
            <Note tone="danger" title="The 900 is not a mini-DIN robot">
              <p>
                500, 600 and 700 series expose a 7-pin mini-DIN at 5 V: pins 1–2 battery, 3 RX, 4
                TX, 5 device-detect, 6–7 ground. A 900 does not have that connector. Bench notes on
                the 980 describe a micro-USB hidden under the rear-right top trim, 115200 8N1, on
                which Start, Safe/Full and the motor opcode respond. Treat the idle level as unknown
                until you measure it. Expect about 3.3 V. If you put 5 V onto that pin you can kill
                the board.
              </p>
              <p>
                Opcode 137 (drive) was not itemized in those notes. Prove it on the floor: Safe mode,
                40 mm/s, one second, e-stop in hand. Safe mode will not drive with a wheel dropped, so
                a robot propped on a book will just sit there.
              </p>
            </Note>
            <Note tone="copper" title="Why the power bank, not the Roomba pack">
              <p>
                The service connector is not a power port. VBUS stays open. The DevKit draws under a
                watt and runs for days from a flat 5000 mAh bank, plugged into the DevKit’s own USB
                socket. Sharing the Roomba pack couples motor stalls into the controller and puts a
                buck converter on a lithium battery. Do that later, fused, if you care. Not first.
              </p>
            </Note>
            <ol className="steps">
              <li>Wheels down, hallway clear, side brush removed, guys not yet so nothing can snag.</li>
              <li>Send 128, then 131, then 138 0. Hex 80 83 8A 00. The vacuum must not spin up.</li>
              <li>Stop packet is 89 00 00 80 00. A 50 mm/s straight pulse is 89 00 32 80 00.</li>
              <li>Only after that pulse is boring do you mount the stick, the phone, and the guys.</li>
            </ol>
          </>
        )}

        {tab === "bom" && (
          <>
            <div className="totals">
              <div>
                <b>${totals.buy}</b>
                <span>To buy and print, rough</span>
              </div>
              <div>
                <b>${totals.later}</b>
                <span>Later, if you outgrow it</span>
              </div>
              <div>
                <b>4</b>
                <span>Parts you already named</span>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Qty</th>
                    <th>Part</th>
                    <th>Spec</th>
                    <th>Why it is here</th>
                    <th className="num">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {BOM.map((item) => (
                    <tr key={item.part}>
                      <td className="num">{item.qty}</td>
                      <td>
                        {item.part}
                        <div className="tag">{item.tag}</div>
                      </td>
                      <td>{item.spec}</td>
                      <td>{item.why}</td>
                      <td className="num">{item.est == null ? "—" : item.est}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="part-body">
              Prices are 2026 street estimates for the small parts, not a quote. The Roomba, the
              phone and the stick are the ones you already have. Print the saddle yourself or hand a
              shop the SVG from Blueprints — PETG, four walls, 40% gyroid.
            </p>
          </>
        )}

        {tab === "motion" && (
          <div className="split">
            <div>
              <p className="tag">Two paths, on purpose</p>
              <p className="part-body">
                Video stays a normal phone call. WhatsApp, FaceTime, Meet — whichever already has
                echo cancellation and a camera stack that works on cellular. The screen shows the
                remote person. The front camera shows the room. The ESP32 is not in that path.
              </p>
              <p className="part-body">
                Motion is a second, smaller link. At home the operator’s laptop opens a WebSocket
                straight to the ESP32 and sends “v r” twenty times a second. Away from home, point
                the same firmware at an outbound MQTT broker you control, same two numbers, same
                250 ms dead-man. The robot dials out, so you are not opening a port on the Roomba’s
                network. Do not use an anonymous public broker. This thing moves.
              </p>
              <p className="part-body">
                Positive velocity is forward. Positive radius turns left. 32768 is straight. Radius
                1 spins counter-clockwise, −1 spins clockwise. The pad below is the packet the
                firmware should see after the speed cap — release it and the dead-man sends stop.
              </p>
              <div className="pad-wrap mt">
                <Pad x={stick.x} y={stick.y} set={(x, y) => setStick({ x, y })} />
                <div className="bytes">
                  <div>
                    mode <b>{drive.mode}</b>
                  </div>
                  <div>
                    v <b>{drive.v}</b> mm/s
                  </div>
                  <div>
                    r <b>{drive.r}</b> mm
                  </div>
                  <div>
                    bytes <b>{toHex(bytes)}</b>
                  </div>
                  <div>cap from the stability sheet, {rec.v} mm/s</div>
                </div>
              </div>
            </div>
            <div>
              <div className="toolbar">
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(FIRMWARE).then(() => {
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 1500)
                    })
                  }}
                >
                  {copied ? "Copied" : "Copy firmware"}
                </button>
              </div>
              <pre className="code">{FIRMWARE}</pre>
            </div>
          </div>
        )}

        {tab === "stability" && (
          <>
            <div className="stats">
              <div className="stat">
                <div className="k">Picture lash</div>
                <div className="v">{rec.shake.toFixed(1)} mm</div>
                <p className="s">
                  Free play at the phone, {lashDeg(mastMm, guys).toFixed(2)}°. This is the number
                  that matters.
                </p>
              </div>
              <div className="stat">
                <div className="k">Static tip</div>
                <div className="v">{(tip / 9.81).toFixed(1)} g</div>
                <p className="s">
                  {tip.toFixed(0)} m/s² before the nose or the tail lifts. Not your constraint.
                </p>
              </div>
              <div className="stat">
                <div className="k">Floor to lens</div>
                <div className="v">{floorLens} mm</div>
                <p className="s">
                  Guy angle off vertical {guyAngleDeg(mastMm).toFixed(0)}°. Shallow on purpose.
                </p>
              </div>
            </div>
            <div className="sliders narrow">
              <label className="slider">
                <span>Deck to phone center</span>
                <b>{mastMm} mm</b>
                <input
                  type="range"
                  min={280}
                  max={1100}
                  step={10}
                  value={mastMm}
                  onChange={(e) => setMastMm(Number(e.target.value))}
                />
              </label>
              <label className="slider">
                <span>Phone mass</span>
                <b>{phoneG} g</b>
                <input
                  type="range"
                  min={140}
                  max={280}
                  step={5}
                  value={phoneG}
                  onChange={(e) => setPhoneG(Number(e.target.value))}
                />
              </label>
              <label className="toggle">
                <input type="checkbox" checked={guys} onChange={(e) => setGuys(e.target.checked)} />
                Guys pretensioned
              </label>
            </div>
            <Note tone={call.tone} title={call.title}>
              <p>{call.body}</p>
              <p>
                Paste into the sketch: VCAP {rec.v}, slew {rec.slew} mm/s². That is{" "}
                {Math.max(1, Math.round(rec.slew / 50))} mm/s per 20 ms tick. Hard accel is what rings
                a mast, not top speed.
              </p>
            </Note>
            <div className="rules">
              <article className="rule">
                <div className="n">Model</div>
                <h3>Lash, not EI</h3>
                <p>
                  A solid 12 mm aluminum tube at this length barely bends under a phone. The stick
                  does not fail as a beam. It fails at the slip joints: about 0.75° of play each,
                  plus a quarter degree in the clamp. Guys are modeled as cutting that deadband to
                  18%. Order-of-magnitude, labeled as such.
                </p>
              </article>
              <article className="rule">
                <div className="n">Model</div>
                <h3>Tip moment</h3>
                <p>
                  Base 4.04 kg at 42 mm, phone and stick at mast height, fulcrum 150 mm from center.
                  Even a tall mast needs well over 1 g to lift a wheel. Outriggers would catch ankles
                  and door frames to solve a problem you do not have.
                </p>
              </article>
              <article className="rule">
                <div className="n">Power</div>
                <h3>Where the watts go</h3>
                <p>
                  Phone call 3–5 W, on its own battery. ESP32 under 1 W, on the power bank. Creep at
                  the speed cap is a few watts from the Roomba pack. Forgetting opcode 138 and leaving
                  the vacuum on is 15–25 W and ruins the call. Don’t charge the phone from the robot.
                </p>
              </article>
            </div>
            <p className="part-body">
              460 mm deck-to-center puts the lens near {GEO_FLOOR(460)} mm off the floor. That is a
              tabletop presence, for people sitting, not a standing Double Robot. Standing eye line
              is about 1500 mm. Getting there on a multi-joint stick makes the video unusable. If you
              truly need that height, replace the stick with one unbroken carbon tube and keep the
              guys, the speed cap, and the slew limit.
            </p>
          </>
        )}
      </main>

      <footer className="colophon">
        Service-port notes follow 2016–2018 bench reports on the 980: micro-USB under the rear-right
        trim, 115200, Open Interface motors confirmed. Drive opcode 137 still has to be proved on
        your robot with the wheels-down procedure. Wheel track, caster lever and joint lash are
        stated assumptions, not iRobot drawings. Measure the handle before you close the hook.
      </footer>
    </div>
  )
}

function GEO_FLOOR(mastMm: number) {
  return 92 + mastMm
}
```


----- FILE: src/components/keel/scene.tsx -----

```tsx
import { useEffect, useMemo, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  type Material,
} from "three"
import { GEO, type PartId } from "@/lib/keel/data"

export type SceneProps = {
  explode: number
  mastMm: number
  guys: boolean
  selected: PartId
  onSelect: (id: PartId) => void
}

const R = GEO.diameterMm / 2000
const H = GEO.heightMm / 1000

function useReducedMotion() {
  const [v, setV] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setV(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])
  return v
}

function Mat({
  id,
  selected,
  color,
  metal = 0.25,
  rough = 0.55,
}: {
  id: PartId
  selected: PartId
  color: string
  metal?: number
  rough?: number
}) {
  const on = selected === id
  return (
    <meshStandardMaterial
      color={color}
      roughness={rough}
      metalness={metal}
      emissive={on ? "#d4783a" : "#000000"}
      emissiveIntensity={on ? 0.45 : 0}
    />
  )
}

function Guy({
  a,
  b,
  color,
  onClick,
}: {
  a: [number, number, number]
  b: [number, number, number]
  color: string
  onClick: (ev: { stopPropagation: () => void }) => void
}) {
  const line = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute("position", new Float32BufferAttribute([...a, ...b], 3))
    return new Line(g, new LineBasicMaterial({ color }))
  }, [a, b, color])
  useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as Material).dispose()
    },
    [line],
  )
  return <primitive object={line} onClick={onClick} />
}

function Cam({ reduced }: { reduced: boolean }) {
  const { camera, gl } = useThree()
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, gl.domElement)
    c.target.set(0, 0.18, 0)
    c.enablePan = false
    c.autoRotate = !reduced
    c.autoRotateSpeed = 0.45
    c.minPolarAngle = 0.25
    c.maxPolarAngle = 1.35
    c.minDistance = 0.35
    c.maxDistance = 1.8
    c.update()
    return c
  }, [camera, gl, reduced])
  useEffect(() => () => controls.dispose(), [controls])
  useFrame(() => controls.update())
  return null
}

function Robot({ explode, mastMm, guys, selected, onSelect }: SceneProps) {
  const e = explode
  const mast = mastMm / 1000
  const deck = H
  const studZ = -GEO.studBehindCenterMm / 1000
  const phoneY = deck + mast + e * 0.14
  const ringY = phoneY - 0.045
  const top: [number, number, number] = [0, ringY, studZ]
  const anchors = useMemo<[number, number, number][]>(
    () => [
      [-GEO.sideAnchorXmm / 1000, deck + 0.012, GEO.sideAnchorZmm / 1000],
      [GEO.sideAnchorXmm / 1000, deck + 0.012, GEO.sideAnchorZmm / 1000],
      [0, deck + 0.01, GEO.aftAnchorZmm / 1000],
    ],
    [],
  )

  return (
    <group>
      <mesh
        position={[0, H * 0.46, 0]}
        castShadow
        onClick={(ev) => {
          ev.stopPropagation()
          onSelect("shell")
        }}
      >
        <cylinderGeometry args={[R * 0.98, R * 0.99, H * 0.78, 72]} />
        <Mat id="shell" selected={selected} color="#3a3936" metal={0.45} rough={0.42} />
      </mesh>
      <mesh position={[0, H * 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.72, 48]} />
        <meshStandardMaterial color="#1a1c1e" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh
        position={[0, H + 0.001, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(ev) => {
          ev.stopPropagation()
          onSelect("camera")
        }}
      >
        <planeGeometry args={[0.05, 0.03]} />
        <Mat id="camera" selected={selected} color="#0c1014" metal={0.1} rough={0.25} />
      </mesh>
      <mesh position={[0, H + 0.004, -0.02]}>
        <cylinderGeometry args={[0.016, 0.016, 0.006, 24]} />
        <meshStandardMaterial color="#c5c1b8" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh
        position={[0, 0.03, e * 0.06]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(ev) => {
          ev.stopPropagation()
          onSelect("bumper")
        }}
      >
        <torusGeometry args={[R + 0.004, 0.013, 10, 64]} />
        <Mat id="bumper" selected={selected} color="#141414" metal={0.15} rough={0.7} />
      </mesh>

      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[
            side * (GEO.wheelTrackMm / 2000) + side * e * 0.05,
            GEO.wheelDiaMm / 2000,
            GEO.wheelZmm / 1000,
          ]}
          onClick={(ev) => {
            ev.stopPropagation()
            onSelect("wheels")
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[GEO.wheelDiaMm / 2000, GEO.wheelDiaMm / 2000, 0.024, 24]} />
            <Mat id="wheels" selected={selected} color="#161616" metal={0.05} rough={0.85} />
          </mesh>
        </group>
      ))}

      <mesh
        position={[0, 0.016, 0.11]}
        onClick={(ev) => {
          ev.stopPropagation()
          onSelect("caster")
        }}
      >
        <sphereGeometry args={[0.014, 16, 12]} />
        <Mat id="caster" selected={selected} color="#2a2a28" metal={0.4} rough={0.4} />
      </mesh>

      <mesh
        position={[0.12, 0.008, 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(ev) => {
          ev.stopPropagation()
          onSelect("brush")
        }}
      >
        <cylinderGeometry args={[0.028, 0.028, 0.004, 16]} />
        <Mat id="brush" selected={selected} color="#1d1d1d" rough={0.9} metal={0} />
      </mesh>

      <group position={[0, e * 0.05, 0]}>
        <mesh
          position={[0, deck + 0.004, GEO.spineCenterZmm / 1000]}
          onClick={(ev) => {
            ev.stopPropagation()
            onSelect("saddle")
          }}
        >
          <boxGeometry args={[GEO.spineWmm / 1000, 0.006, GEO.spineLmm / 1000]} />
          <Mat id="saddle" selected={selected} color="#e4d7c4" metal={0.02} rough={0.62} />
        </mesh>
        <mesh
          position={[0, deck + 0.009, GEO.sideAnchorZmm / 1000]}
          onClick={(ev) => {
            ev.stopPropagation()
            onSelect("saddle")
          }}
        >
          <boxGeometry args={[GEO.armWmm / 1000, 0.005, GEO.armDepthMm / 1000]} />
          <Mat id="saddle" selected={selected} color="#e4d7c4" metal={0.02} rough={0.62} />
        </mesh>
        <mesh position={[0, deck + 0.012, studZ]}>
          <cylinderGeometry args={[0.004, 0.004, 0.016, 12]} />
          <meshStandardMaterial color="#c0c4c8" metalness={0.8} roughness={0.25} />
        </mesh>

        <mesh
          position={[0.055, deck + 0.018, -0.1]}
          onClick={(ev) => {
            ev.stopPropagation()
            onSelect("pod")
          }}
        >
          <boxGeometry args={[0.055, 0.016, 0.032]} />
          <Mat id="pod" selected={selected} color="#2f6b4f" metal={0.2} rough={0.5} />
        </mesh>
        <mesh position={[-0.02, deck + 0.014, -0.155]}>
          <boxGeometry args={[0.07, 0.012, 0.028]} />
          <meshStandardMaterial color="#2a2e32" roughness={0.6} metalness={0.15} />
        </mesh>

        <mesh
          position={[0, deck + mast / 2 + 0.01, studZ]}
          onClick={(ev) => {
            ev.stopPropagation()
            onSelect("mast")
          }}
        >
          <cylinderGeometry args={[0.006, 0.0075, mast, 16]} />
          <Mat id="mast" selected={selected} color="#8d9094" metal={0.75} rough={0.3} />
        </mesh>

        <group
          position={[0, phoneY, studZ]}
          onClick={(ev) => {
            ev.stopPropagation()
            onSelect("phone")
          }}
        >
          <mesh>
            <boxGeometry args={[GEO.phoneWmm / 1000, GEO.phoneHmm / 1000, GEO.phoneTmm / 1000]} />
            <Mat id="phone" selected={selected} color="#121416" metal={0.4} rough={0.35} />
          </mesh>
          <mesh position={[0, 0, GEO.phoneTmm / 2000 + 0.001]}>
            <planeGeometry args={[0.128, 0.058]} />
            <meshStandardMaterial color="#16323c" roughness={0.3} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.004, GEO.phoneTmm / 2000 + 0.002]}>
            <circleGeometry args={[0.012, 20]} />
            <meshStandardMaterial color="#d4783a" roughness={0.4} />
          </mesh>
        </group>

        {guys &&
          anchors.map((a, i) => (
            <Guy
              key={i}
              a={top}
              b={a}
              color={selected === "guys" ? "#ffb07a" : "#d4783a"}
              onClick={(ev) => {
                ev.stopPropagation()
                onSelect("guys")
              }}
            />
          ))}
      </group>
    </group>
  )
}

export function RobotScene(props: SceneProps) {
  const reduced = useReducedMotion()
  return (
    <Canvas
      camera={{ position: [0.58, 0.4, 0.46], fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#1c1916"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[1.4, 2.2, 1.1]} intensity={1.7} />
      <directionalLight position={[-1.2, 0.8, -0.6]} intensity={0.35} color="#c8d4e0" />
      <Robot {...props} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.34, 48]} />
        <meshBasicMaterial color="#090807" transparent opacity={0.5} />
      </mesh>
      <Cam reduced={reduced} />
    </Canvas>
  )
}
```


----- FILE: src/components/keel/stage.tsx -----

```tsx
import { Component, useEffect, useState, type ReactNode } from "react"
import type { SceneProps } from "./scene"

type SceneCmp = (props: SceneProps) => ReactNode

class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() {
    return { err: true }
  }
  render() {
    if (this.state.err) {
      return (
        <div className="stage-pending">
          This browser blocked the 3D view. The drawings still carry every dimension.
        </div>
      )
    }
    return this.props.children
  }
}

export function Stage(props: SceneProps) {
  const [Scene, setScene] = useState<SceneCmp | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    let attempt = 0
    const load = () => {
      void import("./scene")
        .then((m) => {
          if (live) setScene(() => m.RobotScene)
        })
        .catch(() => {
          if (!live) return
          attempt += 1
          if (attempt < 5) window.setTimeout(load, 350 * attempt)
          else setFailed(true)
        })
    }
    load()
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="stage">
      <Boundary>
        {failed ? (
          <div className="stage-pending">
            This browser blocked the 3D view. The drawings still carry every dimension.
          </div>
        ) : Scene ? (
          <Scene {...props} />
        ) : (
          <div className="stage-pending">Building the model…</div>
        )}
      </Boundary>
      <p className="stage-hint">Drag to orbit. Pinch or scroll to zoom. Click a part.</p>
    </div>
  )
}
```


----- FILE: src/components/keel/sheets.tsx -----

```tsx
import { GEO } from "@/lib/keel/data"

function DimH({ x1, x2, y, label, above = true }: { x1: number; x2: number; y: number; label: string; above?: boolean }) {
  const mid = (x1 + x2) / 2
  const ty = above ? y - 6 : y + 14
  return (
    <g className="dim">
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} />
      <text x={mid} y={ty} textAnchor="middle">
        {label}
      </text>
    </g>
  )
}

function DimV({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  const mid = (y1 + y2) / 2
  return (
    <g className="dim">
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} />
      <text x={x + 8} y={mid} dominantBaseline="middle">
        {label}
      </text>
    </g>
  )
}

function TitleBlock({ sheet, title }: { sheet: string; title: string }) {
  return (
    <g className="block">
      <text className="title" x={36} y={40}>
        {title}
      </text>
      <text x={36} y={58} className="label-dim">
        KEEL · ROOMBA 900 TELEPRESENCE · UNITS mm · THIRD ANGLE
      </text>
      <rect x={700} y={18} width={264} height={52} fill="none" stroke="currentColor" />
      <text x={712} y={38}>
        DWG 900-TP · {sheet}
      </text>
      <text x={712} y={56}>
        REV A · DO NOT SCALE FROM A SCREENSHOT
      </text>
    </g>
  )
}

export function ElevationSheet({ mastMm, guys }: { mastMm: number; guys: boolean }) {
  const floor = 560
  const total = GEO.heightMm + mastMm + 100
  const s = Math.min(470 / total, 0.78)
  const rw = GEO.diameterMm * s
  const rh = GEO.heightMm * s
  const rx = 78
  const ry = floor - rh
  const cx = rx + rw / 2
  const studX = cx - GEO.studBehindCenterMm * s
  const mastPx = mastMm * s
  const phoneH = Math.max(GEO.phoneHmm * s, 16)
  const phoneT = Math.max(GEO.phoneTmm * s, 14)
  const phoneTop = ry - mastPx - phoneH / 2
  const sideAnchorX = cx + GEO.sideAnchorZmm * s
  const aftX = cx + GEO.aftAnchorZmm * s

  const fx = 620
  const fw = GEO.diameterMm * s
  const fcx = fx + fw / 2

  return (
    <svg id="sheet-elev" className="sheet" viewBox="0 0 1000 680" xmlns="http://www.w3.org/2000/svg">
      <TitleBlock sheet="01 ELEVATIONS" title="Side and front" />
      <text className="label" x={rx} y={92}>
        SIDE · bumper to the right
      </text>
      <line className="thin" x1={40} y1={floor} x2={520} y2={floor} />
      <rect className="body" x={rx} y={ry} width={rw} height={rh} rx={rh / 2} />
      <line className="center" x1={cx} y1={ry - 10} x2={cx} y2={floor + 16} />
      <line className="guy" x1={studX} y1={ry} x2={studX} y2={phoneTop + phoneH} />
      <rect className="phone" x={studX} y={phoneTop} width={phoneT} height={phoneH} />
      <rect className="screen" x={studX + phoneT - 2} y={phoneTop + 3} width={2} height={phoneH - 6} />
      {guys && (
        <>
          <line className="guy" x1={studX + phoneT / 2} y1={phoneTop + phoneH} x2={sideAnchorX} y2={ry} />
          <line className="guy" x1={studX + phoneT / 2} y1={phoneTop + phoneH} x2={aftX} y2={ry} />
        </>
      )}
      <DimH x1={rx} x2={rx + rw} y={floor + 28} label={`${GEO.diameterMm} DIA`} above={false} />
      <DimV x={rx - 36} y1={ry} y2={floor} label={`${GEO.heightMm}`} />
      <DimV x={rx + rw + 22} y1={phoneTop + phoneH / 2} y2={ry} label={`${Math.round(mastMm)}`} />
      <text className="label-dim" x={studX + 14} y={phoneTop + 12}>
        PHONE
      </text>
      <text className="label-dim" x={rx + 8} y={ry + 18}>
        REAR
      </text>
      <text className="label-dim" x={rx + rw - 52} y={ry + 18}>
        BUMPER
      </text>

      <text className="label" x={fx} y={92}>
        FRONT · screen toward you
      </text>
      <line className="thin" x1={580} y1={floor} x2={980} y2={floor} />
      <rect className="body" x={fx} y={ry} width={fw} height={rh} rx={6} />
      <line className="center" x1={fcx} y1={phoneTop - 8} x2={fcx} y2={floor + 8} />
      <line className="guy" x1={fcx} y1={ry} x2={fcx} y2={phoneTop + phoneH} />
      <rect
        className="phone"
        x={fcx - (GEO.phoneWmm * s) / 2}
        y={phoneTop}
        width={GEO.phoneWmm * s}
        height={phoneH}
      />
      <rect
        className="screen"
        x={fcx - (GEO.phoneWmm * s) / 2 + 4}
        y={phoneTop + 4}
        width={GEO.phoneWmm * s - 8}
        height={phoneH - 8}
      />
      {guys && (
        <>
          <line
            className="guy"
            x1={fcx - 10}
            y1={phoneTop + phoneH}
            x2={fcx - GEO.sideAnchorXmm * s}
            y2={ry}
          />
          <line
            className="guy"
            x1={fcx + 10}
            y1={phoneTop + phoneH}
            x2={fcx + GEO.sideAnchorXmm * s}
            y2={ry}
          />
        </>
      )}
      <DimH x1={fx} x2={fx + fw} y={floor + 28} label={`${GEO.diameterMm}`} above={false} />
      <DimH
        x1={fcx - (GEO.phoneWmm * s) / 2}
        x2={fcx + (GEO.phoneWmm * s) / 2}
        y={phoneTop - 28}
        label={`${GEO.phoneWmm}`}
      />
      <text className="label-dim" x={36} y={650}>
        MAST CALLOUT G IS DECK TO PHONE CENTER AND FOLLOWS THE SLIDER. GUYS{" "}
        {guys ? "SHOWN" : "OMITTED"}. WHEEL TRACK {GEO.wheelTrackMm} IS HIDDEN IN THIS VIEW.
      </text>
    </svg>
  )
}

export function PlanSheet() {
  const cx = 340
  const cy = 360
  const s = 1.35
  const rad = (GEO.diameterMm / 2) * s
  const stud = (z: number, x = 0) => ({ x: cx + x * s, y: cy - z * s })
  const studP = stud(-GEO.studBehindCenterMm)
  const left = stud(GEO.sideAnchorZmm, -GEO.sideAnchorXmm)
  const right = stud(GEO.sideAnchorZmm, GEO.sideAnchorXmm)
  const aft = stud(GEO.aftAnchorZmm)
  const spineW = GEO.spineWmm * s
  const spineL = GEO.spineLmm * s
  const spineCy = cy - GEO.spineCenterZmm * s

  return (
    <svg id="sheet-plan" className="sheet" viewBox="0 0 1000 680" xmlns="http://www.w3.org/2000/svg">
      <TitleBlock sheet="02 PLAN" title="Top plan and keep-outs" />
      <circle className="body" cx={cx} cy={cy} r={rad} />
      <circle className="keep" cx={cx} cy={cy} r={rad + 10} />
      <path
        className="danger-arc"
        d={`M ${cx - rad * 0.85} ${cy - rad * 0.45} A ${rad} ${rad} 0 0 1 ${cx + rad * 0.85} ${cy - rad * 0.45}`}
      />
      <line className="center" x1={cx} y1={cy - rad - 16} x2={cx} y2={cy + rad + 16} />
      <line className="center" x1={cx - rad - 16} y1={cy} x2={cx + rad + 16} y2={cy} />
      <rect
        className="metal"
        x={cx - spineW / 2}
        y={spineCy - spineL / 2}
        width={spineW}
        height={spineL}
      />
      <rect
        className="metal"
        x={cx - (GEO.armWmm * s) / 2}
        y={cy - GEO.sideAnchorZmm * s - (GEO.armDepthMm * s) / 2}
        width={GEO.armWmm * s}
        height={GEO.armDepthMm * s}
      />
      <circle className="ink" cx={studP.x} cy={studP.y} r={5} />
      {[left, right, aft].map((p, i) => (
        <circle key={i} className="guy" cx={p.x} cy={p.y} r={4} />
      ))}
      <rect className="phone" x={cx - 18} y={cy - rad + 36} width={36} height={22} />
      <text className="label-dim" x={cx + 22} y={cy - rad + 52}>
        CAMERA · KEEP CLEAR
      </text>
      <text className="label" x={620} y={120}>
        BUMPER ARC
      </text>
      <text className="label-dim" x={620} y={140}>
        Nothing mounts here. The
      </text>
      <text className="label-dim" x={620} y={156}>
        red arc is the travel zone.
      </text>
      <text className="label" x={620} y={200}>
        GREEN CIRCLE
      </text>
      <text className="label-dim" x={620} y={220}>
        Shell planform, {GEO.diameterMm} mm.
      </text>
      <text className="label-dim" x={620} y={236}>
        Printed parts stay inside it.
      </text>
      <text className="label" x={620} y={280}>
        STUD
      </text>
      <text className="label-dim" x={620} y={300}>
        Open circle, {GEO.studBehindCenterMm} mm
      </text>
      <text className="label-dim" x={620} y={316}>
        behind geometric center.
      </text>
      <text className="label" x={620} y={360}>
        GUY ANCHORS
      </text>
      <text className="label-dim" x={620} y={380}>
        Filled marks. Side ±{GEO.sideAnchorXmm} mm,
      </text>
      <text className="label-dim" x={620} y={396}>
        aft {Math.abs(GEO.aftAnchorZmm)} mm behind center.
      </text>
      <text className="label" x={620} y={440}>
        HANDLE
      </text>
      <text className="label-dim" x={620} y={460}>
        The spine hooks the rear
      </text>
      <text className="label-dim" x={620} y={476}>
        handle. Measure the bar
      </text>
      <text className="label-dim" x={620} y={492}>
        before you close the slot.
      </text>
      <text className="label-dim" x={36} y={650}>
        +Z IS UP THE SHEET, TOWARD THE BUMPER. RCON DOME STAYS FORWARD OF THE ARM.
      </text>
    </svg>
  )
}

export function SaddleSheet() {
  return (
    <svg id="sheet-saddle" className="sheet" viewBox="0 0 1000 680" xmlns="http://www.w3.org/2000/svg">
      <TitleBlock sheet="03 SADDLE" title="Printed saddle" />
      <text className="label" x={48} y={100}>
        SPINE · 100 × 110 × 6 · print flat, PETG
      </text>
      <rect className="metal" x={80} y={140} width={190} height={210} />
      <circle cx={175} cy={286} r={9} className="ink" />
      <text className="label-dim" x={196} y={270}>
        1/4-20 NUT
      </text>
      <text className="label-dim" x={196} y={286}>
        36 mm FROM REAR
      </text>
      <rect className="body" x={80} y={322} width={190} height={28} />
      <text className="label-dim" x={88} y={340}>
        HANDLE HOOK
      </text>
      <DimH x1={80} x2={270} y={126} label="100" />
      <DimV x={286} y1={140} y2={350} label="110" />
      <text className="label" x={340} y={160}>
        Section
      </text>
      <text className="label-dim" x={340} y={182}>
        6 mm plate. Trapped 1/4-20 nut,
      </text>
      <text className="label-dim" x={340} y={198}>
        not a heat-set. Stud stands
      </text>
      <text className="label-dim" x={340} y={214}>
        16 mm proud of the top face.
      </text>
      <text className="label-dim" x={340} y={246}>
        Four TPU pads, 2 mm, under the
      </text>
      <text className="label-dim" x={340} y={262}>
        corners so the plate cannot
      </text>
      <text className="label-dim" x={340} y={278}>
        rock on the handle.
      </text>
      <text className="label-dim" x={340} y={310}>
        Fit the hook slot to the bar
      </text>
      <text className="label-dim" x={340} y={326}>
        you measure. That is the only
      </text>
      <text className="label-dim" x={340} y={342}>
        dimension that is not fixed.
      </text>

      <text className="label" x={48} y={430}>
        ARM · 300 × 16 × 5 · same print
      </text>
      <rect className="metal" x={80} y={460} width={520} height={36} />
      <circle cx={80} cy={478} r={5} className="ink" />
      <circle cx={600} cy={478} r={5} className="ink" />
      <circle cx={340} cy={478} r={4} className="ink" />
      <DimH x1={80} x2={600} y={520} label="300 ANCHOR TO ANCHOR" above={false} />
      <text className="label-dim" x={48} y={580}>
        GUY RING · ID 14 TO CLEAR THE STICK · OD 36 · 3 HOLES Ø3.5 ON Ø28 AT 120°
      </text>
      <circle className="metal" cx={860} cy={500} r={36} />
      <circle className="body" cx={860} cy={500} r={14} />
      <text className="label-dim" x={780} y={430}>
        RING · UNDER CLAMP
      </text>
      <text className="label-dim" x={48} y={640}>
        4 PERIMETERS, 40% GYROID, 0.2 mm LAYER. NO SUPPORTS. ABOUT 90 g PETG PLUS 15 g TPU.
      </text>
    </svg>
  )
}
```


----- FILE: src/components/keel/wiring.tsx -----

```tsx
export function Wiring() {
  return (
    <svg className="wire-svg" viewBox="0 0 980 520" xmlns="http://www.w3.org/2000/svg">
      <rect width="980" height="520" fill="#efe8d8" />
      <text x="28" y="36" fill="#1c1914" fontFamily="Outfit, sans-serif" fontSize="18" fontWeight="600">
        Motion link — signals only
      </text>
      <text x="28" y="56" fill="#5e584c" fontFamily="IBM Plex Mono, monospace" fontSize="11">
        DWG 900-TP-04 · MEASURE THE IDLE LINE BEFORE YOU CONNECT GPIO
      </text>

      <g fill="none" stroke="#1c1914" strokeWidth="1.4">
        <rect x="36" y="88" width="200" height="150" />
        <rect x="390" y="88" width="200" height="210" />
        <rect x="720" y="88" width="220" height="250" />
      </g>
      <text x="48" y="112" fill="#1c1914" fontSize="13" fontFamily="Outfit, sans-serif">
        Power bank
      </text>
      <text x="48" y="134" fill="#5e584c" fontSize="11">
        5 V via the DevKit USB
      </text>
      <text x="48" y="154" fill="#5e584c" fontSize="11">
        socket. Not the 5V pin.
      </text>
      <text x="48" y="186" fill="#1c1914" fontSize="12">
        USB
      </text>
      <line x1="236" y1="182" x2="390" y2="182" stroke="#1c1914" strokeWidth="1.4" />

      <text x="404" y="112" fill="#1c1914" fontSize="13" fontFamily="Outfit, sans-serif">
        ESP32 DevKit
      </text>
      <text x="404" y="148" fill="#1c1914" fontSize="12">
        GPIO17 TX
      </text>
      <text x="404" y="178" fill="#1c1914" fontSize="12">
        GPIO16 RX
      </text>
      <text x="404" y="208" fill="#1c1914" fontSize="12">
        GND
      </text>
      <text x="404" y="248" fill="#1c1914" fontSize="12">
        GPIO4 e-stop
      </text>
      <text x="404" y="278" fill="#5e584c" fontSize="11">
        pull-up, switch to GND
      </text>

      <text x="734" y="112" fill="#1c1914" fontSize="13" fontFamily="Outfit, sans-serif">
        900 service port
      </text>
      <text x="734" y="136" fill="#5e584c" fontSize="11">
        micro-USB under the
      </text>
      <text x="734" y="152" fill="#5e584c" fontSize="11">
        rear-right top trim
      </text>
      <text x="734" y="190" fill="#1c1914" fontSize="12">
        RX
      </text>
      <text x="734" y="220" fill="#1c1914" fontSize="12">
        TX
      </text>
      <text x="734" y="250" fill="#1c1914" fontSize="12">
        GND
      </text>
      <text x="734" y="290" fill="#d4654a" fontSize="12">
        VBUS — open
      </text>
      <text x="734" y="312" fill="#d4654a" fontSize="11">
        do not feed 5 V in
      </text>

      <line x1="590" y1="144" x2="640" y2="144" stroke="#1c1914" strokeWidth="1.4" />
      <rect x="640" y="132" width="56" height="24" fill="#efe8d8" stroke="#d4783a" />
      <text x="668" y="148" textAnchor="middle" fill="#d4783a" fontSize="11">
        220Ω
      </text>
      <line x1="696" y1="144" x2="720" y2="186" stroke="#1c1914" strokeWidth="1.4" />

      <line x1="590" y1="174" x2="640" y2="174" stroke="#1c1914" strokeWidth="1.4" />
      <rect x="640" y="162" width="56" height="24" fill="#efe8d8" stroke="#d4783a" />
      <text x="668" y="178" textAnchor="middle" fill="#d4783a" fontSize="11">
        220Ω
      </text>
      <line x1="696" y1="174" x2="720" y2="216" stroke="#1c1914" strokeWidth="1.4" />

      <line x1="590" y1="204" x2="720" y2="246" stroke="#1c1914" strokeWidth="1.4" />

      <g>
        <rect x="36" y="360" width="908" height="130" fill="none" stroke="#1c1914" strokeWidth="1" />
        <text x="52" y="386" fill="#1c1914" fontSize="13" fontFamily="Outfit, sans-serif">
          Bring-up, in this order
        </text>
        <text x="52" y="412" fill="#5e584c" fontSize="12">
          1  Pop the rear-right trim. Find the micro-USB. Do not plug in a 5 V UART dongle.
        </text>
        <text x="52" y="432" fill="#5e584c" fontSize="12">
          2  Continuity: ground wire to a shell screw. Idle data wire sits near 3.3 V and twitches on CLEAN.
        </text>
        <text x="52" y="452" fill="#5e584c" fontSize="12">
          3  That wire is Roomba TX, into GPIO16. The quiet data wire is Roomba RX, from GPIO17.
        </text>
        <text x="52" y="472" fill="#5e584c" fontSize="12">
          4  Listen at 115200 8N1. A boot line (roomba-mobility) means you have the console. Then 128, 131.
        </text>
      </g>
    </svg>
  )
}
```


----- FILE: src/routes/index.tsx -----

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { KeelApp } from "@/components/keel/app";

export const Route = createFileRoute("/")({ component: KeelApp });
```


----- FILE: src/routes/__root.tsx -----

```tsx
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "KEEL";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: "Roomba 900 telepresence: guyed mast, phone face, ESP32 motion link." },
      { name: "theme-color", content: "#12110f" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
```


----- FILE: reference/favicon.svg -----

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#141210"/>
  <ellipse cx="16" cy="24.2" rx="11" ry="4.4" fill="#efe8d8"/>
  <rect x="14.35" y="11.4" width="3.3" height="12.2" fill="#d4783a"/>
  <rect x="10.5" y="4.8" width="11" height="8.2" rx="1.6" fill="#efe8d8"/>
  <rect x="11.9" y="6.2" width="8.2" height="5.2" rx="0.7" fill="#141210"/>
</svg>
```
