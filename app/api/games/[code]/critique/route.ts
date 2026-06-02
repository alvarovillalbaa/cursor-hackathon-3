import { getBackend } from "@/lib/server/backend";
import { readJson, toErrorResponse } from "@/lib/server/http";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await ctx.params;
    const body = await readJson<{ round?: number }>(request);
    const result = await getBackend().critique(code, body.round);
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
