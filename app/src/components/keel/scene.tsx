import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Canvas, useFrame, useThree, type ThreeElements, type ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { GEO, jointsForMast, type CamView, type PartId, type Piece } from "@/lib/keel/data"
// Printed parts are the real CAD meshes (cad/src → cadgen → GLB), not stand-ins.
import spineGlb from "@/assets/spine.glb?inline"
import armGlb from "@/assets/arm.glb?inline"
import ringGlb from "@/assets/guy_ring.glb?inline"
import podBaseGlb from "@/assets/pod_base.glb?inline"
import podLidGlb from "@/assets/pod_lid.glb?inline"

export type SceneProps = {
  explode: number
  mastMm: number
  guys: boolean
  selected: PartId
  onSelect: (id: PartId) => void
  /** Build tab: only these pieces are drawn. Undefined draws everything. */
  show?: Piece[]
  /** Build tab: these pieces glow instead of the selected part. */
  focus?: Piece[]
  /** Build tab: fly the camera to a preset. Undefined leaves the orbit free. */
  view?: CamView
}

const R = GEO.diameterMm / 2000
const H = GEO.heightMm / 1000
const mm = (v: number) => v / 1000

// Stack heights above the deck, from cad/src/keel_dims.py
const PLATE_TOP = mm(10)
const BOSS_TOP = mm(22)
const JAM_NUT = mm(5.5)
const WASHER = mm(2)
const STUD_Z = -GEO.studBehindCenterMm / 1000
const PHONE_FWD = mm(18) // phone centre sits ahead of the stick axis
const RING_BELOW_PHONE = mm(72)

const COPPER = new THREE.Color("#d4783a")

/* ---------------------------------------------------------------- context */

type Ctx = { selected: PartId; focus: Set<Piece> | null; show: Set<Piece> | null; onSelect: (id: PartId) => void }
const SceneCtx = createContext<Ctx>({ selected: "saddle", focus: null, show: null, onSelect: () => {} })

function useHot(part: PartId, piece: Piece) {
  const c = useContext(SceneCtx)
  return c.focus ? c.focus.has(piece) : c.selected === part
}

function Visible({ piece, children }: { piece: Piece; children: ReactNode }) {
  const c = useContext(SceneCtx)
  return c.show && !c.show.has(piece) ? null : <>{children}</>
}

/** A clickable group that selects a part and shows a pointer. */
function Pick({ part, children, ...rest }: { part: PartId; children: ReactNode } & ThreeElements["group"]) {
  const { onSelect } = useContext(SceneCtx)
  const gl = useThree((s) => s.gl)
  return (
    <group
      {...rest}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onSelect(part)
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        gl.domElement.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = ""
      }}
    >
      {children}
    </group>
  )
}

type MatProps = {
  part: PartId
  piece: Piece
  color: string
  rough?: number
  metal?: number
  coat?: number
  coatRough?: number
  opacity?: number
  side?: THREE.Side
}

function Mat({ part, piece, color, rough = 0.5, metal = 0, coat = 0, coatRough = 0.2, opacity = 1, side }: MatProps) {
  const hot = useHot(part, piece)
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={rough}
      metalness={metal}
      clearcoat={coat}
      clearcoatRoughness={coatRough}
      emissive={hot ? COPPER : "#000000"}
      emissiveIntensity={hot ? 0.42 : 0}
      transparent={opacity < 1}
      opacity={opacity}
      side={side ?? THREE.FrontSide}
    />
  )
}

/* -------------------------------------------------------------- geometry */

type ProfilePt = { p: THREE.Vector2; n: THREE.Vector2 }

function arc(cx: number, cy: number, r: number, a0: number, a1: number, steps: number): ProfilePt[] {
  const out: ProfilePt[] = []
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    const n = new THREE.Vector2(Math.cos(a), Math.sin(a))
    out.push({ p: new THREE.Vector2(cx + r * n.x, cy + r * n.y), n })
  }
  return out
}

/** Roomba 900 side profile: radius vs height, metres. 353 × 92, eased edges. */
function shellProfile(): ProfilePt[] {
  const bottomR = 0.012
  const topR = 0.016
  return [
    { p: new THREE.Vector2(0, 0.008), n: new THREE.Vector2(0, -1) },
    ...arc(R - bottomR, 0.008 + bottomR, bottomR, -Math.PI / 2, 0, 8),
    ...arc(R - topR, H - topR, topR, 0, Math.PI / 2, 14),
    { p: new THREE.Vector2(0, H), n: new THREE.Vector2(0, 1) },
  ]
}

