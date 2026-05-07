import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MapPin, Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Step progress indicator ─────────────────────────────────────────────────

interface StepIndicatorProps {
  steps: string[];
  current: number;
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

// ─── Phone field ──────────────────────────────────────────────────────────────

import CountrySelect from "@/components/CountrySelect";
import RegionSelect from "@/components/RegionSelect";
import { useCountry } from "@/hooks/useCountries";

interface PhoneFieldProps {
  value: string;
  onChange: (v: string) => void;
  countryCode: string;
  hint?: string;
}
const PhoneField = ({ value, onChange, countryCode, hint }: PhoneFieldProps) => {
  const country = useCountry(countryCode);
  return (
    <div className="space-y-1.5">
      <Label htmlFor="mpesa">Mobile money phone number</Label>
      <div className="flex">
        <span className="inline-flex items-center gap-1 rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
          {country?.flag_emoji} {country?.dial_code ?? "+254"}
        </span>
        <Input
          id="mpesa"
          className="rounded-l-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="7XX XXX XXX"
          inputMode="numeric"
          maxLength={15}
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint ?? "Used for mobile money payments"}</p>
    </div>
  );
};

const validatePhone = (raw: string, regex?: string) => {
  const digits = raw.replace(/\s/g, "");
  if (!regex) return /^0?\d{8,12}$/.test(digits) ? digits : null;
  try { return new RegExp(regex).test(digits) ? digits : null; } catch { return digits; }
};

// ─── Unified onboarding form ─────────────────────────────────────────────────

const STEPS = ["Personal info", "Location", "Payment"];

const OnboardingForm = ({ userId, initialName }: { userId: string; initialName: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState(initialName);
  const [location, setLocation] = useState("");
  const [countryCode, setCountryCode] = useState<string>("KE");
  const [regionId, setRegionId] = useState<string | null>(null);
  const [mpesa, setMpesa] = useState("");
  const [saving, setSaving] = useState(false);
  const country = useCountry(countryCode);

  const canNext =
    step === 0 ? fullName.trim() !== "" && location.trim() !== ""
    : step === 1 ? !!countryCode
    : mpesa.trim() !== "";

  const handleSave = async () => {
    const digits = validatePhone(mpesa, country?.phone_regex);
    if (!digits) {
      toast({ title: "Invalid phone number", description: `Please use a valid ${country?.name ?? ""} number`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          onboarding_complete: true,
          location_name: location.trim(),
          mpesa_phone: digits,
          country_code: countryCode,
          region_id: regionId,
        })
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
            <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        <StepIndicator steps={STEPS} current={step} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{STEPS[step]}</CardTitle>
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
                  <Label htmlFor="location">Neighbourhood / Area</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Kilimani" required />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <CountrySelect value={countryCode} onChange={(c) => { setCountryCode(c); setRegionId(null); }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <RegionSelect countryCode={countryCode} value={regionId} onChange={setRegionId} />
                </div>
              </>
            )}

            {step === 2 && (
              <PhoneField value={mpesa} onChange={setMpesa} countryCode={countryCode} hint={`Used for mobile money payments in ${country?.name ?? ""}`} />
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
          {step < STEPS.length - 1 ? (
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
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? { full_name: null });
        setFetching(false);
      });
  }, [user]);

  if (!user || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <OnboardingForm userId={user.id} initialName={profile?.full_name ?? ""} />;
};

export default Onboarding;
