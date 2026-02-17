import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <MapPin className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-extrabold">
              Work<span className="text-primary">pin</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Kenya's trusted marketplace connecting you with skilled service professionals.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">For Customers</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/services" className="hover:text-primary transition-colors">Browse Services</Link>
            <Link to="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
            <Link to="/request" className="hover:text-primary transition-colors">Post a Request</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">For Professionals</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/auth?tab=signup&role=provider" className="hover:text-primary transition-colors">Join as Pro</Link>
            <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Workpin. All rights reserved. Built for Kenya 🇰🇪
      </div>
    </div>
  </footer>
);

export default Footer;
