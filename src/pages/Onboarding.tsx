import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MapPin, Briefcase, Loader2, ChevronRight, ChevronLeft, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { generateSlug, isSlugAvailable } from "@/lib/slugify";

// ─── Step progress indicator ─────────────────────────────────────────────────

interface StepIndicatorProps {
  steps: string[];
  current: number; // 0-based
}

const StepIndicator = ({ steps, current }: StepIndicatorProps) => {
  const pct = ((current) / (steps.length - 1)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-colors",
                    done
                      ? "bg-primary border-primary text-primary-foreground"
                      : active
                      ? "border-primary text-primary bg-background"
                      : "border-muted-foreground/30 text-muted-foreground/40 bg-background"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground/50"
                  )}
                >
                  {label}
                </span>
              </div>
              {/* Connector */}
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-18px] transition-colors",
                    i < current ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <Progress value={pct} className="h-1" />
    </div>
  );
};

// ─── Loading screen ───────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-muted/30">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

// ─── Phone field (shared) ─────────────────────────────────────────────────────

interface PhoneFieldProps {
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}
const PhoneField = ({ value, onChange, hint }: PhoneFieldProps) => (
  <div className="space-y-1.5">
    <Label htmlFor="mpesa">M-Pesa phone number</Label>
    <div className="flex">
      <span className="inline-flex items-center gap-1 rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
        🇰🇪 +254
      </span>
      <Input
        id="mpesa"
        className="rounded-l-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="7XX XXX XXX"
        inputMode="numeric"
        maxLength={12}
        required
      />
    </div>
    <p className="text-xs text-muted-foreground">{hint ?? "Format: 07XX XXX XXX"}</p>
  </div>
);

const validatePhone = (raw: string) => {
  const digits = raw.replace(/\s/g, "");
  return /^07\d{8}$/.test(digits) ? digits : null;
};

// ─── CLIENT FORM ──────────────────────────────────────────────────────────────

const CLIENT_STEPS = ["Personal info", "Payment"];

