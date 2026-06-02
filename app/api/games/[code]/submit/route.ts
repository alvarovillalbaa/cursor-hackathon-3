import { getBackend } from "@/lib/server/backend";
import { toErrorResponse } from "@/lib/server/http";
import { GameError } from "@/lib/server/store";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await ctx.params;
    const form = await request.formData();
    const playerId = String(form.get("playerId") ?? "");
    const round = Number(form.get("round"));
    const videoEntry = form.get("video");
    const video = videoEntry instanceof Blob ? videoEntry : null;

    if (!playerId) throw new GameError("playerId is required", 400);
    if (!Number.isInteger(round)) throw new GameError("round is required", 400);

    const result = await getBackend().submit(code, { playerId, round, video });
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
