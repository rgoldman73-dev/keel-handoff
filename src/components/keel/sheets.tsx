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
