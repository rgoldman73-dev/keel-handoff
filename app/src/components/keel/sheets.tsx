import type { ReactNode } from "react"
import { GEO, PRINTED, SHOP, jointsForMast } from "@/lib/keel/data"

/*
 * Orthographic drawing sheets, drawn from the same numbers as the CAD
 * (cad/src/keel_dims.py) and GEO. A3 landscape, 1190 × 842 user units
 * (2.833 units per paper millimetre), third-angle projection.
 *
 * Robot frame everywhere: origin at the robot centre on the deck plane,
 * +X robot right, +Y forward (bumper), +Z up. Millimetres.
 */

const W = 1190
const HT = 842
const PAPER_MM = W / 420
const M = 24 // inner border

const C = {
  paper: "#efe8d8",
  ink: "#1c1914",
  muted: "#5e584c",
  body: "#e3d9c6",
  metal: "#d3cab8",
  print: "#e9dcc2",
  dark: "#2c2924",
  screen: "#3e6270",
  copper: "#b8612a",
  guy: "#d4783a",
  sage: "#5f7d55",
  danger: "#c4553c",
}

/** Self-contained styles so a copied SVG renders the same anywhere. */
function SheetStyle() {
  return (
    <style>{`
      .s-ink{fill:none;stroke:${C.ink};stroke-width:1.5;stroke-linejoin:round}
      .s-thin{fill:none;stroke:${C.muted};stroke-width:0.8}
      .s-hid{fill:none;stroke:${C.muted};stroke-width:0.8;stroke-dasharray:5 3}
      .s-body{fill:${C.body};stroke:${C.ink};stroke-width:1.5;stroke-linejoin:round}
      .s-print{fill:${C.print};stroke:${C.ink};stroke-width:1.3;stroke-linejoin:round}
      .s-metal{fill:${C.metal};stroke:${C.ink};stroke-width:1.2}
      .s-dark{fill:${C.dark};stroke:${C.ink};stroke-width:1.1}
      .s-screen{fill:${C.screen}}
      .s-guy{stroke:${C.guy};stroke-width:1.4;fill:none}
      .s-guyh{stroke:${C.guy};stroke-width:1.1;fill:none;stroke-dasharray:5 3}
      .s-keep{fill:none;stroke:${C.sage};stroke-width:1.2;stroke-dasharray:6 4}
      .s-danger{fill:none;stroke:${C.danger};stroke-width:2.2}
      .s-cl{fill:none;stroke:${C.copper};stroke-width:0.7;stroke-dasharray:14 3 2 3}
      .s-dim line,.s-dim path{stroke:${C.copper};stroke-width:0.8;fill:none}
      .s-dim polygon{fill:${C.copper};stroke:none}
      .s-dim text{fill:${C.copper};font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px}
      .s-lbl{fill:${C.ink};font-family:Outfit,system-ui,sans-serif;font-size:12px}
      .s-lbls{fill:${C.muted};font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:9.5px;letter-spacing:.02em}
      .s-view{fill:${C.ink};font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;letter-spacing:.08em}
      .s-ttl{fill:${C.ink};font-family:Outfit,system-ui,sans-serif;font-size:19px;font-weight:600}
      .s-cell{fill:${C.ink};font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px}
      .s-cap{fill:${C.muted};font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:7.5px;letter-spacing:.06em}
      .s-frame{fill:none;stroke:${C.ink};stroke-width:1.6}
      .s-grid{stroke:${C.ink};stroke-width:0.8}
      .s-bal circle{fill:${C.paper};stroke:${C.ink};stroke-width:1}
      .s-bal text{fill:${C.ink};font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px}
      .s-bal line{stroke:${C.ink};stroke-width:0.7}
      .s-bal .dot{fill:${C.ink}}
      .s-letter circle{fill:${C.copper};stroke:none}
      .s-letter text{fill:${C.paper};font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;font-weight:500}
    `}</style>
  )
}

/* ------------------------------------------------------------ primitives */

function Arrow({ x, y, dx, dy }: { x: number; y: number; dx: number; dy: number }) {
  const L = 7
  const Wd = 2.4
  const px = -dy
  const py = dx
  return (
    <polygon
      points={`${x},${y} ${x - dx * L + px * Wd},${y - dy * L + py * Wd} ${x - dx * L - px * Wd},${y - dy * L - py * Wd}`}
    />
  )
}

/** Horizontal dimension. Feature points at (x1, y1) and (x2, y2); dimension line at y. */
function DimH({ x1, x2, y1, y2, y, text, letter }: { x1: number; x2: number; y1: number; y2?: number; y: number; text: string; letter?: string }) {
  const yb = y2 ?? y1
  const dir = (from: number) => (y > from ? 1 : -1)
  const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1]
  const mid = (a + b) / 2
  const narrow = b - a < 46
  return (
    <g className="s-dim">
      <line x1={x1} y1={y1 + dir(y1) * 3} x2={x1} y2={y + dir(y1) * 5} />
      <line x1={x2} y1={yb + dir(yb) * 3} x2={x2} y2={y + dir(yb) * 5} />
      <line x1={narrow ? a - 16 : a} y1={y} x2={narrow ? b + 16 : b} y2={y} />
      {narrow ? (
        <>
          <Arrow x={a} y={y} dx={1} dy={0} />
          <Arrow x={b} y={y} dx={-1} dy={0} />
        </>
      ) : (
        <>
          <Arrow x={a} y={y} dx={-1} dy={0} />
          <Arrow x={b} y={y} dx={1} dy={0} />
        </>
      )}
      <text x={narrow ? b + 20 : mid} y={y - 4} textAnchor={narrow ? "start" : "middle"}>
        {letter ? `${letter}  ` : ""}
        {text}
      </text>
    </g>
  )
}

