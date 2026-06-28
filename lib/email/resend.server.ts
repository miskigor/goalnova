type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; reason: "not_configured" | "send_failed"; message?: string };

/** Optional transactional email via [Resend](https://resend.com). Requires `RESEND_API_KEY`. */
export async function sendResendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "not_configured" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.CLUB_NOTIFY_FROM_EMAIL?.trim() ||
    "PitchRusch <noreply@pitchrusch.com>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[resend] send failed", res.status, body);
      return { ok: false, reason: "send_failed", message: body || res.statusText };
    }

    const payload = (await res.json()) as { id?: string };
    return { ok: true, id: payload.id };
  } catch (e) {
    console.error("[resend] send error", e);
    return {
      ok: false,
      reason: "send_failed",
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
