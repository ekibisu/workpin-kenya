import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      // Get read statuses for the user
      const { data: readStatuses } = await supabase
        .from("conversation_read_status")
        .select("request_id, last_read_at")
        .eq("user_id", user.id);

      const readMap = new Map<string, string>();
      (readStatuses || []).forEach((rs: any) => {
        readMap.set(rs.request_id, rs.last_read_at);
      });

      // Get all direct messages not sent by this user
      const { data: messages } = await supabase
        .from("direct_messages")
        .select("request_id, created_at")
        .neq("sender_id", user.id);

      if (!messages) {
        setCount(0);
        return;
      }

      // Count unread: messages where created_at > last_read_at (or no read status)
      const unread = messages.filter((msg: any) => {
        const lastRead = readMap.get(msg.request_id);
        if (!lastRead) return true;
        return new Date(msg.created_at) > new Date(lastRead);
      });

      setCount(unread.length);
    };

    fetchCount();

    // Subscribe to new messages for live updates
    const channel = supabase
      .channel("unread-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id !== user.id) {
            setCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const resetCount = () => {
    // Re-fetch after marking as read
    if (!user) return;
    setTimeout(async () => {
      const { data: readStatuses } = await supabase
        .from("conversation_read_status")
        .select("request_id, last_read_at")
        .eq("user_id", user.id);

      const readMap = new Map<string, string>();
      (readStatuses || []).forEach((rs: any) => {
        readMap.set(rs.request_id, rs.last_read_at);
      });

      const { data: messages } = await supabase
        .from("direct_messages")
        .select("request_id, created_at")
        .neq("sender_id", user.id);

      if (!messages) {
        setCount(0);
        return;
      }

      const unread = messages.filter((msg: any) => {
        const lastRead = readMap.get(msg.request_id);
        if (!lastRead) return true;
        return new Date(msg.created_at) > new Date(lastRead);
      });

      setCount(unread.length);
    }, 500);
  };

  return { unreadCount: count, resetCount };
};
