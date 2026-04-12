import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";

interface Provider {
  id: string;
  owner_id: string;
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
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

const Providers = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    supabase
      .from("businesses")
      .select(`
        id, owner_id, business_name, bio, avg_rating, total_reviews,
        is_verified, categories, location_name, rate_kes, rate_type, username, logo_url,
        profiles:profiles!businesses_owner_id_fkey ( full_name, avatar_url )
      `)
      .eq("is_active", true)
      .order("avg_rating", { ascending: false })
      .then(({ data }) => {
        setProviders((data as unknown as Provider[]) ?? []);
        setLoading(false);
      });
  }, []);

  const locations = useMemo(() => {
    const areas = providers
      .map((p) => p.location_name?.split(",")[0]?.trim())
      .filter(Boolean) as string[];
    return ["All", ...new Set(areas)];
  }, [providers]);

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.business_name.toLowerCase().includes(q) ||
        (p.categories ?? []).some((c) => c.toLowerCase().includes(q));
      const matchesLocation =
        locationFilter === "All" ||
        (p.location_name ?? "").includes(locationFilter);
      const matchesRating = (p.avg_rating ?? 0) >= minRating;
      return matchesSearch && matchesLocation && matchesRating;
    });
  }, [providers, search, locationFilter, minRating]);

  const clearFilters = () => {
    setSearch("");
    setLocationFilter("All");
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
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
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

              {(search || locationFilter !== "All" || minRating !== 0) && (
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
              Showing {filtered.length} professionals
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((provider, i) => {
                const profileData = Array.isArray(provider.profiles)
                  ? provider.profiles[0]
                  : provider.profiles;
                const initials = provider.business_name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const slug = provider.username || provider.id;

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
                          {(provider.logo_url || profileData?.avatar_url) ? (
                            <Image
                              src={(provider.logo_url || profileData?.avatar_url)!}
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
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {profileData?.full_name}
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
                        <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {provider.location_name}
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

          {!loading && filtered.length === 0 && (
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
