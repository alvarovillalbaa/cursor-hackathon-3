import "server-only";

import type { GameConfig, PoseRef } from "@/lib/types";
import type { PoseDetection } from "@/lib/server/ai-mock";

// Internal (server-only) shapes. Plain objects/records (not Maps) so a whole
// game serializes to JSON cleanly for the key/value persistence layer.

export interface InternalSubmission {
  playerId: string;
  round: number;
  submittedAt: number;
  score: number;
  detection: PoseDetection;
}

export interface InternalRound {
  round: number;
  pose: PoseRef;
  startedAt: number;
  previewEndsAt: number;
  revealed: boolean;
  submissions: Record<string, InternalSubmission>;
}

export interface InternalPlayer {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

export interface InternalGame {
  id: string;
  code: string;
  hostToken: string;
  hostPlayerId: string;
  config: GameConfig;
  status: "lobby" | "in_round" | "finished";
  currentRound: number;
  poseOrder: string[];
  players: Record<string, InternalPlayer>;
  rounds: Record<number, InternalRound>;
  createdAt: number;
}
