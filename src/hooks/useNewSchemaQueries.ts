import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type WorkThread = Tables<"work_threads">;
type Booking = Tables<"bookings">;
type Dispute = Tables<"disputes">;
type ProviderTemplate = Tables<"provider_templates">;
type ProviderWallet = Tables<"provider_wallets">;
type WalletTransaction = Tables<"wallet_transactions">;
type FixedPriceService = Tables<"fixed_price_services">;
type Business = Tables<"businesses">;

// ============================================
// WORK THREADS
// ============================================

export function useWorkThreads(userId: string) {
    return useQuery({
        queryKey: ["work_threads", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("work_threads")
                .select("*")
                .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
                .order("updated_at", { ascending: false });

            if (error) throw error;
            return data as WorkThread[];
        },
        enabled: !!userId,
    });
}

// ============================================
// BOOKINGS
// ============================================

export function useBookings(workThreadId: string) {
    return useQuery({
        queryKey: ["bookings", workThreadId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bookings")
                .select("*")
                .eq("work_thread_id", workThreadId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as Booking[];
        },
        enabled: !!workThreadId,
    });
}

// ============================================
// DISPUTES
// ============================================

export function useDisputes(workThreadId?: string) {
    return useQuery({
        queryKey: ["disputes", workThreadId],
        queryFn: async () => {
            let query = supabase.from("disputes").select("*").order("created_at", { ascending: false });

            if (workThreadId) {
                query = query.eq("work_thread_id", workThreadId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Dispute[];
        },
    });
}

// ============================================
// PROVIDER TEMPLATES
// ============================================

export function useProviderTemplates(providerId: string) {
    return useQuery({
        queryKey: ["provider_templates", providerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("provider_templates")
                .select("*")
                .eq("provider_id", providerId)
                .order("sort_order", { ascending: true });

            if (error) throw error;
            return data as ProviderTemplate[];
        },
        enabled: !!providerId,
    });
}

// ============================================
// PROVIDER WALLETS 
// ============================================

export function useProviderWallet(providerId: string) {
    return useQuery({
        queryKey: ["provider_wallets", providerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("provider_wallets")
                .select("*")
                .eq("provider_id", providerId)
                .single();

            if (error && error.code !== "PGRST116") throw error;
            return data as ProviderWallet | null;
        },
        enabled: !!providerId,
    });
}

// ============================================
// WALLET TRANSACTIONS
// ============================================

export function useWalletTransactions(providerId: string) {
    return useQuery({
        queryKey: ["wallet_transactions", providerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("wallet_transactions")
                .select("*")
                .eq("provider_id", providerId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as WalletTransaction[];
        },
        enabled: !!providerId,
    });
}

// ============================================
// FIXED PRICE SERVICES (by business id)
// ============================================

export function useProviderFixedPriceServices(businessId: string) {
    return useQuery({
        queryKey: ["fixed_price_services", businessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("fixed_price_services")
                .select("*")
                .eq("provider_id", businessId)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as FixedPriceService[];
        },
        enabled: !!businessId,
    });
}

// ============================================
// BUSINESSES (replaces provider_profiles)
// ============================================

export function useUserBusinesses(userId: string) {
    return useQuery({
        queryKey: ["businesses", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("businesses")
                .select("*")
                .eq("owner_id", userId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as Business[];
        },
        enabled: !!userId,
    });
}

// ============================================
// CLIENT JOB REQUESTS
// ============================================

export function useClientJobRequests(userId: string) {
    return useQuery({
        queryKey: ["job_requests", "client", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("job_requests")
                .select("id, description, location_name, status, created_at, image_urls, services(name, archetype)")
                .eq("client_id", userId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data as any[]) ?? [];
        },
        enabled: !!userId,
    });
}

// ============================================
// CLIENT QUOTES (for a list of job request ids)
// ============================================

export function useClientQuotes(requestIds: string[]) {
    const key = requestIds.join(",");
    return useQuery({
        queryKey: ["quotes", "client", key],
        queryFn: async () => {
            if (requestIds.length === 0) return [];
            const { data, error } = await supabase
                .from("quotes")
                .select(
                    "id, price_kes, message, status, created_at, request_id, provider_id, work_thread_id, " +
                    "profiles!quotes_provider_id_fkey(full_name), " +
                    "job_requests!quotes_request_id_fkey(description, services(name)), " +
                    "businesses!quotes_provider_id_fkey(avg_rating, total_reviews)"
                )
                .in("request_id", requestIds)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return ((data as any[]) ?? []).map((q) => ({
                ...q,
                business_ratings: q.businesses
                    ? { avg_rating: q.businesses.avg_rating, total_reviews: q.businesses.total_reviews }
                    : null,
            }));
        },
        enabled: requestIds.length > 0,
    });
}

// ============================================
// OWNER BUSINESSES (with completeness metadata)
// ============================================

export interface BusinessWithMeta extends Business {
    galleryCount: number;
    servicesCount: number;
    faqCount: number;
}

export function useOwnerBusinesses(userId: string) {
    return useQuery({
        queryKey: ["businesses", "owner", userId],
        queryFn: async (): Promise<BusinessWithMeta[]> => {
            const { data: bizData, error } = await supabase
                .from("businesses")
                .select("*")
                .eq("owner_id", userId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            const list = (bizData as Business[]) ?? [];
            if (list.length === 0) return [];
            const ids = list.map((b) => b.id);
            const [{ data: svc }, { data: gal }, { data: faq }] = await Promise.all([
                supabase.from("business_services").select("business_id").in("business_id", ids),
                supabase.from("business_gallery").select("business_id").in("business_id", ids),
                supabase.from("business_faqs").select("business_id").in("business_id", ids),
            ]);
            return list.map((b) => ({
                ...b,
                servicesCount: (svc ?? []).filter((r: any) => r.business_id === b.id).length,
                galleryCount: (gal ?? []).filter((r: any) => r.business_id === b.id).length,
                faqCount: (faq ?? []).filter((r: any) => r.business_id === b.id).length,
            }));
        },
        enabled: !!userId,
    });
}

// ============================================
// OPEN JOB FEED (for providers)
// ============================================

export function useOpenJobFeed(businessIds: string[], countries: string[]) {
    return useQuery({
        queryKey: ["job_feed", businessIds.join(","), countries.join(",")],
        queryFn: async () => {
            const { data: userRes } = await supabase.auth.getUser();
            const uid = userRes?.user?.id;
            let query = supabase
                .from("job_requests")
                .select("id, description, location_name, status, created_at, image_urls, country_code, client_id, services(name, archetype)")
                .eq("status", "open")
                .order("created_at", { ascending: false });
            if (uid) query = query.neq("client_id", uid);
            if (countries.length > 0) query = query.in("country_code", countries);
            const { data, error } = await query;
            if (error) throw error;
            return (data as any[]) ?? [];
        },
        enabled: businessIds.length > 0,
    });
}

