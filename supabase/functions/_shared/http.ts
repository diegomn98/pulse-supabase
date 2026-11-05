export type ErrorCode =
  | "forbidden_origin"
  | "method_not_allowed"
  | "invalid_input"
  | "rate_limited"
  | "server_error";

export function json(status: number, body: object, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function failure(status: number, error: ErrorCode, headers?: Record<string, string>): Response {
  return json(status, { ok: false, error }, headers);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) return undefined;

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > maxBytes) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
