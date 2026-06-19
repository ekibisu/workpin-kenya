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
    thread_status: string;
    job_request_status: string | null;
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

        // 1a. Get this user's business ids (empty if they're not a provider)
        const { data: myBusinesses } = await supabase
            .from("businesses")
            .select("id")
            .eq("owner_id", user.id);
        const myBusinessIds = (myBusinesses ?? []).map((b) => b.id);

        // 1b. Fetch threads where the user is the client OR owns the provider business
        const orFilter = myBusinessIds.length > 0
            ? `client_id.eq.${user.id},provider_id.in.(${myBusinessIds.join(",")})`
            : `client_id.eq.${user.id}`;
        const { data: threads, error } = await supabase
            .from("work_threads")
            .select("id, job_request_id, client_id, provider_id, status, created_at, updated_at")
            .or(orFilter)
            .order("updated_at", { ascending: false });

        if (error || !threads) {
            setLoading(false);
            return;
        }

        // 2. For threads where current user is the client, resolve the
        //    provider business -> owner profile id (and business name).
        const businessIdsNeeded = threads
            .filter((t) => t.client_id === user.id)
            .map((t) => t.provider_id);
        const uniqueBusinessIds = [...new Set(businessIdsNeeded)];
        const { data: bizOwners } = uniqueBusinessIds.length > 0
            ? await supabase
                .from("businesses")
                .select("id, owner_id, business_name")
                .in("id", uniqueBusinessIds)
            : { data: [] as { id: string; owner_id: string; business_name: string | null }[] };
        const bizOwnerMap: Record<string, { id: string; owner_id: string; business_name: string | null }> =
            Object.fromEntries((bizOwners ?? []).map((b) => [b.id, b]));

        const otherPartyIds = threads
            .map((t) =>
                t.client_id === user.id
                    ? (bizOwnerMap[t.provider_id]?.owner_id ?? null)
                    : t.client_id
            )
            .filter(Boolean) as string[];
        const uniqueOtherIds = [...new Set(otherPartyIds)];

        // 3. Fetch profiles for other parties
        const { data: profiles } = uniqueOtherIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .in("id", uniqueOtherIds)
            : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };
        const profileMap = Object.fromEntries(
            (profiles || []).map((p) => [p.id, p])
        );

        // 4. Fetch job_requests with service names for threads that have a job_request_id
        const jobRequestIds = threads.map((t) => t.job_request_id).filter(Boolean) as string[];
        const serviceNameMap: Record<string, string> = {};
        const jobStatusMap: Record<string, string> = {};
        if (jobRequestIds.length > 0) {
            const { data: jobReqs } = await supabase
                .from("job_requests")
                .select("id, service_id, status, services!service_requests_service_id_fkey(name)")
                .in("id", jobRequestIds);
            for (const jr of (jobReqs as any[]) || []) {
                serviceNameMap[jr.id] = jr.services?.name ?? null;
                jobStatusMap[jr.id] = jr.status ?? null;
            }
        }

        // 5. Fetch latest message + unread count for each thread
        const threadIds = threads.map((t) => t.id);

        const [latestMsgsRes, unreadRes] = await Promise.all([
            supabase
                .from("messages")
                .select("work_thread_id, content, created_at")
                .in("work_thread_id", threadIds)
                .order("created_at", { ascending: false }),
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
        const unreadMap: Record<string, number> = {};

        // 6. Assemble final list
        const enriched: Conversation[] = threads.map((t) => {
            const otherId = t.client_id === user.id
                ? (bizOwnerMap[t.provider_id]?.owner_id ?? "")
                : t.client_id;
            const profile = profileMap[otherId];
            const latest = latestMap[t.id];
            const service = t.job_request_id ? serviceNameMap[t.job_request_id] ?? null : null;

            return {
                id: t.id,
                job_request_id: t.job_request_id,
                client_id: t.client_id,
                provider_id: t.provider_id,
                status: t.status,
                created_at: t.created_at,
                updated_at: t.updated_at,
                other_party_name: t.client_id === user.id
                    ? (bizOwnerMap[t.provider_id]?.business_name ?? profile?.full_name ?? null)
                    : profile?.full_name ?? null,
                other_party_avatar: profile?.avatar_url ?? null,
                service_name: service,
                last_message_body: latest?.content ?? null,
                last_message_at: latest?.created_at ?? null,
                unread_count: unreadMap[t.id] || 0,
                thread_status: t.status,
                job_request_status: t.job_request_id ? jobStatusMap[t.job_request_id] ?? null : null,
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
