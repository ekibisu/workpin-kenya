import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowLeft, Phone, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone");

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

          {/* Tab switch */}
          <div className="mb-6 flex rounded-xl bg-secondary p-1">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                tab === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                tab === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          {tab === "login" && (
            <div className="space-y-4">
              {/* Method toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setLoginMethod("phone")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                    loginMethod === "phone" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <Phone className="h-4 w-4" /> Phone
                </button>
                <button
                  onClick={() => setLoginMethod("email")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                    loginMethod === "email" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
              </div>

              {loginMethod === "phone" ? (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex h-10 items-center rounded-lg border border-input bg-secondary px-3 text-sm text-muted-foreground">
                      +254
                    </div>
                    <Input id="phone" placeholder="712 345 678" className="flex-1" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="••••••••" />
                  </div>
                </>
              )}

              <Button className="w-full" size="lg">
                {loginMethod === "phone" ? "Send OTP" : "Sign in"}
              </Button>
            </div>
          )}

          {tab === "signup" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="fullName" placeholder="John Kamau" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signupPhone">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="flex h-10 items-center rounded-lg border border-input bg-secondary px-3 text-sm text-muted-foreground">
                    +254
                  </div>
                  <Input id="signupPhone" placeholder="712 345 678" className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signupEmail">Email</Label>
                <Input id="signupEmail" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signupPassword">Password</Label>
                <Input id="signupPassword" type="password" placeholder="Create a strong password" />
              </div>
              <Button className="w-full" size="lg">
                Create Account
              </Button>
            </div>
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
