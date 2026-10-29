from __future__ import annotations

from cadgen import build123d as bd
from cadgen import glb, step, stl

from keel_dims import *  # noqa: F403

OUT_W = POD_IN_W + 2 * POD_WALL
OUT_L = POD_IN_L + 2 * POD_WALL
OUT_H = POD_IN_H + POD_WALL
LID_SCREWS = [(sx * (OUT_W / 2 - 4.2), sy * (OUT_L / 2 - 4.2)) for sx in (-1, 1) for sy in (-1, 1)]


def pod_base_part() -> bd.Part:
    """Robot frame. Floor sits on the spine top face (Z = PLATE_Z1)."""
    z0 = PLATE_Z1
    shell = bd.extrude(bd.RectangleRounded(OUT_W, OUT_L, 4), OUT_H)
    cavity = bd.Location((0, 0, POD_WALL)) * bd.extrude(bd.RectangleRounded(POD_IN_W, POD_IN_L, 2.5), OUT_H)
    body = shell - cavity
    for x, y in LID_SCREWS:
        body += bd.Location((x, y, 0)) * bd.Cylinder(3.6, OUT_H, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
        body -= bd.Location((x, y, OUT_H - 6)) * bd.Cylinder(
            M3_INSERT_D / 2, 6.01, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
        )
    # DevKit rails: the board drops between them, headers down
    for sx in (-1, 1):
        body += bd.Location((sx * (28.8 / 2 + 1), 0, POD_WALL)) * bd.Box(
            2, POD_IN_L - 14, 9, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
        )
    # USB socket opening at the rear wall, service cable slot at the outboard wall
    body -= bd.Location((0, -OUT_L / 2, POD_WALL + 7)) * bd.Box(13, 10, 8)
    body -= bd.Location((OUT_W / 2, -10, POD_WALL + 4)) * bd.Box(10, 8, 5)
    # Floor screws to the spine inserts
    for dy in (-20, 20):
        body -= bd.Location((-10, dy, 0)) * bd.Cylinder(M3_CLEAR_D / 2, 10)
    return bd.Location((POD_CX, POD_CY, z0)) * body


def pod_lid_part() -> bd.Part:
    lid = bd.extrude(bd.RectangleRounded(OUT_W, OUT_L, 4), LID_T)
    lip = bd.Location((0, 0, -2)) * bd.extrude(bd.RectangleRounded(POD_IN_W - 0.6, POD_IN_L - 0.6, 2.2), 2) - bd.Location(
        (0, 0, -2)
    ) * bd.extrude(bd.RectangleRounded(POD_IN_W - 4.6, POD_IN_L - 4.6, 1), 2)
    for x, y in LID_SCREWS:
        lip -= bd.Location((x, y, -3)) * bd.Cylinder(4.2, 4, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    body = lid + lip
    for x, y in LID_SCREWS:
        body -= bd.Location((x, y, 0)) * bd.Cylinder(M3_CLEAR_D / 2, 20)
    # E-stop on the lid, forward end so it is reachable over the mast
    body -= bd.Location((0, OUT_L / 2 - 16, 0)) * bd.Cylinder(ESTOP_D / 2, 20)
    # Status LED window over the DevKit's on-board LED
    body -= bd.Location((0, -6, 0)) * bd.Cylinder(1.6, 20)
    return bd.Location((POD_CX, POD_CY, PLATE_Z1 + OUT_H)) * body


@step(out="../STEP/pod.step")
@stl(out="../STL/pod.stl")
@glb(out="../GLB/pod.glb")
def pod():
    base = pod_base_part()
    base.label = "pod_base"
    lid = pod_lid_part()
    lid.label = "pod_lid"
    return bd.Compound(children=[base, lid], label="pod")


if __name__ == "__main__":
    pod()