/** Vertical dimension. Feature points at (x1, y1) and (x2, y2); dimension line at x. */
function DimV({ y1, y2, x1, x2, x, text, letter }: { y1: number; y2: number; x1: number; x2?: number; x: number; text: string; letter?: string }) {
  const xb = x2 ?? x1
  const dir = (from: number) => (x > from ? 1 : -1)
  const [a, b] = y1 < y2 ? [y1, y2] : [y2, y1]
  const mid = (a + b) / 2
  const narrow = b - a < 40
  return (
    <g className="s-dim">
      <line x1={x1 + dir(x1) * 3} y1={y1} x2={x + dir(x1) * 5} y2={y1} />
      <line x1={xb + dir(xb) * 3} y1={y2} x2={x + dir(xb) * 5} y2={y2} />
      <line x1={x} y1={narrow ? a - 14 : a} x2={x} y2={narrow ? b + 14 : b} />
      {narrow ? (
        <>
          <Arrow x={x} y={a} dx={0} dy={1} />
          <Arrow x={x} y={b} dx={0} dy={-1} />
        </>
      ) : (
        <>
          <Arrow x={x} y={a} dx={0} dy={-1} />
          <Arrow x={x} y={b} dx={0} dy={1} />
        </>
      )}
      <text x={x - 4} y={narrow ? a - 18 : mid} textAnchor="middle" transform={`rotate(-90 ${x - 4} ${narrow ? a - 18 : mid})`}>
        {letter ? `${letter}  ` : ""}
        {text}
      </text>
    </g>
  )
}

function Balloon({ x, y, tx, ty, label }: { x: number; y: number; tx: number; ty: number; label: string }) {
  const r = 13
  const d = Math.hypot(x - tx, y - ty) || 1
  return (
    <g className="s-bal">
      <line x1={x} y1={y} x2={tx + ((x - tx) / d) * r} y2={ty + ((y - ty) / d) * r} />
      <circle className="dot" cx={x} cy={y} r={1.8} />
      <circle cx={tx} cy={ty} r={r} />
      <text x={tx} y={ty + 3.5} textAnchor="middle">
        {label}
      </text>
    </g>
  )
}

function Letter({ x, y, l }: { x: number; y: number; l: string }) {
  return (
    <g className="s-letter">
      <circle cx={x} cy={y} r={8} />
      <text x={x} y={y + 3.5} textAnchor="middle">
        {l}
      </text>
    </g>
  )
}

/** Polygon with rounded corners: each vertex [x, y, r]. */
function roundPoly(pts: [number, number, number][]) {
  const n = pts.length
  let d = ""
  for (let i = 0; i < n; i++) {
    const [x, y, r] = pts[i]
    const [px, py] = pts[(i - 1 + n) % n]
    const [nx, ny] = pts[(i + 1) % n]
    const l1 = Math.hypot(x - px, y - py) || 1
    const l2 = Math.hypot(nx - x, ny - y) || 1
    const ax = x + ((px - x) / l1) * r
    const ay = y + ((py - y) / l1) * r
    const bx = x + ((nx - x) / l2) * r
    const by = y + ((ny - y) / l2) * r
    d += `${i === 0 ? "M" : "L"}${ax.toFixed(2)},${ay.toFixed(2)} Q${x.toFixed(2)},${y.toFixed(2)} ${bx.toFixed(2)},${by.toFixed(2)} `
  }
  return d + "Z"
}

function rrect(x: number, y: number, w: number, h: number, r: number) {
  return roundPoly([
    [x, y, r],
    [x + w, y, r],
    [x + w, y + h, r],
    [x, y + h, r],
  ])
}

/** Roomba 900 profile in mm, same arcs as the 3D shell: [radius, height]. */
function profileMm(): [number, number][] {
  const R = GEO.diameterMm / 2
  const Hh = GEO.heightMm
  const out: [number, number][] = []
  const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
  }
  arcPts(R - 12, 20, 12, -Math.PI / 2, 0, 6)
  arcPts(R - 16, Hh - 16, 16, 0, Math.PI / 2, 8)
  return out
}

/* ----------------------------------------------------------- sheet frame */

