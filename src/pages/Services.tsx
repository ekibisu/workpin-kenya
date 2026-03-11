import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import {
  Home, Heart, PartyPopper, Briefcase, Truck,
  Wrench, Scissors, Music, Laptop, Leaf,
  Droplet, Zap, Sparkles, Camera, Paintbrush,
  Dog, HeartPulse, Apple, Hand, UserRound, Smile,
  Star, ShieldCheck, Key,
  Wind, Monitor, Settings, Layout, Layers, Waves,
  Hammer, Activity, Coffee, Calendar, Mic, Flower,
  ShoppingCart, Video, Bug, Trash, BookOpen, Code,
  Image, FileText, DollarSign, Navigation, Map,
  Trees, UtensilsCrossed, Dumbbell, Car, Palette,
  // New icons from DB
  Fan, Settings2, Droplets, PawPrint, Stethoscope, HeartHandshake,
  TreePine, Sun, Sparkle, Receipt, Mic2, Mail, Shield,
  Circle, Square, Speaker, Stamp, Flower2, Tent,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useServicesByArchetype } from "@/hooks/useServices";
import {
  ARCHETYPE_LABELS,
  type Service,
  type ServiceArchetype,
} from "@/integrations/supabase/types";

// ── Icon maps (mirrors ServicePicker) ────────────────────────────────────────

const ICON_KEY_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // Core
  home: Home, wrench: Wrench, zap: Zap, paintbrush: Paintbrush,
  truck: Truck, trees: Trees, camera: Camera, utensils: UtensilsCrossed,
  music: Music, calendar: Calendar, "book-open": BookOpen, dumbbell: Dumbbell,
  car: Car, settings: Settings, "settings-2": Settings2, code: Code, palette: Palette,
  briefcase: Briefcase, laptop: Laptop, leaf: Leaf,
  droplet: Droplet, droplets: Droplets, hammer: Hammer,
  "party-popper": PartyPopper, party: PartyPopper,
  sparkles: Sparkles, sparkle: Sparkle, scissors: Scissors, star: Star,
  dog: Dog, "heart-pulse": HeartPulse, apple: Apple, hand: Hand,
  "user-round": UserRound, smile: Smile, heart: Heart,
  "shield-check": ShieldCheck, shield: Shield, key: Key,
  wind: Wind, fan: Fan, monitor: Monitor, layout: Layout,
  layers: Layers, waves: Waves, activity: Activity,
  // New from DB
  mic: Mic, "mic-2": Mic2, video: Video,
  "flower-2": Flower2, flower: Flower,
  circle: Circle, square: Square, tent: Tent,
  mail: Mail, speaker: Speaker, stamp: Stamp,
  "paw-print": PawPrint, stethoscope: Stethoscope,
  "heart-handshake": HeartHandshake,
  "tree-pine": TreePine, sun: Sun,
  receipt: Receipt, bug: Bug, trash: Trash,
  // Unmapped DB icon strings — reasonable fallbacks
  rings: Heart, gate: Key, drill: Wrench,
  wall: Layers, sofa: Briefcase, grid: Layers,
};

const SERVICE_NAME_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "house cleaning": Home, "plumbing": Droplet, "electrical repair": Zap,
  "painting": Paintbrush, "moving & packing": Truck,
  "hvac repair & installation": Wind, "fan installation": Wind,
  "appliance repair": Monitor, "locksmith services": Key,
  "roofing & gutter repair": Home, "cctv installation": Camera,
  "gate automation & repair": Settings, "window repair": Layout,
  "masonry & tiling": Layers, "waterproofing": Waves,
  "security / usalama": ShieldCheck, "carpentry / useremala": Hammer,
  "personal training": Activity, "beauty / uzuri": Sparkles,
  "mobile massage therapy": Hand, "hair braiding & styling": Scissors,
  "makeup artistry": Star, "dog walking": Dog, "pet grooming": Scissors,
  "veterinary home visits": HeartPulse, "nutrition coaching": Apple,
  "yoga & pilates instruction": Smile, "home care for elderly": UserRound,
  "photography": Camera, "catering": UtensilsCrossed, "dj & music": Music,
  "event planning": Calendar, "mcs & hosts": Mic, "decor & florists": Flower,
  "tent & chair rental": ShoppingCart, "video production": Video,
  "wedding officiant": Heart, "landscaping": Trees,
  "landscaping & mowing": Trees, "car wash": Car, "mechanic": Settings,
  "pest control & fumigation": Bug, "garbage collection": Trash,
  "tutoring": BookOpen, "web development": Code, "graphic design": Palette,
  "legal consultation": FileText, "accounting & tax": DollarSign,
  "driving lessons": Navigation,
};

