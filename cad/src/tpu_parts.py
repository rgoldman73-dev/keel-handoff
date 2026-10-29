from __future__ import annotations

from cadgen import build123d as bd
from cadgen import step, stl

from keel_dims import *  # noqa: F403

WASHER_OD = 30.0
WASHER_T = 2.0


def pad_part() -> bd.Part:
    return bd.Cylinder(FOOT_D / 2 + 1, PAD_T, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))


def washer_part() -> bd.Part:
    w = bd.Cylinder(WASHER_OD / 2, WASHER_T, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    return w - bd.Cylinder(STUD_CLEAR_D / 2, 10)


@step(out="../STEP/tpu_parts.step")
@stl(out="../STL/tpu_parts.stl")
def tpu_parts():
    """Print plate: six foot pads and the stick washer, TPU 95A."""
    kids = []
    for i in range(6):
        p = bd.Location((i * 16.0, 0, 0)) * pad_part()
        p.label = f"foot_pad:{i + 1}"
        kids.append(p)
    w = bd.Location((40.0, 26.0, 0)) * washer_part()
    w.label = "stick_washer"
    kids.append(w)
    return bd.Compound(children=kids, label="tpu_parts")


if __name__ == "__main__":
    tpu_parts()
