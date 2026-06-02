import type { JoinGameRequest } from "@/lib/types";
import { getBackend } from "@/lib/server/backend";
import { readJson, toErrorResponse } from "@/lib/server/http";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await ctx.params;
    const body = await readJson<JoinGameRequest>(request);
    const result = await getBackend().joinGame(code, body);
    return Response.json(result, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
