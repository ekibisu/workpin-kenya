import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Banknote, FileText, CheckCircle, Loader2, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const steps = ["Service", "Details", "Budget & Location", "Review"];
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ServiceOption {
  id: string;
  name: string;
}

const RequestService = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const preselected = searchParams.get("service") || "";
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    service: preselected,
    serviceId: "",
    description: "",
    budget: "",
    location: "",
  });

  useEffect(() => {
    supabase.from("services").select("id, name").then(({ data }) => {
      if (data) {
        setServices(data);
        if (preselected) {
          const match = data.find((s) => s.name === preselected);
          if (match) setForm((f) => ({ ...f, serviceId: match.id }));
        }
      }
    });
  }, [preselected]);

  // Generate previews when files change
  useEffect(() => {
    const urls = selectedFiles.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [selectedFiles]);

  const updateForm = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectService = (s: ServiceOption) =>
    setForm((prev) => ({ ...prev, service: s.name, serviceId: s.id }));

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({ title: "Invalid file type", description: `${file.name} is not a supported image format.`, variant: "destructive" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${file.name} exceeds 5MB limit.`, variant: "destructive" });
        continue;
      }
      newFiles.push(file);
    }
    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles].slice(0, MAX_IMAGES);
      if (prev.length + newFiles.length > MAX_IMAGES) {
        toast({ title: "Limit reached", description: `You can upload up to ${MAX_IMAGES} images.` });
      }
      return combined;
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const canNext = () => {
    if (step === 0) return !!form.serviceId;
    if (step === 1) return form.description.length >= 10;
    if (step === 2) return !!form.location;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please log in first", description: "You need an account to submit a request.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setSubmitting(true);
    setUploadProgress(0);

    // 1. Insert the service request
    const { data: inserted, error } = await supabase.from("service_requests").insert({
      customer_id: user.id,
      service_id: form.serviceId,
      description: form.description.trim(),
      budget: form.budget ? Number(form.budget) : null,
      location_name: form.location.trim(),
    } as any).select("id").single();

    if (error || !inserted) {
      toast({ title: "Error", description: error?.message || "Failed to create request.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const requestId = inserted.id;

    // 2. Upload images if any
    if (selectedFiles.length > 0) {
      const imageUrls: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const filePath = `${user.id}/${requestId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("request-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("request-images")
          .getPublicUrl(filePath);

        imageUrls.push(urlData.publicUrl);
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      // 3. Update the row with image URLs
      if (imageUrls.length > 0) {
        await supabase.from("service_requests").update({ image_urls: imageUrls } as any).eq("id", requestId);
      }
    }

    setSubmitting(false);
    toast({ title: "Request submitted!", description: "Providers will send you quotes soon." });
    navigate("/dashboard");
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
                <div className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
                <span className={`text-xs font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{s}</span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">What service do you need?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => selectService(s)}
                        className={`rounded-xl border p-3 text-left text-sm font-medium transition-all ${
                          form.serviceId === s.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/30"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-accent p-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">Service: <span className="text-primary">{form.service}</span></span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base font-semibold">Describe what you need</Label>
                    <Textarea id="description" value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="E.g., I need my kitchen pipes fixed. There's a leak under the sink that started 2 days ago..." rows={5} />
                    <p className="text-xs text-muted-foreground">Be specific — this helps pros send you better quotes.</p>
                  </div>

                  {/* Image Upload Area */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Photos (optional)</Label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/40 hover:bg-accent/30"
                    >
                      <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Drag & drop or click to upload</p>
                      <p className="text-xs text-muted-foreground">Up to {MAX_IMAGES} images · JPG, PNG, WebP · Max 5MB each</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleFileSelect(e.target.files);
                        e.target.value = "";
                      }}
                    />

                    {/* Thumbnails */}
                    {previews.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {previews.map((src, i) => (
                          <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                            <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="text-base font-semibold">Budget (KES)</Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="budget" type="number" value={form.budget} onChange={(e) => updateForm("budget", e.target.value)} placeholder="e.g., 5000" className="pl-9" />
                    </div>
                    <p className="text-xs text-muted-foreground">Optional — helps pros give accurate quotes.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-base font-semibold">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="location" value={form.location} onChange={(e) => updateForm("location", e.target.value)} placeholder="e.g., Westlands, Nairobi" className="pl-9" />
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
                      <div className="flex justify-between"><dt className="text-muted-foreground">Service</dt><dd className="font-medium text-foreground">{form.service}</dd></div>
                      <div className="border-t border-border pt-3"><dt className="mb-1 text-muted-foreground">Description</dt><dd className="text-foreground">{form.description}</dd></div>
                      {form.budget && (<div className="flex justify-between border-t border-border pt-3"><dt className="text-muted-foreground">Budget</dt><dd className="font-medium text-foreground">KES {Number(form.budget).toLocaleString()}</dd></div>)}
                      <div className="flex justify-between border-t border-border pt-3"><dt className="text-muted-foreground">Location</dt><dd className="font-medium text-foreground">{form.location}</dd></div>
                    </dl>

                    {/* Review thumbnails */}
                    {previews.length > 0 && (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="mb-2 text-sm text-muted-foreground">Photos ({previews.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {previews.map((src, i) => (
                            <div key={i} className="h-16 w-16 overflow-hidden rounded-lg border border-border">
                              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Upload progress */}
          {submitting && selectedFiles.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground">Uploading photos… {uploadProgress}%</p>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>Next <ChevronRight className="h-4 w-4" /></Button>
            ) : (
              <Button variant="hero" size="lg" onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
