// Shared contracts used by both the client and the BFF route handlers.
// Keep this file free of server-only imports so it is safe in the browser bundle.

export type GameStatus = "lobby" | "in_round" | "finished";

// Phases within a single round.
export type RoundPhase = "preview" | "recording" | "scoring" | "results";

export interface GameConfig {
  totalRounds: number;
  previewSeconds: number;
  recordSeconds: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  totalRounds: 5,
  previewSeconds: 10,
  recordSeconds: 8,
};

export interface PoseRef {
  id: string;
  name: string;
  sanskrit?: string;
  imageUrl: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  cues: string[];
}

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
}

// Per-player result for a single round.
export interface SubmissionState {
  playerId: string;
  hasSubmitted: boolean;
  // Only populated once the round reaches "results".
  score?: number;
}

export interface RankingEntry {
  playerId: string;
  name: string;
  isHost: boolean;
  total: number;
  roundScore: number | null;
  rank: number;
}

// Critique quote shown in the carousel.
export interface CritiqueQuote {
  playerId: string;
  name: string;
  score: number;
  quote: string;
}

// The full, client-safe snapshot returned by GET /state and polled by everyone.
// Never includes the host token or raw video data.
export interface GameState {
  code: string;
  status: GameStatus;
  phase: RoundPhase | null;
  currentRound: number; // 1-based; 0 while in lobby
  config: GameConfig;
  players: PublicPlayer[];
  // Epoch ms when the current phase auto-advances (preview only). null otherwise.
  phaseEndsAt: number | null;
  // Server clock so clients can correct countdown drift.
  serverNow: number;
  // Current round pose (preview/recording/scoring/results). null in lobby.
  pose: PoseRef | null;
  // Submission status for the current round.
  submissions: SubmissionState[];
  // Cumulative ranking; present during results and finished.
  ranking: RankingEntry[];
}

// ---- Request/response payloads ----

export interface CreateGameRequest {
  hostName: string;
  config?: Partial<GameConfig>;
}

export interface CreateGameResponse {
  code: string;
  hostToken: string;
  player: PublicPlayer;
  config: GameConfig;
}

export interface JoinGameRequest {
  name: string;
}

export interface JoinGameResponse {
  code: string;
  player: PublicPlayer;
}

export interface CritiqueResponse {
  round: number;
  quotes: CritiqueQuote[];
}

export interface ApiError {
  error: string;
}
