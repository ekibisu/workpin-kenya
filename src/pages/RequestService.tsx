import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Banknote, FileText, CheckCircle } from "lucide-react";

const steps = ["Service", "Details", "Budget & Location", "Review"];

const serviceOptions = [
  "House Cleaning", "Plumbing", "Electrical Repair", "Painting", "Moving & Packing",
  "Landscaping", "Photography", "Catering", "DJ & Music", "Event Planning",
  "Tutoring", "Personal Training", "Car Wash", "Mechanic", "Web Development", "Graphic Design",
];

const RequestService = () => {
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get("service") || "";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    service: preselected,
    description: "",
    budget: "",
    location: "",
  });

  const updateForm = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canNext = () => {
    if (step === 0) return !!form.service;
    if (step === 1) return form.description.length >= 10;
    if (step === 2) return !!form.location;
    return true;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container max-w-xl py-10">
          <h1 className="mb-2 text-2xl font-extrabold">Request a Service</h1>
          <p className="mb-8 text-sm text-muted-foreground">Tell us what you need — it only takes a minute.</p>

          {/* Progress */}
          <div className="mb-8 flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-border"
                  }`}
                />
                <span className={`text-xs font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">What service do you need?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {serviceOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateForm("service", s)}
                        className={`rounded-xl border p-3 text-left text-sm font-medium transition-all ${
                          form.service === s
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-foreground hover:border-primary/30"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-accent p-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Service: <span className="text-primary">{form.service}</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base font-semibold">
                      Describe what you need
                    </Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      placeholder="E.g., I need my kitchen pipes fixed. There's a leak under the sink that started 2 days ago..."
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Be specific — this helps pros send you better quotes.
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="text-base font-semibold">
                      Budget (KES)
                    </Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="budget"
                        type="number"
                        value={form.budget}
                        onChange={(e) => updateForm("budget", e.target.value)}
                        placeholder="e.g., 5000"
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Optional — helps pros give accurate quotes.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-base font-semibold">
                      Location
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="location"
                        value={form.location}
                        onChange={(e) => updateForm("location", e.target.value)}
                        placeholder="e.g., Westlands, Nairobi"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-primary" />
                      <h3 className="font-heading text-lg font-bold text-foreground">Review Your Request</h3>
                    </div>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Service</dt>
                        <dd className="font-medium text-foreground">{form.service}</dd>
                      </div>
                      <div className="border-t border-border pt-3">
                        <dt className="mb-1 text-muted-foreground">Description</dt>
                        <dd className="text-foreground">{form.description}</dd>
                      </div>
                      {form.budget && (
                        <div className="flex justify-between border-t border-border pt-3">
                          <dt className="text-muted-foreground">Budget</dt>
                          <dd className="font-medium text-foreground">KES {Number(form.budget).toLocaleString()}</dd>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-border pt-3">
                        <dt className="text-muted-foreground">Location</dt>
                        <dd className="font-medium text-foreground">{form.location}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="hero" size="lg">
                Submit Request
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
