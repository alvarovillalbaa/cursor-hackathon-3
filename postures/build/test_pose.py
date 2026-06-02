"""Test MediaPipe pose on representative crops; overlay skeletons; report quality."""
import sys
from PIL import Image
sys.path.insert(0, "build")
from pose_lib import PoseDetector, pad_square_upscale, draw_skeleton, compute_angles, COCO_NAMES

TESTS = {
    1: "Mountain (standing)", 10: "Chair", 14: "Warrior II", 18: "Triangle",
    52: "Downward dog", 57: "Headstand", 64: "Child's pose", 66: "Boat",
    95: "Half lord fishes (seated twist)", 100: "Corpse (lying)",
}

det = PoseDetector(conf=0.2)
tiles = []
print(f"{'id':>3} {'name':32s} {'det':>4} {'nvis':>5} {'meanvis':>7}")
for idx, name in TESTS.items():
    crop = Image.open(f"out/crops/{idx:02d}.png")
    big, scale, px, py = pad_square_upscale(crop, 512)
    kps, vis, raw = det.detect(big)
    if kps is None:
        print(f"{idx:>3} {name:32s} {'NO':>4}")
        tiles.append((idx, big)); continue
    nvis = sum(1 for v in vis if v >= 0.3)
    meanvis = sum(vis)/len(vis)
    print(f"{idx:>3} {name:32s} {'YES':>4} {nvis:>5} {meanvis:>7.2f}")
    ov = draw_skeleton(big, kps, vis)
    tiles.append((idx, ov))

# montage
cols = 5
tile = 320
rows = (len(tiles)+cols-1)//cols
canvas = Image.new("RGB", (cols*tile, rows*tile), (20,20,24))
from PIL import ImageDraw
cd = ImageDraw.Draw(canvas)
for i,(idx,img) in enumerate(tiles):
    t = img.resize((tile-8, tile-8))
    x=(i%cols)*tile+4; y=(i//cols)*tile+4
    canvas.paste(t,(x,y)); cd.text((x+4,y+4), str(idx), fill=(255,255,0))
canvas.save("out/debug/07_pose_test.png")
print("saved out/debug/07_pose_test.png")
