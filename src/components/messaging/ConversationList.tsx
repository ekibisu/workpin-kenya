import { useState } from "react";
import { MessageCircle, Loader2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useConversations } from "@/hooks/useConversations";
import MessageDrawer from "@/components/messaging/MessageDrawer";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

interface ConversationListProps {
    /** Optional: restrict list to threads involving a specific work_thread_id */
    highlightThreadId?: string;
}

const ConversationList = ({ highlightThreadId }: ConversationListProps) => {
    const { conversations, loading } = useConversations();
    const { resetCount } = useUnreadMessageCount();
    const [openThreadId, setOpenThreadId] = useState<string | null>(
        highlightThreadId ?? null
    );
    const [recipientName, setRecipientName] = useState("");

    const openThread = (threadId: string, name: string) => {
        setOpenThreadId(threadId);
        setRecipientName(name);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">No conversations yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Once a provider responds to your request, your chat will appear here.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="divide-y divide-border">
                {conversations.map((conv) => {
                    const initials = conv.other_party_name
                        ? conv.other_party_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "?";

                    const isActive = openThreadId === conv.id;

                    return (
                        <button
                            key={conv.id}
                            onClick={() => openThread(conv.id, conv.other_party_name ?? "Unknown")}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${isActive ? "bg-accent" : ""
                                }`}
                        >
                            {/* Avatar */}
                            <Avatar className="h-10 w-10 shrink-0">
                                {conv.other_party_avatar ? (
                                    <AvatarImage src={conv.other_party_avatar} alt={conv.other_party_name ?? ""} />
                                ) : null}
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-semibold text-foreground">
                                        {conv.other_party_name ?? "Unknown"}
                                    </span>
                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                        {conv.last_message_at
                                            ? formatDistanceToNow(new Date(conv.last_message_at), {
                                                addSuffix: true,
                                            })
                                            : formatDistanceToNow(new Date(conv.created_at), {
                                                addSuffix: true,
                                            })}
                                    </span>
                                </div>

                                {conv.service_name && (
                                    <p className="mb-0.5 text-[11px] font-medium text-primary">
                                        {conv.service_name}
                                    </p>
                                )}
                                {conv.thread_status && conv.thread_status !== "active" && (() => {
                                    const s = conv.thread_status;
                                    const map: Record<string, { label: string; variant: "secondary" | "outline" | "destructive"; className?: string }> = {
                                        quoted: { label: "Quote sent", variant: "secondary" },
                                        completed: { label: "Completed", variant: "outline", className: "text-muted-foreground" },
                                        reviewed: { label: "Reviewed", variant: "outline", className: "text-green-600 border-green-600/40" },
                                        disputed: { label: "Disputed", variant: "destructive" },
                                    };
                                    const cfg = map[s] ?? { label: s, variant: "outline" as const };
                                    return (
                                        <Badge
                                            variant={cfg.variant}
                                            className={`mb-0.5 h-4 text-[9px] px-1.5 ${cfg.className ?? ""}`}
                                        >
                                            {cfg.label}
                                        </Badge>
                                    );
                                })()}

                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs text-muted-foreground">
                                        {conv.last_message_body ?? "No messages yet"}
                                    </p>
                                    {conv.unread_count > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="h-4 min-w-4 shrink-0 justify-center px-1 text-[10px]"
                                        >
                                            {conv.unread_count}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Shared MessageDrawer — opens for whichever thread the user clicks */}
            <MessageDrawer
                workThreadId={openThreadId}
                recipientName={recipientName}
                open={!!openThreadId}
                onOpenChange={(open) => {
                    if (!open) setOpenThreadId(null);
                }}
                onRead={resetCount}
            />
        </>
    );
};

export default ConversationList;
