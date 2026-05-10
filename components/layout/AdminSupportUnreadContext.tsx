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
import { fetchAdminUnreadSupportCount } from "@/lib/supabase/adminSystem";

const AdminSupportUnreadContext = createContext(0);

const ADMIN_SUPPORT_UNREAD_CHANNEL = "admin-support-unread-app-shell";

/**
 * Single realtime subscription for admin support inbox unread count (notifications).
 * Use {@link useAdminSupportUnread} in sidebar, mobile header, menus, and home.
 */
export function AdminSupportUnreadProvider({ children }: { children: ReactNode }) {
  const { loaded, isAdmin } = useAdminAccess();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!loaded || !isAdmin) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const { count: next } = await fetchAdminUnreadSupportCount();
      if (!cancelled) setCount(next);
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
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [loaded, isAdmin]);

  return (
    <AdminSupportUnreadContext.Provider value={count}>
      {children}
    </AdminSupportUnreadContext.Provider>
  );
}

export function useAdminSupportUnread(): number {
  return useContext(AdminSupportUnreadContext);
}
