import { assertEquals } from "jsr:@std/assert@1.0.19";
import { createRateLimiter } from "./rate-limit.ts";

Deno.test("allows up to the limit per key within the window", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });

  assertEquals(limiter.hit("a"), true);
  assertEquals(limiter.hit("a"), true);
  assertEquals(limiter.hit("a"), false);
  assertEquals(limiter.hit("b"), true);
});

Deno.test("starts a new window once the previous one expires", () => {
  let time = 0;
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => time });

  assertEquals(limiter.hit("a"), true);
  assertEquals(limiter.hit("a"), false);
  time = 1000;
  assertEquals(limiter.hit("a"), true);
});

Deno.test("prunes expired keys without resetting active ones", () => {
  let time = 0;
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2, now: () => time });

  limiter.hit("old");
  time = 500;
  limiter.hit("active");
  time = 1200;
  assertEquals(limiter.hit("new"), true);
  assertEquals(limiter.hit("active"), false);
  assertEquals(limiter.hit("old"), true);
});
