import type { PoseRef } from "@/lib/types";

// Bundled fallback pose catalog. When BACKEND_BASE_URL is configured the real
// backend supplies poses per round; these are used when running on the mock.
export const POSES: PoseRef[] = [
  {
    id: "mountain",
    name: "Mountain",
    sanskrit: "Tadasana",
    imageUrl: "/poses/mountain.svg",
    difficulty: "beginner",
    cues: [
      "Stand tall, feet hip-width, weight even across both soles.",
      "Lengthen the spine and stack shoulders over hips.",
      "Relax the arms with palms facing forward.",
    ],
  },
  {
    id: "tree",
    name: "Tree",
    sanskrit: "Vrksasana",
    imageUrl: "/poses/tree.svg",
    difficulty: "beginner",
    cues: [
      "Root down through the standing foot.",
      "Press the lifted foot into the inner thigh or calf (never the knee).",
      "Reach the arms overhead and find a steady gaze.",
    ],
  },
  {
    id: "warrior2",
    name: "Warrior II",
    sanskrit: "Virabhadrasana II",
    imageUrl: "/poses/warrior2.svg",
    difficulty: "intermediate",
    cues: [
      "Bend the front knee over the ankle, thigh toward parallel.",
      "Extend the arms actively in opposite directions.",
      "Sink the hips and gaze over the front hand.",
    ],
  },
  {
    id: "downward-dog",
    name: "Downward Dog",
    sanskrit: "Adho Mukha Svanasana",
    imageUrl: "/poses/downward-dog.svg",
    difficulty: "beginner",
    cues: [
      "Press the hands down and lift the hips up and back.",
      "Make an inverted V; lengthen the spine.",
      "Let the heels reach toward the floor.",
    ],
  },
  {
    id: "triangle",
    name: "Triangle",
    sanskrit: "Trikonasana",
    imageUrl: "/poses/triangle.svg",
    difficulty: "intermediate",
    cues: [
      "Keep both legs straight and strong, feet wide.",
      "Hinge from the hip, not the waist.",
      "Stack the top arm over the shoulder and open the chest.",
    ],
  },
  {
    id: "chair",
    name: "Chair",
    sanskrit: "Utkatasana",
    imageUrl: "/poses/chair.svg",
    difficulty: "intermediate",
    cues: [
      "Sit the hips back as if lowering into a chair.",
      "Keep weight in the heels, knees behind the toes.",
      "Reach the arms up alongside the ears.",
    ],
  },
  {
    id: "cobra",
    name: "Cobra",
    sanskrit: "Bhujangasana",
    imageUrl: "/poses/cobra.svg",
    difficulty: "beginner",
    cues: [
      "Lie prone, hands under the shoulders.",
      "Lift the chest using the back, not just the arms.",
      "Keep the shoulders drawing down away from the ears.",
    ],
  },
  {
    id: "dancer",
    name: "Dancer",
    sanskrit: "Natarajasana",
    imageUrl: "/poses/dancer.svg",
    difficulty: "advanced",
    cues: [
      "Balance on one leg and grip the opposite foot behind you.",
      "Kick the lifted foot into the hand and reach forward.",
      "Lengthen through the chest and keep the standing leg strong.",
    ],
  },
];

export function getPoseById(id: string): PoseRef | undefined {
  return POSES.find((p) => p.id === id);
}
