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
  const isStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const readIds = getReadNotifIds();

    if (isStaging) {
      try {
        const res = await fetch("/api/v1/neon-staging/notifications", {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const items: NotificationItem[] = (json.data?.notifications ?? []).map((row: any) => ({
            id: String(row.id),
            user_id: String(row.recipient_id),
            title: String(row.title ?? ""),
            message: String(row.message ?? ""),
            type: String(row.type ?? "info"),
            read: row.is_read === true || readIds.includes(String(row.id)),
            created_at: String(row.created_at),
            link: typeof row.action_url === "string" ? row.action_url : undefined,
          }));
          setNotifications(items);
          setUnreadCount(Math.max(0, json.data?.unreadCount ?? 0));
          return;
        }
      } catch (err) {
        console.error("Failed to fetch staging notifications", err);
      }
    }

    // Legacy Supabase fallback
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
      read: row.is_read === true || readIds.includes(String(row.id)),
      created_at: String(row.created_at),
      link: typeof row.action_url === "string" ? row.action_url : undefined,
    }));

    setNotifications(formatted);
    setUnreadCount(Math.max(0, count ?? 0));
  }, [isStaging, user]);

  useEffect(() => {
    void fetchNotifications();
    if (!user) return;

    if (isStaging) {
      let eventSource: EventSource | null = null;
      try {
        eventSource = new EventSource("/api/v1/realtime/stream");
        eventSource.addEventListener("notification", () => {
          void fetchNotifications();
        });
        eventSource.addEventListener("reconnect", () => {
          void fetchNotifications();
        });
      } catch (err) {
        console.error("SSE stream connection error", err);
      }

      const refreshWhenVisible = () => {
        if (document.visibilityState === "visible") void fetchNotifications();
      };
      document.addEventListener("visibilitychange", refreshWhenVisible);

      return () => {
        document.removeEventListener("visibilitychange", refreshWhenVisible);
        if (eventSource) eventSource.close();
      };
    }

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
  }, [fetchNotifications, isStaging, user]);

  const markAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => {
        saveReadNotifId(n.id);
        return { ...n, read: true };
      })
    );
    setUnreadCount(0);

    if (user) {
      if (isStaging) {
        try {
          await fetch("/api/v1/neon-staging/notifications", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ all: true }),
          });
          return;
        } catch (err) {
          console.error("Failed to mark all staging notifications read", err);
        }
      }

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
      if (isStaging) {
        try {
          await fetch("/api/v1/neon-staging/notifications", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id }),
          });
          return;
        } catch (err) {
          console.error("Failed to mark staging notification read", err);
        }
      }

      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) console.error("Failed to mark notification read", error);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
