import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "@/components/ui/Image";
import {
  BadgeCheck, Star, MapPin, Clock, MessageCircle, CalendarCheck,
  ArrowLeft, Briefcase, Image as ImageIcon, Globe, Phone, Award,
  Languages, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface ProviderData {
  id: string;
  owner_id: string;
  business_name: string;
  bio: string | null;
  tagline: string | null;
  hero_image_url: string | null;
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
  years_experience: number | null;
  certifications: string[] | null;
  languages: string[] | null;
  website_url: string | null;
  whatsapp_phone: string | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

interface BusinessService {
  id: string;
  custom_name: string;
  description: string | null;
  price_kes: number | null;
  price_type: string | null;
  duration_estimate: string | null;
}

interface GalleryItem {
  id: string;
  media_url: string;
  caption: string | null;
  alt_text: string | null;
  category: string | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
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
  const [bizServices, setBizServices] = useState<BusinessService[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchProvider = async () => {
      const selectFields = `
        id, owner_id, business_name, bio, tagline, hero_image_url, categories,
        avg_rating, total_reviews, is_verified, portfolio_photos, location_name,
        rate_kes, rate_type, response_time_minutes, top_skills, username,
        years_experience, certifications, languages, website_url, whatsapp_phone,
        profiles:profiles!businesses_owner_id_fkey ( full_name, avatar_url )
      `;

      let { data } = await supabase
        .from("businesses")
        .select(selectFields)
        .eq("username", slug)
        .maybeSingle() as { data: ProviderData | null };

      if (!data && /^[0-9a-f-]{36}$/i.test(slug)) {
        const res = await supabase.from("businesses").select(selectFields).eq("id", slug).maybeSingle();
        data = res.data as unknown as ProviderData | null;
      }

      if (!data) { setNotFound(true); setLoading(false); return; }
      setProvider(data);

      // Fetch related data in parallel
      const [{ data: svcData }, { data: galData }, { data: faqData }, { data: reviewData }] = await Promise.all([
        supabase.from("business_services").select("id, custom_name, description, price_kes, price_type, duration_estimate").eq("business_id", data.id).eq("is_active", true).order("sort_order"),
        supabase.from("business_gallery").select("id, media_url, caption, alt_text, category").eq("business_id", data.id).order("sort_order"),
        supabase.from("business_faqs").select("id, question, answer").eq("business_id", data.id).order("sort_order"),
        supabase.from("reviews").select("id, rating, body, created_at, profiles:profiles!reviews_customer_id_fkey ( full_name )").eq("provider_id", data.id).order("created_at", { ascending: false }).limit(10),
      ]);

      setBizServices((svcData as BusinessService[]) ?? []);
      setGalleryItems((galData as GalleryItem[]) ?? []);
      setFaqs((faqData as FAQ[]) ?? []);
      setReviews((reviewData as Review[]) ?? []);
      setLoading(false);

      // SEO meta
      document.title = `${data.business_name}${data.tagline ? ` — ${data.tagline}` : ""} | WorkPin`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute("content",
          `${data.business_name}${data.location_name ? ` in ${data.location_name}` : ""}. ${data.bio?.slice(0, 120) ?? "Professional services on WorkPin."}`
        );
      }
    };

    fetchProvider();
  }, [slug]);

  if (loading) return <LoadingSkeleton />;
  if (notFound || !provider) return <NotFoundView />;

  const profileData = Array.isArray(provider.profiles) ? provider.profiles[0] : provider.profiles;
  const initials = provider.business_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  // Gallery categories
  const galleryCategories = [...new Set(galleryItems.map(g => g.category).filter(Boolean))] as string[];
  const filteredGallery = selectedGalleryCategory
    ? galleryItems.filter(g => g.category === selectedGalleryCategory)
    : galleryItems;

  // Rating breakdown
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: reviews.filter(rev => rev.rating === r).length,
  }));

  const priceLabel = (svc: BusinessService) => {
    if (!svc.price_kes) return svc.price_type === "quote" ? "Get Quote" : null;
    const prefix = svc.price_type === "starting_at" ? "From " : svc.price_type === "hourly" ? "" : "";
    const suffix = svc.price_type === "hourly" ? "/hr" : "";
    return `${prefix}KES ${svc.price_kes.toLocaleString()}${suffix}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {provider.hero_image_url ? (
            <div className="relative h-64 sm:h-80 md:h-96">
              <Image
                src={provider.hero_image_url}
                alt={`${provider.business_name} cover`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>
          ) : (
            <div className="relative h-48 sm:h-56 overflow-hidden">
              <div className="absolute inset-0 gradient-hero opacity-90" />
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(0 0% 100% / 0.08) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>
          )}

          <div className={`container ${provider.hero_image_url ? "-mt-24 relative z-10" : "pt-8"} pb-8`}>
            <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground" onClick={() => navigate("/providers")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> All Professionals
            </Button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6 md:flex-row md:items-end"
            >
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-heading text-3xl font-bold shadow-xl ring-4 ring-background drop-shadow-lg">
                {profileData?.avatar_url ? (
                  <Image src={profileData.avatar_url} alt={provider.business_name} className="h-full w-full rounded-2xl object-cover" />
                ) : initials}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-extrabold text-foreground font-heading">{provider.business_name}</h1>
                  {provider.is_verified && <BadgeCheck className="h-6 w-6 text-primary" />}
                </div>
                {provider.tagline && <p className="text-lg text-muted-foreground">{provider.tagline}</p>}

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {provider.location_name && (
                    <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {provider.location_name}</span>
                  )}
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="h-4 w-4 fill-current" /> {(provider.avg_rating ?? 0).toFixed(1)}
                    <span className="text-muted-foreground">({provider.total_reviews ?? 0} reviews)</span>
                  </span>
                  {provider.response_time_minutes && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" /> Responds in ~{provider.response_time_minutes < 60 ? `${provider.response_time_minutes}min` : `${Math.round(provider.response_time_minutes / 60)}hr`}
                    </span>
                  )}
                  {provider.years_experience && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Award className="h-4 w-4" /> {provider.years_experience}+ years
                    </span>
                  )}
                </div>

                {provider.rate_kes && (
                  <p className="text-lg font-bold text-foreground">
                    KES {provider.rate_kes.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-muted-foreground">/ {provider.rate_type === "hourly" ? "hour" : "job"}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 md:min-w-[220px]">
                <Button size="lg" className="rounded-full shadow-button-raised px-8" asChild>
                  <Link to={`/request?provider=${provider.id}`}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Request a Quote
                  </Link>
                </Button>
                {provider.whatsapp_phone && (
                  <Button variant="outline" size="lg" className="rounded-full shadow-sm hover:shadow-md transition-shadow" asChild>
                    <a href={`https://wa.me/254${provider.whatsapp_phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer">
                      <Phone className="mr-2 h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        <div className="container py-10 space-y-10">
          {/* About */}
          {provider.bio && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <h2 className="mb-3 text-xl font-bold font-heading">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{provider.bio}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {provider.certifications && provider.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {provider.certifications.map((cert, i) => (
                      <Badge key={i} className="bg-primary/10 text-primary border-0"><Award className="mr-1 h-3 w-3" />{cert}</Badge>
                    ))}
                  </div>
                )}
                {provider.languages && provider.languages.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Languages className="h-4 w-4" /> {provider.languages.join(", ")}
                  </div>
                )}
                {provider.website_url && (
                  <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
            </motion.section>
          )}

          {/* Services */}
          {bizServices.length > 0 && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
              <h2 className="mb-4 text-xl font-bold font-heading flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> Services
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {bizServices.map(svc => (
                  <div key={svc.id} className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-4 space-y-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground">{svc.custom_name}</h3>
                      {priceLabel(svc) && (
                        <span className="text-sm font-bold text-primary whitespace-nowrap">{priceLabel(svc)}</span>
                      )}
                    </div>
                    {svc.description && <p className="text-sm text-muted-foreground line-clamp-2">{svc.description}</p>}
                    <div className="flex items-center justify-between">
                      {svc.duration_estimate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{svc.duration_estimate}</span>}
                      <Button size="sm" variant="ghost" className="text-primary" asChild>
                        <Link to={`/request?provider=${provider.id}`}>Request <ChevronRight className="ml-1 h-3 w-3" /></Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Legacy categories (fallback if no business_services) */}
          {bizServices.length === 0 && provider.categories && provider.categories.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-bold font-heading flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> Services
              </h2>
              <div className="flex flex-wrap gap-2">
                {provider.categories.map(cat => (
                  <Badge key={cat} variant="secondary" className="px-3 py-1.5 text-sm">{cat}</Badge>
                ))}
              </div>
            </section>
          )}

          {/* Top Skills */}
          {provider.top_skills && provider.top_skills.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-bold font-heading">Top Skills</h2>
              <div className="flex flex-wrap gap-2">
                {provider.top_skills.map(skill => (
                  <Badge key={skill} className="bg-primary/10 text-primary hover:bg-primary/20 border-0 px-3 py-1">{skill}</Badge>
                ))}
              </div>
            </section>
          )}

          {/* Gallery */}
          {(galleryItems.length > 0 || (provider.portfolio_photos && provider.portfolio_photos.length > 0)) ? (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <h2 className="mb-3 text-xl font-bold font-heading flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" /> Portfolio
              </h2>

              {galleryItems.length > 0 ? (
                <>
                  {galleryCategories.length > 1 && (
                    <div className="mb-3 flex gap-2">
                      <button
                        onClick={() => setSelectedGalleryCategory(null)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${!selectedGalleryCategory ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                      >All</button>
                      {galleryCategories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedGalleryCategory(cat)}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selectedGalleryCategory === cat ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                        >{cat}</button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {filteredGallery.map((item, i) => (
                      <button
                        key={item.id}
                        onClick={() => setLightboxIndex(i)}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-border"
                      >
                        <Image
                          src={item.media_url}
                          alt={item.alt_text || `${provider.business_name} work ${i + 1}`}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        {item.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-xs text-white font-medium truncate">{item.caption}</p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {provider.portfolio_photos!.map((url, i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-xl border border-border">
                      <Image src={url} alt={`${provider.business_name} work sample ${i + 1}`} className="h-full w-full object-cover transition-transform hover:scale-105" />
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          ) : (
            <section>
              <h2 className="mb-3 text-xl font-bold font-heading flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" /> Portfolio
              </h2>
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No portfolio photos yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Check back later for work samples</p>
              </div>
            </section>
          )}

          {/* Lightbox */}
          {lightboxIndex !== null && filteredGallery[lightboxIndex] && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightboxIndex(null)}>
              <div className="relative max-h-[90vh] max-w-4xl" onClick={e => e.stopPropagation()}>
                <Image
                  src={filteredGallery[lightboxIndex].media_url}
                  alt={filteredGallery[lightboxIndex].alt_text || "Gallery image"}
                  className="max-h-[85vh] rounded-xl object-contain"
                />
                {filteredGallery[lightboxIndex].caption && (
                  <p className="mt-2 text-center text-sm text-white">{filteredGallery[lightboxIndex].caption}</p>
                )}
                <button onClick={() => setLightboxIndex(null)} className="absolute -top-3 -right-3 rounded-full bg-background p-2 text-foreground shadow-lg">✕</button>
              </div>
            </div>
          )}

          {/* FAQs */}
          {faqs.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-bold font-heading">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map(faq => (
                  <AccordionItem key={faq.id} value={faq.id} className="rounded-xl border border-border bg-card px-4">
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          <Separator />

          {/* Reviews */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <h2 className="mb-4 text-xl font-bold font-heading flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" /> Reviews
              {(provider.total_reviews ?? 0) > 0 && <span className="text-sm font-normal text-muted-foreground">({provider.total_reviews})</span>}
            </h2>

            {/* Rating breakdown */}
            {reviews.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {ratingCounts.map(({ stars, count }) => (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground">{stars} star{stars !== 1 && "s"}</span>
                    <Progress value={reviews.length ? (count / reviews.length) * 100 : 0} className="h-2 flex-1" />
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => {
                  const rp = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
                  return (
                    <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-foreground">{rp?.full_name ?? "Anonymous"}</span>
                        <div className="flex items-center gap-0.5 text-warning">
                          {Array.from({ length: review.rating ?? 0 }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                      </div>
                      {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
                      <p className="mt-2 text-xs text-muted-foreground/60">
                        {new Date(review.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-10 text-center">
                <Star className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No reviews yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Be the first to leave a review</p>
              </div>
            )}
          </motion.section>

          {/* Bottom CTA */}
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary/5 border border-primary/10 p-10 text-center">
            <h3 className="text-xl font-bold font-heading">Ready to work with {provider.business_name}?</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Get a free quote or book directly. Most providers respond within{" "}
              {provider.response_time_minutes
                ? provider.response_time_minutes < 60 ? `${provider.response_time_minutes} minutes` : `${Math.round(provider.response_time_minutes / 60)} hours`
                : "an hour"}.
            </p>
            <div className="flex gap-3">
              <Button className="rounded-full shadow-button-raised px-8" asChild><Link to={`/request?provider=${provider.id}`}>Request a Quote</Link></Button>
              <Button variant="outline" className="rounded-full" asChild><Link to="/providers">Browse More Pros</Link></Button>
            </div>
          </div>
        </div>

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: provider.business_name,
            description: provider.bio ?? undefined,
            slogan: provider.tagline ?? undefined,
            image: provider.hero_image_url ?? undefined,
            url: `https://workpin-kenya-connect.lovable.app/pro/${provider.username || provider.id}`,
            address: provider.location_name ? { "@type": "PostalAddress", addressLocality: provider.location_name } : undefined,
            aggregateRating: (provider.total_reviews ?? 0) > 0 ? {
              "@type": "AggregateRating",
              ratingValue: provider.avg_rating,
              reviewCount: provider.total_reviews,
            } : undefined,
            ...(bizServices.length > 0 ? {
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Services",
                itemListElement: bizServices.map(s => ({
                  "@type": "Offer",
                  itemOffered: { "@type": "Service", name: s.custom_name, description: s.description },
                  ...(s.price_kes ? { price: s.price_kes, priceCurrency: "KES" } : {}),
                })),
              },
            } : {}),
            ...(faqs.length > 0 ? {} : {}),
          }),
        }} />
        {faqs.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map(f => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            }),
          }} />
        )}
      </main>
      <Footer />
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1 container py-12 space-y-6">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="flex gap-6">
        <Skeleton className="h-24 w-24 rounded-2xl" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
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
        <p className="text-muted-foreground">This profile may have been removed or the URL is incorrect.</p>
        <Button asChild><Link to="/providers">Browse Professionals</Link></Button>
      </div>
    </main>
    <Footer />
  </div>
);

export default ProviderLanding;
