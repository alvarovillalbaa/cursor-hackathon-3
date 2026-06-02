"""
Analyze the 10x10 yoga poster grid geometry.

Strategy:
 - Detect background (cream) vs ink (figures + text).
 - Vertical projection of ink -> 10 column bands separated by whitespace gutters.
 - Horizontal projection of ink -> row bands (skip the title block at top).
 - Save debug visualizations and numeric boundaries to grid.json.
"""
import json
import numpy as np
from PIL import Image, ImageDraw

SRC = "il_794xN.8040869909_tun3.webp"
OUT = "out"

im = Image.open(SRC).convert("RGB")
W, H = im.size
arr = np.asarray(im).astype(np.int16)  # H,W,3

# --- background color: sample the 4 corners (each 8x8) ---
corners = np.concatenate([
    arr[0:8, 0:8].reshape(-1, 3),
    arr[0:8, W-8:W].reshape(-1, 3),
    arr[H-8:H, 0:8].reshape(-1, 3),
    arr[H-8:H, W-8:W].reshape(-1, 3),
])
bg = np.median(corners, axis=0)
print("bg color (median corners):", bg.tolist())

# distance from background -> "ink" where far from bg
dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))  # H,W
ink = (dist > 28).astype(np.float32)           # threshold tuned for cream bg
print("ink fraction:", round(float(ink.mean()), 4))

# --- vertical projection (sum over rows) to find columns ---
col_proj = ink.sum(axis=0)  # length W
# --- horizontal projection (sum over cols) to find rows ---
row_proj = ink.sum(axis=1)  # length H

def bands(proj, gap_thresh_frac=0.02, min_band=8):
    """Find contiguous bands where proj exceeds a small threshold."""
    thr = proj.max() * gap_thresh_frac
    active = proj > thr
    bands = []
    start = None
    for i, a in enumerate(active):
        if a and start is None:
            start = i
        elif not a and start is not None:
            if i - start >= min_band:
                bands.append((start, i))
            start = None
    if start is not None and len(active) - start >= min_band:
        bands.append((start, len(active)))
    return bands

col_bands = bands(col_proj, 0.02, 20)
row_bands = bands(row_proj, 0.02, 12)
print(f"\ncol bands ({len(col_bands)}):")
for b in col_bands:
    print("  ", b, "w=", b[1]-b[0])
print(f"\nrow bands ({len(row_bands)}):")
for b in row_bands:
    print("  ", b, "h=", b[1]-b[0])

# Save projections as debug image
dbg = im.copy()
d = ImageDraw.Draw(dbg)
for (a, b) in col_bands:
    d.rectangle([a, 0, b, H-1], outline=(0, 120, 255), width=1)
for (a, b) in row_bands:
    d.rectangle([0, a, W-1, b], outline=(0, 200, 0), width=1)
dbg.save(f"{OUT}/debug/01_bands.png")

# Also save the raw ink mask
Image.fromarray((ink*255).astype(np.uint8)).save(f"{OUT}/debug/00_ink.png")

json.dump({
    "W": W, "H": H, "bg": bg.tolist(),
    "col_bands": col_bands, "row_bands": row_bands,
    "col_proj": col_proj.astype(int).tolist(),
    "row_proj": row_proj.astype(int).tolist(),
}, open(f"{OUT}/debug/grid_raw.json", "w"))
print("\nsaved debug/01_bands.png, debug/00_ink.png, debug/grid_raw.json")
