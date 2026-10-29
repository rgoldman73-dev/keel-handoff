"""Shop drawings for every printed KEEL part. One PDF, one sheet per part."""
from __future__ import annotations

import math
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "src"))

import cadgen  # noqa: E402
from cadgen.eng_drawing import Sheet, eng_drawing  # noqa: E402

from keel_dims import *  # noqa: E402,F403
from arm import ARM_HALF  # noqa: E402
from pod import OUT_H, OUT_L, OUT_W  # noqa: E402

STEP = HERE.parent / "STEP"
REV = [("A", "2026-10-29", "FIRST ISSUE FROM CAD")]
COMMON = dict(author="KEEL / R. GOLDMAN", revision="A", general_tolerance="ISO 2768-m", revisions=REV)
PRINT = "PETG, 4 WALLS, 40% GYROID, 0.2 LAYER"


def spine_sheet():
    part = cadgen.read_step(STEP / "spine.step")
    sh = Sheet("A2", scale=1.0, title="SADDLE SPINE", part_number="900-TP-101", material="PETG", notes=[
        PRINT + ". HOOK SIDE DOWN ON TREE SUPPORTS.",
        "1/4-20 HEX NUT PRESSED INTO TRAP FROM BELOW BEFORE STUD.",
        "4x M3 HEAT-SET INSERTS FOR ARMS, 2x FOR POD FLOOR.",
        "HOOK SLOT = MEASURED HANDLE BAR + 0.6. MEASURE BEFORE PRINTING.",
    ], **COMMON)
    top, front, right, iso = sh.three_views(part, iso=True)
    rear = SPINE_CY - SPINE_L / 2
    top.dim((-SPINE_W / 2, SPINE_CY, PLATE_Z1), (SPINE_W / 2, SPINE_CY, PLATE_Z1))
    top.dim((SPINE_W / 2, rear + 8, PLATE_Z1), (SPINE_W / 2, NECK_Y0 - 8, PLATE_Z1), text="110", orientation="v")
    top.dim((0, rear, PLATE_Z1), (0, STUD_Y, PLATE_Z1), orientation="v", offset=-80)
    top.dim((-NECK_W / 2, NECK_Y1, PLATE_Z1), (NECK_W / 2, NECK_Y1, PLATE_Z1))
    top.hole((0, STUD_Y, PLATE_Z1 + BOSS_H), STUD_CLEAR_D, thru=True, label="STUD", angle=30)
    top.hole((ARM_SCREW_X[1], ARM_CY, PLATE_Z1), M3_INSERT_D, depth=6, count=4, label="INSERT", angle=60)
    front.dim((0, rear, PLATE_Z0 - HOOK_DROP), (0, rear, PLATE_Z1), orientation="v")
    front.dim((-BOSS_D / 2, STUD_Y, PLATE_Z1 + BOSS_H), (BOSS_D / 2, STUD_Y, PLATE_Z1 + BOSS_H))
    right.dim((0, rear, PLATE_Z0 - HOOK_DROP), (0, rear + HOOK_WALL + HANDLE_BAR_D + 0.6 + 4, PLATE_Z0 - HOOK_DROP))
    right.dim((0, rear, PLATE_Z1 + BOSS_H), (0, rear, 0), orientation="v")
    return sh


def arm_sheet():
    part = cadgen.read_step(STEP / "arm.step")
    sh = Sheet("A3", scale=1.0, title="SADDLE ARM (R, MIRROR FOR L)", part_number="900-TP-102", material="PETG", notes=[
        PRINT + ". PRINT FLAT, NO SUPPORTS.",
        "MAKE TWO: ONE AS DRAWN, ONE MIRRORED IN THE SLICER.",
        "2x M3x12 SOCKET HEAD INTO SPINE INSERTS, C'BORE 6.2 DP 2.",
    ], **COMMON)
    top, front, right, iso = sh.three_views(part, iso=True)
    top.overall()
    top.dim((0, ARM_CY, ARM_Z1), (ARM_SPAN / 2, ARM_CY, ARM_Z1), text="150 (300 ANCHOR TO ANCHOR)")
    top.hole((ARM_SCREW_X[1], ARM_CY, ARM_Z1), M3_CLEAR_D, thru=True, count=2, angle=-60)
    front.dim((ARM_SPAN / 2, ARM_CY, PAD_T), (ARM_SPAN / 2, ARM_CY, ARM_Z1 + LUG_H), orientation="v")
    front.dim((0, ARM_CY, ARM_Z0), (0, ARM_CY, ARM_Z1), orientation="v")
    return sh


def ring_sheet():
    part = cadgen.read_step(STEP / "guy_ring.step")
    sh = Sheet("A3", scale=2.0, title="GUY RING", part_number="900-TP-103", material="PETG", notes=[
        PRINT + ". FLANGE DOWN.",
        "M3 GRUB SCREW LOCKS HEIGHT ON THE STICK.",
        "ID TO SUIT BUTT SECTION: STICK OD + 0.4.",
    ], **COMMON)
    top, front, right, iso = sh.three_views(part, iso=True)
    top.diameter((0, 0, RING_T), RING_OD / 2, angle=20)
    top.diameter((0, 0, RING_HUB_H), RING_ID / 2, angle=200)
    a = math.radians(90)
    top.hole((0, RING_HOLE_PCD / 2, RING_T), GUY_HOLE_D, thru=True, count=3, label="ON PCD 28, 120 DEG", angle=110)
    front.dim((-RING_OD / 2, 0, 0), (-RING_OD / 2, 0, RING_T), orientation="v")
    front.dim((RING_HUB_D / 2, 0, 0), (RING_HUB_D / 2, 0, RING_HUB_H), orientation="v")
    return sh


def pod_sheet():
    part = cadgen.read_step(STEP / "pod.step")
    sh = Sheet("A3", scale=1.0, title="ELECTRONICS POD, BASE + LID", part_number="900-TP-104", material="PETG", notes=[
        PRINT + ". BASE OPEN SIDE UP, LID FLAT.",
        "FITS ESP32 DEVKIT V1, 30 PIN, 51.5 x 28.4 BOARD.",
        "16 mm MOMENTARY E-STOP IN LID, NO TO GND (GPIO 4).",
        "4x M3 INSERTS IN BASE BOSSES, 4x M3x8 THROUGH LID.",
    ], **COMMON)
    top, front, right, iso = sh.three_views(part, iso=True)
    z = PLATE_Z1 + OUT_H + LID_T
    top.dim((POD_CX - OUT_W / 2, POD_CY, PLATE_Z1 + OUT_H), (POD_CX + OUT_W / 2, POD_CY, PLATE_Z1 + OUT_H))
    top.dim((POD_CX + OUT_W / 2, POD_CY - OUT_L / 2 + 6, PLATE_Z1 + OUT_H), (POD_CX + OUT_W / 2, POD_CY + OUT_L / 2 - 6, PLATE_Z1 + OUT_H), text=f"{OUT_L:.0f}", orientation="v")
    top.hole((POD_CX, POD_CY + OUT_L / 2 - 16, z), ESTOP_D, thru=True, label="E-STOP", angle=150)
    front.dim((POD_CX - OUT_W / 2, POD_CY, PLATE_Z1), (POD_CX - OUT_W / 2, POD_CY, z), orientation="v")
    return sh


@eng_drawing(out="../PDF/keel_printed_parts.pdf")
def keel_printed_parts():
    return [spine_sheet(), arm_sheet(), ring_sheet(), pod_sheet()]


if __name__ == "__main__":
    keel_printed_parts()
