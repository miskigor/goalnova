/** Stored in `public.messages.message` — UI maps to `messages.welcomeInboxMessage`. */
export const WELCOME_INBOX_MESSAGE_TOKEN = "__gn:welcome_inbox__" as const;

export function isWelcomeInboxMessageToken(message: string | null | undefined): boolean {
  return message?.trim() === WELCOME_INBOX_MESSAGE_TOKEN;
}

export type MessageTranslate = (key: "welcomeInboxMessage") => string;

export function localizedDirectMessageBody(
  raw: string,
  t: MessageTranslate,
): string {
  if (isWelcomeInboxMessageToken(raw)) {
    return t("welcomeInboxMessage");
  }
  return raw;
}
