"""Shared KEEL dimensions, millimetres.

Robot frame for every printed part: origin at the robot's geometric centre on
the top deck plane, +X to the robot's right, +Y forward toward the bumper,
+Z up. The numbers marked GEO match GEO in src/lib/keel/data.ts and are not
changed here.
"""

# Robot envelope (GEO)
ROBOT_D = 353.0
ROBOT_H = 92.0

# Saddle (GEO)
SPINE_W = 100.0            # X
SPINE_L = 110.0            # Y
SPINE_CY = -115.0          # spine centre, behind robot centre
STUD_Y = -120.0            # 1/4-20 stud on the centreline
ARM_SPAN = 300.0           # anchor to anchor
ARM_DEPTH = 16.0           # Y
ARM_CY = -30.0             # arm centreline
AFT_ANCHOR_Y = -162.0

# Build-up above the deck
PAD_T = 2.0                # TPU foot pad
FOOT_H = 2.0               # printed foot boss under the plate
PLATE_Z0 = PAD_T + FOOT_H  # plate underside: 4 mm clear of the deck
PLATE_T = 6.0
PLATE_Z1 = PLATE_Z0 + PLATE_T
ARM_T = 5.0
ARM_Z0 = PLATE_Z1          # arms lap onto the neck
ARM_Z1 = ARM_Z0 + ARM_T

# Neck that carries the arms forward of the spine
NECK_W = 60.0
NECK_Y0 = SPINE_CY + SPINE_L / 2      # -60
NECK_Y1 = ARM_CY + ARM_DEPTH / 2 + 4  # -18
ARM_SCREW_X = (8.0, 22.0)             # M3 into heat-set inserts, each side

# Stud boss
BOSS_D = 30.0
BOSS_H = 12.0
NUT_AF = 11.4              # 1/4-20 hex nut is 7/16" (11.11) AF; 0.3 clearance
NUT_T = 6.0
STUD_CLEAR_D = 6.6

# Rear handle hook. MEASURE THE HANDLE before printing.
HANDLE_BAR_D = 10.0
HOOK_W = 60.0
HOOK_WALL = 5.0
HOOK_DROP = 14.0           # below the plate underside

# Guy anchors
GUY_HOLE_D = 3.5
LUG_H = 9.0
LUG_T = 8.0

# Guy ring (SHOP F)
RING_OD = 36.0
RING_ID = 14.0
RING_T = 4.0
RING_HOLE_PCD = 28.0
RING_HUB_D = 22.0
RING_HUB_H = 10.0

# Electronics pod: ESP32 DevKit (WROOM-32, 30 pin, ~51.5 x 28.4)
POD_IN_L = 58.0            # along Y
POD_IN_W = 32.0            # along X
POD_IN_H = 20.0
POD_WALL = 2.0
POD_CX = 34.0
POD_CY = -94.0
LID_T = 2.5
ESTOP_D = 16.2             # 16 mm panel-mount momentary

# Power bank: slim one-cell stick bank
BANK_D = 23.0
BANK_X = -32.0
BANK_Y0, BANK_Y1 = -165.0, -70.0
CLIP_W = 10.0
CLIP_WALL = 2.6

# Feet (TPU pads go under these)
SPINE_FEET = ((-42.0, -68.0), (42.0, -68.0), (-42.0, -162.0), (42.0, -162.0))
ARM_FOOT_X = 149.0
FOOT_D = 10.0

M3_INSERT_D = 4.0
M3_CLEAR_D = 3.4