function useRobotGeometry() {
  return useMemo(() => {
    const prof = shellProfile()
    const shell = new THREE.LatheGeometry(
      prof.map((q) => q.p),
      160,
    )
    // Bumper: the front 200° of the side wall, offset 1.5 mm outward, up onto the top edge.
    const band = prof.filter((q) => q.p.y > 0.013 && q.p.y < 0.0895 && q.p.x > 0.15)
    const bumperPts = band.map((q) => q.p.clone().addScaledVector(q.n, 0.0015))
    const bumper = new THREE.LatheGeometry(bumperPts, 120, -1.745, 3.49)
    const rubberPts = band.filter((q) => q.p.y < 0.028).map((q) => q.p.clone().addScaledVector(q.n, 0.0024))
    const rubber = new THREE.LatheGeometry(rubberPts, 120, -1.745, 3.49)
    // Tyre with a crowned tread
    const tyrePts: THREE.Vector2[] = []
    const wr = GEO.wheelDiaMm / 2000
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      const y = -0.011 + 0.022 * t
      tyrePts.push(new THREE.Vector2(wr - 0.0035 * Math.pow(2 * t - 1, 4), y))
    }
    const tyre = new THREE.LatheGeometry([new THREE.Vector2(wr - 0.012, -0.011), ...tyrePts, new THREE.Vector2(wr - 0.012, 0.011)], 48)
    tyre.rotateZ(Math.PI / 2)
    return { shell, bumper, rubber, tyre }
  }, [])
}

function decodeDataUrl(url: string): ArrayBuffer {
  const bin = atob(url.slice(url.indexOf(",") + 1))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

function parseGlb(url: string): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(
      decodeDataUrl(url),
      "",
      (gltf) => {
        gltf.scene.updateMatrixWorld(true)
        const parts: THREE.BufferGeometry[] = []
        gltf.scene.traverse((o) => {
          const m = o as THREE.Mesh
          if (m.isMesh) {
            const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
            for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k)
            parts.push(g.index ? g.toNonIndexed() : g)
          }
        })
        const g = parts.length === 1 ? parts[0] : mergeGeometries(parts)
        if (!g.attributes.normal) g.computeVertexNormals()
        resolve(g)
      },
      reject,
    )
  })
}

type CadGeo = { spine: THREE.BufferGeometry; arm: THREE.BufferGeometry; ring: THREE.BufferGeometry; podBase: THREE.BufferGeometry; podLid: THREE.BufferGeometry }

let cadPromise: Promise<CadGeo> | null = null
function loadCad() {
  if (!cadPromise) {
    cadPromise = Promise.all([spineGlb, armGlb, ringGlb, podBaseGlb, podLidGlb].map(parseGlb)).then(
      ([spine, arm, ring, podBase, podLid]) => ({ spine, arm, ring, podBase, podLid }),
    )
  }
  return cadPromise
}

function useCad() {
  const [cad, setCad] = useState<CadGeo | null>(null)
  useEffect(() => {
    let live = true
    loadCad()
      .then((c) => live && setCad(c))
      .catch(() => {
        cadPromise = null
      })
    return () => {
      live = false
    }
  }, [])
  return cad
}

/** A live video call, drawn once, for the phone screen. */
function useScreenTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas")
    c.width = 1024
    c.height = 498
    const g = c.getContext("2d")!
    const bg = g.createRadialGradient(560, 210, 40, 520, 260, 620)
    bg.addColorStop(0, "#8a6a4f")
    bg.addColorStop(0.45, "#4b3a2d")
    bg.addColorStop(1, "#15120f")
    g.fillStyle = bg
    g.fillRect(0, 0, c.width, c.height)
    // Out-of-focus room: a lamp and a shelf
    g.filter = "blur(18px)"
    g.fillStyle = "rgba(255,214,150,0.55)"
    g.beginPath()
    g.arc(170, 150, 70, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = "rgba(60,80,90,0.6)"
    g.fillRect(760, 60, 220, 300)
    g.fillStyle = "rgba(190,140,90,0.35)"
    g.fillRect(780, 120, 180, 30)
    g.fillRect(780, 220, 180, 30)
    g.filter = "none"
    // The remote person
    g.fillStyle = "#33485e"
    g.beginPath()
    g.ellipse(520, 520, 230, 170, 0, Math.PI, 0)
    g.fill()
    g.fillStyle = "#c0907a"
    g.fillRect(488, 300, 64, 70)
    g.beginPath()
    g.ellipse(520, 235, 82, 100, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = "#2a1c15"
    g.beginPath()
    g.ellipse(520, 175, 92, 62, 0, Math.PI, 0)
    g.fill()
    g.fillRect(430, 170, 22, 70)
    g.fillRect(588, 170, 22, 70)
    // Self view
    g.fillStyle = "rgba(0,0,0,0.35)"
    g.fillRect(842, 318, 156, 156)
    g.fillStyle = "#3b3631"
    g.fillRect(848, 324, 144, 144)
    g.fillStyle = "#1d1b19"
    g.fillRect(848, 410, 144, 58)
    g.fillStyle = "#6c645a"
    g.fillRect(890, 380, 60, 30)
    // Call controls and timer
    const btn = (x: number, col: string) => {
      g.fillStyle = col
      g.beginPath()
      g.arc(x, 440, 26, 0, Math.PI * 2)
      g.fill()
    }
    btn(430, "rgba(255,255,255,0.22)")
    btn(510, "rgba(255,255,255,0.22)")
    btn(590, "#d4483a")
    g.fillStyle = "rgba(255,255,255,0.85)"
    g.font = "500 26px Outfit, system-ui, sans-serif"
    g.fillText("KEEL · 04:12", 40, 52)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])
}

