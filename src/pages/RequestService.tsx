import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ServicePicker } from "@/components/ServicePicker";
import { TedQuestionForm, validateTedAnswers } from "@/components/TedQuestionForm";
import { useService, useServices } from "@/hooks/useServices";
import questionsData from "@/data/questions.json";

const STEP_LABELS = ["Pick a Service", "About the Job", "Location", "Review & Post"];

// Fallback map: service name → archetype when the DB archetype field is null.
// Keeps questions relevant for every service regardless of DB state.
const SERVICE_ARCHETYPE_MAP: Record<string, string> = {
  // Home maintenance
  'House Cleaning': 'home_maintenance', 'Plumbing': 'home_maintenance',
  'Electrical Repair': 'home_maintenance', 'Painting': 'home_maintenance',
  'Moving & Packing': 'home_maintenance',
  'HVAC Repair & Installation': 'home_maintenance', 'Fan Installation': 'home_maintenance',
  'Appliance Repair': 'home_maintenance', 'Locksmith Services': 'home_maintenance',
  'Roofing & Gutter Repair': 'home_maintenance', 'CCTV Installation': 'home_maintenance',
  'Gate Automation & Repair': 'home_maintenance', 'Window Repair': 'home_maintenance',
  'Masonry & Tiling': 'home_maintenance', 'Waterproofing': 'home_maintenance',
  'Security / Usalama': 'home_maintenance', 'Carpentry / Useremala': 'home_maintenance',
  // Lifestyle & wellness
  'Beauty / Uzuri': 'lifestyle_wellness',
  'Mobile Massage Therapy': 'lifestyle_wellness', 'Hair Braiding & Styling': 'lifestyle_wellness',
  'Makeup Artistry': 'lifestyle_wellness', 'Dog Walking': 'lifestyle_wellness',
  'Pet Grooming': 'lifestyle_wellness', 'Veterinary Home Visits': 'lifestyle_wellness',
  'Nutrition Coaching': 'lifestyle_wellness', 'Home Care for Elderly': 'lifestyle_wellness',
  // DB archetype "session" — resolved by name
  'Personal Training': 'lifestyle_wellness', 'Yoga & Pilates Instruction': 'lifestyle_wellness',
  'Tutoring': 'professional_business',
  // Events & celebrations (DB archetype: events_celebrations or "event")
  'Photography': 'events_celebrations', 'Catering': 'events_celebrations',
  'DJ & Music': 'events_celebrations', 'Event Planning': 'events_celebrations',
  'MC / Event Host': 'events_celebrations', 'Video Editing': 'events_celebrations',
  'Florist / Floral Arrangements': 'events_celebrations',
  'Balloon Decoration': 'events_celebrations', 'Tent & Furniture Rental': 'events_celebrations',
  'Kids Party Entertainment': 'events_celebrations', 'Wedding Officiant': 'events_celebrations',
  'Invitation Design': 'events_celebrations', 'Sound System Rental': 'events_celebrations',
  // Professional & business
  'IT Support / Teknolojia': 'professional_business',
  'Graphic Design': 'professional_business', 'Web Development': 'professional_business',
  'Notary Public': 'professional_business', 'Bookkeeping & Accounting': 'professional_business',
  'Tax Consultation': 'professional_business', 'Copywriting & Proofreading': 'professional_business',
  'Voiceover Artist': 'professional_business', 'Social Media Management': 'professional_business',
  'Interior Design': 'professional_business', 'Business Registration': 'professional_business',
  'Translation Services': 'professional_business',
  // Outdoor & heavy duty
  'Landscaping': 'outdoor_heavy_duty', 'Car Wash': 'outdoor_heavy_duty',
  'Mechanic': 'outdoor_heavy_duty', 'Tree Trimming': 'outdoor_heavy_duty',
  'Irrigation System Repair': 'outdoor_heavy_duty',
  'Pest Control / Fumigation': 'outdoor_heavy_duty', 'Pest Control & Fumigation': 'outdoor_heavy_duty',
  'Borehole Drilling': 'outdoor_heavy_duty', 'Solar Panel Installation': 'outdoor_heavy_duty',
  'Perimeter Wall Construction': 'outdoor_heavy_duty', 'Auto Detailing': 'outdoor_heavy_duty',
  'Towing Services': 'outdoor_heavy_duty', 'Window Tinting': 'outdoor_heavy_duty',
};

// Format KES with commas
function fmtKes(v: string) {
  const n = parseInt(v.replace(/\D/g, ""), 10);
  return isNaN(n) ? v : n.toLocaleString("en-KE");
}

// Derive a human-readable summary of TED answers for a given archetype
function summariseAnswers(archetypeId: string, answers: Record<string, string>) {
  const questions = (questionsData as any).archetypes?.[archetypeId]?.questions ?? [];
  return questions
    .filter((q: any) => q.type !== "image_upload" && answers[q.id])
    .map((q: any) => ({ label: q.label, value: answers[q.id] }));
}

