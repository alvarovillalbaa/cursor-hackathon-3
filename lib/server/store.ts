import "server-only";

import {
  DEFAULT_CONFIG,
  type CreateGameRequest,
  type CreateGameResponse,
  type CritiqueQuote,
  type CritiqueResponse,
  type GameConfig,
  type GameState,
  type JoinGameRequest,
  type JoinGameResponse,
  type PoseRef,
  type PublicPlayer,
  type RankingEntry,
  type RoundPhase,
  type SubmissionState,
} from "@/lib/types";
import { POSES } from "@/lib/poses";
import {
  analyzePose,
  critiqueFor,
  scoreFromDetection,
} from "@/lib/server/ai-mock";
import type {
  InternalGame,
  InternalPlayer,
  InternalRound,
} from "@/lib/server/game-types";
import { getPersistence } from "@/lib/server/persistence";

// ---- Persistence ----
// State is stored one-record-per-game through the persistence layer (Upstash
// Redis in prod, local disk in dev). There is intentionally NO long-lived
// in-memory cache: on serverless such a cache is per-instance and goes stale
// the instant another device hits a different instance. Every public function
// therefore reads the game, mutates it, and writes it straight back.

// ---- Errors ----

export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "GameError";
    this.status = status;
  }
}

// ---- Helpers ----

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L
const CODE_LENGTH = 5;

async function genCode(): Promise<string> {
  const persistence = getPersistence();
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!(await persistence.exists(code))) return code;
  }
  throw new GameError("Could not allocate a game code", 500);
}

function genId(): string {
  return globalThis.crypto.randomUUID();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeConfig(input?: Partial<GameConfig>): GameConfig {
  return {
    totalRounds: clamp(
      Math.round(input?.totalRounds ?? DEFAULT_CONFIG.totalRounds),
      1,
      20
    ),
    previewSeconds: clamp(
      Math.round(input?.previewSeconds ?? DEFAULT_CONFIG.previewSeconds),
      3,
      60
    ),
    recordSeconds: clamp(
      Math.round(input?.recordSeconds ?? DEFAULT_CONFIG.recordSeconds),
      3,
      30
    ),
  };
}

function shuffledPoseIds(): string[] {
  const ids = POSES.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

function poseForRound(game: InternalGame, round: number): PoseRef {
  const id = game.poseOrder[(round - 1) % game.poseOrder.length];
  const pose = POSES.find((p) => p.id === id);
  if (!pose) throw new GameError("Pose not found", 500);
  return pose;
}

async function getGame(code: string): Promise<InternalGame> {
  const game = await getPersistence().read(code);
  if (!game) throw new GameError("Game not found", 404);
  return game;
}

function save(game: InternalGame): Promise<void> {
  return getPersistence().write(game);
}

function requireHost(game: InternalGame, hostToken: string | undefined): void {
  if (!hostToken || hostToken !== game.hostToken) {
    throw new GameError("Only the host can do that", 403);
  }
}

function playerList(game: InternalGame): InternalPlayer[] {
  return Object.values(game.players).sort((a, b) => a.joinedAt - b.joinedAt);
}

function playerCount(game: InternalGame): number {
  return Object.keys(game.players).length;
}

function startRound(game: InternalGame, round: number): void {
  const now = Date.now();
  game.rounds[round] = {
    round,
    pose: poseForRound(game, round),
    startedAt: now,
    previewEndsAt: now + game.config.previewSeconds * 1000,
    revealed: false,
    submissions: {},
  };
  game.currentRound = round;
}

function currentRoundObj(game: InternalGame): InternalRound | undefined {
  return game.rounds[game.currentRound];
}

function submissionCount(round: InternalRound | undefined): number {
  return round ? Object.keys(round.submissions).length : 0;
}

function computePhase(game: InternalGame, now: number): RoundPhase | null {
  if (game.status !== "in_round") return null;
  const round = currentRoundObj(game);
  if (!round) return null;
  if (round.revealed) return "results";
  if (now < round.previewEndsAt) return "preview";
  if (submissionCount(round) >= playerCount(game)) return "scoring";
  return "recording";
}

function publicPlayers(game: InternalGame): PublicPlayer[] {
  return playerList(game).map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
  }));
}

