"""Shared utilities: MediaPipe BlazePose(33) -> COCO(17), preprocessing, angles, drawing."""
import math
import numpy as np
from PIL import Image, ImageDraw

# COCO-17 keypoint order (matches YOLO-pose / MoveNet)
COCO_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]
# BlazePose-33 index for each COCO-17 keypoint
BLAZE_TO_COCO = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

COCO_EDGES = [
    (0, 1), (0, 2), (1, 3), (2, 4),            # head
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),   # arms
    (5, 11), (6, 12), (11, 12),                # torso
    (11, 13), (13, 15), (12, 14), (14, 16),    # legs
]

# joint angles: (name, a, vertex, b) using COCO indices
ANGLE_DEFS = [
    ("left_elbow", 5, 7, 9),
    ("right_elbow", 6, 8, 10),
    ("left_shoulder", 7, 5, 11),
    ("right_shoulder", 8, 6, 12),
    ("left_hip", 5, 11, 13),
    ("right_hip", 6, 12, 14),
    ("left_knee", 11, 13, 15),
    ("right_knee", 12, 14, 16),
]

BG = (235, 235, 235)


def pad_square_upscale(crop: Image.Image, size=512, bg=BG):
    """Pad crop to square (centered) on bg, resize to size. Returns (img, scale, padx, pady)."""
    w, h = crop.size
    s = max(w, h)
    canvas = Image.new("RGB", (s, s), bg)
    px, py = (s - w) // 2, (s - h) // 2
    canvas.paste(crop, (px, py))
    big = canvas.resize((size, size), Image.LANCZOS)
    return big, size / s, px, py


def angle(a, v, b):
    """Angle at vertex v (degrees) between rays v->a and v->b. None if missing."""
    if a is None or v is None or b is None:
        return None
    va = (a[0] - v[0], a[1] - v[1])
    vb = (b[0] - v[0], b[1] - v[1])
    na = math.hypot(*va); nb = math.hypot(*vb)
    if na < 1e-6 or nb < 1e-6:
        return None
    cos = (va[0]*vb[0] + va[1]*vb[1]) / (na*nb)
    cos = max(-1.0, min(1.0, cos))
    return round(math.degrees(math.acos(cos)), 1)


def compute_angles(kps, vis, vis_thresh=0.3):
    """kps: list of (x,y) or None (len 17), vis: list of visibility. Returns dict."""
    def pt(i):
        if kps[i] is None or vis[i] < vis_thresh:
            return None
        return kps[i]
    out = {}
    for name, a, v, b in ANGLE_DEFS:
        out[name] = angle(pt(a), pt(v), pt(b))
    return out


def draw_skeleton(img: Image.Image, kps, vis=None, vis_thresh=0.3, r=4):
    """Draw COCO skeleton on a copy of img. kps in pixel coords (x,y) or None."""
    im = img.convert("RGB").copy()
    d = ImageDraw.Draw(im)
    def ok(i):
        return kps[i] is not None and (vis is None or vis[i] >= vis_thresh)
    for a, b in COCO_EDGES:
        if ok(a) and ok(b):
            d.line([kps[a], kps[b]], fill=(0, 200, 255), width=2)
    for i in range(17):
        if ok(i):
            x, y = kps[i]
            col = (255, 60, 60) if i in (5,7,9,11,13,15) else (60, 255, 120)
            d.ellipse([x-r, y-r, x+r, y+r], fill=col)
    return im


class PoseDetector:
    def __init__(self, model="models/pose_landmarker_heavy.task", conf=0.2):
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        opts = vision.PoseLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=model),
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=conf,
            min_pose_presence_confidence=conf,
            min_tracking_confidence=conf,
        )
        self.landmarker = vision.PoseLandmarker.create_from_options(opts)

    def detect(self, pil_img: Image.Image):
        """Returns (kps17 in pixel coords or None, vis17, raw33) for the given RGB PIL image."""
        import mediapipe as mp
        rgb = np.asarray(pil_img.convert("RGB"), dtype=np.uint8)
        H, W = rgb.shape[:2]
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = self.landmarker.detect(mp_img)
        if not res.pose_landmarks:
            return None, [0.0]*17, None
        lm = res.pose_landmarks[0]  # 33 landmarks
        raw = [(p.x*W, p.y*H, p.visibility, p.presence) for p in lm]
        kps, vis = [], []
        for ci, bi in enumerate(BLAZE_TO_COCO):
            p = lm[bi]
            kps.append((p.x*W, p.y*H))
            vis.append(float(p.visibility))
        return kps, vis, raw
