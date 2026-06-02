import "server-only";

import type {
  CreateGameRequest,
  CreateGameResponse,
  CritiqueResponse,
  GameState,
  JoinGameRequest,
  JoinGameResponse,
} from "@/lib/types";
import type { GameBackend, SubmitInput, SubmitResult } from "@/lib/server/backend";
import { GameError } from "@/lib/server/store";

// ---------------------------------------------------------------------------
// PLACEHOLDER Django backend paths.
//
// These are the only things to confirm when wiring the real backend. Set
// BACKEND_BASE_URL (e.g. https://api.example.com) and adjust the paths/payloads
// below to match the Django routes. The mock backend mirrors these semantics.
//
// Auth: the host token is sent as the `X-Host-Token` header on host-only calls.
// ---------------------------------------------------------------------------
const PATHS = {
  createGame: () => `/games`, // POST  { hostName, config }
  joinGame: (code: string) => `/games/${code}/join`, // POST { name }
  state: (code: string) => `/games/${code}/state`, // GET
  start: (code: string) => `/games/${code}/start`, // POST (host)
  submit: (code: string) => `/games/${code}/submit`, // POST multipart { playerId, round, video }
  reveal: (code: string) => `/games/${code}/reveal`, // POST (host)
  next: (code: string) => `/games/${code}/next`, // POST (host)
  critique: (code: string) => `/games/${code}/critique`, // POST { round? }
} as const;

export function createRemoteBackend(baseUrl: string): GameBackend {
  const root = baseUrl.replace(/\/$/, "");

  async function parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const message =
        (data && typeof data.error === "string" && data.error) ||
        `Backend error (${res.status})`;
      throw new GameError(message, res.status);
    }
    return data as T;
  }

  async function postJson<T>(
    path: string,
    body: unknown,
    hostToken?: string
  ): Promise<T> {
    const res = await fetch(`${root}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(hostToken ? { "X-Host-Token": hostToken } : {}),
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
    return parse<T>(res);
  }

  return {
    async createGame(req: CreateGameRequest) {
      return postJson<CreateGameResponse>(PATHS.createGame(), req);
    },

    async joinGame(code: string, req: JoinGameRequest) {
      return postJson<JoinGameResponse>(PATHS.joinGame(code), req);
    },

    async getState(code: string) {
      const res = await fetch(`${root}${PATHS.state(code)}`, {
        cache: "no-store",
      });
      return parse<GameState>(res);
    },

    async startGame(code: string, hostToken?: string) {
      return postJson<GameState>(PATHS.start(code), {}, hostToken);
    },

    async submit(code: string, input: SubmitInput): Promise<SubmitResult> {
      const form = new FormData();
      form.set("playerId", input.playerId);
      form.set("round", String(input.round));
      if (input.video) form.set("video", input.video, "pose.webm");
      const res = await fetch(`${root}${PATHS.submit(code)}`, {
        method: "POST",
        body: form,
        cache: "no-store",
      });
      return parse<SubmitResult>(res);
    },

    async reveal(code: string, hostToken?: string) {
      return postJson<GameState>(PATHS.reveal(code), {}, hostToken);
    },

    async nextRound(code: string, hostToken?: string) {
      return postJson<GameState>(PATHS.next(code), {}, hostToken);
    },

    async critique(code: string, round?: number) {
      return postJson<CritiqueResponse>(PATHS.critique(code), { round });
    },
  };
}
