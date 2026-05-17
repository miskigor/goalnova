/** Known signup failure kinds mapped to `authSignup` translation keys. */
export type SignupErrorKind =
  | "email_exists"
  | "password_too_short"
  | "invalid_email"
  | "signup_disabled"
  | "rate_limited"
  | "email_provider_disabled"
  | "generic";

export class SignupAuthError extends Error {
  readonly kind: SignupErrorKind;

  constructor(kind: SignupErrorKind) {
    super(`SignupAuthError:${kind}`);
    this.name = "SignupAuthError";
    this.kind = kind;
  }
}

export function isSignupAuthError(err: unknown): err is SignupAuthError {
  if (err instanceof SignupAuthError) return true;
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "SignupAuthError" &&
    typeof (err as { kind?: unknown }).kind === "string"
  );
}

export function getSignupAuthErrorKind(err: unknown): SignupErrorKind | null {
  if (!isSignupAuthError(err)) return null;
  return err.kind;
}

function isSignUpEmailAlreadyExistsError(error: {
  code?: string;
  message?: string;
}): boolean {
  const code = (error.code ?? "").toLowerCase();
  if (code === "user_already_exists" || code === "email_exists") {
    return true;
  }
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("user already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already exists") ||
    msg.includes("email address is already registered") ||
    msg.includes("a user with this email address has already been registered") ||
    msg.includes("email already registered")
  );
}

/** Maps Supabase Auth `signUp` errors to a stable UI kind. */
export function classifySupabaseSignupError(error: {
  code?: string;
  message?: string;
}): SignupErrorKind {
  if (isSignUpEmailAlreadyExistsError(error)) {
    return "email_exists";
  }

  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();

  if (
    code === "signup_disabled" ||
    msg.includes("signup is disabled") ||
    msg.includes("signups are disabled")
  ) {
    return "signup_disabled";
  }

  if (
    code === "email_provider_disabled" ||
    msg.includes("email provider disabled") ||
    msg.includes("email signups are disabled") ||
    msg.includes("signup provider disabled")
  ) {
    return "email_provider_disabled";
  }

  if (
    msg.includes("password should be at least") ||
    msg.includes("password must be at least") ||
    (msg.includes("at least") && msg.includes("character") && msg.includes("password")) ||
    code === "weak_password"
  ) {
    return "password_too_short";
  }

  if (
    code === "invalid_email" ||
    (msg.includes("invalid") && msg.includes("email")) ||
    msg.includes("unable to validate email")
  ) {
    return "invalid_email";
  }

  if (
    msg.includes("email rate limit") ||
    msg.includes("rate limit exceeded") ||
    msg.includes("too many requests") ||
    msg.includes("too many signup") ||
    code === "over_request_rate_limit" ||
    code === "429"
  ) {
    return "rate_limited";
  }

  return "generic";
}

/** Translation key under `authSignup` for each kind (except generic → authCommon). */
export const SIGNUP_ERROR_I18N_KEY: Record<
  Exclude<SignupErrorKind, "generic">,
  string
> = {
  email_exists: "signupErrorEmailExists",
  password_too_short: "signupErrorPasswordTooShort",
  invalid_email: "signupErrorInvalidEmail",
  signup_disabled: "signupErrorSignupDisabled",
  rate_limited: "signupErrorRateLimited",
  email_provider_disabled: "signupErrorEmailProviderDisabled",
};
