import { corsHeaders } from "../_shared/cors.ts";
import { clientIp, describeError, failure, isRecord, json, readJsonBody } from "../_shared/http.ts";
import type { RateLimiter } from "../_shared/rate-limit.ts";

const MAX_BODY_BYTES = 512;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Dependencies {
  allowedOrigins: readonly string[];
  ipLimiter: RateLimiter;
  unsubscribe(token: string): Promise<void>;
}

function parseToken(body: unknown): string | null {
  if (!isRecord(body) || typeof body.token !== "string") return null;
  const token = body.token.trim();
  return UUID_PATTERN.test(token) ? token.toLowerCase() : null;
}

export function createHandler(deps: Dependencies): (req: Request) => Promise<Response> {
  return async (req) => {
    const origin = req.headers.get("origin");
    if (!origin || !deps.allowedOrigins.includes(origin)) {
      return failure(403, "forbidden_origin");
    }
    const cors = corsHeaders(origin);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return failure(405, "method_not_allowed", cors);
    if (!deps.ipLimiter.hit(clientIp(req))) return failure(429, "rate_limited", cors);

    const token = parseToken(await readJsonBody(req, MAX_BODY_BYTES));
    if (!token) return failure(400, "invalid_input", cors);

    try {
      await deps.unsubscribe(token);
    } catch (error) {
      console.error(`unsubscribe: unsubscribe_waitlist failed: ${describeError(error)}`);
      return failure(500, "server_error", cors);
    }
    return json(200, { ok: true }, cors);
  };
}
