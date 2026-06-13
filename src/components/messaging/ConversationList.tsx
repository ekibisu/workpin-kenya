import { useMemo, useState } from "react";
import { MessageCircle, Loader2, Flag, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import MessageDrawer from "@/components/messaging/MessageDrawer";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

interface ConversationListProps {
    /** Optional: restrict list to threads involving a specific work_thread_id */
    highlightThreadId?: string;
}

const STATUS_BADGE: Record<
    string,
    { label: string; variant: "secondary" | "outline" | "destructive"; className?: string }
> = {
    quoted: { label: "Quote sent", variant: "secondary" },
    completed: { label: "Completed", variant: "outline", className: "text-muted-foreground" },
    reviewed: { label: "Reviewed", variant: "outline", className: "text-green-600 border-green-600/40" },
    disputed: { label: "Disputed", variant: "destructive" },
};

const ConversationList = ({ highlightThreadId }: ConversationListProps) => {
    const { user } = useAuth();
    const { conversations, loading } = useConversations();
    const { resetCount } = useUnreadMessageCount();
    const [openThreadId, setOpenThreadId] = useState<string | null>(
        highlightThreadId ?? null
    );
    const [recipientName, setRecipientName] = useState("");
    const [completedOpen, setCompletedOpen] = useState(false);

    const openThread = (threadId: string, name: string) => {
        setOpenThreadId(threadId);
        setRecipientName(name);
    };

    const buckets = useMemo(() => {
        const disputed: Conversation[] = [];
        const awaiting: Conversation[] = [];
        const active: Conversation[] = [];
        const completed: Conversation[] = [];
        for (const c of conversations) {
            const isClient = !!user && c.client_id === user.id;
            if (c.thread_status === "disputed") {
                disputed.push(c);
            } else if (
                isClient &&
                (c.thread_status === "quoted" || c.job_request_status === "completion_pending")
            ) {
                awaiting.push(c);
            } else if (c.thread_status === "active" || c.thread_status === "quoted") {
                active.push(c);
            } else if (c.thread_status === "completed" || c.thread_status === "reviewed") {
                completed.push(c);
            } else {
                active.push(c);
            }
        }
        return { disputed, awaiting, active, completed };
    }, [conversations, user]);

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

    const renderRow = (conv: Conversation) => {
        const initials = conv.other_party_name
            ? conv.other_party_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : "?";
        const isActive = openThreadId === conv.id;
        const cfg = STATUS_BADGE[conv.thread_status];

        return (
            <button
                key={conv.id}
                onClick={() => openThread(conv.id, conv.other_party_name ?? "Unknown")}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${isActive ? "bg-accent" : ""}`}
            >
                <Avatar className="h-10 w-10 shrink-0">
                    {conv.other_party_avatar ? (
                        <AvatarImage src={conv.other_party_avatar} alt={conv.other_party_name ?? ""} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {conv.other_party_name ?? "Unknown"}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                            {conv.last_message_at
                                ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                                : formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}
                        </span>
                    </div>

                    {conv.service_name && (
                        <p className="mb-0.5 text-[11px] font-medium text-primary">{conv.service_name}</p>
                    )}
                    {cfg && (
                        <Badge
                            variant={cfg.variant}
                            className={`mb-0.5 h-4 text-[9px] px-1.5 ${cfg.className ?? ""}`}
                        >
                            {cfg.label}
                        </Badge>
                    )}

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
    };

    const SectionHeader = ({
        title,
        count,
        icon,
        className = "",
    }: { title: string; count: number; icon?: React.ReactNode; className?: string }) => (
        <div className={`flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${className}`}>
            {icon}
            <span>{title}</span>
            <span className="text-muted-foreground/60">({count})</span>
        </div>
    );

    return (
        <>
            <div>
                {buckets.disputed.length > 0 && (
                    <section>
                        <SectionHeader
                            title="Disputed"
                            count={buckets.disputed.length}
                            icon={<Flag className="h-3.5 w-3.5 text-destructive" />}
                            className="text-destructive"
                        />
                        <div className="divide-y divide-border border-y border-border">
                            {buckets.disputed.map(renderRow)}
                        </div>
                    </section>
                )}

                {buckets.awaiting.length > 0 && (
                    <section>
                        <SectionHeader title="Awaiting your response" count={buckets.awaiting.length} />
                        <div className="divide-y divide-border border-y border-border">
                            {buckets.awaiting.map(renderRow)}
                        </div>
                    </section>
                )}

                {buckets.active.length > 0 && (
                    <section>
                        <SectionHeader title="Active jobs" count={buckets.active.length} />
                        <div className="divide-y divide-border border-y border-border">
                            {buckets.active.map(renderRow)}
                        </div>
                    </section>
                )}

                {buckets.completed.length > 0 && (
                    <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
                        <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/30">
                            {completedOpen ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            <span>Completed</span>
                            <span className="text-muted-foreground/60">({buckets.completed.length})</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="divide-y divide-border border-y border-border">
                                {buckets.completed.map(renderRow)}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}
            </div>

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
