import "server-only";

import type { PoseRef } from "@/lib/types";

// Mock stand-ins for the real AI pipeline:
//   1. LibreYOLO (https://github.com/LibreYOLO/libreyolo) -> pose keypoint detection
//   2. OpenAI -> turns detection metrics into a 0-100 score
//   3. OpenAI -> writes an "educated" critique of each pose
// When BACKEND_BASE_URL is set, the real Django backend owns all of this and
// this file is never touched.

export interface PoseDetection {
  detected: boolean;
  confidence: number; // 0..1, overall model confidence
  keypointsVisible: number; // out of 17 (COCO keypoint convention)
  // Derived biomechanics-ish metrics the scoring model reasons about.
  alignment: number; // 0..1
  balance: number; // 0..1
  symmetry: number; // 0..1
}

// Deterministic PRNG so a given (game, player, round) always yields the same
// "analysis" -- scores feel earned and the demo is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DIFFICULTY_BIAS: Record<PoseRef["difficulty"], number> = {
  beginner: 0.08,
  intermediate: 0,
  advanced: -0.08,
};

/** Mock of a LibreYOLO pose-detection pass over the submitted frames. */
export function analyzePose(seedKey: string, pose: PoseRef): PoseDetection {
  const rand = mulberry32(hashString(`${seedKey}:${pose.id}`));
  const bias = DIFFICULTY_BIAS[pose.difficulty];

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  // Center the metrics around a "decent attempt" with pose-difficulty bias.
  const base = 0.55 + bias;
  const alignment = clamp01(base + (rand() - 0.4) * 0.5);
  const balance = clamp01(base + (rand() - 0.4) * 0.5);
  const symmetry = clamp01(base + (rand() - 0.4) * 0.5);
  const confidence = clamp01(0.6 + rand() * 0.38);
  const keypointsVisible = Math.round(11 + rand() * 6); // 11..17

  return {
    detected: confidence > 0.45,
    confidence,
    keypointsVisible,
    alignment,
    balance,
    symmetry,
  };
}

/** Mock of the OpenAI scoring pass: detection metrics -> 0..100. */
export function scoreFromDetection(det: PoseDetection): number {
  if (!det.detected) return 0;
  const weighted =
    det.alignment * 0.4 + det.balance * 0.3 + det.symmetry * 0.3;
  const visibilityFactor = det.keypointsVisible / 17;
  const raw = weighted * 0.85 + visibilityFactor * 0.15;
  // Confidence nudges the final number slightly.
  const score = Math.round(raw * 100 * (0.9 + det.confidence * 0.1));
  return Math.max(0, Math.min(100, score));
}

function band(score: number): "low" | "mid" | "high" | "elite" {
  if (score >= 90) return "elite";
  if (score >= 70) return "high";
  if (score >= 45) return "mid";
  return "low";
}

// Educated, constructive critique templates per score band. Each references the
// pose name and one of its cues so the feedback feels specific.
const CRITIQUE_TEMPLATES: Record<
  ReturnType<typeof band>,
  ((name: string, pose: string, cue: string) => string)[]
> = {
  elite: [
    (n, p) => `${n}, that ${p} was genuinely exemplary — clean lines, steady breath, and a foundation most practitioners spend years chasing.`,
    (n, p, c) => `Remarkable ${p}, ${n}. You honored the principle "${c.toLowerCase()}" with the kind of precision a seasoned teacher would applaud.`,
  ],
  high: [
    (n, p, c) => `Strong ${p}, ${n}. The shape is well established; refine "${c.toLowerCase()}" and you cross into mastery.`,
    (n, p) => `${n}, your ${p} reads with real confidence. A touch more length through the spine and it's competition-ready.`,
  ],
  mid: [
    (n, p, c) => `A respectable ${p}, ${n}. The fundamentals are present — focus next on "${c.toLowerCase()}" to find more stability.`,
    (n, p) => `${n}, your ${p} shows promise. Engage the core a little more and the wobble will quiet itself.`,
  ],
  low: [
    (n, p, c) => `${n}, the ${p} is a work in progress, and that's perfectly fine. Begin with "${c.toLowerCase()}" and build from there.`,
    (n, p) => `Courageous attempt at ${p}, ${n}. Slow it down, breathe, and let the foundation settle before reaching for the full expression.`,
  ],
};

/** Mock of the OpenAI critique pass: a single educated quote per submission. */
export function critiqueFor(
  seedKey: string,
  name: string,
  pose: PoseRef,
  score: number
): string {
  const rand = mulberry32(hashString(`${seedKey}:${pose.id}:critique`));
  const templates = CRITIQUE_TEMPLATES[band(score)];
  const template = templates[Math.floor(rand() * templates.length)];
  const cue = pose.cues[Math.floor(rand() * pose.cues.length)] ?? "alignment";
  return template(name, pose.name, cue);
}
