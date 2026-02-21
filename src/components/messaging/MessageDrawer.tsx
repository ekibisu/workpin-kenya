import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  work_thread_id: string;
  sender_id: string;
  body: string;
  type: 'text' | 'quote' | 'system';
  read_at: string | null;
  created_at: string;
}

interface MessageDrawerProps {
  workThreadId: string | null;
  recipientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRead?: () => void;
}

const MessageDrawer = ({ workThreadId, recipientName, open, onOpenChange, onRead }: MessageDrawerProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark as read & fetch messages when opened
  useEffect(() => {
    if (!open || !workThreadId || !user) return;
    setLoading(true);
    // Mark all unread messages as read for this thread
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("work_thread_id", workThreadId)
      .is("read_at", null)
      .neq("sender_id", user.id)
      .then(() => onRead?.());
    supabase
      .from("messages")
      .select("*")
      .eq("work_thread_id", workThreadId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) || []);
        setLoading(false);
      });
  }, [open, workThreadId, user]);

  // Realtime subscription
  useEffect(() => {
    if (!open || !workThreadId) return;
    const channel = supabase
      .channel(`messages-${workThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `work_thread_id=eq.${workThreadId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === (payload.new as Message).id);
            if (exists) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, workThreadId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !workThreadId || !newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      work_thread_id: workThreadId,
      sender_id: user.id,
      body: newMessage.trim(),
      type: "text",
    });
    setSending(false);
    if (!error) {
      setNewMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-base">Chat with {recipientName}</SheetTitle>
          <SheetDescription className="text-xs">Messages about this job</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No messages yet. Say hello!
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(msg.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border px-4 py-3">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1"
            />
            <Button
              size="icon"
              disabled={!newMessage.trim() || sending}
              onClick={handleSend}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MessageDrawer;
