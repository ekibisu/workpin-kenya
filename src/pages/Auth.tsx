import { useState } from "react";
import { useSearchParams, Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowLeft, Mail, Lock, User, Loader2, Search, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"client" | "provider">(
    searchParams.get("role") === "provider" ? "provider" : "client"
  );

  if (authLoading) return null;
  
  // Already authenticated — redirect based on role
  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sanitize email to prevent trailing space errors
      const cleanEmail = email.trim();
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password 
      });

      if (authError) throw authError;

      if (!data.user) throw new Error("Authentication failed: No user data.");

      // 2. Fetch role and onboarding_complete from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, onboarding_complete")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) console.error("Profile fetch error:", profileError);

      // 3. Success Notification
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });

      // 4. Routing Logic: If onboarding not complete, go to /onboarding
      if (profile?.onboarding_complete === false) {
        navigate("/onboarding");
      } else if (profile?.role === "provider") {
        navigate("/provider-dashboard");
      } else if (profile?.role === "client") {
        navigate("/dashboard");
      } else {
        // fallback: go to dashboard
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Login Error:", error.message);
      
      let friendlyMessage = error.message;
      if (friendlyMessage.includes("Invalid login credentials")) {
        friendlyMessage = "Invalid email or password. Please try again.";
      }

      toast({ 
        title: "Login failed", 
        description: friendlyMessage, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { 
            full_name: fullName, 
            role: role 
          },
          emailRedirectTo: globalThis.location.origin,
        },
      });

      if (error) throw error;

      // Insert provider role in user_roles if registering as provider
      if (role === "provider" && data?.user?.id) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{ user_id: data.user.id, role: "provider" }]);
        if (roleError) throw roleError;
      }

      toast({ 
        title: "Check your email", 
        description: "We sent you a confirmation link to verify your account." 
      });
    } catch (error: any) {
      toast({ 
        title: "Signup failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 items-center justify-center gradient-hero lg:flex">
        <div className="max-w-md px-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
            <MapPin className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="mb-4 text-3xl font-extrabold text-primary-foreground">
            Welcome to Workpin
          </h2>
          <p className="text-primary-foreground/70">
            Connect with trusted service professionals across Kenya. Get free quotes, compare, and hire — all in one place.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mb-8">
            <h1 className="mb-2 text-2xl font-extrabold text-foreground">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tab === "login" ? "Sign in to continue" : "Start finding or offering services"}
            </p>
          </div>

          <div className="mb-6 flex rounded-xl bg-secondary p-1">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
            >
              Log in
            </button>
            <a
              href="/register"
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
            >
              Sign up
            </a>
          </div>

          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          )}

          {tab === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("client")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${role === "client"
                      ? "border-primary bg-primary/5 text-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                  >
                    <Search className="h-5 w-5" />
                    <span className="text-sm font-semibold">Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("provider")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${role === "provider"
                      ? "border-primary bg-primary/5 text-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                  >
                    <Briefcase className="h-5 w-5" />
                    <span className="text-sm font-semibold">Provider</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="fullName" placeholder="John Kamau" className="pl-9" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signupEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="signupEmail" type="email" placeholder="you@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signupPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="signupPassword" type="password" placeholder="Create a strong password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to Workpin's{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;