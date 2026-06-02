import { getBackend } from "@/lib/server/backend";
import { toErrorResponse } from "@/lib/server/http";

// Polled frequently; never cache.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await ctx.params;
    const state = await getBackend().getState(code);
    return Response.json(state);
  } catch (err) {
    return toErrorResponse(err);
  }
}
