from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

from keel_dims import *  # noqa: F403

ARM_HALF = ARM_SPAN / 2 + 8.0   # centre seam to the outer end, 158


def arm_part() -> bd.Part:
    """Right arm, robot frame. The left arm is this part mirrored about YZ."""
    y0 = ARM_CY
    bar = bd.Location((ARM_HALF / 2, y0, ARM_Z0)) * bd.extrude(
        bd.RectangleRounded(ARM_HALF, ARM_DEPTH, 3), ARM_T
    )
    # Stiffening rib along the top, stops short of the lap joint and the lug
    rib = bd.Location((30 + (ARM_SPAN / 2 - 46) / 2, y0, ARM_Z1)) * bd.Box(
        ARM_SPAN / 2 - 46, 3, 4, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
    )
    # Foot at the outer end, down to the TPU pad
    foot = bd.Location((ARM_FOOT_X, y0, PAD_T)) * bd.Box(
        18, ARM_DEPTH, ARM_Z0 - PAD_T + 0.01, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
    )
    # Guy lug at the anchor, hole along Y
    lug = bd.Box(10, LUG_T, LUG_H, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    lug = bd.fillet(lug.edges().group_by(bd.Axis.Z)[-1].filter_by(bd.Axis.Y), 4.0)
    lug -= bd.Location((0, 0, LUG_H - 4.5)) * bd.Cylinder(GUY_HOLE_D / 2, 20, rotation=(90, 0, 0))
    lug = bd.Location((ARM_SPAN / 2, y0, ARM_Z1)) * lug
    body = bar + rib + foot + lug
    for x in ARM_SCREW_X:
        body -= bd.Location((x, y0, 0)) * bd.Cylinder(M3_CLEAR_D / 2, 40)
        body -= bd.Location((x, y0, ARM_Z1 - 2)) * bd.Cylinder(
            3.1, 2.01, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
        )
    return body


@step(out="../STEP/arm.step")
@stl(out="../STL/arm.stl")
@glb(out="../GLB/arm.glb")
def arm():
    p = arm_part()
    p.label = "saddle_arm"
    return p


if __name__ == "__main__":
    arm()
