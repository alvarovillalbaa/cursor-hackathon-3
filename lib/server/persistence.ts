import "server-only";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { Redis } from "@upstash/redis";

import type { InternalGame } from "@/lib/server/game-types";
import { GameError } from "@/lib/server/errors";

// ---------------------------------------------------------------------------
// Persistence seam: one record per game, keyed by its 5-char code. No DB.
//
// Two interchangeable drivers, chosen once at module load from the environment:
//   - "redis": Upstash Redis over HTTP. The ONLY option that actually shares
//     state across devices/URLs on Vercel, where each request can hit a
//     different, isolated serverless instance with its own ephemeral /tmp.
//   - "disk":  JSON files under <project>/tmp/games. Zero-setup local-dev
//     fallback. Works because `next dev` is one long-lived process; it does
//     NOT sync across instances, so it's useless on serverless.
//
// The store reads-modifies-writes a whole game per request (stateless), so the
// correct driver is all that's needed to make the demo work across phones.
// ---------------------------------------------------------------------------

export interface GamePersistence {
  readonly kind: "redis" | "disk" | "unconfigured";
  read(code: string): Promise<InternalGame | null>;
  write(game: InternalGame): Promise<void>;
  exists(code: string): Promise<boolean>;
}

// Demo games self-expire so the store never grows unbounded (Redis only).
const GAME_TTL_SECONDS = 60 * 60 * 24; // 24h

function redisKey(code: string): string {
  return `poseoff:game:${code.toUpperCase()}`;
}

function createRedisPersistence(redis: Redis): GamePersistence {
  return {
    kind: "redis",
    async read(code) {
      // @upstash/redis transparently JSON-(de)serializes object values.
      return (await redis.get<InternalGame>(redisKey(code))) ?? null;
    },
    async write(game) {
      await redis.set(redisKey(game.code), game, { ex: GAME_TTL_SECONDS });
    },
    async exists(code) {
      return (await redis.exists(redisKey(code))) === 1;
    },
  };
}

function createDiskPersistence(): GamePersistence {
  const dir = join(process.cwd(), "tmp", "games");
  const fileFor = (code: string) => join(dir, `${code.toUpperCase()}.json`);

  return {
    kind: "disk",
    async read(code) {
      try {
        const file = fileFor(code);
        if (!existsSync(file)) return null;
        return JSON.parse(readFileSync(file, "utf8")) as InternalGame;
      } catch (err) {
        console.error("[poseoff-store] disk read failed:", err);
        return null;
      }
    },
    async write(game) {
      mkdirSync(dir, { recursive: true });
      const file = fileFor(game.code);
      const tmp = `${file}.tmp`;
      // Write-then-rename so readers never observe a half-written file.
      writeFileSync(tmp, JSON.stringify(game));
      renameSync(tmp, file);
    },
    async exists(code) {
      return existsSync(fileFor(code));
    },
  };
}

const STORAGE_NOT_CONFIGURED =
  "Game storage isn't configured. Connect an Upstash Redis store in the " +
  "Vercel dashboard (Storage \u2192 Create Database \u2192 Upstash for Redis), " +
  "then redeploy. See README \u203a Cross-device storage.";

// Used in production when no Redis is wired. The local-disk driver can't help
// there (the project dir is read-only and /tmp doesn't sync across instances),
// so instead of a cryptic EROFS 500 we surface an actionable 503.
function createUnconfiguredPersistence(): GamePersistence {
  const fail = async (): Promise<never> => {
    throw new GameError(STORAGE_NOT_CONFIGURED, 503);
  };
  return {
    kind: "unconfigured",
    read: fail,
    write: fail,
    exists: fail,
  };
}

function selectPersistence(): GamePersistence {
  // Accept either the native Upstash names or the Vercel-injected KV names.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (url && token) {
    return createRedisPersistence(new Redis({ url, token }));
  }

  if (process.env.NODE_ENV === "production") {
    // Fail fast and loud rather than 500 on a read-only filesystem write.
    console.error(`[poseoff-store] ${STORAGE_NOT_CONFIGURED}`);
    return createUnconfiguredPersistence();
  }

  // Local dev: zero-setup file store.
  return createDiskPersistence();
}

// Cache the driver on globalThis so dev hot-reloads reuse one instance.
const globalForPersistence = globalThis as unknown as {
  __poseoffPersistence?: GamePersistence;
};

export function getPersistence(): GamePersistence {
  if (!globalForPersistence.__poseoffPersistence) {
    globalForPersistence.__poseoffPersistence = selectPersistence();
  }
  return globalForPersistence.__poseoffPersistence;
}
