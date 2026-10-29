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
