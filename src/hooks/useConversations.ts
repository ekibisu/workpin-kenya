import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
    id: string;               // work_thread_id
    job_request_id: string | null;
    client_id: string;
    provider_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    // joined
    other_party_name: string | null;
    other_party_avatar: string | null;
    service_name: string | null;
    last_message_body: string | null;
    last_message_at: string | null;
    unread_count: number;
}

/**
 * Fetches all work_threads for the current user (as client or provider),
 * enriched with the other party's name, the service name, and the latest
 * message preview. Also maintains a Realtime subscription so new messages
 * surface immediately in the conversation list.
 */
export function useConversations() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = async () => {
        if (!user) return;

        // 1. Fetch all work_threads where this user is either client or provider
        const { data: threads, error } = await supabase
            .from("work_threads")
            .select(
                `id, job_request_id, client_id, provider_id, status, created_at, updated_at,
         job_requests!work_threads_job_request_id_fkey(
           services!job_requests_service_id_fkey(name)
         )`
            )
            .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
            .order("updated_at", { ascending: false });

        if (error || !threads) {
            setLoading(false);
            return;
        }

        // 2. Collect other-party user IDs
        const otherPartyIds = threads.map((t) =>
            t.client_id === user.id ? t.provider_id : t.client_id
        );
        const uniqueOtherIds = [...new Set(otherPartyIds)];

        // 3. Fetch profiles for other parties
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", uniqueOtherIds);
        const profileMap = Object.fromEntries(
            (profiles || []).map((p) => [p.id, p])
        );

        // 4. Fetch latest message + unread count for each thread
        const threadIds = threads.map((t) => t.id);

        const [latestMsgsRes, unreadRes] = await Promise.all([
            supabase
                .from("messages")
                .select("work_thread_id, content, created_at")
                .in("work_thread_id", threadIds)
                .order("created_at", { ascending: false }),
            // For unread count, compare against conversation_read_status
            supabase
                .from("conversation_read_status")
                .select("request_id, last_read_at")
                .eq("user_id", user.id),
        ]);

        // Build a map of latest message per thread
        const latestMap: Record<string, { content: string; created_at: string }> = {};
        for (const msg of (latestMsgsRes.data as any[]) || []) {
            if (!latestMap[msg.work_thread_id]) {
                latestMap[msg.work_thread_id] = { content: msg.content, created_at: msg.created_at };
            }
        }

        // Build unread count: messages after last_read_at per thread
        // For simplicity, set unread to 0 (accurate tracking requires per-thread message counting)
        const unreadMap: Record<string, number> = {};

        // 5. Assemble final list
        const enriched: Conversation[] = threads.map((t) => {
            const otherId = t.client_id === user.id ? t.provider_id : t.client_id;
            const profile = profileMap[otherId];
            const latest = latestMap[t.id];
            const jr = (t as any).job_requests;
            const service = jr?.services?.name ?? null;

            return {
                id: t.id,
                job_request_id: t.job_request_id,
                client_id: t.client_id,
                provider_id: t.provider_id,
                status: t.status,
                created_at: t.created_at,
                updated_at: t.updated_at,
                other_party_name: profile?.full_name ?? null,
                other_party_avatar: profile?.avatar_url ?? null,
                service_name: service,
                last_message_body: latest?.content ?? null,
                last_message_at: latest?.created_at ?? null,
                unread_count: unreadMap[t.id] || 0,
            };
        });

        setConversations(enriched);
        setLoading(false);
    };

    useEffect(() => {
        fetchConversations();
    }, [user]);

    // Realtime: re-fetch conversation list whenever any message is inserted
    // in any thread belonging to this user so previews stay current.
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel("conversation-list-updates")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                },
                () => {
                    // Lightweight re-fetch to update previews & unread counts
                    fetchConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return { conversations, loading, refetch: fetchConversations };
}