const RequestService = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Pre-select service from ?service= query param (deep-link from /services page)
  const { data: allServices } = useServices();
  useEffect(() => {
    const nameParam = searchParams.get("service");
    if (!nameParam || !allServices) return;
    const match = allServices.find(
      (s) => s.name.toLowerCase() === nameParam.toLowerCase()
    );
    if (match) {
      setSelectedServiceId(match.id);
      setStep(1);
    }
  }, [allServices, searchParams]);
  const [tedAnswers, setTedAnswers] = useState<Record<string, string>>({});
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch selected service details (name + archetype)
  const { data: selectedService } = useService(selectedServiceId ?? "");

  const archetypeId =
    selectedService?.archetype ||
    (selectedService?.name ? SERVICE_ARCHETYPE_MAP[selectedService.name] : null) ||
    "home_maintenance";

  // ── Validation ──────────────────────────────────────────────────────────────

  const canNext = () => {
    if (step === 0) return !!selectedServiceId;
    if (step === 1) return validateTedAnswers(archetypeId, tedAnswers).length === 0;
    return true; // step 2 is optional
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please log in first", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!selectedServiceId) return;

    setSubmitting(true);

    const { data: inserted, error } = await supabase
      .from("job_requests")
      .insert({
        client_id: user.id,
        service_id: selectedServiceId,
        description: JSON.stringify(tedAnswers),
        location_name: location.trim() || null,
        budget_min_kes: budgetMin ? parseInt(budgetMin.replace(/\D/g, ""), 10) : null,
        budget_max_kes: budgetMax ? parseInt(budgetMax.replace(/\D/g, ""), 10) : null,
        timeline: null,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      toast({ title: "Error", description: error?.message ?? "Failed to post job.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Write pre-uploaded image URLs to the job request (no re-upload needed)
    if (uploadedImageUrls.length > 0) {
      await supabase.from("job_requests").update({ image_urls: uploadedImageUrls }).eq("id", inserted.id);
    }

    setSubmitting(false);
    toast({ title: "Kazi imewekwa! Providers watajulishwa." });
    navigate("/dashboard");
  };

  // ── Step content ─────────────────────────────────────────────────────────────

  const progressPct = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container max-w-2xl py-10">
          <h1 className="mb-1 text-2xl font-extrabold">Post a Job</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
          </p>

          {/* Progress bar */}
          <div className="mb-8 space-y-1">
            <Progress value={progressPct} className="h-2" />
            <div className="flex justify-between">
              {STEP_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={`text-[11px] font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
            >
              {/* ── STEP 1: Pick a Service ──────────────────────────────────── */}
              {step === 0 && (
                <ServicePicker
                  value={selectedServiceId}
                  onChange={(id) => setSelectedServiceId(id)}
                />
              )}

              {/* ── STEP 2: TED Questions ───────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  {selectedService && (
                    <div className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">Service:</span>
                      <span className="font-semibold text-foreground">{selectedService.name}</span>
                    </div>
                  )}
                  <TedQuestionForm
                    archetypeId={archetypeId}
                    serviceName={selectedService?.name}
                    value={tedAnswers}
                    onChange={setTedAnswers}
                    onImagesChange={setUploadedImageUrls}
                  />
                </div>
              )}

              {/* ── STEP 3: Location & Budget ───────────────────────────────── */}
              {step === 2 && (
                <Card>
                  <CardContent className="space-y-5 pt-6">
                    {/* Location */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Kilimani, Nairobi"
                          className="pl-9"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Helps providers quote accurately</p>
                    </div>

                    {/* Budget range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Budget range (KES) — optional</Label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={budgetMin}
                            onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ""))}
                            placeholder="Min"
                            className="pl-9"
                            inputMode="numeric"
                          />
                        </div>
                        <span className="text-muted-foreground">–</span>
                        <div className="relative flex-1">
                          <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={budgetMax}
                            onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ""))}
                            placeholder="Max"
                            className="pl-9"
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Helps providers quote accurately</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── STEP 4: Review ──────────────────────────────────────────── */}
              {step === 3 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4 flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-primary" />
                      <h3 className="text-lg font-bold">Review Your Request</h3>
                    </div>

                    <dl className="space-y-3 text-sm">
                      {/* Service */}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Service</dt>
                        <dd className="font-medium">{selectedService?.name ?? "—"}</dd>
                      </div>

                      {/* TED answers */}
                      {summariseAnswers(archetypeId, tedAnswers).map(
                        ({ label, value }: { label: string; value: string }) => (
                          <div key={label} className="border-t border-border pt-3">
                            <dt className="mb-0.5 text-muted-foreground">{label}</dt>
                            <dd className="font-medium">{value}</dd>
                          </div>
                        )
                      )}

                      {/* Location */}
                      {location && (
                        <div className="flex justify-between border-t border-border pt-3">
                          <dt className="text-muted-foreground">Location</dt>
                          <dd className="font-medium">{location}</dd>
                        </div>
                      )}

                      {/* Budget */}
                      {(budgetMin || budgetMax) && (
                        <div className="flex justify-between border-t border-border pt-3">
                          <dt className="text-muted-foreground">Budget</dt>
                          <dd className="font-medium">
                            {budgetMin ? `KES ${fmtKes(budgetMin)}` : "—"}
                            {" – "}
                            {budgetMax ? `KES ${fmtKes(budgetMax)}` : "—"}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step < STEP_LABELS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post Job
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RequestService;
