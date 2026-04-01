import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateBusinessFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (business: any) => void;
  redirectToWizard?: boolean;
}

interface ServiceOption {
  id: string;
  name: string;
  category: string;
}

const CreateBusinessForm = ({ open, onOpenChange, onCreated, redirectToWizard = true }: CreateBusinessFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [rateKes, setRateKes] = useState("");
  const [rateType, setRateType] = useState("hourly");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    supabase
      .from("services")
      .select("id, name, category")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setServices((data as ServiceOption[]) || []));
  }, []);

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const handleSubmit = async () => {
    if (!user || !businessName.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("businesses")
      .insert({
        owner_id: user.id,
        business_name: businessName.trim(),
        bio: bio.trim() || null,
        categories: selectedCategories,
        rate_kes: rateKes ? Number(rateKes) : null,
        rate_type: rateType,
        mpesa_phone: mpesaPhone.trim() || null,
        location_name: locationName.trim() || null,
      })
      .select("id, business_name, bio, categories, avg_rating, total_reviews, is_active, location_name, rate_kes, rate_type")
      .single();

    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Reset form
    setBusinessName("");
    setBio("");
    setSelectedCategories([]);
    setRateKes("");
    setRateType("hourly");
    setMpesaPhone("");
    setLocationName("");
    onCreated(data);
    if (redirectToWizard && data?.id) {
      navigate(`/business/${data.id}/setup`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Create a Business</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Business Name *</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. John's Plumbing"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Bio / Description</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients what you do..."
              rows={3}
              className="resize-none"
            />
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
                    selectedCategories.includes(svc.name)
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
              <Input
                type="number"
                min="0"
                value={rateKes}
                onChange={(e) => setRateKes(e.target.value)}
                placeholder="e.g. 2000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rate Type</Label>
              <Select value={rateType} onValueChange={setRateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <Input
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="e.g. 0712345678"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Westlands, Nairobi"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!businessName.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Business
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBusinessForm;