function buildRanking(game: InternalGame): RankingEntry[] {
  const currentRevealed = currentRoundObj(game)?.revealed ?? false;
  const currentRound = game.currentRound;

  const entries = playerList(game).map((player) => {
    let total = 0;
    for (const round of Object.values(game.rounds)) {
      if (!round.revealed) continue;
      total += round.submissions[player.id]?.score ?? 0;
    }
    let roundScore: number | null = null;
    if (currentRevealed) {
      roundScore =
        game.rounds[currentRound]?.submissions[player.id]?.score ?? 0;
    }
    return {
      playerId: player.id,
      name: player.name,
      isHost: player.isHost,
      total,
      roundScore,
      rank: 0,
    };
  });

  entries.sort(
    (a, b) =>
      b.total - a.total ||
      (b.roundScore ?? -1) - (a.roundScore ?? -1) ||
      a.name.localeCompare(b.name)
  );

  // Standard competition ranking (ties share a rank).
  let rank = 0;
  let count = 0;
  let prevTotal: number | null = null;
  for (const entry of entries) {
    count++;
    if (entry.total !== prevTotal) {
      rank = count;
      prevTotal = entry.total;
    }
    entry.rank = rank;
  }
  return entries;
}

function currentSubmissions(game: InternalGame): SubmissionState[] {
  const round = currentRoundObj(game);
  return playerList(game).map((player) => {
    const sub = round?.submissions[player.id];
    const state: SubmissionState = {
      playerId: player.id,
      hasSubmitted: Boolean(sub),
    };
    if (round?.revealed && sub) state.score = sub.score;
    return state;
  });
}

function toGameState(game: InternalGame): GameState {
  const now = Date.now();
  const phase = computePhase(game, now);
  const round = currentRoundObj(game);
  const showRanking = game.status === "finished" || round?.revealed === true;

  return {
    code: game.code,
    status: game.status,
    phase,
    currentRound: game.status === "lobby" ? 0 : game.currentRound,
    config: game.config,
    players: publicPlayers(game),
    phaseEndsAt: phase === "preview" ? (round?.previewEndsAt ?? null) : null,
    serverNow: now,
    pose: game.status === "in_round" ? (round?.pose ?? null) : null,
    submissions: game.status === "in_round" ? currentSubmissions(game) : [],
    ranking: showRanking ? buildRanking(game) : [],
  };
}

// ---- Public API (consumed by the mock backend) ----

export async function createGame(
  req: CreateGameRequest
): Promise<CreateGameResponse> {
  const hostName = (req.hostName ?? "").trim();
  if (!hostName) throw new GameError("A host name is required", 400);
  if (hostName.length > 24) throw new GameError("Name is too long", 400);

  const code = await genCode();
  const hostPlayerId = genId();
  const config = normalizeConfig(req.config);

  const game: InternalGame = {
    id: genId(),
    code,
    hostToken: genId(),
    hostPlayerId,
    config,
    status: "lobby",
    currentRound: 0,
    poseOrder: shuffledPoseIds(),
    players: {
      [hostPlayerId]: {
        id: hostPlayerId,
        name: hostName,
        isHost: true,
        joinedAt: Date.now(),
      },
    },
    rounds: {},
    createdAt: Date.now(),
  };
  await save(game);

  return {
    code,
    hostToken: game.hostToken,
    player: { id: hostPlayerId, name: hostName, isHost: true },
    config,
  };
}

