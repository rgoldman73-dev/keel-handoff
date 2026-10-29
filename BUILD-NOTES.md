# KEEL rev B: what changed from the Grok handoff

## Layout

| Path | What |
| --- | --- |
| `cad/src/` | build123d models (cadgen 0.7.21). `keel_dims.py` holds every dimension. |
| `cad/STEP`, `cad/STL` | Printable parts: spine 101, arm 102 (print one mirrored), guy ring 103, pod 104, TPU pads/washer. |
| `cad/drawings/keel_drawings.py` → `cad/PDF/keel_printed_parts.pdf` | Dimensioned shop drawings, projected from the solids. |
| `cad/GLB/web` | Meshes the web model loads, so the 3D view shows the real printed geometry. |
| `app/` | The static site (Vite + React 19 + three + @react-three/fiber, no drei, no SSR). |

Rebuild CAD: `cd cad && uvx --no-config --managed-python --python 3.13 --from cadgen==0.7.21 python src/<part>.py`, then `python drawings/keel_drawings.py`, then copy `GLB/web/*.glb` and re-rasterise the PDF into `app/src/assets/sheet-*.png` (`pdftoppm -r 150 -gray -png`).

Web: `cd app && npm i && npm run build` (static `dist/`) or `npm run build:single` (one self-contained HTML).

## Design changes (each one is a fix, not a restyle)

- **Arms now connect to the spine.** In rev A the 300 mm arm (centred 30 mm behind centre) floated 22 mm in front of the spine. Rev B adds a 60 mm neck; the arm is two 158 mm halves lapped onto it with 4 × M3, so every part fits a 180 mm bed.
- **Stud position on the saddle sheet.** Rev A labelled the nut "36 mm from rear"; with GEO (stud 120 behind centre, spine 110 long centred at −115) it is 50 mm. The CAD uses 50.
- **Real nut trap.** A 6 mm plate cannot trap a 5.6 mm 1/4-20 nut, so the stud sits in a Ø30 × 12 boss with diagonal gussets, nut from below, jam nut on top.
- **4 mm stand-off.** The saddle rides on six 2 mm TPU pads over 2 mm printed feet, so the arm clears the CLEAN button.
- **Power bank.** A flat 5 000 mAh bank does not fit inside the planform beside the stud and pod. Rev B clips a one-cell stick bank (Ø23 × 95) to the spine. BOM spec updated; price estimate unchanged.
- **Guy ring** got a hub with an M3 grub screw and sits 72 mm below phone centre so it clears the clamp ball.
- **Side brush** is on the robot's right in the model (rev A had it on the left).

## Unchanged

GEO numbers, tip math, lash model, Open Interface bytes, firmware, Stage retry/fallback, no shadow maps or readback, no drei.

## Still to measure on the real robot

Handle bar diameter and the gap under it (`HANDLE_BAR_D`, assumed Ø10), stick butt-section OD (ring ID 14), and whether the CLEAN button sits under the arm on your unit.
