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

    try {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data && Array.isArray(data) && data.length > 0) {
        const formatted = data.map((n: NotificationItem) => ({
          ...n,
          read: n.read || readIds.includes(n.id),
        }));
        setNotifications(formatted);
        setUnreadCount(formatted.filter((n: NotificationItem) => !n.read).length);
      } else {
        // Fallback default notifications
        const defaultNotifs: NotificationItem[] = [
          {
            id: "notif-1",
            user_id: user.id,
            title: "Welcome to MeroTalent!",
            message: "Your profile is active. Explore jobs, hackathons, and mentors.",
            type: "system",
            read: readIds.includes("notif-1"),
            created_at: new Date().toISOString(),
          },
        ];
        setNotifications(defaultNotifs);
        setUnreadCount(defaultNotifs.filter((n) => !n.read).length);
      }
    } catch {
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => {
        saveReadNotifId(n.id);
        return { ...n, read: true };
      })
    );
    setUnreadCount(0);

    if (user) {
      await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id);
    }
  };

  const markAsRead = async (id: string) => {
    saveReadNotifId(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (user) {
      await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
