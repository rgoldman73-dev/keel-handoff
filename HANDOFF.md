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