function Frame({
  title,
  dwg,
  sheet,
  scale,
  rev = "A",
}: {
  title: string
  dwg: string
  sheet: string
  scale: string
  rev?: string
}) {
  const cols = 8
  const rows = 6
  const iw = W - 2 * M
  const ih = HT - 2 * M
  const tbW = 430
  const tbH = 118
  const tx = W - M - tbW
  const ty = HT - M - tbH
  return (
    <g>
      <rect x={0} y={0} width={W} height={HT} fill={C.paper} />
      <rect className="s-frame" x={10} y={10} width={W - 20} height={HT - 20} />
      <rect className="s-frame" x={M} y={M} width={iw} height={ih} />
      {Array.from({ length: cols }, (_, i) => {
        const x = M + (iw / cols) * i
        return (
          <g key={`c${i}`}>
            {i > 0 && (
              <>
                <line className="s-grid" x1={x} y1={10} x2={x} y2={M} />
                <line className="s-grid" x1={x} y1={HT - M} x2={x} y2={HT - 10} />
              </>
            )}
            <text className="s-cap" x={x + iw / cols / 2} y={20} textAnchor="middle">
              {cols - i}
            </text>
            <text className="s-cap" x={x + iw / cols / 2} y={HT - 14} textAnchor="middle">
              {cols - i}
            </text>
          </g>
        )
      })}
      {Array.from({ length: rows }, (_, i) => {
        const y = M + (ih / rows) * i
        const l = "FEDCBA"[i]
        return (
          <g key={`r${i}`}>
            {i > 0 && (
              <>
                <line className="s-grid" x1={10} y1={y} x2={M} y2={y} />
                <line className="s-grid" x1={W - M} y1={y} x2={W - 10} y2={y} />
              </>
            )}
            <text className="s-cap" x={17} y={y + ih / rows / 2 + 3} textAnchor="middle">
              {l}
            </text>
            <text className="s-cap" x={W - 17} y={y + ih / rows / 2 + 3} textAnchor="middle">
              {l}
            </text>
          </g>
        )
      })}

      {/* Revision block */}
      <g>
        <rect className="s-frame" x={W - M - 330} y={M} width={330} height={36} fill={C.paper} />
        <line className="s-grid" x1={W - M - 330} y1={M + 14} x2={W - M} y2={M + 14} />
        <line className="s-grid" x1={W - M - 296} y1={M} x2={W - M - 296} y2={M + 36} />
        <line className="s-grid" x1={W - M - 220} y1={M} x2={W - M - 220} y2={M + 36} />
        <text className="s-cap" x={W - M - 324} y={M + 10}>REV</text>
        <text className="s-cap" x={W - M - 290} y={M + 10}>DATE</text>
        <text className="s-cap" x={W - M - 214} y={M + 10}>DESCRIPTION</text>
        <text className="s-cell" x={W - M - 320} y={M + 29}>{rev}</text>
        <text className="s-cell" x={W - M - 290} y={M + 29}>2026-10-29</text>
        <text className="s-cell" x={W - M - 214} y={M + 29}>REDRAWN FROM CAD, SADDLE REV B</text>
      </g>

      {/* Title block */}
      <g>
        <rect className="s-frame" x={tx} y={ty} width={tbW} height={tbH} fill={C.paper} />
        <line className="s-grid" x1={tx} y1={ty + 46} x2={tx + tbW} y2={ty + 46} />
        <line className="s-grid" x1={tx} y1={ty + 74} x2={tx + tbW} y2={ty + 74} />
        <line className="s-grid" x1={tx} y1={ty + 98} x2={tx + tbW - 86} y2={ty + 98} />
        <line className="s-grid" x1={tx + 300} y1={ty} x2={tx + 300} y2={ty + 46} />
        {[110, 220, 300].map((dx) => (
          <line key={dx} className="s-grid" x1={tx + dx} y1={ty + 46} x2={tx + dx} y2={ty + 98} />
        ))}
        <line className="s-grid" x1={tx + tbW - 86} y1={ty + 46} x2={tx + tbW - 86} y2={ty + tbH} />
        <text className="s-cap" x={tx + 8} y={ty + 11}>TITLE</text>
        <text className="s-ttl" x={tx + 8} y={ty + 36}>{title}</text>
        <text className="s-cap" x={tx + 308} y={ty + 11}>DWG NO</text>
        <text className="s-cell" x={tx + 308} y={ty + 34} style={{ fontSize: 14 }}>{dwg}</text>
        <text className="s-cap" x={tx + 8} y={ty + 56}>DRAWN</text>
        <text className="s-cell" x={tx + 8} y={ty + 69}>KEEL / R.G.</text>
        <text className="s-cap" x={tx + 118} y={ty + 56}>DATE</text>
        <text className="s-cell" x={tx + 118} y={ty + 69}>2026-10-29</text>
        <text className="s-cap" x={tx + 228} y={ty + 56}>SCALE</text>
        <text className="s-cell" x={tx + 228} y={ty + 69}>{scale}</text>
        <text className="s-cap" x={tx + 308} y={ty + 56}>REV</text>
        <text className="s-cell" x={tx + 308} y={ty + 69}>{rev}</text>
        <text className="s-cap" x={tx + 8} y={ty + 84}>UNITS</text>
        <text className="s-cell" x={tx + 8} y={ty + 95}>mm</text>
        <text className="s-cap" x={tx + 118} y={ty + 84}>TOLERANCE</text>
        <text className="s-cell" x={tx + 118} y={ty + 95}>ISO 2768-m</text>
        <text className="s-cap" x={tx + 228} y={ty + 84}>SHEET</text>
        <text className="s-cell" x={tx + 228} y={ty + 95}>{sheet}</text>
        <text className="s-cap" x={tx + 308} y={ty + 84}>SIZE</text>
        <text className="s-cell" x={tx + 308} y={ty + 95}>A3</text>
        <text className="s-cap" x={tx + 8} y={ty + 110}>DO NOT SCALE. DIMENSIONS GOVERN. MEASURE THE HANDLE BEFORE PRINTING.</text>
        {/* Third-angle projection symbol */}
        <g transform={`translate(${tx + tbW - 70} ${ty + 70})`}>
          <path className="s-ink" d="M0,-10 L22,-15 L22,15 L0,10 Z" style={{ strokeWidth: 1 }} />
          <line className="s-cl" x1={-6} y1={0} x2={60} y2={0} />
          <circle className="s-ink" cx={44} cy={0} r={15} style={{ strokeWidth: 1 }} />
          <circle className="s-ink" cx={44} cy={0} r={10} style={{ strokeWidth: 1 }} />
          <text className="s-cap" x={22} y={36} textAnchor="middle">THIRD ANGLE</text>
        </g>
      </g>
    </g>
  )
}

/* ------------------------------------------------------- view builders */

const R = GEO.diameterMm / 2
const HH = GEO.heightMm
const STUD_Y = -GEO.studBehindCenterMm
const ARM_Y = GEO.sideAnchorZmm
const AFT_Y = GEO.aftAnchorZmm
const PH_W = GEO.phoneWmm
const PH_H = GEO.phoneHmm
const PH_T = GEO.phoneTmm
const PHONE_Y = STUD_Y + 18 // phone centre, ahead of the stick axis
const STACK = 22 + 5.5 + 2 // boss top, jam nut, washer: stick foot on the deck

function stickParts(mastMm: number) {
  const tip = mastMm - 58
  const total = tip - STACK
  const joints = jointsForMast(mastMm)
  const buttMax = 520 - 58 - STACK
  const butt = joints === 0 ? total : Math.min(total, buttMax)
  const grip = Math.min(110, total * 0.4)
  const secs: { z0: number; z1: number; d: number }[] = [{ z0: STACK + 12, z1: STACK + butt, d: 13 }]
  for (let i = 0; i < joints; i++) {
    const each = (total - butt) / joints
    secs.push({ z0: STACK + butt + i * each, z1: STACK + butt + (i + 1) * each, d: 13 - (i + 1) * 2.2 })
  }
  return { tip, grip, secs, joints }
}

type Proj = { k: number; ox: number; oy: number }