/** Soft contact shadow, baked into a static texture. No readback. */
function useShadowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas")
    c.width = c.height = 256
    const g = c.getContext("2d")!
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, "rgba(0,0,0,0.85)")
    grad.addColorStop(0.62, "rgba(0,0,0,0.7)")
    grad.addColorStop(0.74, "rgba(0,0,0,0.28)")
    grad.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
}

/* ------------------------------------------------------------------ parts */

function RobotBase({ explode: e }: { explode: number }) {
  const geo = useRobotGeometry()
  const wr = GEO.wheelDiaMm / 2000
  return (
    <group>
      <Pick part="shell">
        <mesh geometry={geo.shell}>
          <Mat part="shell" piece="robot" color="#101113" rough={0.5} metal={0.1} coat={0.55} coatRough={0.32} />
        </mesh>
        {/* Top face trim ring and the raised centre panel */}
        <mesh position={[0, H + 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.152, 0.1545, 128]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, H + 0.0006, 0.005]}>
          <cylinderGeometry args={[0.044, 0.045, 0.0012, 96]} />
          <meshPhysicalMaterial color="#0d0e10" roughness={0.18} clearcoat={1} clearcoatRoughness={0.05} />
        </mesh>
        <mesh position={[0, H + 0.0016, 0.005]}>
          <cylinderGeometry args={[0.021, 0.021, 0.0016, 64]} />
          <meshStandardMaterial color="#8d9299" roughness={0.32} metalness={0.9} />
        </mesh>
        <mesh position={[0, H + 0.0014, 0.005]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.0235, 0.0262, 96]} />
          <meshStandardMaterial color="#b8f0d6" emissive="#7fe0b2" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.034, H + 0.0014, 0.005]}>
            <cylinderGeometry args={[0.0055, 0.0055, 0.001, 32]} />
            <meshStandardMaterial color="#2a2c2f" roughness={0.4} />
          </mesh>
        ))}
        {/* Rear carry handle, flush in its recess. The saddle hook goes under the bar. */}
        <mesh position={[0, H + 0.0003, -0.1597]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, 0.024]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <mesh position={[0, H - 0.0012, -0.1597]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.064, 24]} />
          <meshStandardMaterial color="#2b2c2e" roughness={0.45} metalness={0.2} />
        </mesh>
        {/* Rear-right trim over the service port */}
        <mesh position={[-0.118, H + 0.0004, -0.112]} rotation={[0, 0.82, 0]}>
          <boxGeometry args={[0.05, 0.0012, 0.026]} />
          <meshStandardMaterial color="#26282b" roughness={0.5} metalness={0.3} />
        </mesh>
      </Pick>

      <Pick part="camera">
        <mesh position={[0, H - 0.0005, 0.138]} rotation={[-0.32, 0, 0]}>
          <primitive object={useMemo(() => new RoundedBoxGeometry(0.046, 0.006, 0.02, 2, 0.002), [])} attach="geometry" />
          <Mat part="camera" piece="robot" color="#030507" rough={0.06} coat={1} coatRough={0.02} metal={0.2} />
        </mesh>
        <mesh position={[0, H - 0.004, 0.161]}>
          <sphereGeometry args={[0.0085, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Mat part="camera" piece="robot" color="#140c10" rough={0.12} coat={1} opacity={0.92} />
        </mesh>
      </Pick>

      <Pick part="bumper" position={[0, 0, e * 0.06]}>
        <mesh geometry={geo.bumper}>
          <Mat part="bumper" piece="robot" color="#121315" rough={0.42} metal={0.1} coat={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={geo.rubber}>
          <Mat part="bumper" piece="robot" color="#0a0a0a" rough={0.92} side={THREE.DoubleSide} />
        </mesh>
      </Pick>

      <Pick part="wheels">
        {([-1, 1] as const).map((side) => (
          <group
            key={side}
            position={[side * (GEO.wheelTrackMm / 2000 + e * 0.07), wr, GEO.wheelZmm / 1000]}
          >
            <mesh geometry={geo.tyre}>
              <Mat part="wheels" piece="robot" color="#141414" rough={0.9} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[wr - 0.012, wr - 0.012, 0.018, 32]} />
              <Mat part="wheels" piece="robot" color="#3a3b3d" rough={0.5} metal={0.4} />
            </mesh>
          </group>
        ))}
      </Pick>

      <Pick part="caster" position={[0, 0.016, 0.115 + e * 0.03]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.012, 24]} />
          <Mat part="caster" piece="robot" color="#222222" rough={0.6} />
        </mesh>
      </Pick>

      <Visible piece="brush">
        <Pick part="brush" position={[-0.128 - e * 0.05, 0.007 - e * 0.004, 0.105]}>
          <mesh>
            <cylinderGeometry args={[0.01, 0.012, 0.006, 24]} />
            <Mat part="brush" piece="brush" color="#2a2a2a" rough={0.7} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3 + 0.4, 0]}>
              <boxGeometry args={[0.003, 0.0015, 0.058]} />
              <Mat part="brush" piece="brush" color="#151515" rough={0.95} />
            </mesh>
          ))}
        </Pick>
      </Visible>
    </group>
  )
}

