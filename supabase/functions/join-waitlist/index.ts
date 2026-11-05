import { parseAllowedOrigins } from "../_shared/cors.ts";
import { requireEnv } from "../_shared/env.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { sendEmail } from "../_shared/resend.ts";
import { createSecretClient } from "../_shared/supabase.ts";
import { renderWelcomeEmail } from "../_shared/welcome-email.ts";
import { createHandler } from "./handler.ts";

const supabaseUrl = requireEnv("SUPABASE_URL");
const resendApiKey = requireEnv("RESEND_API_KEY");
const emailFrom = requireEnv("EMAIL_FROM");
const siteUrl = requireEnv("SITE_URL");
const allowedOrigins = parseAllowedOrigins(requireEnv("ALLOWED_ORIGINS"));

const supabase = createSecretClient();

const MINUTE = 60_000;

Deno.serve(createHandler({
  allowedOrigins,
  ipLimiter: createRateLimiter({ limit: 20, windowMs: 10 * MINUTE }),
  emailLimiter: createRateLimiter({ limit: 5, windowMs: 60 * MINUTE }),

  async joinWaitlist({ email, platforms, source }) {
    const { data, error } = await supabase
      .rpc("join_waitlist", { email, platforms, source })
      .single<{ send_welcome: boolean; unsubscribe_token: string }>();
    if (error) throw new Error(`join_waitlist rpc failed (${error.code})`);
    return { sendWelcome: data.send_welcome, unsubscribeToken: data.unsubscribe_token };
  },

  async markWelcomeSent(token) {
    const { error } = await supabase.rpc("mark_welcome_sent", { token });
    if (error) throw new Error(`mark_welcome_sent rpc failed (${error.code})`);
  },

  async sendWelcomeEmail(email, token) {
    const unsubscribeUrl = new URL("/functions/v1/unsubscribe", supabaseUrl);
    unsubscribeUrl.searchParams.set("token", token);
    const { subject, html, text } = renderWelcomeEmail({
      email,
      siteUrl,
      unsubscribeUrl: unsubscribeUrl.href,
    });
    await sendEmail(resendApiKey, {
      from: emailFrom,
      to: email,
      subject,
      html,
      text,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl.href}>` },
    });
  },
}));
