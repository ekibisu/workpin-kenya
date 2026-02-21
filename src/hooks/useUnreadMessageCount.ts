import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      // Get all messages for threads where user is a participant and not the sender
      const { data: messages } = await supabase
        .from("messages")
        .select("work_thread_id, created_at, read_at, sender_id")
        .neq("sender_id", user.id);

      if (!messages) {
        setCount(0);
        return;
      }

      // Count unread: messages where read_at is null
      const unread = messages.filter((msg: any) => !msg.read_at);
      setCount(unread.length);
    };

    fetchCount();

    // Subscribe to new messages for live updates
    const channel = supabase
      .channel("unread-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id !== user.id && !msg.read_at) {
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
      const { data: messages } = await supabase
        .from("messages")
        .select("work_thread_id, created_at, read_at, sender_id")
        .neq("sender_id", user.id);

      if (!messages) {
        setCount(0);
        return;
      }

      const unread = messages.filter((msg: any) => !msg.read_at);
      setCount(unread.length);
    }, 500);
  };

  return { unreadCount: count, resetCount };
};