/** Front view: looking at the bumper. Robot right is on the viewer's left. */
function FrontView({ p, mastMm, guys }: { p: Proj; mastMm: number; guys: boolean }) {
  const { k, ox, oy } = p
  const X = (x: number) => ox - x * k // x = robot +X (right)
  const Z = (z: number) => oy - z * k // z above floor
  const D = (z: number) => Z(HH + z) // z above deck
  const prof = profileMm()
  const outline = [...prof.map(([r, h]) => `${X(-r)},${Z(h)}`), ...prof.reverse().map(([r, h]) => `${X(r)},${Z(h)}`)]
  const st = stickParts(mastMm)
  const ringZ = mastMm - 72
  const s120 = Math.sin((2 * Math.PI) / 3) * 14
  return (
    <g>
      <line className="s-thin" x1={X(R + 40)} y1={Z(0)} x2={X(-R - 40)} y2={Z(0)} />
      {/* Wheels and caster below the shell */}
      {[-1, 1].map((s) => (
        <rect key={s} className="s-dark" x={X(s * 115) - 11 * k} y={Z(9)} width={22 * k} height={9 * k} />
      ))}
      <rect className="s-dark" x={X(6)} y={Z(9)} width={12 * k} height={9 * k} />
      <polygon className="s-body" points={outline.join(" ")} />
      <line className="s-thin" x1={X(R - 1)} y1={Z(15)} x2={X(-R + 1)} y2={Z(15)} />
      <path className="s-dark" d={`M${X(9)},${Z(HH - 0.5)} A${9 * k},${9 * k} 0 0 1 ${X(-9)},${Z(HH - 0.5)} Z`} />

      {/* Behind the arm: boss, bank, pod, stick */}
      <rect className="s-print" x={X(15)} y={D(22)} width={30 * k} height={12 * k} />
      <rect className="s-print" x={X(50)} y={D(10)} width={100 * k} height={6 * k} />
      <rect className="s-print" x={X(52)} y={D(34.5)} width={36 * k} height={24.5 * k} rx={2} />
      <rect fill="#c23a2c" stroke={C.ink} strokeWidth={0.8} x={X(41.5)} y={D(40.5)} width={15 * k} height={6 * k} />
      <circle className="s-print" cx={X(-32)} cy={D(21.3)} r={14.4 * k} />
      <circle className="s-metal" cx={X(-32)} cy={D(21.3)} r={11.5 * k} />
      <rect className="s-dark" x={X(12)} y={D(STACK + 12)} width={24 * k} height={12 * k} />
      <rect className="s-dark" x={X(12.2)} y={D(STACK + 12 + st.grip)} width={24.4 * k} height={st.grip * k} />
      {st.secs.map((s, i) => (
        <g key={i}>
          <rect className="s-metal" x={X(s.d / 2)} y={D(s.z1)} width={s.d * k} height={(s.z1 - s.z0) * k} />
          {i > 0 && <rect className="s-dark" x={X(s.d / 2 + 2.5)} y={D(s.z0 + 6)} width={(s.d + 5) * k} height={12 * k} />}
        </g>
      ))}
      <rect className="s-print" x={X(18)} y={D(ringZ + 4)} width={36 * k} height={4 * k} />
      <rect className="s-print" x={X(11)} y={D(ringZ + 10)} width={22 * k} height={6 * k} />
      <circle className="s-dark" cx={X(0)} cy={D(mastMm - 51)} r={8.5 * k} />
      {[-1, 1].map((s) => (
        <rect key={s} className="s-dark" x={X(17)} y={D(mastMm + s * 40.5 + 4.5)} width={34 * k} height={9 * k} rx={2} />
      ))}

      {/* Arm, feet, lugs: nearest the viewer */}
      <rect className="s-print" x={X(158)} y={D(15)} width={316 * k} height={5 * k} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect className="s-print" x={X(s * 149) - 9 * k} y={D(10)} width={18 * k} height={8 * k} />
          <rect className="s-dark" x={X(s * 149) - 6 * k} y={D(-2)} width={12 * k} height={2 * k} />
          <path className="s-print" d={rrect(X(s * 150) - 5 * k, D(24), 10 * k, 9 * k, Math.min(4 * k, 4))} />
          <circle className="s-ink" cx={X(s * 150)} cy={D(19.5)} r={1.75 * k + 0.5} style={{ strokeWidth: 0.8 }} />
        </g>
      ))}

      {/* Phone, screen toward the viewer */}
      <path className="s-dark" d={rrect(X(PH_W / 2), D(mastMm + PH_H / 2), PH_W * k, PH_H * k, 6 * k)} />
      <rect className="s-screen" x={X(70.25)} y={D(mastMm + 33.25)} width={140.5 * k} height={66.5 * k} rx={3 * k} />
      <circle fill="#0b0b0b" cx={X(66.5)} cy={D(mastMm)} r={2.2 * k + 0.6} />
      {[-1, 1].map((s) => (
        <rect key={s} className="s-dark" x={X(17)} y={D(mastMm + s * 40.5 + 4.5)} width={34 * k} height={9 * k} rx={2} />
      ))}

      {guys && (
        <>
          <line className="s-guy" x1={X(150)} y1={D(19.5)} x2={X(s120)} y2={D(ringZ + 2)} />
          <line className="s-guy" x1={X(-150)} y1={D(19.5)} x2={X(-s120)} y2={D(ringZ + 2)} />
          <line className="s-guyh" x1={X(0)} y1={D(14.5)} x2={X(0)} y2={D(ringZ + 2)} />
        </>
      )}
      <line className="s-cl" x1={X(0)} y1={Z(-8)} x2={X(0)} y2={D(mastMm + PH_H / 2 + 14)} />
    </g>
  )
}

