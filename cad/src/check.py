import itertools
from cadgen import read_step
from cadgen.geometry import overlap_volume
sc = read_step("STEP/saddle_assembly.step")
sols = list(sc.solids())
for s in sols:
    bb = s.bounding_box()
    print(round(bb.min.X,1),round(bb.max.X,1),round(bb.min.Y,1),round(bb.max.Y,1),round(bb.min.Z,1),round(bb.max.Z,1), round(s.volume))
for a,b in itertools.combinations(range(len(sols)),2):
    v = overlap_volume(sols[a], sols[b])
    if v > 0.01: print("overlap", a, b, round(v,2))
