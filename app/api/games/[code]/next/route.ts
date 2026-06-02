import { getBackend } from "@/lib/server/backend";
import { hostToken, toErrorResponse } from "@/lib/server/http";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await ctx.params;
    const state = await getBackend().nextRound(code, hostToken(request));
    return Response.json(state);
  } catch (err) {
    return toErrorResponse(err);
  }
}