/** Side view, from the robot's left: bumper on the viewer's left. */
function SideView({ p, mastMm, guys }: { p: Proj; mastMm: number; guys: boolean }) {
  const { k, ox, oy } = p
  const Y = (y: number) => ox - y * k // y = robot +Y (forward)
  const Z = (z: number) => oy - z * k
  const D = (z: number) => Z(HH + z)
  const prof = profileMm()
  const outline = [...prof.map(([r, h]) => `${Y(r)},${Z(h)}`), ...prof.reverse().map(([r, h]) => `${Y(-r)},${Z(h)}`)]
  const st = stickParts(mastMm)
  const ringZ = mastMm - 72
  const wr = GEO.wheelDiaMm / 2
  const seamY = -Math.sin((10 * Math.PI) / 180) * R
  const rear = -170
  // Hook profile from cad/src/spine.py: wall 5, slot 10.6, lip 4
  const hook = [
    [rear, 4],
    [rear, -10],
    [rear + 19.6, -10],
    [rear + 19.6, -6],
    [rear + 5, -6],
    [rear + 5, 4],
  ]
  return (
    <g>
      <line className="s-thin" x1={Y(R + 40)} y1={Z(0)} x2={Y(-R - 40)} y2={Z(0)} />
      <circle className="s-hid" cx={Y(GEO.wheelZmm)} cy={Z(wr)} r={wr * k} />
      <path
        className="s-dark"
        d={`M${Y(GEO.wheelZmm - 22)},${Z(9)} A${wr * k},${wr * k} 0 0 0 ${Y(GEO.wheelZmm + 22)},${Z(9)} Z`}
      />
      <circle className="s-dark" cx={Y(115)} cy={Z(6)} r={6 * k} />
      <polygon className="s-body" points={outline.join(" ")} />
      <line className="s-thin" x1={Y(seamY)} y1={Z(15)} x2={Y(seamY)} y2={Z(86)} />
      <line className="s-thin" x1={Y(R - 1)} y1={Z(15)} x2={Y(seamY)} y2={Z(15)} />
      <rect className="s-dark" x={Y(148)} y={Z(HH + 0.5)} width={20 * k} height={2.5 * k} />
      <polygon className="s-hid" points={hook.map(([y, z]) => `${Y(y)},${D(z)}`).join(" ")} />
      <circle className="s-hid" cx={Y(-159.7)} cy={D(-1)} r={5 * k} />

      {/* Far side first: pod, spine, boss, aft lug */}
      <rect className="s-print" x={Y(-63)} y={D(34.5)} width={62 * k} height={24.5 * k} rx={2} />
      <rect fill="#c23a2c" stroke={C.ink} strokeWidth={0.8} x={Y(-71.5)} y={D(40.5)} width={15 * k} height={6 * k} />
      <path className="s-print" d={roundPoly([[Y(-18), D(10), 2], [Y(rear), D(10), 2], [Y(rear), D(4), 0], [Y(-18), D(4), 2]])} />
      <polygon className="s-print" points={hook.map(([y, z]) => `${Y(y)},${D(z)}`).join(" ")} />
      {[-68, -162].map((y) => (
        <g key={y}>
          <rect className="s-print" x={Y(y + 5)} y={D(4)} width={10 * k} height={2 * k} />
          <rect className="s-dark" x={Y(y + 6)} y={D(2)} width={12 * k} height={2 * k} />
        </g>
      ))}
      <rect className="s-print" x={Y(-105)} y={D(22)} width={30 * k} height={12 * k} />
      <path className="s-print" d={rrect(Y(-156), D(19), 12 * k, 9 * k, Math.min(3.5 * k, 3))} />
      <circle className="s-ink" cx={Y(-162)} cy={D(14.5)} r={1.75 * k + 0.5} style={{ strokeWidth: 0.8 }} />

      {/* Near side: bank and its clips */}
      <path className="s-metal" d={rrect(Y(-70), D(32.8), 95 * k, 23 * k, 9 * k)} />
      {[-84, -151].map((y) => (
        <rect key={y} className="s-print" x={Y(y + 5)} y={D(28)} width={10 * k} height={18 * k} />
      ))}

      {/* Arm section and the near lug */}
      <rect className="s-print" x={Y(-22)} y={D(15)} width={16 * k} height={5 * k} />
      <rect className="s-print" x={Y(-22)} y={D(10)} width={16 * k} height={8 * k} />
      <rect className="s-dark" x={Y(-24)} y={D(-2)} width={12 * k} height={2 * k} />
      <path className="s-print" d={rrect(Y(-26), D(24), 8 * k, 9 * k, Math.min(3.5 * k, 3))} />
      <circle className="s-ink" cx={Y(-30)} cy={D(19.5)} r={1.75 * k + 0.5} style={{ strokeWidth: 0.8 }} />

      {/* Stick, ring, clamp, phone */}
      <rect className="s-dark" x={Y(STUD_Y + 12)} y={D(STACK + 12)} width={24 * k} height={12 * k} />
      <rect className="s-dark" x={Y(STUD_Y + 12.2)} y={D(STACK + 12 + st.grip)} width={24.4 * k} height={st.grip * k} />
      {st.secs.map((s, i) => (
        <g key={i}>
          <rect className="s-metal" x={Y(STUD_Y + s.d / 2)} y={D(s.z1)} width={s.d * k} height={(s.z1 - s.z0) * k} />
          {i > 0 && <rect className="s-dark" x={Y(STUD_Y + s.d / 2 + 2.5)} y={D(s.z0 + 6)} width={(s.d + 5) * k} height={12 * k} />}
        </g>
      ))}
      <rect className="s-print" x={Y(STUD_Y + 18)} y={D(ringZ + 4)} width={36 * k} height={4 * k} />
      <rect className="s-print" x={Y(STUD_Y + 11)} y={D(ringZ + 10)} width={22 * k} height={6 * k} />
      <circle className="s-dark" cx={Y(STUD_Y)} cy={D(mastMm - 51)} r={8.5 * k} />
      <path className="s-dark" d={rrect(Y(STUD_Y + 14), D(mastMm + 42), 12 * k, 84 * k, 3 * k)} />
      <rect className="s-dark" x={Y(PHONE_Y + PH_T / 2)} y={D(mastMm + PH_H / 2)} width={PH_T * k} height={PH_H * k} />
      <rect className="s-screen" x={Y(PHONE_Y + PH_T / 2) - 1} y={D(mastMm + PH_H / 2 - 3)} width={2} height={(PH_H - 6) * k} />
      {[-1, 1].map((s) => (
        <rect key={s} className="s-dark" x={Y(STUD_Y + 26)} y={D(mastMm + s * 40.5 + 4.5)} width={24 * k} height={9 * k} rx={2} />
      ))}

      {guys && (
        <>
          <line className="s-guy" x1={Y(-162)} y1={D(14.5)} x2={Y(STUD_Y - 14)} y2={D(ringZ + 2)} />
          <line className="s-guy" x1={Y(-30)} y1={D(19.5)} x2={Y(STUD_Y + 7)} y2={D(ringZ + 2)} />
        </>
      )}
      <line className="s-cl" x1={Y(0)} y1={Z(-8)} x2={Y(0)} y2={Z(HH + 30)} />
      <line className="s-cl" x1={Y(STUD_Y)} y1={D(-14)} x2={Y(STUD_Y)} y2={D(mastMm + PH_H / 2 + 14)} />
    </g>
  )
}

