"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/lib/supabase/client";
import { fetchAdminUnreadInboxBreakdown } from "@/lib/supabase/adminSystem";
import { fetchAdminPendingClubRequestCount } from "@/lib/supabase/clubs";

export const ADMIN_CLUB_PENDING_CHANGED_EVENT = "gn-admin-club-pending-changed";

export type AdminInboxUnreadBreakdown = {
  total: number;
  support: number;
  verification: number;
  clubPending: number;
};

const EMPTY_BREAKDOWN: AdminInboxUnreadBreakdown = {
  total: 0,
  support: 0,
  verification: 0,
  clubPending: 0,
};

const AdminInboxUnreadContext = createContext<AdminInboxUnreadBreakdown>(EMPTY_BREAKDOWN);

const ADMIN_SUPPORT_UNREAD_CHANNEL = "admin-support-unread-app-shell";

/**
 * Single realtime subscription for admin inbox unread counts (support, scout, clubs).
 * Use {@link useAdminSupportUnread} in sidebar, mobile header, menus, and home.
 */
export function AdminSupportUnreadProvider({ children }: { children: ReactNode }) {
  const { loaded, isAdmin } = useAdminAccess();
  const [breakdown, setBreakdown] = useState<AdminInboxUnreadBreakdown>(EMPTY_BREAKDOWN);

  useEffect(() => {
    if (!loaded || !isAdmin) {
      setBreakdown(EMPTY_BREAKDOWN);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const [inbox, pendingClubs] = await Promise.all([
        fetchAdminUnreadInboxBreakdown(),
        fetchAdminPendingClubRequestCount(),
      ]);
      if (cancelled) return;
      const clubPending = pendingClubs > 0 ? pendingClubs : inbox.clubPartnershipCount;
      const support = inbox.error ? 0 : inbox.supportCount;
      const verification = inbox.error ? 0 : inbox.verificationCount;
      setBreakdown({
        support,
        verification,
        clubPending,
        total: support + verification + clubPending,
      });
    };
    void refresh();
    const ch = supabase
      .channel(ADMIN_SUPPORT_UNREAD_CHANNEL)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_ticket_messages" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void refresh(),
      )
      .subscribe();
    const onClubPendingChanged = () => void refresh();
    window.addEventListener(ADMIN_CLUB_PENDING_CHANGED_EVENT, onClubPendingChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(ADMIN_CLUB_PENDING_CHANGED_EVENT, onClubPendingChanged);
      void supabase.removeChannel(ch);
    };
  }, [loaded, isAdmin]);

  return (
    <AdminInboxUnreadContext.Provider value={breakdown}>
      {children}
    </AdminInboxUnreadContext.Provider>
  );
}

export function useAdminSupportUnread(): number {
  return useContext(AdminInboxUnreadContext).total;
}

export function useAdminClubPendingCount(): number {
  return useContext(AdminInboxUnreadContext).clubPending;
}

export function useAdminInboxUnreadBreakdown(): AdminInboxUnreadBreakdown {
  return useContext(AdminInboxUnreadContext);
}

export function notifyAdminClubPendingChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_CLUB_PENDING_CHANGED_EVENT));
}
