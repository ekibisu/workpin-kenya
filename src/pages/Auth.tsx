import { useState } from "react";
import { useSearchParams, Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowLeft, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  if (authLoading) return null;
  
  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password 
      });

      if (authError) throw authError;
      if (!data.user) throw new Error("Authentication failed: No user data.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) console.error("Profile fetch error:", profileError);

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });

      if (profile?.onboarding_complete === false) {
        navigate("/onboarding");
      } else {
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
          },
          emailRedirectTo: globalThis.location.origin,
        },
      });

      if (error) throw error;

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
              {tab === "login" ? "Sign in to continue" : "Find services or offer your own — one account does it all"}
            </p>
          </div>

          <div className="mb-6 flex rounded-xl bg-secondary p-1">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Log in
            </button>
            <a
              href="/register"
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all text-center ${tab === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
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
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    className="pl-9 pr-10"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full" size="lg" type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>

              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setResetEmail(email); }}
                className="w-full text-center text-sm text-primary hover:underline mt-2"
              >
                Forgot password?
              </button>
            </form>
          )}

          {showForgotPassword && (
            <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Reset your password</p>
              <p className="text-xs text-muted-foreground">We'll send a reset link to your email.</p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!resetEmail.trim() || resetLoading}
                  onClick={async () => {
                    setResetLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast({ title: "Check your email", description: "We sent you a password reset link." });
                      setShowForgotPassword(false);
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                >
                  {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForgotPassword(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {tab === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
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
