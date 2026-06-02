"""Run MediaPipe on all 100 crops -> seed keypoints (crop-normalized) + triage montage."""
import json, sys
from PIL import Image, ImageDraw
sys.path.insert(0, "build")
from pose_lib import PoseDetector, pad_square_upscale, draw_skeleton, compute_angles

det = PoseDetector(conf=0.15)
grid = {c["id"]: c for c in json.load(open("out/grid.json"))["cells"]}
results = {}
overlays = []

for idx in range(1, 101):
    crop = Image.open(f"out/crops/{idx:02d}.png").convert("RGB")
    w, h = crop.size
    big, scale, px, py = pad_square_upscale(crop, 512)
    kps_px, vis, raw = det.detect(big)
    if kps_px is None:
        results[idx] = {"detected": False, "kps": None, "vis": [0.0]*17}
        overlays.append((idx, big.resize((200,200)), False))
        continue
    s = max(w, h)
    # convert 512-pixel coords -> crop-normalized (0..1)
    kps_norm = []
    for (x, y) in kps_px:
        cx = (x/512.0)*s - px
        cy = (y/512.0)*s - py
        kps_norm.append([round(cx/w, 4), round(cy/h, 4)])
    ov = draw_skeleton(big, kps_px, vis).resize((200,200))
    overlays.append((idx, ov, True))
    results[idx] = {"detected": True, "kps": kps_norm, "vis": [round(v,3) for v in vis],
                    "nvis": sum(1 for v in vis if v>=0.3),
                    "meanvis": round(sum(vis)/len(vis),3)}

json.dump(results, open("out/mp_raw.json", "w"), indent=0)

# triage montage 10x10 with id + status color
tile = 210
canvas = Image.new("RGB", (10*tile, 10*tile), (15,15,18))
d = ImageDraw.Draw(canvas)
for i,(idx,img,okdet) in enumerate(overlays):
    r,c = (idx-1)//10, (idx-1)%10
    x,y = c*tile+5, r*tile+5
    canvas.paste(img,(x,y))
    col = (120,255,120) if okdet else (255,80,80)
    d.text((x+3,y+3), f"{idx}", fill=col)
canvas.save("out/debug/08_mp_all.png")

ndet = sum(1 for v in results.values() if v["detected"])
ngood = sum(1 for v in results.values() if v.get("meanvis",0)>=0.5)
print(f"detected: {ndet}/100 | meanvis>=0.5: {ngood}/100")
print("saved out/mp_raw.json, out/debug/08_mp_all.png")
