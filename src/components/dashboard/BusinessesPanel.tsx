import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Briefcase, MapPin, Star, Loader2, Settings, Eye, EyeOff, Wand2,
} from "lucide-react";
import CreateBusinessForm from "./CreateBusinessForm";
import { computeCompleteness } from "@/lib/profileCompleteness";

interface Business {
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
}

const BusinessesPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [bizMeta, setBizMeta] = useState<Record<string, { galleryCount: number; servicesCount: number; faqCount: number }>>({});

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [{ data: bizData }, { data: profile }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, business_name, bio, categories, avg_rating, total_reviews, is_active, location_name, rate_kes, rate_type")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      const bizList = (bizData as Business[]) || [];
      setBusinesses(bizList);
      setSubscriptionTier(profile?.subscription_tier || "free");

      // Fetch counts for completeness
      if (bizList.length > 0) {
        const ids = bizList.map(b => b.id);
        const [{ data: svcCounts }, { data: galCounts }, { data: faqCounts }] = await Promise.all([
          supabase.from("business_services").select("business_id").in("business_id", ids),
          supabase.from("business_gallery").select("business_id").in("business_id", ids),
          supabase.from("business_faqs").select("business_id").in("business_id", ids),
        ]);
        const meta: Record<string, { galleryCount: number; servicesCount: number; faqCount: number }> = {};
        ids.forEach(id => {
          meta[id] = {
            servicesCount: (svcCounts || []).filter((r: any) => r.business_id === id).length,
            galleryCount: (galCounts || []).filter((r: any) => r.business_id === id).length,
            faqCount: (faqCounts || []).filter((r: any) => r.business_id === id).length,
          };
        });
        setBizMeta(meta);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const maxBusinesses = subscriptionTier === "pro" ? 5 : 1;
  const canCreate = businesses.length < maxBusinesses;

  const handleToggleActive = async (bizId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("businesses")
      .update({ is_active: !currentActive })
      .eq("id", bizId);
    if (error) {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
      return;
    }
    setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, is_active: !currentActive } : b));
    toast({ title: !currentActive ? "Business activated" : "Business deactivated" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Businesses</h2>
          <p className="text-sm text-muted-foreground">
            {businesses.length} of {maxBusinesses} business{maxBusinesses !== 1 ? "es" : ""} ({subscriptionTier} plan)
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          disabled={!canCreate}
          size="sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Business
        </Button>
      </div>

      {businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-14 text-center">
          <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <h3 className="text-base font-semibold text-foreground">No businesses yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a business to start offering services and receiving job requests from clients.
          </p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Your First Business
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {businesses.map((biz) => (
            <div
              key={biz.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{biz.business_name}</h3>
                <Badge variant={biz.is_active ? "default" : "secondary"} className="text-[10px]">
                  {biz.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {biz.bio && (
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{biz.bio}</p>
              )}

              {biz.categories && biz.categories.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {biz.categories.slice(0, 4).map((cat) => (
                    <Badge key={cat} variant="outline" className="text-[10px]">
                      {cat}
                    </Badge>
                  ))}
                  {biz.categories.length > 4 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{biz.categories.length - 4}
                    </Badge>
                  )}
                </div>
              )}

              <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
                {biz.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {biz.location_name}
                  </span>
                )}
                {(biz.avg_rating ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {Number(biz.avg_rating).toFixed(1)} ({biz.total_reviews})
                  </span>
                )}
                {biz.rate_kes && (
                  <span>KES {biz.rate_kes}/{biz.rate_type || "hr"}</span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/business/${biz.id}`)}
                >
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  Manage
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(biz.id, biz.is_active)}
                >
                  {biz.is_active ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateBusinessForm
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(newBiz) => {
          setBusinesses(prev => [newBiz as Business, ...prev]);
          setShowCreate(false);
          toast({ title: "Business created!", description: "You can now start receiving job requests." });
        }}
      />
    </div>
  );
};

export default BusinessesPanel;
