import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
    WorkThread,
    ClientProfile,
    Booking,
    Dispute,
    ProviderTemplate,
    ProviderWallet,
    WalletTransaction,
    FixedPriceService
} from "@/integrations/supabase/types";

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
// CLIENT PROFILES
// ============================================

export function useClientProfile(userId: string) {
    return useQuery({
        queryKey: ["client_profiles", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("client_profiles")
                .select("*")
                .eq("user_id", userId)
                .single();

            if (error && error.code !== "PGRST116") throw error; // Allow null for not found
            return data as ClientProfile | null;
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
// FIXED PRICE SERVICES
// ============================================

export function useProviderFixedPriceServices(providerId: string) {
    return useQuery({
        queryKey: ["fixed_price_services", providerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("fixed_price_services")
                .select("*")
                .eq("provider_id", providerId)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as FixedPriceService[];
        },
        enabled: !!providerId,
    });
}
