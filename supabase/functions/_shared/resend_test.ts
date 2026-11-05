import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import { type EmailMessage, ResendError, sendEmail } from "./resend.ts";

const message: EmailMessage = {
  from: "PULSE <hola@pulse.test>",
  to: "ana@example.com",
  subject: "Ya estás en la lista",
  html: "<p>Hola</p>",
  text: "Hola",
  headers: { "List-Unsubscribe": "<https://pulse.test/baja>" },
};

function fakeFetch(status: number, requests: Request[]): typeof fetch {
  return (input, init) => {
    requests.push(new Request(input, init));
    return Promise.resolve(new Response(JSON.stringify({ id: "email-id" }), { status }));
  };
}

Deno.test("sends the message to the Resend emails API", async () => {
  const requests: Request[] = [];

  await sendEmail("re_test_key", message, fakeFetch(200, requests));

  assertEquals(requests.length, 1);
  const [request] = requests;
  assertEquals(request.method, "POST");
  assertEquals(request.url, "https://api.resend.com/emails");
  assertEquals(request.headers.get("authorization"), "Bearer re_test_key");
  assertEquals(request.headers.get("content-type"), "application/json");
  assertEquals(await request.json(), { ...message, to: ["ana@example.com"] });
});

Deno.test("throws ResendError with the status when Resend rejects the message", async () => {
  const error = await assertRejects(
    () => sendEmail("re_test_key", message, fakeFetch(403, [])),
    ResendError,
  );
  assertEquals(error.status, 403);
});

Deno.test("propagates network errors", async () => {
  const failingFetch: typeof fetch = () => Promise.reject(new TypeError("network down"));

  await assertRejects(() => sendEmail("re_test_key", message, failingFetch), TypeError, "network down");
});
