import type { CreateGameRequest } from "@/lib/types";
import { getBackend } from "@/lib/server/backend";
import { readJson, toErrorResponse } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateGameRequest>(request);
    const result = await getBackend().createGame(body);
    return Response.json(result, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
