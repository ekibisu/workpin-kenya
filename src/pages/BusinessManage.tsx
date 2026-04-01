import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2, ArrowLeft, Save, MapPin, Star,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BusinessData {
  id: string;
  business_name: string;
  bio: string | null;
  categories: string[] | null;
  avg_rating: number | null;
  total_reviews: number | null;
  is_active: boolean;
  location_name: string | null;
  rate_kes: number | null;
  rate_type: string | null;
  mpesa_phone: string | null;
  owner_id: string;
}

interface ServiceOption {
  id: string;
  name: string;
}

const BusinessManage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [biz, setBiz] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);

  // Editable fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [rateKes, setRateKes] = useState("");
  const [rateType, setRateType] = useState("hourly");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    const fetchBiz = async () => {
      const [{ data }, { data: svcData }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, business_name, bio, categories, avg_rating, total_reviews, is_active, location_name, rate_kes, rate_type, mpesa_phone, owner_id")
          .eq("id", id)
          .eq("owner_id", user.id)
          .maybeSingle(),
        supabase
          .from("services")
          .select("id, name")
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      if (!data) {
        toast({ title: "Not found", description: "Business not found or access denied.", variant: "destructive" });
        navigate("/dashboard/businesses");
        return;
      }
      setBiz(data as BusinessData);
      setName(data.business_name);
      setBio(data.bio || "");
      setCategories(data.categories || []);
      setRateKes(data.rate_kes?.toString() || "");
      setRateType(data.rate_type || "hourly");
      setMpesaPhone(data.mpesa_phone || "");
      setLocationName(data.location_name || "");
      setServices((svcData as ServiceOption[]) || []);
      setLoading(false);
    };
    fetchBiz();
  }, [id, user]);

  const toggleCategory = (svcName: string) => {
    setCategories(prev =>
      prev.includes(svcName) ? prev.filter(c => c !== svcName) : [...prev, svcName]
    );
  };

  const handleSave = async () => {
    if (!id || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        business_name: name.trim(),
        bio: bio.trim() || null,
        categories,
        rate_kes: rateKes ? Number(rateKes) : null,
        rate_type: rateType,
        mpesa_phone: mpesaPhone.trim() || null,
        location_name: locationName.trim() || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Business updated" });
  };

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
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/dashboard/businesses")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Businesses
          </Button>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">{biz?.business_name}</h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                {biz?.location_name && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{biz.location_name}</span>
                )}
                {(biz?.avg_rating ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    {Number(biz?.avg_rating).toFixed(1)} ({biz?.total_reviews} reviews)
                  </span>
                )}
                <Badge variant={biz?.is_active ? "default" : "secondary"} className="text-[10px]">
                  {biz?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="services" className="flex-1">Services</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
                <div className="space-y-1.5">
                  <Label>Business Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Bio</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="resize-none" />
                </div>

                <div className="space-y-1.5">
                  <Label>Service Categories</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleCategory(svc.name)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          categories.includes(svc.name)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {svc.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Rate (KES)</Label>
                    <Input type="number" min="0" value={rateKes} onChange={(e) => setRateKes(e.target.value)} />
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

                <div className="space-y-1.5">
                  <Label>M-Pesa Phone</Label>
                  <Input value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="0712345678" />
                </div>

                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g. Westlands, Nairobi" />
                </div>

                <Button disabled={!name.trim() || saving} onClick={handleSave} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-1.5 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="services">
              <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Fixed-price services management coming soon.
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BusinessManage;
