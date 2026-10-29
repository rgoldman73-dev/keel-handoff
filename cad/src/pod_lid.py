from __future__ import annotations

from cadgen import glb

from pod import pod_lid_part


@glb(out="../GLB/web/pod_lid.glb", mesh_tolerance=0.05)
def pod_lid():
    """Web-view mesh only; the printable STEP/STL is pod.py."""
    p = pod_lid_part()
    p.label = "pod_lid"
    return p


if __name__ == "__main__":
    pod_lid()
