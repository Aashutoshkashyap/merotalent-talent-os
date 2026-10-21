import { isNeonClientRuntime } from "@/lib/backend-selection";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const isStaging = isNeonClientRuntime();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setNextCursor(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const readIds = getReadNotifIds();
    setIsLoading(true);

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
            user_id: user.id,
            title: String(row.title ?? ""),
            message: String(row.message ?? ""),
            type: String(row.type ?? "info"),
            read: row.is_read === true,
            created_at: String(row.created_at),
            link: typeof row.action_url === "string" ? row.action_url : undefined,
          }));
          setNotifications(items);
          setUnreadCount(Math.max(0, json.data?.unreadCount ?? 0));
          setNextCursor(typeof json.data?.nextCursor === "string" ? json.data.nextCursor : null);
          setError(null);
          return;
        }
        throw new Error(`Notification request failed (${res.status}).`);
      } catch (err) {
        console.error("Failed to fetch staging notifications", err);
        setError("Notifications could not be loaded. Please retry.");
        return;
      } finally {
        setIsLoading(false);
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
      setError("Notifications could not be loaded. Please retry.");
      setIsLoading(false);
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
    setError(null);
    setIsLoading(false);
  }, [isStaging, user]);

  const loadMore = async () => {
    if (!isStaging || !nextCursor) return;
    try {
      const response = await fetch(`/api/v1/neon-staging/notifications?before=${encodeURIComponent(nextCursor)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Notification page failed (${response.status}).`);
      const json = await response.json();
      const incoming: NotificationItem[] = (json.data?.notifications ?? []).map((row: any) => ({
        id: String(row.id), user_id: user?.id ?? "", title: String(row.title ?? ""),
        message: String(row.message ?? ""), type: String(row.type ?? "info"),
        read: row.is_read === true, created_at: String(row.created_at),
        link: typeof row.action_url === "string" ? row.action_url : undefined,
      }));
      setNotifications((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...incoming.filter((item) => !ids.has(item.id))];
      });
      setNextCursor(typeof json.data?.nextCursor === "string" ? json.data.nextCursor : null);
      setError(null);
    } catch {
      setError("Could not load more notifications. Please retry.");
    }
  };

  useEffect(() => {
    void fetchNotifications();
    if (!user) return;

    if (isStaging) {
      let eventSource: EventSource | null = null;
      try {
        const cursorKey = `merotalent.notification_cursor.${user.id}`;
        const cursor = sessionStorage.getItem(cursorKey);
        const url = cursor && /^(0|[1-9][0-9]{0,18})$/.test(cursor)
          ? `/api/v1/realtime/stream?cursor=${cursor}` : "/api/v1/realtime/stream";
        eventSource = new EventSource(url);
        eventSource.addEventListener("notification", (event) => {
          if (event.lastEventId) sessionStorage.setItem(cursorKey, event.lastEventId);
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
    if (isStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/notifications", {
          method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }),
        });
        if (!response.ok) throw new Error(`Mark all read failed (${response.status}).`);
        await fetchNotifications();
      } catch {
        setError("Could not mark notifications as read. Please retry.");
      }
      return;
    }
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
    if (isStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/notifications", {
          method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error(`Mark read failed (${response.status}).`);
        await fetchNotifications();
      } catch {
        setError("Could not mark the notification as read. Please retry.");
      }
      return;
    }
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

  const markAsUnread = async (id: string) => {
    if (!isStaging) return;
    try {
      const response = await fetch("/api/v1/neon-staging/notifications", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, read: false }),
      });
      if (!response.ok) throw new Error(`Mark unread failed (${response.status}).`);
      await fetchNotifications();
    } catch { setError("Could not mark the notification unread. Please retry."); }
  };

  return { notifications, unreadCount, isLoading, error, hasMore: !!nextCursor,
    loadMore, markAsRead, markAsUnread, markAllAsRead, refresh: fetchNotifications };
}
