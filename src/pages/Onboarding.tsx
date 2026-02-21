import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [mpesa, setMpesa] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
        setFetching(false);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Basic M-Pesa format validation: 07XX XXX XXX (10 digits starting with 07)
    const digits = mpesa.replace(/\s/g, "");
    if (!/^07\d{8}$/.test(digits)) {
      toast({
        title: "Invalid phone number",
        description: "Enter a valid M-Pesa number, e.g. 0712 345 678",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Upsert client_profiles
      const { error: profileError } = await supabase
        .from("client_profiles")
        .upsert(
          { user_id: user.id, location_name: location.trim(), mpesa_phone: digits },
          { onConflict: "user_id" }
        );
      if (profileError) throw profileError;

      // 2. Update profiles: full_name + onboarding_complete
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), onboarding_complete: true })
        .eq("id", user.id);
      if (updateError) throw updateError;

      toast({ title: "Profile saved!", description: "Welcome to Workpin." });
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Complete your profile</h1>
          <p className="text-muted-foreground text-sm">
            Just a few details to get you started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kilimani, Nairobi"
              required
            />
          </div>

          {/* M-Pesa phone */}
          <div className="space-y-1.5">
            <Label htmlFor="mpesa">M-Pesa phone number</Label>
            <div className="flex">
              <span className="inline-flex items-center gap-1.5 rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                🇰🇪 +254
              </span>
              <Input
                id="mpesa"
                className="rounded-l-none"
                value={mpesa}
                onChange={(e) => setMpesa(e.target.value)}
                placeholder="07XX XXX XXX"
                inputMode="numeric"
                maxLength={12}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">Format: 07XX XXX XXX</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save & continue"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
