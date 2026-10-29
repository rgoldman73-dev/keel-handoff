from __future__ import annotations

from cadgen import glb

from pod import pod_base_part


@glb(out="../GLB/web/pod_base.glb", mesh_tolerance=0.05)
def pod_base():
    """Web-view mesh only; the printable STEP/STL is pod.py."""
    p = pod_base_part()
    p.label = "pod_base"
    return p


if __name__ == "__main__":
    pod_base()
