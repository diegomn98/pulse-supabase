import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1.0.19";
import { renderWelcomeEmail } from "./welcome-email.ts";

const input = {
  email: "ana+<b>@example.com",
  siteUrl: "https://pulse.test",
  unsubscribeUrl: "https://api.pulse.test/functions/v1/unsubscribe?token=abc&x=1",
};

Deno.test("renders subject, copy and links in the HTML version", () => {
  const { subject, html } = renderWelcomeEmail(input);

  assertEquals(subject, "Ya estás en la lista");
  assertMatch(html, /<h1[^>]*>Ya estás en la lista<\/h1>/);
  assertMatch(html, /¡Gracias por apuntarte!/);
  for (const text of ["Intervalos", "Con voz guía", "Running", "Con GPS", "Fuerza", "Series y pesos"]) {
    assert(html.includes(text), text);
  }
  assert(html.includes('href="https://pulse.test/privacidad"'));
  assert(html.includes('href="https://pulse.test/terminos"'));
  assert(html.includes('href="https://api.pulse.test/functions/v1/unsubscribe?token=abc&amp;x=1"'));
});

Deno.test("escapes the email address in the HTML version", () => {
  const { html } = renderWelcomeEmail(input);

  assert(html.includes("ana+&lt;b&gt;@example.com"));
  assert(!html.includes("ana+<b>@example.com"));
});

Deno.test("renders a plain text version with every link", () => {
  const { text } = renderWelcomeEmail(input);

  assertMatch(text, /^Ya estás en la lista\n/);
  assert(text.includes("- Intervalos: con voz guía"));
  assert(text.includes("con ana+<b>@example.com."));
  assert(text.includes("Privacidad: https://pulse.test/privacidad"));
  assert(text.includes("Términos: https://pulse.test/terminos"));
  assert(text.includes(`Darme de baja: ${input.unsubscribeUrl}`));
  assert(!/<[a-z]/i.test(text.replace(input.email, "")));
});
