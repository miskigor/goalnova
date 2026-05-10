import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeAccountRecoveryBody } from "@/lib/support/accountRecoveryValidation";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_RECOVERY_SUBJECT = "Account recovery request";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: JSON_HEADERS });
  }

  const parsed = normalizeAccountRecoveryBody(
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {},
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: JSON_HEADERS });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false as const, reason: "service_role_unconfigured" as const },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const { accountEmail, contactEmail, username, message } = parsed.data;

  const row: Database["public"]["Tables"]["support_tickets"]["Insert"] = {
    user_id: null,
    subject: ACCOUNT_RECOVERY_SUBJECT,
    message,
    category: "account_issue",
    ticket_type: "account_recovery",
    account_email: accountEmail,
    contact_email: contactEmail,
    username,
    status: "open",
    priority: "normal",
  };

  const inserted = await admin.from("support_tickets").insert(row).select("id").single();

  if (inserted.error) {
    console.error("[account-recovery API]", inserted.error.message, inserted.error);
    return NextResponse.json(
      {
        error:
          "Could not save your request. If this persists, contact support — the database may need the latest migrations.",
      },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const id = inserted.data?.id;
  if (!id) {
    return NextResponse.json({ error: "No ticket id returned." }, { status: 500, headers: JSON_HEADERS });
  }

  return NextResponse.json({ ok: true as const, id }, { status: 200, headers: JSON_HEADERS });
}
