from __future__ import annotations

import math

from cadgen import build123d as bd
from cadgen import glb, step, stl

from keel_dims import *  # noqa: F403


def guy_ring_part() -> bd.Part:
    """Local frame: axis on Z, flange underside at Z=0. Slides on the butt section."""
    flange = bd.Cylinder(RING_OD / 2, RING_T, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    hub = bd.Cylinder(RING_HUB_D / 2, RING_HUB_H, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    body = flange + hub
    body = bd.fillet(body.edges().filter_by(bd.GeomType.CIRCLE).group_by(bd.Axis.Z)[-1], 1.5)
    body -= bd.Cylinder(RING_ID / 2, 60)
    for i in range(3):
        a = math.radians(90 + i * 120)   # one hole straight aft when the ring is turned 180 on the mast
        body -= bd.Location((RING_HOLE_PCD / 2 * math.cos(a), RING_HOLE_PCD / 2 * math.sin(a), 0)) * bd.Cylinder(
            GUY_HOLE_D / 2, 30
        )
    # M3 radial grub hole to lock the ring height
    body -= bd.Location((0, 0, RING_T + (RING_HUB_H - RING_T) / 2)) * bd.Cylinder(
        1.25, RING_HUB_D, rotation=(0, 90, 0), align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)
    )
    return body


@step(out="../STEP/guy_ring.step")
@stl(out="../STL/guy_ring.stl")
@glb(out="../GLB/guy_ring.glb")
def guy_ring():
    p = guy_ring_part()
    p.label = "guy_ring"
    return p


if __name__ == "__main__":
    guy_ring()
