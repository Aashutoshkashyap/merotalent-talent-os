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

    try {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data && Array.isArray(data)) {
        setNotifications(data);
        const unread = data.filter((n: NotificationItem) => !n.read).length;
        setUnreadCount(unread);
      } else {
        // Fallback default notifications if table has 0 records yet
        const defaultNotifs: NotificationItem[] = [
          {
            id: "notif-1",
            user_id: user.id,
            title: "Welcome to MeroTalent!",
            message: "Your profile is active. Explore jobs, hackathons, and mentors.",
            type: "system",
            read: false,
            created_at: new Date().toISOString(),
          },
        ];
        setNotifications(defaultNotifs);
        setUnreadCount(1);
      }
    } catch {
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Simple 10-second polling (Free, 0 cost, no paid Realtime required)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    if (user) {
      await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id);
    }
  };

  const markAsRead = async (id: string) => {
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
