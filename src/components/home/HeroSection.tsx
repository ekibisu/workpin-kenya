import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img src={heroImage} alt="Professional service provider" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
      </div>

      <div className="container relative z-10 py-20 md:py-32 lg:py-40">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 text-sm font-medium text-primary-foreground backdrop-blur-sm">
              🇰🇪 Kenya's #1 Services Marketplace
            </span>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Find trusted pros
              <br />
              <span className="text-primary-light">for any job.</span>
            </h1>
            <p className="mb-8 max-w-lg text-lg text-primary-foreground/70">
              From plumbing to photography — get free quotes from verified professionals near you. 
              Fast, reliable, and built for Kenyans.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/request">
                <Search className="h-5 w-5" />
                Get Free Quotes
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link to="/auth?tab=signup&role=provider">
                Join as a Pro
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 flex items-center gap-6 text-sm text-primary-foreground/60"
          >
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              2,000+ Verified Pros
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              Free Quotes
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              M-Pesa Payments
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
