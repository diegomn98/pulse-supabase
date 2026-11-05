import { parseAllowedOrigins } from "../_shared/cors.ts";
import { requireEnv } from "../_shared/env.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { createSecretClient } from "../_shared/supabase.ts";
import { createHandler } from "./handler.ts";

const allowedOrigins = parseAllowedOrigins(requireEnv("ALLOWED_ORIGINS"));
const supabase = createSecretClient();

const MINUTE = 60_000;

Deno.serve(createHandler({
  allowedOrigins,
  ipLimiter: createRateLimiter({ limit: 20, windowMs: 10 * MINUTE }),

  async unsubscribe(token) {
    const { error } = await supabase.rpc("unsubscribe_waitlist", { token });
    if (error) throw new Error(`unsubscribe_waitlist rpc failed (${error.code})`);
  },
}));
