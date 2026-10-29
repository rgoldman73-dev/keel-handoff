from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step

from arm import arm
from guy_ring import guy_ring
from keel_dims import *  # noqa: F403
from pod import pod
from spine import spine
from tpu_parts import pad_part, washer_part

MAST_MM = 460.0          # deck to phone centre, default in the app
RING_BELOW_PHONE = 72.0  # flange 72 mm below phone centre, under the clamp ball


@step(out="../STEP/saddle_assembly.step")
@glb(out="../GLB/saddle_assembly.glb")
def saddle_assembly():
    """Everything printed, in the robot frame, as it sits on the deck."""
    s = spine()
    s.label = "spine"
    ar = arm()
    ar.label = "arm:right"
    al = arm().mirror(bd.Plane.YZ)
    al.label = "arm:left"
    pd = pod()
    pd.label = "pod"
    ring = bd.Location((0, STUD_Y, PLATE_Z1 + MAST_MM - RING_BELOW_PHONE)) * bd.Rot(0, 0, 180) * guy_ring()
    ring.label = "guy_ring"
    washer = bd.Location((0, STUD_Y, PLATE_Z1 + BOSS_H)) * washer_part()
    washer.label = "stick_washer"
    pads = []
    for i, (x, y) in enumerate(list(SPINE_FEET) + [(ARM_FOOT_X, ARM_CY), (-ARM_FOOT_X, ARM_CY)]):
        p = bd.Location((x, y, 0)) * pad_part()
        p.label = f"foot_pad:{i + 1}"
        pads.append(p)
    return bd.Compound(children=[s, ar, al, pd, ring, washer, *pads], label="keel_saddle")


if __name__ == "__main__":
    saddle_assembly()