export async function joinGame(
  code: string,
  req: JoinGameRequest
): Promise<JoinGameResponse> {
  const game = await getGame(code);
  if (game.status !== "lobby") {
    throw new GameError("This game has already started", 409);
  }
  const name = (req.name ?? "").trim();
  if (!name) throw new GameError("A name is required", 400);
  if (name.length > 24) throw new GameError("Name is too long", 400);
  if (playerCount(game) >= 40) throw new GameError("This game is full", 409);

  const id = genId();
  game.players[id] = { id, name, isHost: false, joinedAt: Date.now() };
  await save(game);

  return { code: game.code, player: { id, name, isHost: false } };
}

export async function getState(code: string): Promise<GameState> {
  return toGameState(await getGame(code));
}

export async function startGame(
  code: string,
  hostToken?: string
): Promise<GameState> {
  const game = await getGame(code);
  requireHost(game, hostToken);
  if (game.status !== "lobby") {
    throw new GameError("Game already started", 409);
  }
  game.status = "in_round";
  startRound(game, 1);
  await save(game);
  return toGameState(game);
}

export async function submit(
  code: string,
  playerId: string,
  round: number
): Promise<{ score: number }> {
  const game = await getGame(code);
  if (game.status !== "in_round") {
    throw new GameError("No active round", 409);
  }
  if (round !== game.currentRound) {
    throw new GameError("Submission is for a different round", 409);
  }
  const player = game.players[playerId];
  if (!player) throw new GameError("Unknown player", 404);

  const roundObj = currentRoundObj(game)!;
  if (roundObj.revealed) {
    throw new GameError("This round is already over", 409);
  }
  if (Date.now() < roundObj.previewEndsAt) {
    throw new GameError("Still in the preview phase", 409);
  }

  // Idempotent: a re-submit returns the original score.
  const existing = roundObj.submissions[playerId];
  if (existing) return { score: existing.score };

  const seedKey = `${game.code}:${playerId}:${round}`;
  const detection = analyzePose(seedKey, roundObj.pose);
  const score = scoreFromDetection(detection);
  roundObj.submissions[playerId] = {
    playerId,
    round,
    submittedAt: Date.now(),
    score,
    detection,
  };

  // Auto-reveal once everyone has submitted.
  if (submissionCount(roundObj) >= playerCount(game)) {
    roundObj.revealed = true;
  }
  await save(game);
  return { score };
}

export async function reveal(
  code: string,
  hostToken?: string
): Promise<GameState> {
  const game = await getGame(code);
  requireHost(game, hostToken);
  if (game.status !== "in_round") {
    throw new GameError("No active round", 409);
  }
  currentRoundObj(game)!.revealed = true;
  await save(game);
  return toGameState(game);
}

export async function nextRound(
  code: string,
  hostToken?: string
): Promise<GameState> {
  const game = await getGame(code);
  requireHost(game, hostToken);
  if (game.status !== "in_round") {
    throw new GameError("No active round to advance", 409);
  }
  // Make sure the just-finished round counts toward totals.
  currentRoundObj(game)!.revealed = true;

  if (game.currentRound >= game.config.totalRounds) {
    game.status = "finished";
  } else {
    startRound(game, game.currentRound + 1);
  }
  await save(game);
  return toGameState(game);
}

export async function critique(
  code: string,
  round?: number
): Promise<CritiqueResponse> {
  const game = await getGame(code);
  const targetRound = round ?? game.currentRound;
  const roundObj = game.rounds[targetRound];
  if (!roundObj) throw new GameError("Round not found", 404);

  const quotes: CritiqueQuote[] = playerList(game).map((player) => {
    const sub = roundObj.submissions[player.id];
    const score = sub?.score ?? 0;
    const seedKey = `${game.code}:${player.id}:${targetRound}`;
    return {
      playerId: player.id,
      name: player.name,
      score,
      quote: critiqueFor(seedKey, player.name, roundObj.pose, score),
    };
  });

  return { round: targetRound, quotes };
}