/** Printed saddle, pod and bank in the CAD frame (GLB Y-up, turned 180° so +Z faces the bumper). */
function Saddle({ cad, explode: e }: { cad: CadGeo | null; explode: number }) {
  const petg = { color: "#e6dac4", rough: 0.48, coat: 0.25, coatRough: 0.5 }
  const lift = e * 0.05
  const nut = useMemo(() => new THREE.CylinderGeometry(0.0064, 0.0064, JAM_NUT, 6), [])
  return (
    <group position={[0, lift, 0]}>
      <Visible piece="pads">
        <Pick part="saddle" position={[0, -e * 0.03, 0]}>
          {[
            [-42, -68],
            [42, -68],
            [-42, -162],
            [42, -162],
            [149, -30],
            [-149, -30],
          ].map(([x, y], i) => (
            <mesh key={i} position={[-mm(x), H + mm(1), mm(y)]}>
              <cylinderGeometry args={[0.006, 0.006, 0.002, 24]} />
              <Mat part="saddle" piece="pads" color="#26292b" rough={0.9} />
            </mesh>
          ))}
        </Pick>
      </Visible>
      {cad && (
        <group position={[0, H, 0]} rotation={[0, Math.PI, 0]}>
          <Visible piece="spine">
            <Pick part="saddle">
              <mesh geometry={cad.spine}>
                <Mat part="saddle" piece="spine" {...petg} />
              </mesh>
            </Pick>
          </Visible>
          <Visible piece="arms">
            <Pick part="saddle" position={[0, e * 0.03, 0]}>
              <mesh geometry={cad.arm} position={[e * 0.03, 0, 0]}>
                <Mat part="saddle" piece="arms" {...petg} />
              </mesh>
              <mesh geometry={cad.arm} scale={[-1, 1, 1]} position={[-e * 0.03, 0, 0]}>
                <Mat part="saddle" piece="arms" {...petg} />
              </mesh>
            </Pick>
          </Visible>
          <Visible piece="pod">
            <Pick part="pod" position={[0, e * 0.05, 0]}>
              <mesh geometry={cad.podBase}>
                <Mat part="pod" piece="pod" color="#33373b" rough={0.55} coat={0.2} />
              </mesh>
            </Pick>
          </Visible>
          <Visible piece="podlid">
            <Pick part="pod" position={[0, e * 0.13, 0]}>
              <mesh geometry={cad.podLid}>
                <Mat part="pod" piece="podlid" color="#33373b" rough={0.55} coat={0.2} />
              </mesh>
              {/* E-stop cap in the lid */}
              <mesh position={[mm(34), mm(37.4), mm(79)]}>
                <cylinderGeometry args={[0.0074, 0.0078, 0.006, 32]} />
                <Mat part="pod" piece="podlid" color="#c23a2c" rough={0.35} coat={0.6} />
              </mesh>
              <mesh position={[mm(34), mm(35), mm(79)]}>
                <cylinderGeometry args={[0.0098, 0.0098, 0.0012, 32]} />
                <meshStandardMaterial color="#c9c6bf" metalness={0.9} roughness={0.3} />
              </mesh>
            </Pick>
          </Visible>
          <Visible piece="board">
            <Pick part="pod" position={[mm(34), mm(21) + e * 0.08, mm(94)]}>
              <mesh>
                <boxGeometry args={[0.0284, 0.0016, 0.0515]} />
                <Mat part="pod" piece="board" color="#1f3a2c" rough={0.6} />
              </mesh>
              <mesh position={[0, 0.0018, 0.012]}>
                <boxGeometry args={[0.018, 0.0028, 0.0255]} />
                <meshStandardMaterial color="#b8bcc0" metalness={0.95} roughness={0.28} />
              </mesh>
              <mesh position={[0, 0.0016, -0.0235]}>
                <boxGeometry args={[0.008, 0.003, 0.006]} />
                <meshStandardMaterial color="#9da2a6" metalness={0.9} roughness={0.3} />
              </mesh>
            </Pick>
          </Visible>
          <Visible piece="bank">
            <Pick part="pod" position={[mm(-32) - e * 0.04, mm(21.3) + e * 0.06, mm(117.5)]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.0115, 0.0115, 0.095, 40]} />
                <Mat part="pod" piece="bank" color="#4d5d6c" rough={0.32} metal={0.75} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[0, 0, s * 0.0478]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.0112, 0.0112, 0.002, 40]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
                </mesh>
              ))}
            </Pick>
          </Visible>
          <Visible piece="stud">
            <Pick part="saddle" position={[0, e * 0.06, mm(120)]}>
              <mesh position={[0, mm(21), 0]}>
                <cylinderGeometry args={[0.00317, 0.00317, 0.034, 16]} />
                <meshStandardMaterial color="#c3c7cb" metalness={0.95} roughness={0.32} />
              </mesh>
              <mesh geometry={nut} position={[0, BOSS_TOP + JAM_NUT / 2, 0]}>
                <meshStandardMaterial color="#b5b9bd" metalness={0.95} roughness={0.3} />
              </mesh>
            </Pick>
          </Visible>
        </group>
      )}
    </group>
  )
}

