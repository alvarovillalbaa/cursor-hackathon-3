import numpy as np
from PIL import Image

im = Image.open("il_794xN.8040869909_tun3.webp").convert("RGB")
arr = np.asarray(im).astype(np.int16)
H, W, _ = arr.shape

def stats(name, y0, y1, x0, x1):
    patch = arr[y0:y1, x0:x1].reshape(-1, 3)
    print(f"{name:28s} mean RGB = {patch.mean(0).round(1).tolist()}  "
          f"R-B={float(patch[:,0].mean()-patch[:,2].mean()):+.1f}")

# Title text (white-ish on cream? actually dark) ~ y 60-110 center
stats("TITLE area", 60, 110, 300, 500)
# Mountain figure (top-left) approx
stats("FIGURE mountain", 165, 210, 50, 85)
# A terracotta body region row2 col1 (low lunge)
stats("FIGURE low lunge", 290, 330, 40, 90)
# English name text under mountain
stats("TEXT 'Mountain'", 232, 242, 45, 95)
# sanskrit text
stats("TEXT 'Tadasana'", 246, 254, 45, 95)
# background
stats("BG", 0, 8, 0, 8)

# Build candidate masks and report fractions
R, G, B = arr[...,0], arr[...,1], arr[...,2]
bg = 235
dist = np.sqrt(((arr-bg)**2).sum(2))
ink = dist > 28
reddish = (R - B) > 18
sat = (arr.max(2) - arr.min(2)) > 22
dark = arr.mean(2) < 110
figure_color = ink & (reddish | sat)      # terracotta + skin
figure_or_hair = ink & (reddish | sat | dark)
print("\nink frac        ", round(ink.mean(),4))
print("reddish frac    ", round(reddish.mean(),4))
print("figure_color    ", round(figure_color.mean(),4))
print("figure_or_hair  ", round(figure_or_hair.mean(),4))

Image.fromarray((figure_color*255).astype(np.uint8)).save("out/debug/02_figmask_color.png")
Image.fromarray((figure_or_hair*255).astype(np.uint8)).save("out/debug/03_figmask_hair.png")
print("saved 02_figmask_color.png, 03_figmask_hair.png")
