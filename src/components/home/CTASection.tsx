import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CTASection = () => (
  <section className="relative overflow-hidden gradient-hero py-16 md:py-24">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(155_80%_30%/0.3),transparent_60%)]" />
    <div className="container relative z-10 text-center">
      <h2 className="mb-4 text-3xl font-extrabold text-primary-foreground md:text-4xl">
        Ready to get started?
      </h2>
      <p className="mx-auto mb-8 max-w-md text-primary-foreground/70">
        Join thousands of Kenyans who trust Workpin to find reliable service professionals.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          size="xl"
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg"
          asChild
        >
          <Link to="/register">
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          asChild
        >
          <Link to="/register">Become a Pro</Link>
        </Button>
      </div>
    </div>
  </section>
);

export default CTASection;