function resolveIcon(iconKey: string | null, name?: string | null) {
  if (iconKey) {
    const c = ICON_KEY_MAP[iconKey.toLowerCase()];
    if (c) return c;
  }
  if (name) {
    const c = SERVICE_NAME_MAP[name.trim().replace(/\s+/g, " ").toLowerCase()];
    if (c) return c;
  }
  return Briefcase;
}

// ── Archetype section ─────────────────────────────────────────────────────────

const ARCHETYPE_ORDER: ServiceArchetype[] = [
  "home_maintenance",
  "lifestyle_wellness",
  "events_celebrations",
  "professional_business",
  "outdoor_heavy_duty",
];

const ARCHETYPE_ICONS: Record<ServiceArchetype, React.ComponentType<{ className?: string }>> = {
  home_maintenance:      Home,
  lifestyle_wellness:    Heart,
  events_celebrations:   PartyPopper,
  professional_business: Briefcase,
  outdoor_heavy_duty:    Truck,
};

function ArchetypeSection({
  archetype,
  services,
  startIndex,
}: {
  archetype: ServiceArchetype;
  services: Service[];
  startIndex: number;
}) {
  if (services.length === 0) return null;

  const SectionIcon = ARCHETYPE_ICONS[archetype];
  const label = ARCHETYPE_LABELS[archetype];

  return (
    <section>
      {/* Section header — same neutral style as ServicePicker */}
      <div className="mb-3 flex items-center gap-3 rounded-lg border-b border-slate-200 bg-slate-50 px-4 py-3">
        <SectionIcon className="h-4 w-4 text-slate-500" />
        <h2 className="flex-1 text-sm font-semibold text-slate-900">{label}</h2>
        <span className="text-xs text-slate-400">{services.length}</span>
      </div>

      {/* Service tiles */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {services.map((s, i) => {
          const Icon = resolveIcon(s.icon, s.name);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (startIndex + i) * 0.03 }}
            >
              <Link
                to={`/providers?service=${encodeURIComponent(s.name)}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-brand"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {s.name}
                  </span>
                  {s.description ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {s.description}
                    </span>
                  ) : (
                    <span className="block text-xs text-muted-foreground">{label}</span>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {ARCHETYPE_ORDER.map((key) => (
        <div key={key} className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Services = () => {
  const { data: grouped, isLoading } = useServicesByArchetype();
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  let runningIndex = 0;

  const hasNoResults =
    !isLoading &&
    query &&
    ARCHETYPE_ORDER.every(
      (a) => !(grouped?.[a] ?? []).some((s) => s.name.toLowerCase().includes(query))
    );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container py-12">
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-extrabold">All Services</h1>
            <p className="text-muted-foreground">Browse our full catalog of available services</p>
          </div>

          {/* Search bar */}
          <div className="relative mb-8 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-slate-200 pl-9 shadow-sm focus-visible:ring-emerald-500"
            />
          </div>

          {!query ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="mb-4 h-10 w-10 text-slate-300" />
              <p className="text-base font-medium text-slate-600">Search for a service to get started</p>
              <p className="mt-1 text-sm text-slate-400">e.g. "plumbing", "photography", "tutoring"</p>
            </div>
          ) : isLoading ? (
            <LoadingSkeleton />
          ) : hasNoResults ? (
            <p className="py-16 text-center text-sm text-slate-500">
              No services match &ldquo;{search}&rdquo;
            </p>
          ) : (
            <div className="space-y-10">
              {ARCHETYPE_ORDER.map((archetype) => {
                const services = grouped?.[archetype] ?? [];
                const filtered = services.filter((s) => s.name.toLowerCase().includes(query));
                const section = (
                  <ArchetypeSection
                    key={archetype}
                    archetype={archetype}
                    services={filtered}
                    startIndex={runningIndex}
                  />
                );
                runningIndex += filtered.length;
                return section;
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
