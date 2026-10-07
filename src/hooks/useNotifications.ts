import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  link?: string;
}

const READ_NOTIFS_KEY = "merotalent.read_notifications";

const getReadNotifIds = (): string[] => {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveReadNotifId = (id: string) => {
  try {
    const read = getReadNotifIds();
    if (!read.includes(id)) {
      localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify([...read, id]));
    }
  } catch {
    // Ignore storage error
  }
};

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const readIds = getReadNotifIds();

    // The table keys the recipient as recipient_id and the flag as is_read.
    // This hook used user_id and read, so every query failed with 42703 and the
    // list silently fell back to a fabricated notification.
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      (supabase as any)
        .from("notifications")
        .select("id, recipient_id, title, message, type, is_read, action_url, created_at")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      (supabase as any)
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false),
    ]);

    if (error || countError) {
      console.error("Failed to load notifications", error);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const formatted: NotificationItem[] = (data ?? []).map((row: any) => ({
      id: String(row.id),
      user_id: String(row.recipient_id),
      title: String(row.title ?? ""),
      message: String(row.message ?? ""),
      type: String(row.type ?? "info"),
      // localStorage still supplements the flag so a failed write does not make
      // an already-dismissed notification reappear.
      read: row.is_read === true || readIds.includes(String(row.id)),
      created_at: String(row.created_at),
      link: typeof row.action_url === "string" ? row.action_url : undefined,
    }));

    setNotifications(formatted);
    // The badge is the exact unread total for this recipient, not merely the
    // unread rows in the recent-notification window rendered by the menu.
    setUnreadCount(Math.max(0, count ?? 0));
  }, [user]);

  useEffect(() => {
    void fetchNotifications();
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
        () => void fetchNotifications(),
      )
      .subscribe();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void fetchNotifications();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user]);

  const markAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => {
        saveReadNotifId(n.id);
        return { ...n, read: true };
      })
    );
    setUnreadCount(0);

    if (user) {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", user.id);
      if (error) console.error("Failed to mark all notifications read", error);
    }
  };

  const markAsRead = async (id: string) => {
    const wasUnread = notifications.some((notification) => notification.id === id && !notification.read);
    saveReadNotifId(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));

    if (user) {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) console.error("Failed to mark notification read", error);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
