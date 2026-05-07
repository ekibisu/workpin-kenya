import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Country {
  code: string;
  name: string;
  currency_code: string;
  dial_code: string;
  phone_regex: string;
  default_payment_provider: string;
  flag_emoji: string | null;
  sort_order: number;
}

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Country[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useCountry(code: string | null | undefined) {
  const { data } = useCountries();
  return data?.find((c) => c.code === code) ?? null;
}
