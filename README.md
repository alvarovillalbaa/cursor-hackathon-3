# PoseOff

A Kahoot-style multiplayer yoga game with computer vision. A host opens a game on a big screen, players join from their phones via a QR code or 5-character code, everyone gets the same yoga pose, records themselves holding it, and an AI pipeline scores each attempt 0-100. A live ranking appears after every round, and an "Critique us" button serves up an AI critique of each player's pose.

## How it works

1. **Create** a game (set the number of rounds and pose-preview time). You become the host and also play.
2. Players **join** by scanning the QR code or entering the code. They land in the lobby.
3. The host clicks **Start now**. Each round:
   - Everyone sees the **pose** for a few seconds (default 10s).
   - The camera opens and players **record** a short clip, then **submit**.
   - The backend analyzes each clip (**LibreYOLO** for keypoints -> an evaluator model for a 0-100 score).
   - A **ranking** is shown. Tap **Critique us** for an AI critique carousel.
4. The host clicks **Next round** until the game ends (default 5 rounds), then a final ranking is shown.

## Architecture

- **Frontend + BFF**: Next.js App Router. UI under `app/`, game logic components under `components/game/`.
- **Route handlers** (`app/api/games/...`) are a thin backend-for-frontend. They delegate to `getBackend()` in `lib/server/backend.ts`:
  - If `BACKEND_BASE_URL` is set, requests are **proxied** to your Django backend (placeholder paths live in `lib/server/backend-remote.ts`).
  - If it is not set, a built-in **mock** (`lib/server/store.ts`) plus **fake AI** (`lib/server/ai-mock.ts`) run everything locally so the game is fully playable with zero setup.
- **Storage** (no database): one record per game, persisted through `lib/server/persistence.ts`, which auto-selects a driver:
  - **Upstash Redis** over HTTP when `UPSTASH_REDIS_REST_URL`/`KV_REST_API_URL` (+ token) is set. This is the **only** option that works on Vercel/serverless, where each request can hit a different, isolated instance with its own ephemeral `/tmp`.
  - **Local JSON files** under `tmp/games/<CODE>.json` otherwise — zero-setup for `next dev`, but single-process only (does not sync across instances/devices).
  - The store is **stateless** (read-modify-write per request); there is deliberately no shared in-memory cache, since on serverless that cache is per-instance and goes stale.
- **State sync** is HTTP polling (`hooks/use-game-state.ts`, ~1.5s) against `GET /api/games/[code]/state`, which performs server-authoritative phase transitions.
- **Recording** uses `getUserMedia` + `MediaRecorder` (`hooks/use-recorder.ts`).
- **Poses** come from the backend, falling back to the bundled set in `public/poses/` (catalog in `lib/poses.ts`).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no backend configured it runs entirely on the mock.

### Playing across devices (phone cameras need HTTPS)

`getUserMedia` is blocked on non-secure origins, so phones cannot record over `http://<your-LAN-IP>:3000`. Use one of:

- **HTTPS dev server**: `npm run dev:https` (Next.js generates a self-signed cert via mkcert), then set the QR base URL.
- **Tunnel**: e.g. `cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`, then point the QR base URL at the public HTTPS URL.

Tell the app which public URL to encode into the QR code with `NEXT_PUBLIC_APP_URL`.

## Cross-device storage (required on Vercel)

Local `tmp/` files cannot be shared on Vercel: serverless functions have no shared, persistent disk, and the per-invocation `/tmp` is wiped and isolated between instances. So a host on one phone and a player on another would hit different instances and never see the same game. To demo across devices with **no database**, point the app at a free **Upstash Redis** store (a key/value store, not a relational DB):

1. In the Vercel dashboard: **Storage → Create Database → Upstash for Redis** (or **Marketplace → Upstash**), then **Connect** it to this project.
2. Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the `@upstash/redis` client also accepts the native `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`).
3. **Redeploy.** That's it — `lib/server/persistence.ts` detects the vars and switches from local files to Redis automatically. No code change.

To run the Redis driver locally, `vercel env pull .env.local` (or paste the two vars) and `npm run dev`.

> Concurrency note: writes are last-write-wins per game (read-modify-write, no lock). For a normal demo this is fine; if two players submit in the exact same instant one submission can be dropped, and the host's **Reveal**/**Next round** always forces the round forward. Move submissions to per-player keys or a Lua `eval` CAS if you need bulletproof concurrency.

## Environment variables

Create `.env.local`:

```bash
# Cross-device storage on Vercel (auto-injected when you connect an Upstash store).
# Either pair works; native UPSTASH_* takes precedence over KV_*.
KV_REST_API_URL=https://your-db.upstash.io
KV_REST_API_TOKEN=your_token_here
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...

# Optional: when set, the BFF proxies to your real (Django) backend instead of the mock.
BACKEND_BASE_URL=https://api.your-backend.com

# Optional: base URL embedded in the join QR code (use your tunnel/HTTPS URL).
# Defaults to the browser's window.location.origin when unset.
NEXT_PUBLIC_APP_URL=https://your-tunnel.example.com
```

### Wiring the real backend

The placeholder REST contract the BFF expects is defined in `lib/server/backend-remote.ts` (paths) and `lib/types.ts` (payloads). Set `BACKEND_BASE_URL`, confirm the paths match your Django routes, and the mock is bypassed. The host token is sent as the `X-Host-Token` header on host-only actions (start, reveal, next).
