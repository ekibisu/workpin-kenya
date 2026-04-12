import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlanLimits {
  max_businesses: number;
  max_services: number;
  max_gallery: number;
  max_quotes_per_month: number;
}

interface SubscriptionInfo {
  planName: string;
  limits: PlanLimits;
  loading: boolean;
}

const FREE_LIMITS: PlanLimits = {
  max_businesses: 1,
  max_services: 3,
  max_gallery: 5,
  max_quotes_per_month: 5,
};

export function useSubscriptionLimits(userId: string | undefined): SubscriptionInfo {
  const [planName, setPlanName] = useState("Free");
  const [limits, setLimits] = useState<PlanLimits>(FREE_LIMITS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      // Get user's businesses and their subscriptions
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId);

      if (!businesses?.length) {
        setLoading(false);
        return;
      }

      // Check for any active subscription across user's businesses
      const { data: subs } = await supabase
        .from("business_subscriptions")
        .select("plan_id, status, subscription_plans(name, limits)")
        .in("business_id", businesses.map((b) => b.id))
        .eq("status", "active");

      if (subs?.length) {
        // Use the highest-tier active subscription
        const best = subs.reduce((best: any, s: any) => {
          const plan = s.subscription_plans;
          if (!best || tierRank(plan.name) > tierRank(best.name)) {
            return plan;
          }
          return best;
        }, null);

        if (best) {
          setPlanName(best.name);
          setLimits(best.limits as PlanLimits);
        }
      }

      setLoading(false);
    };

    fetch();
  }, [userId]);

  return { planName, limits, loading };
}

function tierRank(name: string): number {
  if (name === "Premium") return 2;
  if (name === "Pro") return 1;
  return 0;
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}