/** Plan view from above, bumper toward the bottom of the sheet. */
function PlanView({ p, guys, detail = false }: { p: Proj; guys: boolean; detail?: boolean }) {
  const { k, ox, oy } = p
  const X = (x: number) => ox - x * k
  const Y = (y: number) => oy + y * k
  const P = (x: number, y: number) => `${X(x)},${Y(y)}`
  const spine = roundPoly([
    [X(-30), Y(-18), 5 * k],
    [X(30), Y(-18), 5 * k],
    [X(30), Y(-60), 0],
    [X(50), Y(-60), 8 * k],
    [X(50), Y(-170), 8 * k],
    [X(-50), Y(-170), 8 * k],
    [X(-50), Y(-60), 8 * k],
    [X(-30), Y(-60), 0],
  ])
  const a0 = (-100 * Math.PI) / 180
  const a1 = (100 * Math.PI) / 180
  const arcAt = (r: number) => {
    const pt = (a: number) => P(r * Math.sin(a), r * Math.cos(a))
    return `M${pt(a0)} A${r * k},${r * k} 0 1 1 ${pt(a1)}`
  }
  const s120 = Math.sin((2 * Math.PI) / 3) * 14
  return (
    <g>
      <circle className="s-body" cx={X(0)} cy={Y(0)} r={R * k} />
      <circle className="s-thin" cx={X(0)} cy={Y(0)} r={153 * k} />
      <path className="s-thin" d={arcAt(R - 2.5)} />
      {[a0, a1].map((a) => (
        <line key={a} className="s-ink" style={{ strokeWidth: 1 }} x1={X((R - 6) * Math.sin(a))} y1={Y((R - 6) * Math.cos(a))} x2={X(R * Math.sin(a))} y2={Y(R * Math.cos(a))} />
      ))}
      <circle className="s-keep" cx={X(0)} cy={Y(0)} r={(R + 6) * k} />
      <path className="s-danger" d={arcAt(R + 12)} />
      <circle className="s-thin" cx={X(0)} cy={Y(5)} r={45 * k} />
      <circle className="s-metal" cx={X(0)} cy={Y(5)} r={21 * k} />
      <circle className="s-thin" cx={X(0)} cy={Y(5)} r={26 * k} />
      <path className="s-dark" d={rrect(X(23), Y(128), 46 * k, 20 * k, 3 * k)} />
      <rect className="s-keep" x={X(32)} y={Y(118)} width={64 * k} height={52 * k} />
      <circle className="s-dark" cx={X(0)} cy={Y(161)} r={8.5 * k} />
      <rect className="s-dark" x={X(35)} y={Y(-172)} width={70 * k} height={24 * k} />
      <rect className="s-hid" x={X(32)} y={Y(-164.7)} width={64 * k} height={10 * k} />
      <g transform={`rotate(${-47} ${X(118)} ${Y(-112)})`}>
        <rect className="s-thin" x={X(118) - 25 * k} y={Y(-112) - 13 * k} width={50 * k} height={26 * k} rx={3} />
      </g>

      {/* Saddle */}
      <path className="s-print" d={spine} />
      {[
        [-42, -68],
        [42, -68],
        [-42, -162],
        [42, -162],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} className="s-hid" cx={X(x)} cy={Y(y)} r={5 * k} />
      ))}
      <path className="s-print" d={rrect(X(158), Y(-38), 316 * k, 16 * k, 3 * k)} />
      <line className="s-ink" style={{ strokeWidth: 0.8 }} x1={X(0)} y1={Y(-38)} x2={X(0)} y2={Y(-22)} />
      {[-150, 150].map((x) => (
        <rect key={x} className="s-print" x={X(x + 5)} y={Y(-34)} width={10 * k} height={8 * k} />
      ))}
      {[-22, -8, 8, 22].map((x) => (
        <circle key={x} className="s-ink" style={{ strokeWidth: 0.8 }} cx={X(x)} cy={Y(-30)} r={1.7 * k + 0.4} />
      ))}
      <rect className="s-print" x={X(4)} y={Y(-168)} width={8 * k} height={12 * k} />
      <path className="s-print" d={rrect(X(52), Y(-125), 36 * k, 62 * k, 4 * k)} />
      <circle fill="#c23a2c" stroke={C.ink} strokeWidth={0.8} cx={X(34)} cy={Y(-79)} r={7.5 * k} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sy) => <circle key={`${sx}${sy}`} className="s-ink" style={{ strokeWidth: 0.7 }} cx={X(34 + sx * 13.8)} cy={Y(-94 + sy * 26.8)} r={1.7 * k} />))}
      {[-84, -151].map((y) => (
        <rect key={y} className="s-print" x={X(-17.4)} y={Y(y - 5)} width={29.2 * k} height={10 * k} />
      ))}
      <path className="s-metal" d={rrect(X(-20.5), Y(-165), 23 * k, 95 * k, 5 * k)} />
      <path className="s-thin" d={rrect(X(26), Y(-113), 8 * k, 18 * k, 4 * k)} />
      <circle className="s-print" cx={X(0)} cy={Y(STUD_Y)} r={15 * k} />
      {detail ? (
        <circle className="s-dark" cx={X(0)} cy={Y(STUD_Y)} r={3.3 * k} />
      ) : (
        <>
          <circle className="s-print" cx={X(0)} cy={Y(STUD_Y)} r={18 * k} />
          <circle className="s-print" cx={X(0)} cy={Y(STUD_Y)} r={11 * k} />
          <circle className="s-dark" cx={X(0)} cy={Y(STUD_Y)} r={6.5 * k} />
        </>
      )}
      {!detail && [
        [0, -14],
        [s120, 7],
        [-s120, 7],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} className="s-ink" style={{ strokeWidth: 0.7 }} cx={X(x)} cy={Y(STUD_Y + y)} r={1.75 * k + 0.3} />
      ))}
      {!detail && (
        <>
          <rect className="s-dark" x={X(17)} y={Y(STUD_Y - 2)} width={34 * k} height={24 * k} rx={2} />
          <rect className="s-dark" x={X(PH_W / 2)} y={Y(PHONE_Y - PH_T / 2)} width={PH_W * k} height={PH_T * k} rx={2} />
          <rect className="s-screen" x={X(PH_W / 2 - 3)} y={Y(PHONE_Y + PH_T / 2) - 1.2} width={(PH_W - 6) * k} height={1.6} />
        </>
      )}

      {guys && (
        <>
          <line className="s-guy" x1={X(150)} y1={Y(-30)} x2={X(s120)} y2={Y(STUD_Y + 7)} />
          <line className="s-guy" x1={X(-150)} y1={Y(-30)} x2={X(-s120)} y2={Y(STUD_Y + 7)} />
          <line className="s-guy" x1={X(0)} y1={Y(-162)} x2={X(0)} y2={Y(STUD_Y - 14)} />
          {[
            [150, -30],
            [-150, -30],
            [0, -162],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} fill={C.guy} cx={X(x)} cy={Y(y)} r={2.6} />
          ))}
        </>
      )}
      <line className="s-cl" x1={X(0)} y1={Y(-R - 22)} x2={X(0)} y2={Y(R + 22)} />
      <line className="s-cl" x1={X(R + 22)} y1={Y(0)} x2={X(-R - 22)} y2={Y(0)} />
      {detail && (
        <>
          <text className="s-lbls" x={X(-26)} y={Y(140)}>CAMERA · KEEP CLEAR</text>
          <text className="s-lbls" x={X(-12)} y={Y(171)}>IR DOME</text>
          <text className="s-lbls" x={X(-40)} y={Y(-176) - 4}>CARRY HANDLE</text>
          <text className="s-lbls" x={X(100)} y={Y(-142)}>SERVICE PORT TRIM</text>
          <text className="s-lbls" x={X(-24)} y={Y(18)}>CLEAN · 4 mm UNDER ARM</text>
        </>
      )}
    </g>
  )
}

