import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import {
  Home, Wrench, Zap, Paintbrush, Truck, Trees, Camera, UtensilsCrossed,
  Music, Calendar, BookOpen, Dumbbell, Car, Settings, Code, Palette,
} from "lucide-react";
import { Link } from "react-router-dom";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home, wrench: Wrench, zap: Zap, paintbrush: Paintbrush,
  truck: Truck, trees: Trees, camera: Camera, utensils: UtensilsCrossed,
  music: Music, calendar: Calendar, "book-open": BookOpen, dumbbell: Dumbbell,
  car: Car, settings: Settings, code: Code, palette: Palette,
};

const services = [
  { name: "House Cleaning", icon: "home", category: "Home" },
  { name: "Plumbing", icon: "wrench", category: "Home" },
  { name: "Electrical Repair", icon: "zap", category: "Home" },
  { name: "Painting", icon: "paintbrush", category: "Home" },
  { name: "Moving & Packing", icon: "truck", category: "Home" },
  { name: "Landscaping", icon: "trees", category: "Outdoor" },
  { name: "Photography", icon: "camera", category: "Events" },
  { name: "Catering", icon: "utensils", category: "Events" },
  { name: "DJ & Music", icon: "music", category: "Events" },
  { name: "Event Planning", icon: "calendar", category: "Events" },
  { name: "Tutoring", icon: "book-open", category: "Education" },
  { name: "Personal Training", icon: "dumbbell", category: "Health" },
  { name: "Car Wash", icon: "car", category: "Auto" },
  { name: "Mechanic", icon: "settings", category: "Auto" },
  { name: "Web Development", icon: "code", category: "Tech" },
  { name: "Graphic Design", icon: "palette", category: "Tech" },
];

const Services = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1 bg-background">
      <div className="container py-12">
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-extrabold">All Services</h1>
          <p className="text-muted-foreground">Browse our full catalog of available services</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {services.map((s, i) => {
            const Icon = iconMap[s.icon] || Home;
            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={`/request?service=${encodeURIComponent(s.name)}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-brand"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">{s.category}</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Services;
