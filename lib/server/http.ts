import "server-only";

import { GameError } from "@/lib/server/store";

// Maps thrown errors to JSON responses. GameError carries an HTTP status;
// anything else is treated as a 500.
export function toErrorResponse(err: unknown): Response {
  if (err instanceof GameError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("[yoga-kahoot] unexpected error:", err);
  return Response.json({ error: "Unexpected server error" }, { status: 500 });
}

// Best-effort JSON body parse that tolerates empty bodies.
export async function readJson<T = Record<string, unknown>>(
  request: Request
): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function hostToken(request: Request): string | undefined {
  return request.headers.get("x-host-token") ?? undefined;
}