/* -------------------------------------------------------------- sheets */

function pickScale(mastMm: number) {
  for (const s of [4, 5, 6, 8, 10]) {
    const k = PAPER_MM / s
    if ((GEO.diameterMm + HH + mastMm + 50) * k + 150 < HT - 2 * M - 40) return { s, k }
  }
  return { s: 10, k: PAPER_MM / 10 }
}

export function GeneralArrangementSheet({ mastMm, guys }: { mastMm: number; guys: boolean }) {
  const { s, k } = pickScale(mastMm)
  const floor = HT - M - 92
  const fx = M + 40 + R * k + 30
  const sx = fx + R * k * 2 + 110
  const topZ = HH + mastMm + PH_H / 2
  const frontTop = floor - topZ * k
  const planCy = frontTop - 58 - R * k
  const front: Proj = { k, ox: fx, oy: floor }
  const side: Proj = { k, ox: sx, oy: floor }
  const plan: Proj = { k, ox: fx, oy: planCy }
  const D = (z: number) => floor - (HH + z) * k
  const tableX = W - M - 430
  const rows = PRINTED
  const shopY = M + 62
  return (
    <svg id="sheet-ga" className="sheet" viewBox={`0 0 ${W} ${HT}`} xmlns="http://www.w3.org/2000/svg">
      <SheetStyle />
      <Frame title="KEEL GENERAL ARRANGEMENT" dwg="900-TP-001" sheet="1 OF 6" scale={`1:${s}`} />

      <PlanView p={plan} guys={guys} />
      <FrontView p={front} mastMm={mastMm} guys={guys} />
      <SideView p={side} mastMm={mastMm} guys={guys} />

      <text className="s-view" x={fx} y={planCy - R * k - 26} textAnchor="middle">TOP</text>
      <text className="s-view" x={fx} y={floor + 66} textAnchor="middle">FRONT · SCREEN TOWARD YOU</text>
      <text className="s-view" x={sx} y={floor + 66} textAnchor="middle">RIGHT · BUMPER LEFT</text>

      {/* Front view dimensions */}
      <DimH x1={fx - R * k} x2={fx + R * k} y1={floor} y={floor + 24} text={`Ø${GEO.diameterMm}`} letter="A" />
      <DimH x1={fx - 150 * k} x2={fx + 150 * k} y1={D(19.5)} y={floor + 46} text={`${GEO.sideAnchorXmm * 2} GUY ANCHORS`} letter="J" />
      <DimV y1={floor} y2={D(0)} x1={fx - R * k} x={fx - R * k - 18} text={`${HH}`} letter="B" />
      <DimV y1={D(0)} y2={D(mastMm)} x1={fx + R * k - 30} x2={fx + 6} x={fx + R * k + 18} text={`${mastMm}`} letter="G" />
      <DimV y1={floor} y2={D(mastMm)} x1={fx + R * k} x2={fx + 6} x={fx + R * k + 40} text={`${HH + mastMm} FLOOR TO LENS`} />
      <DimH x1={fx - (PH_W / 2) * k} x2={fx + (PH_W / 2) * k} y1={D(mastMm + PH_H / 2)} y={D(mastMm + PH_H / 2) - 18} text={`${PH_W} × ${PH_H}`} letter="H" />

      {/* Side view dimensions */}
      <DimH x1={sx} x2={sx + GEO.studBehindCenterMm * k} y1={D(-4)} y={floor + 24} text={`${GEO.studBehindCenterMm}`} letter="E" />
      <DimH x1={sx} x2={sx - GEO.aftAnchorZmm * k} y1={D(14.5)} y={floor + 46} text={`${Math.abs(GEO.aftAnchorZmm)} AFT ANCHOR`} />
      <DimH x1={sx} x2={sx - ARM_Y * k} y1={D(10)} y={D(mastMm * 0.28)} text={`${Math.abs(ARM_Y)}`} letter="D" />
      <DimV y1={D(4)} y2={D(10)} x1={sx + 60 * k} x={sx + 18 * k} text="6" />

      {/* Balloons: printed parts */}
      <Balloon x={sx + 140 * k} y={D(7)} tx={sx + 150 * k} ty={D(78)} label="101" />
      <Balloon x={sx + 28 * k} y={D(17)} tx={sx - 40 * k} ty={D(92)} label="102" />
      <Balloon x={sx + 120 * k} y={D(mastMm - 66)} tx={sx + 210 * k} ty={D(mastMm - 30)} label="103" />
      <Balloon x={sx + 70 * k} y={D(48)} tx={sx + 40 * k} ty={D(126)} label="104" />
      <Balloon x={fx - 149 * k} y={D(-1)} tx={fx - 200 * k} ty={D(36)} label="105" />
      <Balloon x={fx + 11 * k} y={D(STACK - 1)} tx={fx + 70 * k} ty={D(76)} label="106" />

      {/* Shop callouts */}
      <g>
        <text className="s-view" x={tableX} y={shopY}>SHOP CALLOUTS</text>
        {SHOP.map((r, i) => (
          <g key={r.call}>
            <Letter x={tableX + 8} y={shopY + 18 + i * 21} l={r.call} />
            <text className="s-cell" x={tableX + 24} y={shopY + 22 + i * 21}>{r.mm}</text>
            <text className="s-lbls" x={tableX + 118} y={shopY + 22 + i * 21}>
              {r.note.split(". ")[0].replace(/\.$/, "").slice(0, 50)}
            </text>
          </g>
        ))}
      </g>

      {/* Parts list */}
      <g>
        {(() => {
          const y0 = HT - M - 118 - 22 - rows.length * 18
          const cols = [0, 34, 116, 300, 350, 430]
          return (
            <g>
              <rect className="s-frame" x={tableX} y={y0} width={430} height={22 + rows.length * 18} fill={C.paper} />
              {cols.slice(1, -1).map((c) => (
                <line key={c} className="s-grid" x1={tableX + c} y1={y0} x2={tableX + c} y2={y0 + 22 + rows.length * 18} />
              ))}
              <line className="s-grid" x1={tableX} y1={y0 + 18} x2={tableX + 430} y2={y0 + 18} />
              {["ITEM", "PART NO", "DESCRIPTION", "QTY", "MATL"].map((h, i) => (
                <text key={h} className="s-cap" x={tableX + cols[i] + 6} y={y0 + 12}>{h}</text>
              ))}
              {rows.map((r, i) => (
                <g key={r.no}>
                  {[r.no.slice(-3), r.no, r.name, r.qty, r.mat].map((v, j) => (
                    <text key={j} className="s-cell" style={{ fontSize: 10 }} x={tableX + cols[j] + 6} y={y0 + 32 + i * 18}>
                      {v}
                    </text>
                  ))}
                </g>
              ))}
            </g>
          )
        })()}
      </g>

      <text className="s-lbls" x={M + 10} y={HT - M - 8}>
        MAST G FOLLOWS THE SLIDER ({mastMm}). GUYS {guys ? "SHOWN" : "OMITTED"}. {jointsForMast(mastMm) === 0 ? "BUTT SECTION ONLY, NO SLIP JOINT OPEN." : `${jointsForMast(mastMm)} SLIP JOINT(S) OPEN: EXPECT SHAKE.`}
      </text>
    </svg>
  )
}

