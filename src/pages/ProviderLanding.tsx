import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BadgeCheck,
  Star,
  MapPin,
  Clock,
  MessageCircle,
  CalendarCheck,
  ArrowLeft,
  Briefcase,
  Image as ImageIcon,
} from "lucide-react";
import { motion } from "framer-motion";

interface ProviderData {
  user_id: string;
  business_name: string;
  bio: string | null;
  categories: string[] | null;
  avg_rating: number | null;
  total_reviews: number | null;
  is_verified: boolean | null;
  portfolio_photos: string[] | null;
  location_name: string | null;
  rate_kes: number | null;
  rate_type: string | null;
  response_time_minutes: number | null;
  top_skills: string[] | null;
  username: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Review {
  id: string;
  rating: number | null;
  body: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

const ProviderLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchProvider = async () => {
      // Try username first, then user_id
      let query = supabase
        .from("provider_profiles")
        .select(`
          user_id, business_name, bio, categories, avg_rating, total_reviews,
          is_verified, portfolio_photos, location_name, rate_kes, rate_type,
          response_time_minutes, top_skills, username,
          profiles:profiles!providers_user_id_fkey ( full_name, avatar_url )
        `)
        .eq("username", slug)
        .maybeSingle();

      let { data } = await query as { data: ProviderData | null };

      // Fallback: try as UUID
      if (!data && /^[0-9a-f-]{36}$/i.test(slug)) {
        const res = await supabase
          .from("provider_profiles")
          .select(`
            user_id, business_name, bio, categories, avg_rating, total_reviews,
            is_verified, portfolio_photos, location_name, rate_kes, rate_type,
            response_time_minutes, top_skills, username,
            profiles:profiles!providers_user_id_fkey ( full_name, avatar_url )
          `)
          .eq("user_id", slug)
          .maybeSingle();
        data = res.data as unknown as ProviderData | null;
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProvider(data as ProviderData);

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from("reviews")
        .select("id, rating, body, created_at, profiles:profiles!reviews_customer_id_fkey ( full_name )")
        .eq("provider_id", data.user_id)
        .order("created_at", { ascending: false })
        .limit(10);

      setReviews((reviewData as Review[]) ?? []);
      setLoading(false);

      // SEO
      document.title = `${data.business_name} — WorkPin`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute(
          "content",
          `${data.business_name}${data.location_name ? ` in ${data.location_name}` : ""}. ${data.bio?.slice(0, 120) ?? "Professional services on WorkPin."}`
        );
      }
    };

    fetchProvider();
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (notFound || !provider) return <NotFoundView />;

  const initials = provider.business_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profileData = Array.isArray(provider.profiles) ? provider.profiles[0] : provider.profiles;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-primary/10 via-accent/30 to-background pb-8 pt-12">
          <div className="container">
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 text-muted-foreground"
              onClick={() => navigate("/providers")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> All Professionals
            </Button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6 md:flex-row md:items-start"
            >
              {/* Avatar */}
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-heading text-2xl font-bold shadow-lg">
                {profileData?.avatar_url ? (
                  <img
                    src={profileData.avatar_url}
                    alt={provider.business_name}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-extrabold text-foreground font-heading">
                    {provider.business_name}
                  </h1>
                  {provider.is_verified && (
                    <BadgeCheck className="h-6 w-6 text-primary" />
                  )}
                </div>

                {profileData?.full_name && (
                  <p className="text-muted-foreground">
                    {profileData.full_name}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {provider.location_name && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {provider.location_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="h-4 w-4 fill-current" />
                    {(provider.avg_rating ?? 0).toFixed(1)}
                    <span className="text-muted-foreground">
                      ({provider.total_reviews ?? 0} reviews)
                    </span>
                  </span>
                  {provider.response_time_minutes && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" /> Responds in ~
                      {provider.response_time_minutes < 60
                        ? `${provider.response_time_minutes}min`
                        : `${Math.round(provider.response_time_minutes / 60)}hr`}
                    </span>
                  )}
                </div>

                {provider.rate_kes && (
                  <p className="text-lg font-bold text-foreground">
                    KES {provider.rate_kes.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {provider.rate_type === "hourly" ? "hour" : "job"}
                    </span>
                  </p>
                )}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col gap-2 md:min-w-[200px]">
                <Button size="lg" asChild>
                  <Link to={`/request?provider=${provider.user_id}`}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Request a Quote
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to={`/request?provider=${provider.user_id}`}>
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    Book Now
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="container py-10 space-y-10">
          {/* Bio */}
          {provider.bio && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="mb-3 text-xl font-bold font-heading">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {provider.bio}
              </p>
            </motion.section>
          )}

          {/* Services */}
          {provider.categories && provider.categories.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="mb-3 text-xl font-bold font-heading flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> Services
              </h2>
              <div className="flex flex-wrap gap-2">
                {provider.categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </motion.section>
          )}

          {/* Top Skills */}
          {provider.top_skills && provider.top_skills.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-bold font-heading">
                Top Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {provider.top_skills.map((skill) => (
                  <Badge key={skill} className="bg-primary/10 text-primary hover:bg-primary/20 border-0 px-3 py-1">
                    {skill}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Portfolio */}
          {provider.portfolio_photos &&
            provider.portfolio_photos.length > 0 && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="mb-3 text-xl font-bold font-heading flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" /> Portfolio
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {provider.portfolio_photos.map((url, i) => (
                    <div
                      key={i}
                      className="aspect-square overflow-hidden rounded-xl border border-border"
                    >
                      <img
                        src={url}
                        alt={`${provider.business_name} work sample ${i + 1}`}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

          <Separator />

          {/* Reviews */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="mb-4 text-xl font-bold font-heading flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" /> Reviews
              {(provider.total_reviews ?? 0) > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({provider.total_reviews})
                </span>
              )}
            </h2>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const reviewProfile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
                  return (
                    <div
                      key={review.id}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {reviewProfile?.full_name ?? "Anonymous"}
                        </span>
                        <div className="flex items-center gap-1 text-warning">
                          {Array.from({ length: review.rating ?? 0 }).map(
                            (_, i) => (
                              <Star
                                key={i}
                                className="h-3.5 w-3.5 fill-current"
                              />
                            )
                          )}
                        </div>
                      </div>
                      {review.body && (
                        <p className="text-sm text-muted-foreground">
                          {review.body}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground/60">
                        {new Date(review.created_at).toLocaleDateString(
                          "en-KE",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No reviews yet.</p>
            )}
          </motion.section>

          {/* Bottom CTA */}
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-accent/50 p-8 text-center">
            <h3 className="text-lg font-bold font-heading">
              Ready to work with {provider.business_name}?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Get a free quote or book directly. Most providers respond within{" "}
              {provider.response_time_minutes
                ? provider.response_time_minutes < 60
                  ? `${provider.response_time_minutes} minutes`
                  : `${Math.round(provider.response_time_minutes / 60)} hours`
                : "an hour"}
              .
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link to={`/request?provider=${provider.user_id}`}>
                  Request a Quote
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/providers">Browse More Pros</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: provider.business_name,
              description: provider.bio ?? undefined,
              address: provider.location_name
                ? { "@type": "PostalAddress", addressLocality: provider.location_name }
                : undefined,
              aggregateRating:
                (provider.total_reviews ?? 0) > 0
                  ? {
                      "@type": "AggregateRating",
                      ratingValue: provider.avg_rating,
                      reviewCount: provider.total_reviews,
                    }
                  : undefined,
            }),
          }}
        />
      </main>
      <Footer />
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1 container py-12 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-6">
        <Skeleton className="h-24 w-24 rounded-2xl" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </main>
    <Footer />
  </div>
);

const NotFoundView = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Professional not found</h1>
        <p className="text-muted-foreground">
          This profile may have been removed or the URL is incorrect.
        </p>
        <Button asChild>
          <Link to="/providers">Browse Professionals</Link>
        </Button>
      </div>
    </main>
    <Footer />
  </div>
);

export default ProviderLanding;
