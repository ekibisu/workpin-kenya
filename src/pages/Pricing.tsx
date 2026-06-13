import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useActiveCountry } from "@/contexts/CountryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SubscriptionCheckout from "@/components/payments/SubscriptionCheckout";

interface Plan {
  id: string;
  name: string;
  price_monthly_kes: number;
  price_annual_kes: number;
  prices: Record<string, { monthly?: number; annual?: number }>;
  limits: Record<string, number>;
  features: string[];
  sort_order: number;
}

const tierIcons: Record<string, React.ReactNode> = {
  Free: <Star className="h-6 w-6" />,
  Pro: <Zap className="h-6 w-6" />,
  Premium: <Crown className="h-6 w-6" />,
};

const tierAccents: Record<string, string> = {
  Free: "border-border",
  Pro: "border-primary ring-2 ring-primary/20",
  Premium: "border-amber-400 ring-2 ring-amber-400/20",
};

const Pricing = () => {
  const { country } = useActiveCountry();
  const { user } = useAuth();
  const { toast } = useToast();
  const currency = country?.currency_code || "KES";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<Plan | null>(null);

  useEffect(() => {
    supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setPlans(
          (data || []).map((p: any) => ({
            ...p,
            features: Array.isArray(p.features) ? p.features : [],
            limits: typeof p.limits === "object" && p.limits ? p.limits : {},
            prices: typeof p.prices === "object" && p.prices ? p.prices : {},
          }))
        );
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) { setBusinessId(null); return; }
    supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setBusinessId(data?.id ?? null));
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-5xl">
              Grow your business with <span className="text-primary">Workpin</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Choose a plan that fits your needs. Upgrade anytime to unlock more features and reach more clients.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative h-7 w-12 rounded-full transition-colors ${annual ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${annual ? "translate-x-[22px]" : "translate-x-0.5"}`}
                />
              </button>
              <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
                Annual
                <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
              </span>
            </div>
          </motion.div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan, i) => {
                const block = plan.prices[currency] || plan.prices["KES"] || { monthly: plan.price_monthly_kes, annual: plan.price_annual_kes };
                const monthly = block.monthly ?? 0;
                const annualTotal = block.annual ?? 0;
                const price = annual ? Math.round(annualTotal / 12) : monthly;
                const isPro = plan.name === "Pro";

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative flex flex-col rounded-2xl border-2 bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${tierAccents[plan.name] || "border-border"}`}
                  >
                    {isPro && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-brand-3d">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <div className="mb-4 flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.name === "Premium" ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"}`}>
                        {tierIcons[plan.name]}
                      </div>
                      <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
                    </div>

                    <div className="mb-6">
                      {price === 0 ? (
                        <span className="text-3xl font-extrabold">Free</span>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-muted-foreground">{currency}</span>
                          <span className="text-3xl font-extrabold">{price.toLocaleString()}</span>
                          <span className="text-sm text-muted-foreground">/mo</span>
                        </div>
                      )}
                      {annual && annualTotal > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {currency} {annualTotal.toLocaleString()} billed annually
                        </p>
                      )}
                    </div>

                    <ul className="mb-8 flex-1 space-y-3">
                      {plan.features.map((feature, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.price_monthly_kes === 0 ? (
                      <Button
                        asChild
                        variant={isPro ? "default" : "outline"}
                        className={`w-full ${isPro ? "shadow-brand-3d" : ""}`}
                      >
                        <Link to="/register">Get Started Free</Link>
                      </Button>
                    ) : user && businessId ? (
                      <Button
                        variant={isPro ? "default" : "outline"}
                        className={`w-full ${isPro ? "shadow-brand-3d" : ""}`}
                        onClick={() => setUpgradeTarget(plan)}
                      >
                        Upgrade to {plan.name}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant={isPro ? "default" : "outline"}
                        className={`w-full ${isPro ? "shadow-brand-3d" : ""}`}
                      >
                        <Link to={`/register?plan=${plan.name.toLowerCase()}`}>
                          Choose {plan.name}
                        </Link>
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* FAQ */}
          <div className="mx-auto mt-16 max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold">Frequently Asked Questions</h2>
            <div className="mt-8 space-y-6 text-left">
              <div>
                <h3 className="font-semibold">Can I upgrade or downgrade anytime?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Yes! You can upgrade at any time and your new features will be available immediately. Downgrades take effect at the end of your billing cycle.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">How does payment work?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We accept M-Pesa payments. You'll receive an STK Push notification on your phone to confirm payment securely.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">What happens when I hit a limit?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  You'll see a prompt to upgrade your plan. Your existing data is never deleted — you just won't be able to add more until you upgrade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <SubscriptionCheckout
        open={!!upgradeTarget}
        onOpenChange={(o) => { if (!o) setUpgradeTarget(null); }}
        plan={upgradeTarget}
        period={annual ? "annual" : "monthly"}
        businessId={businessId}
        onSuccess={() => {
          setUpgradeTarget(null);
          toast({ title: "Plan upgraded!", description: "Your new plan is now active." });
        }}
      />
    </div>
  );
};

export default Pricing;
