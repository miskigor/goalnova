function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isAllowedPasswordResetRedirect(redirectTo: string): boolean {
  try {
    const target = new URL(redirectTo);
    if (target.protocol !== "https:" && target.protocol !== "http:") return false;
    if (!target.pathname.includes("reset-password")) return false;

    const allowedHosts = new Set(["pitchrusch.com", "www.pitchrusch.com", "localhost"]);
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (site) {
      try {
        allowedHosts.add(new URL(site).hostname);
      } catch {
        /* ignore invalid env */
      }
    }

    return allowedHosts.has(target.hostname);
  } catch {
    return false;
  }
}

export function isPasswordRecoveryUserNotFound(error: {
  message?: string;
  code?: string;
} | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    code === "user_not_found" ||
    msg.includes("user not found") ||
    msg.includes("no user found")
  );
}

export function isPasswordRecoveryEmailSendFailure(error: {
  message?: string;
  code?: string;
} | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    msg.includes("error sending recovery email") ||
    msg.includes("error sending email") ||
    (code === "unexpected_failure" && msg.includes("email") && msg.includes("recovery"))
  );
}

export function buildPasswordResetEmail(input: {
  resetLink: string;
  email: string;
}): { subject: string; html: string; text: string } {
  const link = input.resetLink.trim();
  const email = escapeHtml(input.email.trim());
  const subject = "Reset your PitchRusch password";
  const text = [
    "You requested a password reset for your PitchRusch account.",
    "",
    `Open this link to choose a new password: ${link}`,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    `Account: ${input.email.trim()}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0b0f14;color:#e8eef5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:520px;margin:0 auto;">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;">Reset your password</h1>
      <p style="margin:0 0 16px;line-height:1.5;color:#b8c4d4;">
        You requested a password reset for <strong>${email}</strong>.
      </p>
      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#f5c518;color:#000;text-decoration:none;font-weight:700;">
          Choose a new password
        </a>
      </p>
      <p style="margin:0 0 12px;line-height:1.5;color:#b8c4d4;font-size:14px;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 20px;word-break:break-all;font-size:13px;color:#8fa3b8;">
        ${escapeHtml(link)}
      </p>
      <p style="margin:0;line-height:1.5;color:#8fa3b8;font-size:13px;">
        If you did not request this, you can ignore this email.
      </p>
    </div>
  </body>
</html>`;

  return { subject, html, text };
}
