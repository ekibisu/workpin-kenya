import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "@/components/ui/Image";
import { motion } from "framer-motion";
import {
  Search,
  Star,
  MapPin,
  BadgeCheck,
  MessageCircle,
  X,
  Tag,
} from "lucide-react";

import SubscriptionBadge from "@/components/SubscriptionBadge";
import { useActiveCountry } from "@/contexts/CountryContext";

interface Provider {
  id: string;
  business_name: string;
  bio: string | null;
  avg_rating: number | null;
  total_reviews: number | null;
  is_verified: boolean | null;
  categories: string[] | null;
  location_name: string | null;
  rate_kes: number | null;
  rate_type: string | null;
  username: string | null;
  logo_url: string | null;
  subscription_status: string | null;
  owner_full_name: string | null;
  owner_avatar_url: string | null;
  distance_km: number | null;
}

const CATEGORIES = [
  "All",
  "Home Maintenance",
  "Lifestyle & Wellness",
  "Events & Celebrations",
  "Professional & Business",
  "Outdoor & Heavy Duty",
];

const Providers = () => {
  const { activeCountry } = useActiveCountry();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["providers", activeCountry, debouncedSearch, categoryFilter, minRating],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_providers", {
        p_category: categoryFilter !== "all" ? categoryFilter : null,
        p_country: activeCountry,
        p_min_rating: minRating,
        p_limit: 24,
      });
      if (error) throw error;
      let rows = (data ?? []) as Provider[];
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        rows = rows.filter(
          (p) =>
            p.business_name.toLowerCase().includes(q) ||
            (p.categories ?? []).some((c) => c.toLowerCase().includes(q))
        );
      }
      return rows;
    },
    staleTime: 30_000,
  });

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setMinRating(0);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container py-12">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-extrabold">
                Find Professionals
              </h1>
              <p className="text-muted-foreground">
                Browse verified service providers near you
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pros or services..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c === "All" ? "all" : c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background text-sm">
                <Star className="h-4 w-4 text-warning" />
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  <option value="0">Any Rating</option>
                  <option value="4">4.0+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.8">4.8+ Stars</option>
                </select>
              </div>

              {(search || categoryFilter !== "all" || minRating !== 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-primary"
                >
                  <X className="mr-2 h-4 w-4" /> Clear
                </Button>
              )}
            </div>

            <div className="text-sm text-muted-foreground font-medium">
              Showing {providers.length} professionals
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider, i) => {
                const initials = provider.business_name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const slug = provider.username || provider.id;
                const avatar = provider.logo_url || provider.owner_avatar_url;

                return (
                  <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg"
                  >
                    <Link to={`/pro/${slug}`} className="block">
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-sm font-bold text-primary">
                          {avatar ? (
                            <Image
                              src={avatar}
                              alt={provider.business_name}
                              className="h-full w-full rounded-xl object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate font-heading text-base font-bold text-foreground">
                              {provider.business_name}
                            </h3>
                            {provider.is_verified && (
                              <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                            )}
                            <SubscriptionBadge status={provider.subscription_status} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {provider.owner_full_name}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3 flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-warning">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {(provider.avg_rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          ({provider.total_reviews ?? 0} reviews)
                        </span>
                      </div>

                      {provider.location_name && (
                        <div className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {provider.location_name}
                        </div>
                      )}
                      {provider.distance_km != null && (
                        <div className="mb-3 ml-5 text-xs text-muted-foreground">
                          {provider.distance_km} km away
                        </div>
                      )}

                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {(provider.categories ?? []).slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
                          >
                            {s}
                          </span>
                        ))}
                        {(provider.categories ?? []).length > 3 && (
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                            +{(provider.categories ?? []).length - 3}
                          </span>
                        )}
                      </div>
                    </Link>

                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/pro/${slug}`}>
                        <MessageCircle className="h-4 w-4 mr-1" />
                        View Profile
                      </Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!isLoading && providers.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No professionals found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search terms
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Providers;
