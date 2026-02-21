import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Loader2, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ─── Shared loading screen ───────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

// ─── Client onboarding form ───────────────────────────────────────────────────
const ClientForm = ({ userId, initialName }: { userId: string; initialName: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(initialName);
  const [location, setLocation] = useState("");
  const [mpesa, setMpesa] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const { error: cpError } = await supabase
        .from("client_profiles")
        .upsert(
          { user_id: userId, location_name: location.trim(), mpesa_phone: digits },
          { onConflict: "user_id" }
        );
      if (cpError) throw cpError;

      const { error: pError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), onboarding_complete: true })
        .eq("id", userId);
      if (pError) throw pError;

      toast({ title: "Profile saved!", description: "Welcome to Workpin." });
      navigate("/dashboard");
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Complete your profile</h1>
          <p className="text-muted-foreground text-sm">Just a few details to get you started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save & continue"}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ─── Provider onboarding form ─────────────────────────────────────────────────
type Service = { id: string; name: string; category: string };

const ProviderForm = ({ userId, initialName }: { userId: string; initialName: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(initialName);
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [radius, setRadius] = useState(10);
  const [rate, setRate] = useState("");
  const [rateType, setRateType] = useState<"hourly" | "per_job">("hourly");
  const [mpesa, setMpesa] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    supabase
      .from("services")
      .select("id, name, category")
      .order("category")
      .order("name")
      .then(({ data }) => {
        setServices(data ?? []);
        setLoadingServices(false);
      });
  }, []);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  // Group services by category for display
  const grouped = services.reduce<Record<string, Service[]>>((acc, svc) => {
    (acc[svc.category] = acc[svc.category] ?? []).push(svc);
    return acc;
  }, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCategories.length === 0) {
      toast({ title: "Select at least one service category", variant: "destructive" });
      return;
    }

    const digits = mpesa.replace(/\s/g, "");
    if (!/^07\d{8}$/.test(digits)) {
      toast({
        title: "Invalid phone number",
        description: "Enter a valid M-Pesa number, e.g. 0712 345 678",
        variant: "destructive",
      });
      return;
    }

    const rateNum = Number(rate);
    if (!rate || isNaN(rateNum) || rateNum <= 0) {
      toast({ title: "Enter a valid starting rate", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error: ppError } = await supabase
        .from("provider_profiles")
        .upsert(
          {
            user_id: userId,
            business_name: businessName.trim(),
            bio: bio.trim() || null,
            categories: selectedCategories,
            service_radius_km: radius,
            rate_kes: rateNum,
            rate_type: rateType,
            mpesa_phone: digits,
          },
          { onConflict: "user_id" }
        );
      if (ppError) throw ppError;

      const { error: pError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), onboarding_complete: true })
        .eq("id", userId);
      if (pError) throw pError;

      toast({ title: "Profile saved!", description: "Welcome to Workpin." });
      navigate("/provider-dashboard");
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Set up your provider profile</h1>
          <p className="text-muted-foreground text-sm">Tell clients who you are and what you do</p>
        </div>

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

          {/* Business name */}
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Juma Electricals"
              required
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <Label htmlFor="bio">Bio</Label>
              <span className={`text-xs ${bio.length > 480 ? "text-destructive" : "text-muted-foreground"}`}>
                {bio.length}/500
              </span>
            </div>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              placeholder="Describe your experience, skills, and what makes you great…"
              rows={4}
            />
          </div>

          {/* Service categories */}
          <div className="space-y-2">
            <Label>Service categories</Label>
            {loadingServices ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([category, svcs]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {svcs.map((svc) => {
                        const selected = selectedCategories.includes(svc.name);
                        return (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => toggleCategory(svc.name)}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-input bg-background hover:bg-muted"
                            }`}
                          >
                            {svc.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedCategories.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedCategories.join(", ")}
              </p>
            )}
          </div>

          {/* Service radius */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <Label>Service radius</Label>
              <span className="text-sm font-medium">{radius} km</span>
            </div>
            <Slider
              min={5}
              max={50}
              step={5}
              value={[radius]}
              onValueChange={([val]) => setRadius(val)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Rate */}
          <div className="space-y-1.5">
            <Label htmlFor="rate">Starting rate (KES)</Label>
            <div className="flex gap-2">
              <Input
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 1500"
                inputMode="numeric"
                className="flex-1"
                required
              />
              <div className="flex rounded-md border border-input overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setRateType("hourly")}
                  className={`px-3 py-2 transition-colors ${
                    rateType === "hourly"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  / hr
                </button>
                <button
                  type="button"
                  onClick={() => setRateType("per_job")}
                  className={`px-3 py-2 transition-colors border-l border-input ${
                    rateType === "per_job"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  / job
                </button>
              </div>
            </div>
          </div>

          {/* M-Pesa */}
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
            <p className="text-xs text-muted-foreground">This is where you'll receive payments</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save & continue"}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ─── Root component ───────────────────────────────────────────────────────────
const Onboarding = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null; role: string } | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? { full_name: null, role: "client" });
        setFetching(false);
      });
  }, [user]);

  if (!user || fetching) return <LoadingScreen />;

  const name = profile?.full_name ?? "";

  if (profile?.role === "provider") {
    return <ProviderForm userId={user.id} initialName={name} />;
  }

  return <ClientForm userId={user.id} initialName={name} />;
};

export default Onboarding;
