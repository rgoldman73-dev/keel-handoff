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