export function DeckSheet() {
  const s = 2
  const k = PAPER_MM / s
  const cx = M + 40 + (R + 30) * k
  const cy = HT / 2 + 8
  const plan: Proj = { k, ox: cx, oy: cy }
  const X = (x: number) => cx - x * k
  const Y = (y: number) => cy + y * k
  const tx = W - M - 430
  const coords: [string, string, string, string][] = [
    ["Stud, 1/4-20", "0", "−120", "+38 tip"],
    ["Guy anchor, robot right", "+150", "−30", "+19.5"],
    ["Guy anchor, robot left", "−150", "−30", "+19.5"],
    ["Guy anchor, aft", "0", "−162", "+14.5"],
    ["Spine feet (4)", "±42", "−68 / −162", "0"],
    ["Arm feet (2)", "±149", "−30", "0"],
    ["Pod centre", "+34", "−94", "+10"],
    ["E-stop", "+34", "−79", "+34.5"],
    ["Bank axis", "−32", "−165 … −70", "+21.3"],
    ["Handle bar (assumed Ø10)", "0", "−159.7", "−1"],
    ["Camera window", "0", "+128 … +148", "0"],
  ]
  return (
    <svg id="sheet-deck" className="sheet" viewBox={`0 0 ${W} ${HT}`} xmlns="http://www.w3.org/2000/svg">
      <SheetStyle />
      <Frame title="DECK LAYOUT AND KEEP-OUTS" dwg="900-TP-002" sheet="2 OF 6" scale={`1:${s}`} />
      <PlanView p={plan} guys detail />
      <text className="s-view" x={cx} y={Y(R + 46)} textAnchor="middle">TOP · BUMPER DOWN THE SHEET</text>

      <DimH x1={X(150)} x2={X(-150)} y1={Y(-30)} y={Y(-R - 30)} text={`${GEO.sideAnchorXmm * 2}`} letter="J" />
      <DimH x1={X(50)} x2={X(-50)} y1={Y(-170)} y={Y(-R - 10)} text={`${GEO.spineWmm}`} letter="C" />
      <DimH x1={X(R)} x2={X(-R)} y1={Y(0)} y={Y(R + 26)} text={`Ø${GEO.diameterMm}`} letter="A" />
      <DimV y1={Y(0)} y2={Y(-30)} x1={X(-158)} x={X(-R - 22)} text="30" letter="D" />
      <DimV y1={Y(0)} y2={Y(STUD_Y)} x1={X(-15)} x={X(-R - 46)} text={`${GEO.studBehindCenterMm}`} letter="E" />
      <DimV y1={Y(0)} y2={Y(AFT_Y)} x1={X(-4)} x={X(-R - 70)} text={`${Math.abs(AFT_Y)}`} />
      <DimV y1={Y(-60)} y2={Y(-170)} x1={X(50)} x={X(R + 22)} text={`${GEO.spineLmm}`} letter="C" />

      <g>
        <text className="s-view" x={tx} y={M + 66}>COORDINATES · ORIGIN ROBOT CENTRE ON DECK</text>
        <text className="s-lbls" x={tx} y={M + 82}>+X ROBOT RIGHT · +Y FORWARD · +Z UP · mm</text>
        {["FEATURE", "X", "Y", "Z"].map((h, i) => (
          <text key={h} className="s-cap" x={tx + [0, 220, 280, 370][i]} y={M + 104}>{h}</text>
        ))}
        <line className="s-grid" x1={tx} y1={M + 109} x2={tx + 430} y2={M + 109} />
        {coords.map((r, i) => (
          <g key={r[0]}>
            {r.map((v, j) => (
              <text key={j} className="s-cell" style={{ fontSize: 10.5 }} x={tx + [0, 220, 280, 370][j]} y={M + 126 + i * 19}>
                {v}
              </text>
            ))}
          </g>
        ))}
      </g>
      <g>
        {[
          ["s-danger", "BUMPER TRAVEL. Nothing bridges the bumper to the body. Leave a few mm of travel all round."],
          ["s-keep", "PLANFORM Ø353 + 6. Every printed part stays inside it; door frames only see the robot."],
          ["s-keep", "CAMERA AND IR DOME. Dock-seek (opcode 143) still needs both. The saddle stays behind them."],
          ["s-hid", "HANDLE BAR. Hook slot = measured bar + 0.6. Edit HANDLE_BAR_D before printing 101."],
          ["s-guy", "GUYS. Three 1.2 mm Dyneema lines, ring to lugs, light even pretension."],
        ].map(([cls, t], i) => (
          <g key={i} transform={`translate(${tx} ${M + 360 + i * 34})`}>
            <line className={cls} x1={0} y1={0} x2={26} y2={0} />
            <text className="s-lbls" x={36} y={3.5}>{t.length > 64 ? t.slice(0, t.lastIndexOf(" ", 64)) : t}</text>
            {t.length > 64 && <text className="s-lbls" x={36} y={16}>{t.slice(t.lastIndexOf(" ", 64) + 1)}</text>}
          </g>
        ))}
      </g>
    </svg>
  )
}

/** A sheet generated by cadgen from the STEP model, shown as an image on paper. */
export function CadSheet({ src, alt }: { src: string; alt: string }) {
  return <img className="cad-sheet" src={src} alt={alt} />
}

export function SheetCaption({ children }: { children: ReactNode }) {
  return <p className="sheet-cap">{children}</p>
}
