"""
Extract the 10x10 grid of yoga figures.
Outputs:
  out/crops/NN.png    tight figure crop (color)   -> for pose estimation
  out/cells/NN.png    figure + caption text       -> for name verification / OCR
  out/grid.json       per-cell bboxes & centers
  out/debug/04_montage.png, 05_overlay.png, 06_cells_montage.png
"""
import json
import numpy as np
from PIL import Image, ImageDraw

SRC = "il_794xN.8040869909_tun3.webp"
OUT = "out"
TITLE_CUT = 150
N_COLS, N_ROWS = 10, 10
PAD = 5

im = Image.open(SRC).convert("RGB")
arr = np.asarray(im).astype(np.int16)
H, W, _ = arr.shape
R, B = arr[..., 0], arr[..., 2]

bg = 235
dist = np.sqrt(np.clip(((arr - bg) ** 2).sum(2), 0, None))
ink = dist > 26
figure = ink & (((R - B) > 16) | ((arr.max(2) - arr.min(2)) > 20))
figure[:TITLE_CUT] = False
ink_nt = ink.copy()
ink_nt[:TITLE_CUT] = False


def runs_from_proj(proj, smooth=3, frac=0.04):
    sm = np.convolve(proj, np.ones(smooth) / smooth, mode="same")
    active = sm > sm.max() * frac
    runs, s = [], None
    for i, a in enumerate(active):
        if a and s is None:
            s = i
        elif not a and s is not None:
            runs.append([s, i]); s = None
    if s is not None:
        runs.append([s, len(active)])
    return runs


col_runs = runs_from_proj(figure.sum(0).astype(float))
row_runs = runs_from_proj(figure.sum(1).astype(float))
assert len(col_runs) == N_COLS, f"got {len(col_runs)} cols"
assert len(row_runs) == N_ROWS, f"got {len(row_runs)} rows"

# Voronoi-ish x windows (split gutters at midpoints)
def midpoints(runs, lo, hi):
    edges = [lo]
    for i in range(len(runs) - 1):
        edges.append((runs[i][1] + runs[i + 1][0]) // 2)
    edges.append(hi)
    return edges

x_edges = midpoints(col_runs, 0, W)
y_edges = midpoints(row_runs, TITLE_CUT, H)

def tight_bbox(mask):
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]

cells = []
overlay = im.copy()
od = ImageDraw.Draw(overlay)
crop_imgs, cell_imgs = [], []

for r in range(N_ROWS):
    for c in range(N_COLS):
        idx = r * N_COLS + c + 1
        # column search window = gutter-split
        cx0, cx1 = x_edges[c], x_edges[c + 1]
        # row figure window: figure band +- small margin (avoid caption below)
        ry0, ry1 = row_runs[r][0], row_runs[r][1]
        # search window for tight bbox
        wy0 = max(TITLE_CUT, ry0 - 10)
        wy1 = min(H, ry1 + 10)
        win_fig = figure[wy0:wy1, cx0:cx1]
        bb = tight_bbox(win_fig)
        if bb is None:
            print(f"!! cell {idx}: empty figure mask"); continue
        # expand & re-tighten on ink to catch pale limbs
        ex0 = max(cx0, cx0 + bb[0] - 9)
        ey0 = max(wy0, wy0 + bb[1] - 9)
        ex1 = min(cx1, cx0 + bb[2] + 9)
        ey1 = min(wy1, wy0 + bb[3] + 9)
        win_ink = ink_nt[ey0:ey1, ex0:ex1]
        bb2 = tight_bbox(win_ink)
        fx0, fy0 = ex0 + bb2[0], ey0 + bb2[1]
        fx1, fy1 = ex0 + bb2[2], ey0 + bb2[3]
        # pad
        fx0 = max(0, fx0 - PAD); fy0 = max(0, fy0 - PAD)
        fx1 = min(W, fx1 + PAD); fy1 = min(H, fy1 + PAD)

        crop = im.crop((fx0, fy0, fx1, fy1))
        crop.save(f"{OUT}/crops/{idx:02d}.png")
        crop_imgs.append((idx, crop))

        # full cell (figure + caption) for OCR/verification
        cell_y1 = y_edges[r + 1]
        cell = im.crop((cx0, y_edges[r], cx1, cell_y1))
        cell.save(f"{OUT}/cells/{idx:02d}.png")
        cell_imgs.append((idx, cell))

        od.rectangle([fx0, fy0, fx1, fy1], outline=(0, 120, 255), width=1)
        od.text((cx0 + 1, y_edges[r] + 1), str(idx), fill=(255, 0, 0))
        cells.append({
            "id": idx, "row": r, "col": c,
            "bbox": [fx0, fy0, fx1, fy1],
            "bbox_wh": [fx1 - fx0, fy1 - fy0],
            "cell_bbox": [cx0, y_edges[r], cx1, cell_y1],
        })

overlay.save(f"{OUT}/debug/05_overlay.png")
json.dump({"src": SRC, "W": W, "H": H, "cells": cells},
          open(f"{OUT}/grid.json", "w"), indent=1)

# montage of crops (normalized to tile)
def montage(items, tile, cols, path, bg=(20, 20, 24)):
    rows = (len(items) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * tile, rows * tile), bg)
    for i, (idx, img) in enumerate(items):
        im2 = img.copy()
        im2.thumbnail((tile - 4, tile - 4))
        x = (i % cols) * tile + (tile - im2.width) // 2
        y = (i // cols) * tile + (tile - im2.height) // 2
        canvas.paste(im2, (x, y))
    canvas.save(path)

montage(crop_imgs, 76, 10, f"{OUT}/debug/04_montage.png")
montage(cell_imgs, 96, 10, f"{OUT}/debug/06_cells_montage.png")
print(f"extracted {len(cells)} cells -> out/crops, out/cells")
sizes = np.array([c["bbox_wh"] for c in cells])
print("crop W: min/med/max", sizes[:,0].min(), int(np.median(sizes[:,0])), sizes[:,0].max())
print("crop H: min/med/max", sizes[:,1].min(), int(np.median(sizes[:,1])), sizes[:,1].max())
