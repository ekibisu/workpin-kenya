import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowLeft, Mail, Lock, User, Loader2, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      setError("");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 items-center justify-center gradient-hero lg:flex bg-primary">
        <div className="max-w-md px-12 text-center text-white">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <MapPin className="h-8 w-8" />
          </div>
          <h2 className="mb-4 text-3xl font-extrabold">Welcome to Workpin</h2>
          <p className="opacity-90">Connect with trusted service professionals across Kenya.</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="mb-8">
            <h1 className="mb-2 text-2xl font-extrabold">Create your account</h1>
            <p className="text-sm text-muted-foreground">Find services or offer your own — one account does it all</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="John Kamau" className="pl-9" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="you@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder="••••••••" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="0712 345 678" className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
            </div>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            <Button className="w-full" size="lg" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
