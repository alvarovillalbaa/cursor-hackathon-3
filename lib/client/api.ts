import type {
  CreateGameRequest,
  CreateGameResponse,
  CritiqueResponse,
  GameConfig,
  GameState,
  JoinGameResponse,
} from "@/lib/types";

// Thin client over the BFF route handlers. Throws Error(message) on failure so
// callers can surface the backend's message directly.

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(
      (data && typeof data.error === "string" && data.error) ||
        `Request failed (${res.status})`
    );
  }
  return data as T;
}

function hostHeaders(hostToken?: string): HeadersInit {
  return hostToken ? { "X-Host-Token": hostToken } : {};
}

export async function createGame(
  hostName: string,
  config?: Partial<GameConfig>
): Promise<CreateGameResponse> {
  const body: CreateGameRequest = { hostName, config };
  const res = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle<CreateGameResponse>(res);
}

export async function joinGame(
  code: string,
  name: string
): Promise<JoinGameResponse> {
  const res = await fetch(`/api/games/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return handle<JoinGameResponse>(res);
}

export async function fetchState(code: string): Promise<GameState> {
  const res = await fetch(`/api/games/${code}/state`, { cache: "no-store" });
  return handle<GameState>(res);
}

export async function startGame(
  code: string,
  hostToken: string
): Promise<GameState> {
  const res = await fetch(`/api/games/${code}/start`, {
    method: "POST",
    headers: hostHeaders(hostToken),
  });
  return handle<GameState>(res);
}

export async function submitVideo(
  code: string,
  playerId: string,
  round: number,
  video: Blob
): Promise<{ score: number | null }> {
  const form = new FormData();
  form.set("playerId", playerId);
  form.set("round", String(round));
  form.set("video", video, "pose.webm");
  const res = await fetch(`/api/games/${code}/submit`, {
    method: "POST",
    body: form,
  });
  return handle<{ score: number | null }>(res);
}

export async function revealRound(
  code: string,
  hostToken: string
): Promise<GameState> {
  const res = await fetch(`/api/games/${code}/reveal`, {
    method: "POST",
    headers: hostHeaders(hostToken),
  });
  return handle<GameState>(res);
}

export async function nextRound(
  code: string,
  hostToken: string
): Promise<GameState> {
  const res = await fetch(`/api/games/${code}/next`, {
    method: "POST",
    headers: hostHeaders(hostToken),
  });
  return handle<GameState>(res);
}

export async function fetchCritique(
  code: string,
  round?: number
): Promise<CritiqueResponse> {
  const res = await fetch(`/api/games/${code}/critique`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ round }),
  });
  return handle<CritiqueResponse>(res);
}
