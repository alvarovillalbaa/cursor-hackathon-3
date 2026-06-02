"""Multi-orientation MediaPipe pass: try rotations, un-rotate, keep best by mean visibility.
Rescues inversions/lying poses that BlazePose misses at 0 deg."""
import json, sys, math
from PIL import Image, ImageDraw
sys.path.insert(0, "build")
from pose_lib import PoseDetector, pad_square_upscale, draw_skeleton

det = PoseDetector(conf=0.12)
ANGLES = [0, 90, 180, 270, 45, 315]
SZ = 512

def unrotate(pt, deg, cx=SZ/2, cy=SZ/2):
    # image was rotated by `deg` CCW (PIL rotate is CCW). To map detected pt back, rotate by -deg...
    # PIL Image.rotate(angle) rotates CCW. Pixel mapping of result->original is rotate by +angle about center.
    th = math.radians(deg)
    x, y = pt[0]-cx, pt[1]-cy
    xr = x*math.cos(th) - y*math.sin(th)
    yr = x*math.sin(th) + y*math.cos(th)
    return (xr+cx, yr+cy)

results = {}
overlays = []
for idx in range(1, 101):
    crop = Image.open(f"out/crops/{idx:02d}.png").convert("RGB")
    w, h = crop.size; s = max(w, h)
    big, _, px, py = pad_square_upscale(crop, SZ)
    best = None
    for deg in ANGLES:
        rot = big.rotate(deg, resample=Image.BICUBIC, fillcolor=(235,235,235))
        kps_px, vis, raw = det.detect(rot)
        if kps_px is None:
            continue
        kps_back = [unrotate(p, deg) for p in kps_px]
        mv = sum(vis)/len(vis)
        nvis = sum(1 for v in vis if v >= 0.3)
        score = mv  # selection metric
        if best is None or score > best["score"]:
            best = {"deg": deg, "kps_px": kps_back, "vis": vis, "score": mv, "nvis": nvis}
    if best is None:
        results[idx] = {"detected": False, "kps": None, "vis": [0.0]*17, "deg": None}
        overlays.append((idx, big.resize((200,200)), -1)); continue
    kps_norm = []
    for (x, y) in best["kps_px"]:
        cx = (x/SZ)*s - px; cy = (y/SZ)*s - py
        kps_norm.append([round(cx/w, 4), round(cy/h, 4)])
    results[idx] = {"detected": True, "kps": kps_norm, "vis": [round(v,3) for v in best["vis"]],
                    "deg": best["deg"], "nvis": best["nvis"], "meanvis": round(best["score"],3)}
    ov = draw_skeleton(big, best["kps_px"], best["vis"]).resize((200,200))
    overlays.append((idx, ov, best["deg"]))

json.dump(results, open("out/mp_multi.json", "w"), indent=0)
tile=210
canvas = Image.new("RGB",(10*tile,10*tile),(15,15,18)); d=ImageDraw.Draw(canvas)
for (idx,img,deg) in overlays:
    r,c=(idx-1)//10,(idx-1)%10; x,y=c*tile+5,r*tile+5
    canvas.paste(img,(x,y))
    col=(255,80,80) if deg<0 else ((120,255,120) if deg==0 else (255,210,90))
    d.text((x+3,y+3),f"{idx}:{deg if deg>=0 else 'X'}",fill=col)
canvas.save("out/debug/09_mp_multi.png")
ndet=sum(1 for v in results.values() if v["detected"])
ngood=sum(1 for v in results.values() if v.get("meanvis",0)>=0.5)
rot=sum(1 for v in results.values() if v.get("deg",0) not in (0,None))
print(f"detected {ndet}/100 | meanvis>=0.5 {ngood}/100 | rescued-by-rotation {rot}")
print("saved out/mp_multi.json, out/debug/09_mp_multi.png")
