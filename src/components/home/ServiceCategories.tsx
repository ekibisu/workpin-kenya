import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Wrench, Zap, Paintbrush, Truck, Trees, Camera, UtensilsCrossed,
  Music, Calendar, BookOpen, Dumbbell, Car, Settings, Code, Palette,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home, wrench: Wrench, zap: Zap, paintbrush: Paintbrush,
  truck: Truck, trees: Trees, camera: Camera, utensils: UtensilsCrossed,
  music: Music, calendar: Calendar, "book-open": BookOpen, dumbbell: Dumbbell,
  car: Car, settings: Settings, code: Code, palette: Palette,
};

const categories = [
  { name: "Home Services", icon: "home", services: ["Cleaning", "Plumbing", "Electrical", "Painting"], color: "bg-primary-light text-primary-dark" },
  { name: "Events", icon: "camera", services: ["Photography", "Catering", "DJ", "Planning"], color: "bg-accent text-accent-foreground" },
  { name: "Moving", icon: "truck", services: ["Packing", "Transport", "Setup"], color: "bg-surface-warm text-foreground" },
  { name: "Education", icon: "book-open", services: ["Tutoring", "Coaching"], color: "bg-primary-light text-primary-dark" },
  { name: "Auto", icon: "car", services: ["Car Wash", "Mechanic"], color: "bg-accent text-accent-foreground" },
  { name: "Tech", icon: "code", services: ["Web Dev", "Design"], color: "bg-surface-warm text-foreground" },
];

const ServiceCategories = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-extrabold md:text-4xl">
            What do you need <span className="text-gradient">done?</span>
          </h2>
          <p className="mx-auto max-w-md text-muted-foreground">
            Browse popular categories or tell us what you need — we'll match you with the best pros.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon] || Home;
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/services?category=${cat.name}`}
                  className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-brand"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {cat.services.join(" · ")}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;