function Tube({ points, radius, color, part, piece }: { points: THREE.Vector3[]; radius: number; color: string; part: PartId; piece: Piece }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, radius, 10), [points, radius])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo}>
      <Mat part={part} piece={piece} color={color} rough={0.7} />
    </mesh>
  )
}

function Cables({ explode: e }: { explode: number }) {
  const lift = e * 0.05
  const pts = useMemo(() => {
    const y = H + lift
    const service = [
      new THREE.Vector3(-0.052, y + 0.016 + e * 0.05, -0.104),
      new THREE.Vector3(-0.074, y + 0.014, -0.106),
      new THREE.Vector3(-0.1, y + 0.006, -0.11),
      new THREE.Vector3(-0.116, H + 0.0012, -0.113),
    ]
    const usb = [
      new THREE.Vector3(0.032 + e * 0.04, y + 0.021 + e * 0.06, -0.166),
      new THREE.Vector3(0.026, y + 0.022, -0.176),
      new THREE.Vector3(-0.008, y + 0.03, -0.175),
      new THREE.Vector3(-0.03, y + 0.024, -0.14),
      new THREE.Vector3(-0.034, y + 0.019 + e * 0.05, -0.127),
    ]
    return { service, usb }
  }, [lift, e])
  return (
    <Visible piece="cable">
      <Pick part="pod">
        <Tube points={pts.service} radius={0.0017} color="#141414" part="pod" piece="cable" />
        <Visible piece="bank">
          <Tube points={pts.usb} radius={0.0015} color="#202020" part="pod" piece="cable" />
        </Visible>
      </Pick>
    </Visible>
  )
}

