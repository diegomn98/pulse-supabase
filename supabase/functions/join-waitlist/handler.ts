import { corsHeaders } from "../_shared/cors.ts";
import type { RateLimiter } from "../_shared/rate-limit.ts";

const PLATFORMS = ["ios", "android", "web"] as const;
const SOURCES = ["hero", "footer"] as const;
const MAX_BODY_BYTES = 2048;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Platform = (typeof PLATFORMS)[number];
export type Source = (typeof SOURCES)[number];

export interface WaitlistEntry {
  email: string;
  platforms: Platform[];
  source: Source;
}

export interface JoinResult {
  sendWelcome: boolean;
  unsubscribeToken: string;
}

export interface Dependencies {
  allowedOrigins: readonly string[];
  ipLimiter: RateLimiter;
  emailLimiter: RateLimiter;
  joinWaitlist(entry: WaitlistEntry): Promise<JoinResult>;
  markWelcomeSent(unsubscribeToken: string): Promise<void>;
  sendWelcomeEmail(email: string, unsubscribeToken: string): Promise<void>;
}

type ErrorCode =
  | "forbidden_origin"
  | "method_not_allowed"
  | "invalid_input"
  | "rate_limited"
  | "server_error";

function json(status: number, body: object, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function failure(status: number, error: ErrorCode, headers?: Record<string, string>): Response {
  return json(status, { ok: false, error }, headers);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

async function readBody(req: Request): Promise<unknown> {
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return undefined;

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function isHoneypotFilled(body: Record<string, unknown>): boolean {
  return typeof body.website === "string" && body.website.length > 0;
}

function parseEntry(body: Record<string, unknown>): WaitlistEntry | null {
  const { email, platforms, source, website } = body;
  if (website !== undefined && website !== "") return null;
  if (typeof email !== "string" || !isOneOf(SOURCES, source)) return null;
  if (!Array.isArray(platforms) || platforms.length > PLATFORMS.length) return null;
  if (!platforms.every((platform) => isOneOf(PLATFORMS, platform))) return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) return null;

  return {
    email: normalizedEmail,
    platforms: PLATFORMS.filter((platform) => platforms.includes(platform)),
    source,
  };
}

async function deliverWelcome(deps: Dependencies, email: string, unsubscribeToken: string) {
  try {
    await deps.sendWelcomeEmail(email, unsubscribeToken);
  } catch (error) {
    console.error(`join-waitlist: welcome email not sent: ${describeError(error)}`);
    return;
  }
  try {
    await deps.markWelcomeSent(unsubscribeToken);
  } catch (error) {
    console.error(`join-waitlist: welcome_sent_at not saved: ${describeError(error)}`);
  }
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

    const body = await readBody(req);
    if (!isRecord(body)) return failure(400, "invalid_input", cors);
    if (isHoneypotFilled(body)) return json(200, { ok: true }, cors);

    const entry = parseEntry(body);
    if (!entry) return failure(400, "invalid_input", cors);
    if (!deps.emailLimiter.hit(entry.email)) return failure(429, "rate_limited", cors);

    let result: JoinResult;
    try {
      result = await deps.joinWaitlist(entry);
    } catch (error) {
      console.error(`join-waitlist: join_waitlist failed: ${describeError(error)}`);
      return failure(500, "server_error", cors);
    }

    if (result.sendWelcome) {
      await deliverWelcome(deps, entry.email, result.unsubscribeToken);
    }
    return json(200, { ok: true }, cors);
  };
}
