import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCountries, Country } from "@/hooks/useCountries";

const STORAGE_KEY = "workpin.activeCountry";
const DEFAULT_COUNTRY = "KE";

interface CountryContextValue {
  activeCountry: string;
  setActiveCountry: (code: string) => void;
  country: Country | null;
  countries: Country[];
}

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: countries = [] } = useCountries();
  const [activeCountry, setActiveCountryState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_COUNTRY;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_COUNTRY;
  });

  // Initialise from profile when logged in (only if user hasn't picked one yet)
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    supabase
      .from("profiles")
      .select("country_code")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.country_code) {
          setActiveCountryState(data.country_code);
          localStorage.setItem(STORAGE_KEY, data.country_code);
        }
      });
  }, [user]);

  const setActiveCountry = (code: string) => {
    setActiveCountryState(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const value = useMemo<CountryContextValue>(() => ({
    activeCountry,
    setActiveCountry,
    country: countries.find((c) => c.code === activeCountry) ?? null,
    countries,
  }), [activeCountry, countries]);

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useActiveCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useActiveCountry must be used within CountryProvider");
  return ctx;
}