function Mast({ cad, explode: e, mastMm }: { cad: CadGeo | null; explode: number; mastMm: number }) {
  const screen = useScreenTexture()
  const lift = e * 0.05 + e * 0.04
  const foot = H + BOSS_TOP + JAM_NUT + WASHER + lift
  const phoneY = H + mm(mastMm) + e * 0.14
  const tip = phoneY - 0.058
  const joints = jointsForMast(mastMm)
  const buttMax = H + 0.52 - 0.058 - (H + BOSS_TOP + JAM_NUT + WASHER)
  const total = tip - foot
  const sections = useMemo(() => {
    const out: { y0: number; y1: number; r: number }[] = []
    const butt = joints === 0 ? total : Math.min(total, buttMax)
    out.push({ y0: foot + 0.012, y1: foot + butt, r: 0.0065 })
    if (joints > 0) {
      const each = (total - butt) / joints
      for (let i = 0; i < joints; i++) {
        const y0 = foot + butt + i * each
        out.push({ y0: y0 - 0.02, y1: y0 + each, r: 0.0065 - (i + 1) * 0.0011 })
      }
    }
    return out
  }, [foot, total, joints, buttMax])
  const gripLen = Math.min(0.11, total * 0.4)
  const ringY = phoneY - RING_BELOW_PHONE - e * 0.06
  const phoneGeo = useMemo(() => new RoundedBoxGeometry(mm(GEO.phoneWmm), mm(GEO.phoneHmm), mm(GEO.phoneTmm), 4, 0.0055), [])
  const jawGeo = useMemo(() => new RoundedBoxGeometry(0.034, 0.009, 0.024, 2, 0.0025), [])
  const bodyGeo = useMemo(() => new RoundedBoxGeometry(0.03, 0.084, 0.012, 2, 0.004), [])
  const phoneZ = STUD_Z + PHONE_FWD

  return (
    <group>
      <Visible piece="washer">
        <Pick part="saddle" position={[0, H + BOSS_TOP + JAM_NUT + WASHER / 2 + lift - e * 0.02, STUD_Z]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, WASHER, 40]} />
            <Mat part="saddle" piece="washer" color="#26292b" rough={0.9} />
          </mesh>
        </Pick>
      </Visible>

      <Visible piece="stick">
        <Pick part="mast" position={[0, 0, STUD_Z]}>
          <mesh position={[0, foot + 0.006, 0]}>
            <cylinderGeometry args={[0.0118, 0.0124, 0.012, 40]} />
            <Mat part="mast" piece="stick" color="#2d2f31" rough={0.35} metal={0.8} />
          </mesh>
          <mesh position={[0, foot + 0.012 + gripLen / 2, 0]}>
            <cylinderGeometry args={[0.0122, 0.0122, gripLen, 40]} />
            <Mat part="mast" piece="stick" color="#161718" rough={0.88} />
          </mesh>
          {sections.map((s, i) => (
            <group key={i}>
              <mesh position={[0, (s.y0 + s.y1) / 2, 0]}>
                <cylinderGeometry args={[s.r, s.r, s.y1 - s.y0, 32]} />
                <Mat part="mast" piece="stick" color={i === 0 ? "#55595e" : "#7d8288"} rough={0.28} metal={0.9} />
              </mesh>
              {i > 0 && (
                <mesh position={[0, s.y0 + 0.02, 0]}>
                  <cylinderGeometry args={[s.r + 0.0022, s.r + 0.0022, 0.012, 32]} />
                  <Mat part="mast" piece="stick" color="#1b1b1b" rough={0.6} />
                </mesh>
              )}
            </group>
          ))}
        </Pick>
      </Visible>

      <Visible piece="ring">
        {cad && (
          <Pick part="guys" position={[0, ringY, STUD_Z]}>
            <mesh geometry={cad.ring}>
              <Mat part="guys" piece="ring" color="#c9692f" rough={0.45} coat={0.3} />
            </mesh>
          </Pick>
        )}
      </Visible>

      <Visible piece="clamp">
        <Pick part="phone">
          <group position={[0, phoneY, STUD_Z]}>
            <mesh position={[0, -0.051, 0]}>
              <sphereGeometry args={[0.0085, 24, 16]} />
              <Mat part="phone" piece="clamp" color="#202224" rough={0.4} metal={0.5} />
            </mesh>
            <mesh position={[0, -0.046, 0.004]}>
              <cylinderGeometry args={[0.005, 0.005, 0.012, 16]} />
              <Mat part="phone" piece="clamp" color="#202224" rough={0.4} metal={0.5} />
            </mesh>
            <mesh geometry={bodyGeo} position={[0, 0, 0.008]}>
              <Mat part="phone" piece="clamp" color="#202224" rough={0.6} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={jawGeo} position={[0, s * (mm(GEO.phoneHmm) / 2 + 0.0045), 0.014]}>
                <Mat part="phone" piece="clamp" color="#191a1b" rough={0.75} />
              </mesh>
            ))}
            <mesh position={[0.019, -0.04, 0.008]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.007, 0.007, 0.006, 20]} />
              <Mat part="phone" piece="clamp" color="#2a2b2d" rough={0.5} />
            </mesh>
          </group>
        </Pick>
      </Visible>

      <Visible piece="phone">
        <Pick part="phone" position={[0, phoneY, phoneZ]}>
          <mesh geometry={phoneGeo}>
            <Mat part="phone" piece="phone" color="#9ea4aa" rough={0.22} metal={1} />
          </mesh>
          <mesh position={[0, 0, mm(GEO.phoneTmm) / 2 + 0.0002]}>
            <planeGeometry args={[0.1405, 0.0665]} />
            <meshBasicMaterial map={screen} toneMapped={false} color="#e8e8e8" />
          </mesh>
          <mesh position={[-0.0665, 0, mm(GEO.phoneTmm) / 2 + 0.0004]}>
            <circleGeometry args={[0.0018, 20]} />
            <meshBasicMaterial color="#020203" />
          </mesh>
          <mesh position={[0, 0, -mm(GEO.phoneTmm) / 2 - 0.0002]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.142, 0.066]} />
            <meshPhysicalMaterial color="#1c2a36" roughness={0.25} clearcoat={1} clearcoatRoughness={0.05} />
          </mesh>
          <mesh position={[0.05, 0.016, -mm(GEO.phoneTmm) / 2 - 0.0012]}>
            <primitive object={useMemo(() => new RoundedBoxGeometry(0.032, 0.032, 0.0024, 2, 0.006), [])} attach="geometry" />
            <meshPhysicalMaterial color="#20262c" roughness={0.3} metalness={0.4} clearcoat={1} />
          </mesh>
        </Pick>
      </Visible>
    </group>
  )
}

