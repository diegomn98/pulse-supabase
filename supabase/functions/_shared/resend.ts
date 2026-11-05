const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export class ResendError extends Error {
  constructor(readonly status: number) {
    super(`resend responded with ${status}`);
    this.name = "ResendError";
  }
}

export async function sendEmail(
  apiKey: string,
  message: EmailMessage,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchFn(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...message, to: [message.to] }),
      signal: controller.signal,
    });
    await response.body?.cancel();
    if (!response.ok) throw new ResendError(response.status);
  } finally {
    clearTimeout(timeout);
  }
}
