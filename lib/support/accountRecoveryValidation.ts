/**
 * Shared validation for account recovery (must stay aligned with SQL RPC checks).
 */

export type NormalizedAccountRecovery = {
  accountEmail: string;
  contactEmail: string;
  username: string | null;
  message: string;
};

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Same rules as goalnova_submit_account_recovery_ticket in Postgres. */
export function normalizeAccountRecoveryBody(raw: {
  accountEmail?: unknown;
  contactEmail?: unknown;
  username?: unknown;
  message?: unknown;
}): { ok: true; data: NormalizedAccountRecovery } | { ok: false; error: string } {
  const accountRaw =
    typeof raw.accountEmail === "string" ? raw.accountEmail : "";
  const contactRaw =
    typeof raw.contactEmail === "string" ? raw.contactEmail : "";
  const messageRaw = typeof raw.message === "string" ? raw.message : "";
  const usernameRaw =
    typeof raw.username === "string" ? raw.username.trim() : "";

  const accountEmail = normalizeEmail(accountRaw);
  const contactEmail = normalizeEmail(contactRaw);
  const message = messageRaw.trim();

  let username: string | null = null;
  if (usernameRaw.length > 0) {
    if (usernameRaw.length > 120) {
      return { ok: false, error: "Username too long." };
    }
    username = usernameRaw;
  }

  if (accountEmail.length < 5 || accountEmail.length > 254) {
    return { ok: false, error: "Invalid account email." };
  }
  if (accountEmail.indexOf("@") < 1) {
    return { ok: false, error: "Invalid account email." };
  }

  if (contactEmail.length < 5 || contactEmail.length > 254) {
    return { ok: false, error: "Invalid contact email." };
  }
  if (contactEmail.indexOf("@") < 1) {
    return { ok: false, error: "Invalid contact email." };
  }

  if (message.length < 10) {
    return { ok: false, error: "Message too short." };
  }
  if (message.length > 4000) {
    return { ok: false, error: "Message too long." };
  }

  return {
    ok: true,
    data: {
      accountEmail,
      contactEmail,
      username,
      message,
    },
  };
}
