"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSupportTicket,
  listMySupportTicketMessages,
  listMyUnreadSupportReplyTicketIds,
  listMySupportTickets,
  markMySupportTicketRepliesRead,
  sendMySupportTicketMessage,
  type SupportTicketCategory,
  type SupportTicketMessageRow,
  type SupportTicketRow,
} from "@/lib/supabase/supportTickets";
import { supabase } from "@/lib/supabase/client";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

const CATEGORY_OPTIONS: { value: SupportTicketCategory; label: string }[] = [
  { value: "account_issue", label: "Account issue" },
  { value: "verification_issue", label: "Verification issue" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "report_problem", label: "Report problem" },
  { value: "bug_report", label: "Bug report" },
  { value: "other", label: "Other" },
];

export function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessageRow[]>([]);
  const [unreadTicketIds, setUnreadTicketIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("other");
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { rows, error: e } = await listMySupportTickets();
    if (e) {
      setError(e);
      setTickets([]);
    } else {
      setTickets(rows);
      if (!selectedTicketId && rows.length > 0) {
        setSelectedTicketId(rows[0].id);
      }
    }
    const unread = await listMyUnreadSupportReplyTicketIds();
    if (!unread.error) {
      setUnreadTicketIds(unread.ids);
    }
    setLoading(false);
  }, [selectedTicketId]);

  const loadMessages = useCallback(async (ticketId: string) => {
    const { rows, error: e } = await listMySupportTicketMessages(ticketId);
    if (e) {
      setError(e);
      setMessages([]);
      return;
    }
    setMessages(rows);
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setMessages([]);
      return;
    }
    void (async () => {
      await loadMessages(selectedTicketId);
      await markMySupportTicketRepliesRead(selectedTicketId);
      await loadTickets();
    })();
  }, [selectedTicketId, loadMessages, loadTickets]);

  useEffect(() => {
    const uid = currentUserId;
    if (!uid) return;
    const ch = supabase
      .channel(`support:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => void loadTickets(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_ticket_messages" },
        async () => {
          void loadTickets();
          if (selectedTicketId) {
            await loadMessages(selectedTicketId);
            await markMySupportTicketRepliesRead(selectedTicketId);
            await loadTickets();
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [currentUserId, selectedTicketId, loadTickets, loadMessages]);

  async function onCreateTicket() {
    const s = subject.trim();
    const m = message.trim();
    if (s.length < 2 || m.length < 2) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { id, error: e } = await createSupportTicket({
      subject: s,
      message: m,
      category,
    });
    setSubmitting(false);
    if (e || !id) {
      setError(e ?? "Failed to create support ticket.");
      return;
    }
    setSubject("");
    setMessage("");
    setCategory("other");
    setSuccess("Your support request has been sent.");
    await loadTickets();
    setSelectedTicketId(id);
    await loadMessages(id);
  }

  async function onReply() {
    if (!selectedTicketId) return;
    const m = replyText.trim();
    if (m.length < 2) return;
    setSubmitting(true);
    const { ok, error: e } = await sendMySupportTicketMessage({
      ticketId: selectedTicketId,
      message: m,
    });
    setSubmitting(false);
    if (!ok) {
      setError(e ?? "Failed to send message.");
      return;
    }
    setReplyText("");
    await loadMessages(selectedTicketId);
    await loadTickets();
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[340px,minmax(0,1fr)]">
      <section className="space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4">
        <h1 className="text-lg font-semibold text-gn-text">Support / Contact Support</h1>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-3 py-2 text-sm text-gn-text"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
          className="w-full rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-3 py-2 text-sm text-gn-text"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          rows={5}
          className="w-full rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-3 py-2 text-sm text-gn-text"
        />
        <button
          type="button"
          disabled={submitting}
          onClick={() => void onCreateTicket()}
          className="rounded-xl bg-gn-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          Send support request
        </button>
        {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4">
        <h2 className="text-lg font-semibold text-gn-text">Your support tickets</h2>
        {loading ? <p className="text-sm text-gn-text-secondary">Loading...</p> : null}
        <div className="grid gap-2 md:grid-cols-2">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => setSelectedTicketId(ticket.id)}
              className={`rounded-xl border p-3 text-left ${
                selectedTicketId === ticket.id
                  ? "border-gn-accent/50 bg-gn-surface/70"
                  : "border-gn-border-subtle bg-gn-surface/40"
              }`}
            >
              <p className="truncate text-sm font-semibold text-gn-text">{ticket.subject}</p>
              <p className="text-xs text-gn-text-secondary">
                {ticket.category} · {ticket.status} · {ticket.priority}
              </p>
              {unreadTicketIds.includes(ticket.id) ? (
                <span className="mt-1 inline-flex rounded-full bg-gn-accent px-2 py-0.5 text-[10px] font-semibold text-black">
                  Unread reply
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {selected ? (
          <div className="space-y-3 rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-3">
            <p className="text-sm font-semibold text-gn-text">{selected.subject}</p>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.sender_user_id
                      ? "ms-auto max-w-[90%] bg-gn-accent/20 text-gn-text"
                      : "me-auto max-w-[90%] bg-gn-surface-elevated text-gn-text-secondary"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      m.sender_user_id ? "text-gn-text-secondary/80" : "text-gn-text-secondary/60"
                    }`}
                  >
                    {formatDateTime(m.created_at)}
                  </p>
                </div>
              ))}
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              className="w-full rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-3 py-2 text-sm text-gn-text"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onReply()}
              className="rounded-xl border border-gn-border-subtle px-4 py-2 text-sm text-gn-text disabled:opacity-60"
            >
              Send message
            </button>
          </div>
        ) : (
          <p className="text-sm text-gn-text-secondary">No tickets yet.</p>
        )}
      </section>
    </div>
  );
}
