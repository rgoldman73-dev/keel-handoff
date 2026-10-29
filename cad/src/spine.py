from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

from keel_dims import *  # noqa: F403


def _plate() -> bd.Part:
    spine = bd.Location((0, SPINE_CY, PLATE_Z0)) * bd.extrude(
        bd.RectangleRounded(SPINE_W, SPINE_L, 8), PLATE_T
    )
    neck_len = NECK_Y1 - NECK_Y0 + 6
    neck = bd.Location((0, NECK_Y0 - 6 + neck_len / 2, PLATE_Z0)) * bd.extrude(
        bd.RectangleRounded(NECK_W, neck_len, 5), PLATE_T
    )
    return spine + neck


def _hook() -> bd.Part:
    """J-hook under the rear edge. The slot opens forward and takes the handle bar."""
    rear = SPINE_CY - SPINE_L / 2
    slot = HANDLE_BAR_D + 0.6
    z_bot = PLATE_Z0 - HOOK_DROP
    pts = [
        (rear, PLATE_Z0 + 0.01),
        (rear, z_bot),
        (rear + HOOK_WALL + slot + 4, z_bot),
        (rear + HOOK_WALL + slot + 4, z_bot + 4),
        (rear + HOOK_WALL + slot, z_bot + 4),
        (rear + HOOK_WALL, z_bot + 4),
        (rear + HOOK_WALL, PLATE_Z0 + 0.01),
    ]
    sk = bd.Plane.YZ * bd.make_face(bd.Polyline(*pts, close=True))
    return bd.extrude(sk, HOOK_W / 2, both=True)


def _boss() -> bd.Part:
    boss = bd.Location((0, STUD_Y, PLATE_Z1)) * bd.Cylinder(
        BOSS_D / 2, BOSS_H, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
    )
    # Four gussets on the diagonals, clear of the pod and the bank clips
    rib = bd.extrude(
        bd.Plane.XZ * bd.Polygon((-BOSS_D / 2 - 7, 0), (BOSS_D / 2 + 7, 0), (0, BOSS_H - 2), align=None),
        1.5,
        both=True,
    )
    ribs = bd.Location((0, STUD_Y, PLATE_Z1)) * (bd.Rot(0, 0, 45) * rib + bd.Rot(0, 0, -45) * rib)
    return boss + ribs


def _lug(x: float, y: float, along: str) -> bd.Part:
    """Upright guy lug with a cross hole."""
    if along == "X":
        body = bd.Box(LUG_T, 12, LUG_H, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
        hole = bd.Cylinder(GUY_HOLE_D / 2, 20, rotation=(0, 90, 0))
    else:
        body = bd.Box(12, LUG_T, LUG_H, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
        hole = bd.Cylinder(GUY_HOLE_D / 2, 20, rotation=(90, 0, 0))
    top_edges = body.edges().group_by(bd.Axis.Z)[-1].filter_by(bd.Axis.Z if along == "Z" else (bd.Axis.Y if along == "X" else bd.Axis.X))
    body = bd.fillet(top_edges, 3.5)
    lug = body - bd.Location((0, 0, LUG_H - 4.5)) * hole
    return bd.Location((x, y, PLATE_Z1)) * lug


def _clip(y: float) -> bd.Part:
    r_in = BANK_D / 2 + 0.3
    r_out = r_in + CLIP_WALL
    cz = PLATE_Z1 + r_in - 0.5
    ring = bd.Location((BANK_X, y, cz)) * bd.Cylinder(r_out, CLIP_W, rotation=(90, 0, 0))
    base = bd.Location((BANK_X, y, PLATE_Z1)) * bd.Box(
        2 * r_out, CLIP_W, cz - PLATE_Z1, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
    )
    bore = bd.Location((BANK_X, y, cz)) * bd.Cylinder(r_in, CLIP_W + 2, rotation=(90, 0, 0))
    mouth = bd.Location((BANK_X, y, cz + r_in * 0.55)) * bd.Box(
        BANK_D * 0.78, CLIP_W + 2, r_out, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
    )
    return (ring + base) - bore - mouth


def spine_part() -> bd.Part:
    body = _plate() + _hook() + _boss()
    for fx, fy in SPINE_FEET:
        body += bd.Location((fx, fy, PAD_T)) * bd.Cylinder(
            FOOT_D / 2, FOOT_H + 0.01, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
        )
    body += _lug(0, AFT_ANCHOR_Y, "X")
    body += _clip(BANK_Y1 - 14) + _clip(BANK_Y0 + 14)
    # Stud: clearance through, hex nut trapped from below
    body -= bd.Location((0, STUD_Y, 0)) * bd.Cylinder(STUD_CLEAR_D / 2, 60)
    body -= bd.Location((0, STUD_Y, PLATE_Z0)) * bd.extrude(bd.RegularPolygon(NUT_AF / 2, 6, major_radius=False), NUT_T)
    # Arm inserts and pod inserts
    for sx in (-1, 1):
        for x in ARM_SCREW_X:
            body -= bd.Location((sx * x, ARM_CY, PLATE_Z1 - 6)) * bd.Cylinder(
                M3_INSERT_D / 2, 6.01, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
            )
    for py in (POD_CY - 20, POD_CY + 20):
        body -= bd.Location((POD_CX - 10, py, PLATE_Z1 - 5.5)) * bd.Cylinder(
            M3_INSERT_D / 2, 5.51, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
        )
    # Cable pass for the service lead, beside the boss
    body -= bd.Location((22, STUD_Y - 26, PLATE_Z0)) * bd.extrude(bd.SlotOverall(18, 7), PLATE_T)
    return body


@step(out="../STEP/spine.step")
@stl(out="../STL/spine.stl")
@glb(out="../GLB/spine.glb")
def spine():
    p = spine_part()
    p.label = "saddle_spine"
    return p


if __name__ == "__main__":
    spine()