function Guy({ a, b, color }: { a: THREE.Vector3; b: THREE.Vector3; color: string }) {
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([a, b])
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color }))
  }, [a, b, color])
  useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    },
    [line],
  )
  const lock = useMemo(() => a.clone().lerp(b, 0.08), [a, b])
  return (
    <group>
      <primitive object={line} />
      <mesh position={lock}>
        <sphereGeometry args={[0.0032, 12, 8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
    </group>
  )
}

function Guys({ explode: e, mastMm }: { explode: number; mastMm: number }) {
  const hot = useHot("guys", "guys")
  const lift = e * 0.05
  const phoneY = H + mm(mastMm) + e * 0.14
  const ry = phoneY - RING_BELOW_PHONE - e * 0.06 + 0.002
  const k = 0.014
  const lines = useMemo(() => {
    const s = Math.sin((2 * Math.PI) / 3) * k
    const c = 0.5 * k
    return [
      [new THREE.Vector3(-0.15, H + 0.0195 + lift + e * 0.03, -0.03), new THREE.Vector3(-s, ry, STUD_Z + c)],
      [new THREE.Vector3(0.15, H + 0.0195 + lift + e * 0.03, -0.03), new THREE.Vector3(s, ry, STUD_Z + c)],
      [new THREE.Vector3(0, H + 0.0145 + lift, GEO.aftAnchorZmm / 1000), new THREE.Vector3(0, ry, STUD_Z - k)],
    ]
  }, [lift, ry, e])
  return (
    <Pick part="guys">
      {lines.map(([a, b], i) => (
        <Guy key={i} a={a} b={b} color={hot ? "#ffb07a" : "#d4783a"} />
      ))}
      {/* Fat invisible hit targets so a 1 px line is still clickable */}
      {lines.map(([a, b], i) => {
        const mid = a.clone().add(b).multiplyScalar(0.5)
        const len = a.distanceTo(b)
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
        return (
          <mesh key={`h${i}`} position={mid} quaternion={q}>
            <cylinderGeometry args={[0.006, 0.006, len, 6]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        )
      })}
    </Pick>
  )
}

/* ----------------------------------------------------------------- camera */

function viewPose(v: CamView, mastMm: number): [THREE.Vector3, THREE.Vector3] {
  const top = H + mm(mastMm)
  switch (v) {
    case "deck":
      return [new THREE.Vector3(0.3, 0.33, 0.2), new THREE.Vector3(0, 0.095, -0.085)]
    case "rear":
      return [new THREE.Vector3(-0.3, 0.31, -0.36), new THREE.Vector3(0, 0.1, -0.09)]
    case "parts":
      return [new THREE.Vector3(0.4, 0.42, 0.3), new THREE.Vector3(0, 0.14, -0.06)]
    case "side":
      return [new THREE.Vector3(0.7, 0.26, 0.02), new THREE.Vector3(0, top * 0.45, -0.06)]
    case "mast":
      return [new THREE.Vector3(0.52, top * 0.7 + 0.12, 0.42), new THREE.Vector3(0, top * 0.55, -0.08)]
    case "phone":
      return [new THREE.Vector3(0.24, top + 0.1, 0.4), new THREE.Vector3(0, top - 0.01, -0.1)]
    case "robot":
      return [new THREE.Vector3(0.44, 0.34, 0.46), new THREE.Vector3(0, 0.05, 0)]
    default: {
      const ty = Math.max(0.2, top * 0.5)
      return [new THREE.Vector3(0.9, ty + 0.46 + top * 0.08, 0.72), new THREE.Vector3(0, ty, -0.04)]
    }
  }
}

function Cam({ reduced, view, mastMm }: { reduced: boolean; view?: CamView; mastMm: number }) {
  const { camera, gl } = useThree()
  const anim = useRef<{ p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; start: number } | null>(null)
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, gl.domElement)
    c.target.set(0, 0.28, -0.04)
    c.enablePan = false
    c.enableDamping = true
    c.dampingFactor = 0.12
    c.autoRotateSpeed = 0.45
    c.minPolarAngle = 0.25
    c.maxPolarAngle = 1.35
    c.minDistance = 0.35
    c.maxDistance = 1.8
    c.update()
    return c
  }, [camera, gl])
  useEffect(() => {
    controls.autoRotate = !reduced && !view
  }, [controls, reduced, view])
  useEffect(() => {
    const stop = () => {
      anim.current = null
    }
    controls.addEventListener("start", stop)
    return () => {
      controls.removeEventListener("start", stop)
      controls.dispose()
    }
  }, [controls])
  useEffect(() => {
    if (!view) return
    const [p1, t1] = viewPose(view, mastMm)
    if (reduced) {
      camera.position.copy(p1)
      controls.target.copy(t1)
      controls.update()
      return
    }
    anim.current = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, start: performance.now() }
    // Mast changes re-aim only views that depend on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, view === "mast" || view === "phone" ? mastMm : 0])
  useFrame(() => {
    const a = anim.current
    if (a) {
      const t = Math.min(1, (performance.now() - a.start) / 900)
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      camera.position.lerpVectors(a.p0, a.p1, k)
      controls.target.lerpVectors(a.t0, a.t1, k)
      if (t >= 1) anim.current = null
    }
    controls.update()
  })
  return null
}

