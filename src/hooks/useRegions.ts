import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Region {
  id: string;
  country_code: string;
  name: string;
  kind: string;
}

export function useRegions(countryCode: string | null | undefined) {
  return useQuery({
    queryKey: ["regions", countryCode],
    queryFn: async () => {
      if (!countryCode) return [];
      const { data, error } = await supabase
        .from("regions")
        .select("*")
        .eq("country_code", countryCode)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data || []) as Region[];
    },
    enabled: !!countryCode,
    staleTime: 1000 * 60 * 30,
  });
}
