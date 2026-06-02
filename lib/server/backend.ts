import "server-only";

import type {
  CreateGameRequest,
  CreateGameResponse,
  CritiqueResponse,
  GameState,
  JoinGameRequest,
  JoinGameResponse,
} from "@/lib/types";
import * as store from "@/lib/server/store";
import { createRemoteBackend } from "@/lib/server/backend-remote";

export interface SubmitInput {
  playerId: string;
  round: number;
  // The recorded clip. The mock ignores the bytes; the remote backend forwards it.
  video: Blob | null;
}

export interface SubmitResult {
  // Score may be null when the real backend scores asynchronously; clients then
  // pick the score up from the polled game state.
  score: number | null;
}

// The contract every backend (mock or real Django) must satisfy.
export interface GameBackend {
  createGame(req: CreateGameRequest): Promise<CreateGameResponse>;
  joinGame(code: string, req: JoinGameRequest): Promise<JoinGameResponse>;
  getState(code: string): Promise<GameState>;
  startGame(code: string, hostToken?: string): Promise<GameState>;
  submit(code: string, input: SubmitInput): Promise<SubmitResult>;
  reveal(code: string, hostToken?: string): Promise<GameState>;
  nextRound(code: string, hostToken?: string): Promise<GameState>;
  critique(code: string, round?: number): Promise<CritiqueResponse>;
}

// In-process mock backend backed by the in-memory store + fake AI.
const mockBackend: GameBackend = {
  async createGame(req) {
    return store.createGame(req);
  },
  async joinGame(code, req) {
    return store.joinGame(code, req);
  },
  async getState(code) {
    return store.getState(code);
  },
  async startGame(code, hostToken) {
    return store.startGame(code, hostToken);
  },
  async submit(code, input) {
    // The mock derives the score deterministically and ignores the video bytes.
    return store.submit(code, input.playerId, input.round);
  },
  async reveal(code, hostToken) {
    return store.reveal(code, hostToken);
  },
  async nextRound(code, hostToken) {
    return store.nextRound(code, hostToken);
  },
  async critique(code, round) {
    return store.critique(code, round);
  },
};

let cached: GameBackend | null = null;

// Picks the real backend when BACKEND_BASE_URL is configured, otherwise the mock.
export function getBackend(): GameBackend {
  if (cached) return cached;
  const baseUrl = process.env.BACKEND_BASE_URL?.trim();
  cached = baseUrl ? createRemoteBackend(baseUrl) : mockBackend;
  return cached;
}