function Env() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = pm.fromScene(room, 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.62
    room.dispose()
    pm.dispose()
    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [gl, scene])
  return null
}

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

function useFloorTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas")
    c.width = c.height = 256
    const g = c.getContext("2d")!
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, "rgba(0,0,0,0.5)")
    grad.addColorStop(0.35, "rgba(0,0,0,0.38)")
    grad.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
}

function Floor() {
  const shadow = useShadowTexture()
  const floor = useFloorTexture()
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial map={floor} transparent depthWrite={false} color="#000000" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[0.47, 0.47]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} color="#000000" />
      </mesh>
    </group>
  )
}

function Robot(props: SceneProps) {
  const cad = useCad()
  return (
    <group>
      <Visible piece="robot">
        <RobotBase explode={props.explode} />
      </Visible>
      <Saddle cad={cad} explode={props.explode} />
      <Cables explode={props.explode} />
      <Mast cad={cad} explode={props.explode} mastMm={props.mastMm} />
      {props.guys && (
        <Visible piece="guys">
          <Guys explode={props.explode} mastMm={props.mastMm} />
        </Visible>
      )}
    </group>
  )
}

export function RobotScene(props: SceneProps) {
  const reduced = useReducedMotion()
  const ctx = useMemo<Ctx>(
    () => ({
      selected: props.selected,
      focus: props.focus ? new Set(props.focus) : null,
      show: props.show ? new Set(props.show) : null,
      onSelect: props.onSelect,
    }),
    [props.selected, props.focus, props.show, props.onSelect],
  )
  return (
    <Canvas
      camera={{ position: [0.9, 0.78, 0.72], fov: 32, near: 0.01, far: 20 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <color attach="background" args={["#1c1916"]} />
      <Env />
      <hemisphereLight args={["#fff4e6", "#1c1916", 0.25]} />
      <directionalLight position={[1.4, 2.2, 1.1]} intensity={1.6} color="#fff1e0" />
      <directionalLight position={[-1.2, 0.9, -1.0]} intensity={0.7} color="#c8d8ea" />
      <SceneCtx.Provider value={ctx}>
        <Robot {...props} />
      </SceneCtx.Provider>
      <Floor />
      <Cam reduced={reduced} view={props.view} mastMm={props.mastMm} />
    </Canvas>
  )
}
