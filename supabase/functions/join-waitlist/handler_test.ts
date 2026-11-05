import { assertEquals, assertMatch } from "jsr:@std/assert@1.0.19";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { createHandler, type Dependencies, type JoinResult, type WaitlistEntry } from "./handler.ts";

const ORIGIN = "https://pulse.test";
const TOKEN = "6f1c2a4e-3b7d-4f7e-9a51-2c8e0d4b7a10";

interface Calls {
  joined: WaitlistEntry[];
  sent: { email: string; token: string }[];
  marked: string[];
}

function setup(overrides: Partial<Dependencies> = {}, joinResult: JoinResult = {
  sendWelcome: true,
  unsubscribeToken: TOKEN,
}) {
  const calls: Calls = { joined: [], sent: [], marked: [] };
  const handler = createHandler({
    allowedOrigins: [ORIGIN],
    ipLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    emailLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    joinWaitlist: (entry) => {
      calls.joined.push(entry);
      return Promise.resolve(joinResult);
    },
    sendWelcomeEmail: (email, token) => {
      calls.sent.push({ email, token });
      return Promise.resolve();
    },
    markWelcomeSent: (token) => {
      calls.marked.push(token);
      return Promise.resolve();
    },
    ...overrides,
  });
  return { handler, calls };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/join-waitlist", {
    method: "POST",
    headers: { "Origin": ORIGIN, "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = {
  email: "  Ana@Example.COM ",
  platforms: ["web", "ios", "web"],
  source: "hero",
  website: "",
};

async function expectResponse(response: Response, status: number, body: unknown) {
  assertEquals(response.status, status);
  assertEquals(await response.json(), body);
}

function silenceConsoleError(): () => void {
  const original = console.error;
  console.error = () => {};
  return () => {
    console.error = original;
  };
}

Deno.test("valid signup is saved, welcomed and marked as sent", async () => {
  const { handler, calls } = setup();

  const response = await handler(post(validBody));

  await expectResponse(response, 200, { ok: true });
  assertEquals(response.headers.get("access-control-allow-origin"), ORIGIN);
  assertEquals(calls.joined, [
    { email: "ana@example.com", platforms: ["ios", "web"], source: "hero" },
  ]);
  assertEquals(calls.sent, [{ email: "ana@example.com", token: TOKEN }]);
  assertEquals(calls.marked, [TOKEN]);
});

Deno.test("signup without platforms or honeypot field is valid", async () => {
  const { handler, calls } = setup();

  const response = await handler(post({ email: "ana@example.com", platforms: [], source: "footer" }));

  await expectResponse(response, 200, { ok: true });
  assertEquals(calls.joined, [{ email: "ana@example.com", platforms: [], source: "footer" }]);
});

Deno.test("invalid input is rejected without touching the waitlist", async (t) => {
  const cases: Record<string, unknown> = {
    "malformed json": "{not json",
    "array body": [validBody],
    "missing email": { ...validBody, email: undefined },
    "email without domain": { ...validBody, email: "ana@" },
    "email with spaces": { ...validBody, email: "ana maria@example.com" },
    "email too long": { ...validBody, email: `${"a".repeat(250)}@example.com` },
    "unknown platform": { ...validBody, platforms: ["ios", "windows"] },
    "platforms not an array": { ...validBody, platforms: "ios" },
    "too many platforms": { ...validBody, platforms: ["ios", "ios", "ios", "ios"] },
    "unknown source": { ...validBody, source: "header" },
    "honeypot not a string": { ...validBody, website: 1 },
    "body too large": { ...validBody, padding: "x".repeat(3000) },
  };

  for (const [name, body] of Object.entries(cases)) {
    await t.step(name, async () => {
      const { handler, calls } = setup();
      await expectResponse(await handler(post(body)), 400, { ok: false, error: "invalid_input" });
      assertEquals(calls.joined.length, 0);
    });
  }
});

Deno.test("filled honeypot answers success without saving or sending", async () => {
  const { handler, calls } = setup();

  const response = await handler(post({ ...validBody, email: "not-an-email", website: "https://spam.test" }));

  await expectResponse(response, 200, { ok: true });
  assertEquals(calls, { joined: [], sent: [], marked: [] });
});

Deno.test("duplicate email answers the same and does not resend the welcome", async () => {
  const { handler, calls } = setup({}, { sendWelcome: false, unsubscribeToken: TOKEN });

  const response = await handler(post(validBody));

  await expectResponse(response, 200, { ok: true });
  assertEquals(calls.joined.length, 1);
  assertEquals(calls.sent, []);
  assertEquals(calls.marked, []);
});

Deno.test("requests over the per-IP limit are rejected", async () => {
  const { handler, calls } = setup({
    ipLimiter: createRateLimiter({ limit: 2, windowMs: 60_000 }),
  });
  const fromIp = (email: string) =>
    post({ ...validBody, email }, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

  assertEquals((await handler(fromIp("a@example.com"))).status, 200);
  assertEquals((await handler(fromIp("b@example.com"))).status, 200);
  await expectResponse(await handler(fromIp("c@example.com")), 429, { ok: false, error: "rate_limited" });
  assertEquals(
    (await handler(post({ ...validBody, email: "d@example.com" }, { "x-forwarded-for": "198.51.100.1" })))
      .status,
    200,
  );
  assertEquals(calls.joined.length, 3);
});

Deno.test("requests over the per-email limit are rejected", async () => {
  const { handler, calls } = setup({
    emailLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
  });

  assertEquals((await handler(post(validBody))).status, 200);
  await expectResponse(
    await handler(post({ ...validBody, email: "ANA@example.com" })),
    429,
    { ok: false, error: "rate_limited" },
  );
  assertEquals(calls.joined.length, 1);
});

Deno.test("email provider failure keeps the signup and leaves welcome unsent", async () => {
  const restore = silenceConsoleError();
  try {
    const { handler, calls } = setup({
      sendWelcomeEmail: () => Promise.reject(new Error("resend responded with 500")),
    });

    const response = await handler(post(validBody));

    await expectResponse(response, 200, { ok: true });
    assertEquals(calls.joined.length, 1);
    assertEquals(calls.marked, []);
  } finally {
    restore();
  }
});

Deno.test("failure to mark the welcome as sent still answers success", async () => {
  const restore = silenceConsoleError();
  try {
    const { handler, calls } = setup({
      markWelcomeSent: () => Promise.reject(new Error("mark_welcome_sent rpc failed")),
    });

    await expectResponse(await handler(post(validBody)), 200, { ok: true });
    assertEquals(calls.sent.length, 1);
  } finally {
    restore();
  }
});

Deno.test("database failure answers server_error and sends nothing", async () => {
  const restore = silenceConsoleError();
  try {
    const { handler, calls } = setup({
      joinWaitlist: () => Promise.reject(new Error("join_waitlist rpc failed")),
    });

    await expectResponse(await handler(post(validBody)), 500, { ok: false, error: "server_error" });
    assertEquals(calls.sent, []);
  } finally {
    restore();
  }
});

Deno.test("preflight from an allowed origin returns CORS headers", async () => {
  const { handler } = setup();

  const response = await handler(
    new Request("http://localhost/join-waitlist", { method: "OPTIONS", headers: { "Origin": ORIGIN } }),
  );

  assertEquals(response.status, 204);
  assertEquals(response.headers.get("access-control-allow-origin"), ORIGIN);
  assertMatch(response.headers.get("access-control-allow-headers") ?? "", /apikey/);
});

Deno.test("requests from other or missing origins are rejected", async () => {
  const { handler, calls } = setup();

  const other = await handler(post(validBody, { "Origin": "https://evil.test" }));
  await expectResponse(other, 403, { ok: false, error: "forbidden_origin" });
  assertEquals(other.headers.get("access-control-allow-origin"), null);

  const missing = new Request("http://localhost/join-waitlist", {
    method: "POST",
    body: JSON.stringify(validBody),
  });
  assertEquals((await handler(missing)).status, 403);
  assertEquals(calls.joined.length, 0);
});

Deno.test("methods other than POST are rejected", async () => {
  const { handler } = setup();

  const response = await handler(
    new Request("http://localhost/join-waitlist", { method: "GET", headers: { "Origin": ORIGIN } }),
  );

  await expectResponse(response, 405, { ok: false, error: "method_not_allowed" });
});
