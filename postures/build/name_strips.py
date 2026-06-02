"""Make upscaled per-row strips (figure+caption) so names are legible for transcription."""
import json
from PIL import Image

im = Image.open("il_794xN.8040869909_tun3.webp").convert("RGB")
grid = json.load(open("out/grid.json"))
cells = grid["cells"]
SCALE = 3

# group by row, build a strip spanning full width using cell_bbox union
for r in range(10):
    row_cells = [c for c in cells if c["row"] == r]
    x0 = min(c["cell_bbox"][0] for c in row_cells)
    y0 = min(c["cell_bbox"][1] for c in row_cells)
    x1 = max(c["cell_bbox"][2] for c in row_cells)
    y1 = max(c["cell_bbox"][3] for c in row_cells)
    strip = im.crop((x0, y0, x1, y1))
    strip = strip.resize((strip.width * SCALE, strip.height * SCALE), Image.LANCZOS)
    strip.save(f"out/debug/row_{r:02d}.png")
print("saved out/debug/row_00..09.png")
