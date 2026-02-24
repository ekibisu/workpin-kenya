import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Search,
  Star,
  MapPin,
  BadgeCheck,
  MessageCircle,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const mockProviders = [
  {
    id: 1,
    name: "James Mwangi",
    business: "Mwangi Plumbing",
    rating: 4.8,
    reviews: 47,
    location: "Westlands, Nairobi",
    verified: true,
    services: ["Plumbing", "Pipe Repair"],
    avatar: "JM",
  },
  {
    id: 2,
    name: "Grace Wanjiku",
    business: "Grace Events",
    rating: 4.9,
    reviews: 112,
    location: "Karen, Nairobi",
    verified: true,
    services: ["Event Planning", "Catering"],
    avatar: "GW",
  },
  {
    id: 3,
    name: "Peter Otieno",
    business: "Spark Electric",
    rating: 4.6,
    reviews: 34,
    location: "Kilimani, Nairobi",
    verified: false,
    services: ["Electrical Repair", "Wiring"],
    avatar: "PO",
  },
  {
    id: 4,
    name: "Faith Njeri",
    business: "Clean Spaces",
    rating: 4.7,
    reviews: 89,
    location: "Lavington, Nairobi",
    verified: true,
    services: ["House Cleaning"],
    avatar: "FN",
  },
  {
    id: 5,
    name: "David Kipchoge",
    business: "DK Photography",
    rating: 5.0,
    reviews: 63,
    location: "CBD, Nairobi",
    verified: true,
    services: ["Photography", "Videography"],
    avatar: "DK",
  },
  {
    id: 6,
    name: "Amina Hassan",
    business: "TechAmina",
    rating: 4.5,
    reviews: 21,
    location: "Mombasa Road",
    verified: false,
    services: ["Web Development", "Graphic Design"],
    avatar: "AH",
  },
];

const Providers = () => {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [minRating, setMinRating] = useState(0);

  // Derived unique locations for the dropdown
  const locations = [
    "All",
    ...new Set(mockProviders.map((p) => p.location.split(",")[0])),
  ];
  const filtered = useMemo(() => {
    return mockProviders.filter((p) => {
      const matchesSearch =
        p.business.toLowerCase().includes(search.toLowerCase()) ||
        p.services.some((s) => s.toLowerCase().includes(search.toLowerCase()));

      const matchesLocation =
        locationFilter === "All" || p.location.includes(locationFilter);
      const matchesRating = p.rating >= minRating;

      return matchesSearch && matchesLocation && matchesRating;
    });
  }, [search, locationFilter, minRating]);

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
              {/* Location Dropdown */}
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

              {/* Rating Dropdown */}
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((provider, i) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-brand"
              >
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-light font-heading text-sm font-bold text-primary-dark">
                    {provider.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate font-heading text-base font-bold text-foreground">
                        {provider.business}
                      </h3>
                      {provider.verified && (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {provider.name}
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {provider.rating}
                  </span>
                  <span className="text-muted-foreground">
                    ({provider.reviews} reviews)
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {provider.location}
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {provider.services.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <MessageCircle className="h-4 w-4" />
                  Request Quote
                </Button>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
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