const ClientForm = ({ userId, initialName }: { userId: string; initialName: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState(initialName);
  const [location, setLocation] = useState("");
  const [mpesa, setMpesa] = useState("");
  const [saving, setSaving] = useState(false);

  const canNext =
    step === 0 ? fullName.trim() !== "" && location.trim() !== "" : mpesa.trim() !== "";

  const handleSave = async () => {
    const digits = validatePhone(mpesa);
    if (!digits) {
      toast({ title: "Invalid phone number", description: "Format: 07XX XXX XXX", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), onboarding_complete: true, location_name: location.trim(), mpesa_phone: digits })
        .eq("id", userId);
      if (pErr) throw pErr;

      toast({ title: "Profile saved!", description: "Welcome to Workpin." });
      navigate("/dashboard");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Complete your profile</h1>
            <p className="text-sm text-muted-foreground">Step {step + 1} of {CLIENT_STEPS.length}</p>
          </div>
        </div>

        <StepIndicator steps={CLIENT_STEPS} current={step} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{CLIENT_STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 ? "Tell us a bit about yourself" : "How would you like to pay for services?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kilimani, Nairobi" required />
                </div>
              </>
            )}

            {step === 1 && (
              <PhoneField value={mpesa} onChange={setMpesa} hint="Used to pay for services via M-Pesa" />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < CLIENT_STEPS.length - 1 ? (
            <Button className="flex-1" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1" disabled={!canNext || saving} onClick={handleSave}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save & continue"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── PROVIDER FORM ────────────────────────────────────────────────────────────

const PROVIDER_STEPS = ["About you", "Your services", "Rates & payment"];

type Service = { id: string; name: string; category: string };

const ProviderForm = ({ userId, initialName }: { userId: string; initialName: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Step 1
  const [fullName, setFullName] = useState(initialName);
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Step 2
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [radius, setRadius] = useState(10);

  // Step 3
  const [rate, setRate] = useState("");
  const [rateType, setRateType] = useState<"hourly" | "per_job">("hourly");
  const [mpesa, setMpesa] = useState("");
  const [saving, setSaving] = useState(false);

  const checkSlugAvailability = useCallback(async (s: string) => {
    if (!s) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    const available = await isSlugAvailable(s, userId);
    setSlugAvailable(available);
    setCheckingSlug(false);
  }, [userId]);

  const handleBusinessNameBlur = useCallback(() => {
    if (!businessName.trim()) return;
    const newSlug = generateSlug(businessName);
    setSlug(newSlug);
    checkSlugAvailability(newSlug);
  }, [businessName, checkSlugAvailability]);

  const handleSlugChange = useCallback((value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
    setSlug(cleaned);
    setSlugAvailable(null);
  }, []);

  const handleSlugBlur = useCallback(() => {
    checkSlugAvailability(slug);
  }, [slug, checkSlugAvailability]);

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

  const grouped = services.reduce<Record<string, Service[]>>((acc, svc) => {
    (acc[svc.category] = acc[svc.category] ?? []).push(svc);
    return acc;
  }, {});

  const toggleCategory = (name: string) =>
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );

  const canNext = (() => {
    if (step === 0) return fullName.trim() !== "" && businessName.trim() !== "";
    if (step === 1) return selectedCategories.length > 0;
    return rate !== "" && mpesa.trim() !== "";
  })();

  const handleSave = async () => {
    const digits = validatePhone(mpesa);
    if (!digits) {
      toast({ title: "Invalid phone number", description: "Format: 07XX XXX XXX", variant: "destructive" });
      return;
    }
    const rateNum = Number(rate);
    if (!rate || isNaN(rateNum) || rateNum <= 0) {
      toast({ title: "Enter a valid starting rate in KES", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Ensure slug is unique before saving
      let finalSlug = slug || generateSlug(businessName);
      if (finalSlug) {
        const available = await isSlugAvailable(finalSlug, userId);
        if (!available) {
          // Append suffix
          for (let i = 2; i <= 20; i++) {
            const candidate = `${finalSlug}-${i}`;
            if (await isSlugAvailable(candidate, userId)) {
              finalSlug = candidate;
              break;
            }
          }
        }
      }

      const { error: ppErr } = await supabase
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
            username: finalSlug || null,
          },
          { onConflict: "user_id" }
        );
      if (ppErr) throw ppErr;

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), onboarding_complete: true })
        .eq("id", userId);
      if (pErr) throw pErr;

      toast({ title: "Profile saved!", description: "Welcome to Workpin." });
      navigate("/provider-dashboard");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const stepDescriptions = [
    "Your public profile that clients will see",
    "Select the services you offer and your coverage area",
    "Set your pricing in KES and payment details",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Set up your provider profile</h1>
            <p className="text-sm text-muted-foreground">Step {step + 1} of {PROVIDER_STEPS.length}</p>
          </div>
        </div>

        <StepIndicator steps={PROVIDER_STEPS} current={step} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{PROVIDER_STEPS[step]}</CardTitle>
            <CardDescription>{stepDescriptions[step]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* ── Step 1: About you ── */}
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} onBlur={handleBusinessNameBlur} placeholder="e.g. Juma Electricals" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Public URL
                  </Label>
                  <div className="flex items-center gap-0 rounded-md border border-input bg-muted overflow-hidden">
                    <span className="px-3 text-xs text-muted-foreground select-none whitespace-nowrap bg-muted border-r border-input">
                      workpin.app/pro/
                    </span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      onBlur={handleSlugBlur}
                      placeholder="your-business-name"
                      className="border-0 rounded-none focus-visible:ring-0"
                    />
                  </div>
                  {checkingSlug && <p className="text-xs text-muted-foreground">Checking availability…</p>}
                  {!checkingSlug && slugAvailable === true && slug && (
                    <p className="text-xs text-primary font-medium">✓ workpin.app/pro/{slug} is available</p>
                  )}
                  {!checkingSlug && slugAvailable === false && slug && (
                    <p className="text-xs text-destructive font-medium">✗ That URL is taken — try another</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <Label htmlFor="bio">Bio <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <span className={cn("text-xs", bio.length > 480 ? "text-destructive font-medium" : "text-muted-foreground")}>
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
              </>
            )}

            {/* ── Step 2: Services ── */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Service categories</Label>
                  {selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCategories.map((c) => (
                        <Badge key={c} variant="secondary" className="gap-1 pr-1">
                          {c}
                          <button
                            type="button"
                            onClick={() => toggleCategory(c)}
                            className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                            aria-label={`Remove ${c}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {loadingServices ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                    </div>
                  ) : (
                    <ScrollArea className="h-56 rounded-md border p-3">
                      <div className="space-y-4">
                        {Object.entries(grouped).map(([category, svcs]) => (
                          <div key={category}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              {category}
                            </p>
                            <div className="space-y-2">
                              {svcs.map((svc) => (
                                <div key={svc.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={svc.id}
                                    checked={selectedCategories.includes(svc.name)}
                                    onCheckedChange={() => toggleCategory(svc.name)}
                                  />
                                  <label
                                    htmlFor={svc.id}
                                    className="text-sm cursor-pointer select-none"
                                  >
                                    {svc.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  {selectedCategories.length === 0 && (
                    <p className="text-xs text-muted-foreground">Select at least one service</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <Label>Service radius</Label>
                    <span className="text-sm font-semibold">{radius} km</span>
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
              </>
            )}

            {/* ── Step 3: Rates & payment ── */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rate">Starting rate (KES)</Label>
                  <div className="flex gap-2 items-start">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                        KES
                      </span>
                      <Input
                        id="rate"
                        value={rate}
                        onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))}
                        placeholder="1500"
                        inputMode="numeric"
                        className="pl-12"
                        required
                      />
                    </div>
                    <ToggleGroup
                      type="single"
                      value={rateType}
                      onValueChange={(v) => { if (v) setRateType(v as "hourly" | "per_job"); }}
                      className="border rounded-md"
                    >
                      <ToggleGroupItem value="hourly" className="px-3 text-sm">/ hr</ToggleGroupItem>
                      <ToggleGroupItem value="per_job" className="px-3 text-sm">/ job</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  {rate && (
                    <p className="text-xs text-muted-foreground">
                      KES {Number(rate).toLocaleString()} {rateType === "hourly" ? "per hour" : "per job"}
                    </p>
                  )}
                </div>

                <Separator />

                <PhoneField value={mpesa} onChange={setMpesa} hint="Payments from clients go to this number" />
              </>
            )}

          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < PROVIDER_STEPS.length - 1 ? (
            <Button className="flex-1" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1" disabled={!canNext || saving} onClick={handleSave}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save & continue"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

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

  if (profile?.role === "provider") return <ProviderForm userId={user.id} initialName={name} />;
  return <ClientForm userId={user.id} initialName={name} />;
};

export default Onboarding;
