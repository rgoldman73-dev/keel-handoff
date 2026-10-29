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
