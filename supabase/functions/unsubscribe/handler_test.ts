import { assertEquals, assertMatch } from "jsr:@std/assert@1.0.19";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { createHandler, type Dependencies } from "./handler.ts";

const ORIGIN = "https://pulse.test";
const TOKEN = "6f1c2a4e-3b7d-4f7e-9a51-2c8e0d4b7a10";

function setup(overrides: Partial<Dependencies> = {}) {
  const unsubscribed: string[] = [];
  const handler = createHandler({
    allowedOrigins: [ORIGIN],
    ipLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    unsubscribe: (token) => {
      unsubscribed.push(token);
      return Promise.resolve();
    },
    ...overrides,
  });
  return { handler, unsubscribed };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/unsubscribe", {
    method: "POST",
    headers: { "Origin": ORIGIN, "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function expectResponse(response: Response, status: number, body: unknown) {
  assertEquals(response.status, status);
  assertEquals(await response.json(), body);
}

Deno.test("valid token is unsubscribed", async () => {
  const { handler, unsubscribed } = setup();

  const response = await handler(post({ token: TOKEN }));

  await expectResponse(response, 200, { ok: true });
  assertEquals(response.headers.get("access-control-allow-origin"), ORIGIN);
  assertEquals(unsubscribed, [TOKEN]);
});

Deno.test("token is trimmed and lowercased before calling the rpc", async () => {
  const { handler, unsubscribed } = setup();

  await expectResponse(await handler(post({ token: ` ${TOKEN.toUpperCase()} ` })), 200, { ok: true });
  assertEquals(unsubscribed, [TOKEN]);
});

Deno.test("unknown or repeated token answers the same success", async () => {
  const { handler, unsubscribed } = setup();
  const unknown = "00000000-0000-4000-8000-000000000000";

  await expectResponse(await handler(post({ token: unknown })), 200, { ok: true });
  await expectResponse(await handler(post({ token: unknown })), 200, { ok: true });
  assertEquals(unsubscribed, [unknown, unknown]);
});

Deno.test("invalid input is rejected without calling the rpc", async (t) => {
  const cases: Record<string, unknown> = {
    "malformed json": "{not json",
    "empty body": "",
    "array body": [{ token: TOKEN }],
    "missing token": {},
    "token not a string": { token: 123 },
    "token not a uuid": { token: "abc" },
    "token with extra characters": { token: `${TOKEN}x` },
    "body too large": { token: TOKEN, padding: "x".repeat(600) },
  };

  for (const [name, body] of Object.entries(cases)) {
    await t.step(name, async () => {
      const { handler, unsubscribed } = setup();
      await expectResponse(await handler(post(body)), 400, { ok: false, error: "invalid_input" });
      assertEquals(unsubscribed, []);
    });
  }
});

Deno.test("requests over the per-IP limit are rejected", async () => {
  const { handler, unsubscribed } = setup({
    ipLimiter: createRateLimiter({ limit: 2, windowMs: 60_000 }),
  });
  const fromIp = () => post({ token: TOKEN }, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

  assertEquals((await handler(fromIp())).status, 200);
  assertEquals((await handler(fromIp())).status, 200);
  await expectResponse(await handler(fromIp()), 429, { ok: false, error: "rate_limited" });
  assertEquals((await handler(post({ token: TOKEN }, { "x-forwarded-for": "198.51.100.1" }))).status, 200);
  assertEquals(unsubscribed.length, 3);
});

Deno.test("database failure answers server_error", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const { handler } = setup({
      unsubscribe: () => Promise.reject(new Error("unsubscribe_waitlist rpc failed")),
    });

    await expectResponse(await handler(post({ token: TOKEN })), 500, { ok: false, error: "server_error" });
  } finally {
    console.error = original;
  }
});

Deno.test("preflight from an allowed origin returns CORS headers", async () => {
  const { handler } = setup();

  const response = await handler(
    new Request("http://localhost/unsubscribe", { method: "OPTIONS", headers: { "Origin": ORIGIN } }),
  );

  assertEquals(response.status, 204);
  assertEquals(response.headers.get("access-control-allow-origin"), ORIGIN);
  assertMatch(response.headers.get("access-control-allow-headers") ?? "", /apikey/);
});

Deno.test("requests from other or missing origins are rejected", async () => {
  const { handler, unsubscribed } = setup();

  const other = await handler(post({ token: TOKEN }, { "Origin": "https://evil.test" }));
  await expectResponse(other, 403, { ok: false, error: "forbidden_origin" });
  assertEquals(other.headers.get("access-control-allow-origin"), null);

  const missing = new Request("http://localhost/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ token: TOKEN }),
  });
  assertEquals((await handler(missing)).status, 403);
  assertEquals(unsubscribed, []);
});

Deno.test("methods other than POST are rejected", async () => {
  const { handler, unsubscribed } = setup();

  const response = await handler(
    new Request(`http://localhost/unsubscribe?token=${TOKEN}`, { method: "GET", headers: { "Origin": ORIGIN } }),
  );

  await expectResponse(response, 405, { ok: false, error: "method_not_allowed" });
  assertEquals(unsubscribed, []);
});
