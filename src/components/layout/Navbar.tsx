import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, MapPin, LogOut, User, Settings, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/providers", label: "Find Pros" },
  { href: "/how-it-works", label: "How It Works" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileAndRole = async () => {
      if (!user) return;
      // Fetch avatar, name, and role from profiles in a single query
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      setAvatarUrl(profile?.avatar_url ?? null);
      setFullName(profile?.full_name ?? null);
      setUserRole(profile?.role ?? null);
    };
    fetchProfileAndRole();
  }, [user]);

  const isProviderDashboard = location.pathname.startsWith("/provider-dashboard");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
            Work<span className="text-primary">pin</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${location.pathname === link.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
            >
              {link.label}
            </Link>
          ))}
          {/* Dashboard link, only when logged in */}
          {user && (
            <Link
              to="/dashboard"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${location.pathname === "/dashboard"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
            >
              {userRole === "provider" ? "Pro Dashboard" : "Dashboard"}
            </Link>
          )}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                  <Avatar className="h-8 w-8">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Avatar" />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {fullName
                        ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                        : user.email?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    to={userRole === "provider" ? "/profile" : "/client-profile"}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    {userRole === "provider" ? "Professional Profile" : "Client Profile"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={userRole === "provider" ? "/provider-dashboard" : "/dashboard"}
                    className="flex items-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {userRole === "provider" ? "Pro Dashboard" : "Dashboard"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth?tab=signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-card md:hidden"
          >
            <div className="container flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${location.pathname === link.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    {isProviderDashboard ? (
                      <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent">
                        <User className="h-4 w-4" /> Professional Profile
                      </Link>
                    ) : (
                      <Link to="/client-profile" onClick={() => setIsOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent">
                        <User className="h-4 w-4" /> Client Profile
                      </Link>
                    )}
                    <Link to="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link to="/dashboard/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent">
                      <Settings className="h-4 w-4" /> Account Settings
                    </Link>
                    <Button variant="ghost" onClick={() => { handleSignOut(); setIsOpen(false); }} className="justify-start text-destructive hover:text-destructive">
                      <LogOut className="mr-1 h-4 w-4" /> Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>Log in</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/auth?tab=signup" onClick={() => setIsOpen(false)}>Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
