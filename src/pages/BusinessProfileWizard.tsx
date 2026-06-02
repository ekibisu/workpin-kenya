import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Loader2, Save, Upload, Plus, X, Trash2,
  Eye, CheckCircle, Briefcase, Image as ImageIcon, Award, Phone, MapPin, Camera,
  ShieldCheck, Clock as ClockIcon,
} from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { generateUniqueSlug } from "@/lib/slugify";
import { computeCompleteness } from "@/lib/profileCompleteness";
import { useSubscriptionLimits, isUnlimited } from "@/hooks/useSubscriptionLimits";
import { Link } from "react-router-dom";
import CountrySelect from "@/components/CountrySelect";
import CountryMultiSelect from "@/components/CountryMultiSelect";

const STEPS = ["Basics", "Services", "Gallery", "Credentials", "Contact", "Verify", "Preview"];

interface ServiceOption {
  id: string;
  name: string;
  category: string;
}

interface BusinessService {
  id?: string;
  service_id: string | null;
  custom_name: string;
  description: string;
  price_kes: string;
  price_type: string;
  duration_estimate: string;
}

interface GalleryItem {
  id?: string;
  media_url: string;
  caption: string;
  alt_text: string;
  category: string;
  file?: File;
}

const BusinessProfileWizard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { upload, uploading } = useMediaUpload();
  const { limits, planName } = useSubscriptionLimits(user?.id);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogServices, setCatalogServices] = useState<ServiceOption[]>([]);

  // Step 1: Basics
  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [locationName, setLocationName] = useState("");
  const [countryCode, setCountryCode] = useState("KE");
  const [serviceCountries, setServiceCountries] = useState<string[]>(["KE"]);
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Step 2: Services
  const [services, setServices] = useState<BusinessService[]>([]);

  // Step 3: Gallery
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroUrl, setHeroUrl] = useState("");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Step 4: Credentials
  const [yearsExperience, setYearsExperience] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState("");
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [newLang, setNewLang] = useState("");

  // Step 5: Contact
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [rateKes, setRateKes] = useState("");
  const [rateType, setRateType] = useState("hourly");

  // Step 6: Verify (ID upload)
  const [idFrontUrl, setIdFrontUrl] = useState("");
  const [idBackUrl, setIdBackUrl] = useState("");
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationSubmittedAt, setVerificationSubmittedAt] = useState<string | null>(null);

  // Load existing data
  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const [{ data: biz }, { data: svcCatalog }, { data: bizServices }, { data: bizGallery }] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
        supabase.from("services").select("id, name, category").eq("is_active", true).order("sort_order"),
        supabase.from("business_services").select("*").eq("business_id", id).order("sort_order"),
        supabase.from("business_gallery").select("*").eq("business_id", id).order("sort_order"),
      ]);

      if (!biz) {
        toast({ title: "Not found", variant: "destructive" });
        navigate("/dashboard/businesses");
        return;
      }

      setCatalogServices((svcCatalog as ServiceOption[]) || []);
      setBusinessName(biz.business_name || "");
      setTagline(biz.tagline || "");
      setBio(biz.bio || "");
      setLocationName(biz.location_name || "");
      setCountryCode((biz as any).country_code || "KE");
      setServiceCountries(((biz as any).service_country_codes && (biz as any).service_country_codes.length > 0) ? (biz as any).service_country_codes : [(biz as any).country_code || "KE"]);
      setSlug(biz.username || "");
      setHeroUrl(biz.hero_image_url || "");
      setLogoUrl((biz as any).logo_url || "");
      setYearsExperience(biz.years_experience?.toString() || "");
      setCertifications(biz.certifications || []);
      setLanguages(biz.languages || ["English"]);
      setMpesaPhone(biz.mpesa_phone || "");
      setWhatsappPhone(biz.whatsapp_phone || "");
      setWebsiteUrl(biz.website_url || "");
      setRateKes(biz.rate_kes?.toString() || "");
      setRateType(biz.rate_type || "hourly");
      setIdFrontUrl((biz as any).verification_id_url || "");
      setIsVerified(!!(biz as any).is_verified);
      setVerificationSubmittedAt((biz as any).verification_submitted_at || null);


      if (bizServices && bizServices.length > 0) {
        setServices(bizServices.map((s: any) => ({
          id: s.id,
          service_id: s.service_id,
          custom_name: s.custom_name,
          description: s.description || "",
          price_kes: s.price_kes?.toString() || "",
          price_type: s.price_type || "starting_at",
          duration_estimate: s.duration_estimate || "",
        })));
      }

      if (bizGallery && bizGallery.length > 0) {
        setGallery(bizGallery.map((g: any) => ({
          id: g.id,
          media_url: g.media_url,
          caption: g.caption || "",
          alt_text: g.alt_text || "",
          category: g.category || "",
        })));
      }

      setLoading(false);
    };
    load();
  }, [id, user]);

  // Auto-generate slug when name changes
  useEffect(() => {
    if (!businessName.trim() || slug) return;
    const timeout = setTimeout(async () => {
      const s = await generateUniqueSlug(businessName, locationName, user?.id);
      setSlug(s);
    }, 600);
    return () => clearTimeout(timeout);
  }, [businessName, locationName]);

  // Save current step
  const saveStep = useCallback(async () => {
    if (!id) return;
    setSaving(true);

    try {
      if (step === 0) {
        const finalSlug = slug || await generateUniqueSlug(businessName, locationName, user?.id);

        // Upload logo if new file
        let finalLogoUrl = logoUrl;
        if (logoFile) {
          const result = await upload({
            file: logoFile,
            context: "logo",
            providerSlug: finalSlug || id,
            providerName: businessName,
          });
          if (result) finalLogoUrl = result.public_url;
          setLogoUrl(finalLogoUrl);
          setLogoFile(null);
        }

        await supabase.from("businesses").update({
          business_name: businessName.trim(),
          tagline: tagline.trim() || null,
          bio: bio.trim() || null,
          location_name: locationName.trim() || null,
          country_code: countryCode,
          service_country_codes: serviceCountries.length > 0 ? serviceCountries : [countryCode],
          username: finalSlug || null,
          logo_url: finalLogoUrl || null,
        } as any).eq("id", id);
        if (!slug) setSlug(finalSlug);
      }

      if (step === 1) {
        // Delete existing and re-insert
        await supabase.from("business_services").delete().eq("business_id", id);
        if (services.length > 0) {
          await supabase.from("business_services").insert(
            services.map((s, i) => ({
              business_id: id,
              service_id: s.service_id || null,
              custom_name: s.custom_name,
              description: s.description || null,
              price_kes: s.price_kes ? Number(s.price_kes) : null,
              price_type: s.price_type,
              duration_estimate: s.duration_estimate || null,
              sort_order: i,
            }))
          );
          // Also sync categories array for search compatibility
          await supabase.from("businesses").update({
            categories: services.map(s => s.custom_name),
          }).eq("id", id);
        }
      }

      if (step === 2) {
        // Upload hero if new file
        let finalHeroUrl = heroUrl;
        if (heroFile) {
          const result = await upload({
            file: heroFile,
            context: "hero",
            providerSlug: slug || id,
            providerName: businessName,
          });
          if (result) finalHeroUrl = result.public_url;
          setHeroUrl(finalHeroUrl);
          setHeroFile(null);
        }

        // Upload new gallery items
        const uploadedGallery = [...gallery];
        for (let i = 0; i < uploadedGallery.length; i++) {
          const item = uploadedGallery[i];
          if (item.file) {
            const result = await upload({
              file: item.file,
              context: item.caption ? `gallery-${item.caption.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}` : "gallery",
              providerSlug: slug || id,
              providerName: businessName,
            });
            if (result) {
              uploadedGallery[i] = { ...item, media_url: result.public_url, file: undefined };
            }
          }
        }
        setGallery(uploadedGallery);

        // Save to DB
        await supabase.from("businesses").update({ hero_image_url: finalHeroUrl || null }).eq("id", id);
        await supabase.from("business_gallery").delete().eq("business_id", id);
        const validGallery = uploadedGallery.filter(g => g.media_url);
        if (validGallery.length > 0) {
          await supabase.from("business_gallery").insert(
            validGallery.map((g, i) => ({
              business_id: id,
              media_url: g.media_url,
              caption: g.caption || null,
              alt_text: g.alt_text || null,
              category: g.category || null,
              sort_order: i,
            }))
          );
        }
      }

      if (step === 3) {
        await supabase.from("businesses").update({
          years_experience: yearsExperience ? Number(yearsExperience) : null,
          certifications,
          languages,
        }).eq("id", id);
      }

      if (step === 4) {
        await supabase.from("businesses").update({
          mpesa_phone: mpesaPhone.trim() || null,
          whatsapp_phone: whatsappPhone.trim() || null,
          website_url: websiteUrl.trim() || null,
          rate_kes: rateKes ? Number(rateKes) : null,
          rate_type: rateType,
        }).eq("id", id);
      }

      toast({ title: "Progress saved" });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [step, id, businessName, tagline, bio, locationName, countryCode, serviceCountries, slug, services, heroFile, heroUrl, gallery, yearsExperience, certifications, languages, mpesaPhone, whatsappPhone, websiteUrl, rateKes, rateType, logoFile, logoUrl]);

  const handleNext = async () => {
    await saveStep();
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  };

  const handlePublish = async () => {
    await saveStep();
    await supabase.from("businesses").update({ is_active: true }).eq("id", id);
    toast({ title: "Profile published! 🎉" });
    navigate(`/pro/${slug || id}`);
  };

  const addService = () => {
    setServices(prev => [...prev, {
      service_id: null, custom_name: "", description: "", price_kes: "", price_type: "starting_at", duration_estimate: "",
    }]);
  };

  const updateService = (index: number, field: string, value: string) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: GalleryItem[] = files.map(f => ({
      media_url: URL.createObjectURL(f),
      caption: "",
      alt_text: "",
      category: "",
      file: f,
    }));
    setGallery(prev => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeGalleryItem = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
  };

  const completeness = computeCompleteness({
    business_name: businessName,
    tagline,
    bio,
    hero_image_url: heroUrl || (heroFile ? "pending" : null),
    location_name: locationName,
    years_experience: yearsExperience ? Number(yearsExperience) : null,
    certifications,
    galleryCount: gallery.length,
    servicesCount: services.filter(s => s.custom_name).length,
    faqCount: 0,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container max-w-2xl py-8">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-foreground">Set Up Your Profile</h1>
            <Badge variant="outline" className="text-xs">{completeness}% complete</Badge>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>

          <div className="mb-8 space-y-1">
            <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />
            <div className="flex justify-between">
              {STEPS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => i < step && setStep(i)}
                  className={`text-[11px] font-medium transition-colors ${
                    i <= step ? "text-primary cursor-pointer" : "text-muted-foreground cursor-default"
                  }`}
                >
                  {label}
                </button>
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
              {/* STEP 0: Basics */}
              {step === 0 && (
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    {/* Logo Upload */}
                    <div className="space-y-1.5">
                      <Label>Business Logo / Avatar</Label>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="relative group flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors overflow-hidden"
                        >
                          {(logoUrl || logoFile) ? (
                            <>
                              <img
                                src={logoFile ? URL.createObjectURL(logoFile) : logoUrl}
                                alt="Logo preview"
                                className="h-full w-full object-cover rounded-xl"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="h-5 w-5 text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Camera className="h-5 w-5 text-primary/60" />
                              <span className="text-[10px] text-primary/60 font-medium">Add Logo</span>
                            </div>
                          )}
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          ref={logoInputRef}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setLogoFile(file);
                            e.target.value = "";
                          }}
                        />
                        <p className="text-xs text-muted-foreground">Upload a logo or photo that represents your business. This appears on your profile card and listing.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Business Name *</Label>
                      <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Mwangi Plumbing" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tagline</Label>
                      <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Fast, reliable plumbing across Nairobi" maxLength={120} />
                      <p className="text-xs text-muted-foreground">{tagline.length}/120 characters</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>About Your Business</Label>
                      <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell clients what you do, your experience, and why they should hire you..." rows={4} className="resize-none" />
                      <p className="text-xs text-muted-foreground">{bio.length} characters {bio.length < 100 && "(aim for 100+)"}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location</Label>
                      <Input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Westlands, Nairobi" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Primary Country</Label>
                      <CountrySelect value={countryCode} onChange={setCountryCode} />
                      <p className="text-xs text-muted-foreground">Where your business is based.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Countries You Serve</Label>
                      <CountryMultiSelect value={serviceCountries} onChange={setServiceCountries} />
                      <p className="text-xs text-muted-foreground">Select every country where you accept jobs. Leads outside these are hidden.</p>
                    </div>
                    {slug && (
                      <div className="rounded-lg bg-accent/50 p-3 text-sm">
                        <span className="text-muted-foreground">Your profile URL: </span>
                        <span className="font-medium text-foreground">workpin.co/pro/{slug}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* STEP 1: Services */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Add the services you offer. Each service gets its own pricing shown on your profile.
                      {!isUnlimited(limits.max_services) && (
                        <span className="ml-1 text-xs">({services.length}/{limits.max_services} on {planName})</span>
                      )}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addService}
                      disabled={!isUnlimited(limits.max_services) && services.length >= limits.max_services}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Service
                    </Button>
                  </div>

                  {!isUnlimited(limits.max_services) && services.length >= limits.max_services && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        You've reached the {planName} plan limit of {limits.max_services} services.
                      </span>
                      <Link to="/pricing" className="font-medium text-primary hover:underline">Upgrade</Link>
                    </div>
                  )}

                  {services.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center py-10 text-center">
                        <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No services added yet. Click "Add Service" to get started.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    services.map((svc, i) => (
                      <Card key={i}>
                        <CardContent className="space-y-3 pt-5">
                          <div className="flex items-start justify-between">
                            <Label className="text-xs font-semibold text-muted-foreground">Service {i + 1}</Label>
                            <Button variant="ghost" size="sm" onClick={() => removeService(i)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Service Name *</Label>
                            <div className="flex gap-2">
                              <Input
                                value={svc.custom_name}
                                onChange={e => updateService(i, "custom_name", e.target.value)}
                                placeholder="e.g. Full House Plumbing"
                                className="flex-1"
                              />
                            </div>
                            {catalogServices.length > 0 && !svc.custom_name && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {catalogServices.slice(0, 8).map(cs => (
                                  <button
                                    key={cs.id}
                                    type="button"
                                    onClick={() => {
                                      updateService(i, "custom_name", cs.name);
                                      updateService(i, "service_id", cs.id);
                                    }}
                                    className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/30 transition-colors"
                                  >
                                    {cs.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Textarea
                              value={svc.description}
                              onChange={e => updateService(i, "description", e.target.value)}
                              placeholder="What's included in this service?"
                              rows={2}
                              className="resize-none"
                            />
                          </div>
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <span>💰</span> Pricing & Duration
                              <span className="text-[10px] font-normal italic ml-1">— shown on your public profile</span>
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Price (KES)</Label>
                                <Input type="number" min="0" value={svc.price_kes} onChange={e => updateService(i, "price_kes", e.target.value)} placeholder="e.g. 3,000" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Price Type</Label>
                                <Select value={svc.price_type} onValueChange={v => updateService(i, "price_type", v)}>
                                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="starting_at">Starting from</SelectItem>
                                    <SelectItem value="fixed">Fixed price</SelectItem>
                                    <SelectItem value="hourly">Per hour</SelectItem>
                                    <SelectItem value="quote">Request quote</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1 mt-2">
                              <Label className="text-xs">Estimated Duration</Label>
                              <Input value={svc.duration_estimate} onChange={e => updateService(i, "duration_estimate", e.target.value)} placeholder="e.g. 2-3 hours" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* STEP 2: Gallery */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Hero image */}
                  <Card>
                    <CardContent className="space-y-3 pt-5">
                      <Label className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Hero / Cover Image</Label>
                      <p className="text-xs text-muted-foreground">This is the large banner image at the top of your profile.</p>
                      {(heroUrl || heroFile) ? (
                        <div className="relative">
                          <img
                            src={heroFile ? URL.createObjectURL(heroFile) : heroUrl}
                            alt="Hero preview"
                            className="h-48 w-full rounded-xl object-cover border border-border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => { setHeroFile(null); setHeroUrl(""); }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-colors">
                          <Upload className="mb-2 h-6 w-6 text-muted-foreground/50" />
                          <span className="text-sm text-muted-foreground">Click to upload hero image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) setHeroFile(f);
                          }} />
                        </label>
                      )}
                    </CardContent>
                  </Card>

                  {/* Gallery */}
                  <Card>
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" /> Portfolio Gallery
                          {!isUnlimited(limits.max_gallery) && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">({gallery.length}/{limits.max_gallery})</span>
                          )}
                        </Label>
                        <label className={(!isUnlimited(limits.max_gallery) && gallery.length >= limits.max_gallery) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
                          <Button size="sm" variant="outline" asChild disabled={!isUnlimited(limits.max_gallery) && gallery.length >= limits.max_gallery}>
                            <span><Plus className="mr-1 h-3.5 w-3.5" /> Add Photos</span>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={!isUnlimited(limits.max_gallery) && gallery.length >= limits.max_gallery}
                            onChange={handleGalleryUpload}
                          />
                        </label>
                      </div>

                      {!isUnlimited(limits.max_gallery) && gallery.length >= limits.max_gallery && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            You've reached the {planName} plan limit of {limits.max_gallery} photos.
                          </span>
                          <Link to="/pricing" className="font-medium text-primary hover:underline">Upgrade</Link>
                        </div>
                      )}

                      {gallery.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                          <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">Add photos of your completed work to attract clients.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {gallery.map((item, i) => (
                            <div key={i} className="group relative">
                              <img
                                src={item.media_url}
                                alt={item.alt_text || `Gallery ${i + 1}`}
                                className="aspect-square w-full rounded-xl object-cover border border-border"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeGalleryItem(i)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Input
                                value={item.caption}
                                onChange={e => {
                                  const updated = [...gallery];
                                  updated[i] = { ...item, caption: e.target.value };
                                  setGallery(updated);
                                }}
                                placeholder="Caption"
                                className="mt-1 text-xs h-7"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* STEP 3: Credentials */}
              {step === 3 && (
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Years of Experience</Label>
                      <Input type="number" min="0" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} placeholder="e.g. 5" />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Certifications & Licenses</Label>
                      <div className="flex gap-2">
                        <Input value={newCert} onChange={e => setNewCert(e.target.value)} placeholder="e.g. Licensed Electrician" onKeyDown={e => {
                          if (e.key === "Enter" && newCert.trim()) {
                            setCertifications(prev => [...prev, newCert.trim()]);
                            setNewCert("");
                          }
                        }} />
                        <Button size="sm" variant="outline" onClick={() => {
                          if (newCert.trim()) {
                            setCertifications(prev => [...prev, newCert.trim()]);
                            setNewCert("");
                          }
                        }}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                      {certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {certifications.map((cert, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {cert}
                              <button onClick={() => setCertifications(prev => prev.filter((_, j) => j !== i))}>
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Languages</Label>
                      <div className="flex gap-2">
                        <Input value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="e.g. Swahili" onKeyDown={e => {
                          if (e.key === "Enter" && newLang.trim()) {
                            setLanguages(prev => [...prev, newLang.trim()]);
                            setNewLang("");
                          }
                        }} />
                        <Button size="sm" variant="outline" onClick={() => {
                          if (newLang.trim()) {
                            setLanguages(prev => [...prev, newLang.trim()]);
                            setNewLang("");
                          }
                        }}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {languages.map((lang, i) => (
                          <Badge key={i} variant="outline" className="gap-1">
                            {lang}
                            <button onClick={() => setLanguages(prev => prev.filter((_, j) => j !== i))}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* STEP 4: Contact */}
              {step === 4 && (
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> M-Pesa Phone</Label>
                      <Input value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} placeholder="0712345678" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp Number</Label>
                      <Input value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} placeholder="0712345678" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website URL</Label>
                      <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://example.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Rate (KES)</Label>
                        <Input type="number" min="0" value={rateKes} onChange={e => setRateKes(e.target.value)} placeholder="e.g. 2000" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Rate Type</Label>
                        <Select value={rateType} onValueChange={setRateType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="project">Per Project</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* STEP 5: Preview */}
              {step === 5 && (
                <div className="space-y-6">
                  {/* Mini preview */}
                  <Card className="overflow-hidden">
                    {(heroUrl || heroFile) && (
                      <div className="h-40 w-full overflow-hidden">
                        <img
                          src={heroFile ? URL.createObjectURL(heroFile) : heroUrl}
                          alt="Hero"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="pt-5 space-y-3">
                      <h2 className="text-xl font-extrabold text-foreground">{businessName || "Your Business Name"}</h2>
                      {tagline && <p className="text-sm text-muted-foreground">{tagline}</p>}
                      {locationName && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {locationName}
                        </span>
                      )}
                      {bio && <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>}

                      {services.filter(s => s.custom_name).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Services</p>
                          <div className="flex flex-wrap gap-1.5">
                            {services.filter(s => s.custom_name).map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s.custom_name}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {gallery.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {gallery.slice(0, 4).map((g, i) => (
                            <img key={i} src={g.media_url} alt={g.alt_text || `Gallery ${i+1}`} className="aspect-square rounded-lg object-cover border border-border" />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="rounded-xl bg-accent/50 p-4 text-center space-y-2">
                    <CheckCircle className="mx-auto h-8 w-8 text-primary" />
                    <h3 className="font-bold text-foreground">Profile {completeness}% Complete</h3>
                    <p className="text-sm text-muted-foreground">
                      {completeness >= 80 ? "Looking great! Your profile is ready to publish." :
                       completeness >= 50 ? "Good progress! Consider adding more details to stand out." :
                       "Keep going! A complete profile gets more clients."}
                    </p>
                    <Progress value={completeness} className="h-2 mx-auto max-w-xs" />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => step === 0 ? navigate("/dashboard/businesses") : setStep(s => s - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 0 ? "Dashboard" : "Back"}
            </Button>

            <div className="flex gap-2">
              {step < STEPS.length - 1 ? (
                <Button onClick={handleNext} disabled={saving || uploading || (step === 0 && !businessName.trim())}>
                  {(saving || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save & Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate(`/pro/${slug || id}`)}>
                    <Eye className="mr-1.5 h-4 w-4" /> Preview
                  </Button>
                  <Button onClick={handlePublish} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publish Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BusinessProfileWizard;
