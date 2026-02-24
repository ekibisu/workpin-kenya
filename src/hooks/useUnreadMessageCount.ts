import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      // Get threads the user participates in
      const { data: threads } = await supabase
        .from("work_threads")
        .select("id")
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

      if (!threads || threads.length === 0) {
        setCount(0);
        return;
      }

      const threadIds = threads.map((t) => t.id);

      // Get read status for each thread
      const { data: readStatuses } = await supabase
        .from("conversation_read_status")
        .select("request_id, last_read_at")
        .eq("user_id", user.id);

      const readMap: Record<string, string> = {};
      for (const rs of readStatuses || []) {
        readMap[rs.request_id] = rs.last_read_at;
      }

      // Count messages from others that are newer than last_read_at
      let totalUnread = 0;
      for (const threadId of threadIds) {
        let query = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("work_thread_id", threadId)
          .neq("sender_id", user.id);

        const lastRead = readMap[threadId];
        if (lastRead) {
          query = query.gt("created_at", lastRead);
        }

        const { count: c } = await query;
        totalUnread += c || 0;
      }

      setCount(totalUnread);
    };

    fetchCount();

    const channel = supabase
      .channel("unread-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
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
    setCount(0);
  };

  return { unreadCount: count, resetCount };
};
