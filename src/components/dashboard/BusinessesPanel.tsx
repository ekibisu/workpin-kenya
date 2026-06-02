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
  BadgeCheck, Clock, ShieldAlert,
} from "lucide-react";
import CreateBusinessForm from "./CreateBusinessForm";
import { computeCompleteness } from "@/lib/profileCompleteness";
import { useOwnerBusinesses, type BusinessWithMeta } from "@/hooks/useNewSchemaQueries";

type Business = BusinessWithMeta;

const BusinessesPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: businessesData = [], isLoading: loading, refetch } = useOwnerBusinesses(user?.id ?? "");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState("free");

  useEffect(() => {
    setBusinesses(businessesData as Business[]);
  }, [businessesData]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setSubscriptionTier(data?.subscription_tier || "free"));
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

              <div className="mb-2 flex items-center gap-1.5 text-xs">
                {biz.is_verified && biz.verification_id_url ? (
                  <span className="flex items-center gap-1 font-medium text-green-600">
                    <BadgeCheck className="h-4 w-4 text-green-500" /> Verified
                  </span>
                ) : biz.verification_id_url ? (
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <Clock className="h-4 w-4 text-amber-500" /> Pending review
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/business/${biz.id}/setup`)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    Get verified
                  </button>
                )}
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

              {/* Completeness */}
              {(() => {
                const score = computeCompleteness({
                  business_name: biz.business_name,
                  bio: biz.bio,
                  location_name: biz.location_name,
                  galleryCount: biz.galleryCount,
                  servicesCount: biz.servicesCount,
                  faqCount: biz.faqCount,
                });
                return (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Profile: {score}%</span>
                      {score < 60 && (
                        <Button size="sm" variant="ghost" className="h-auto py-0 px-1 text-xs text-primary" onClick={() => navigate(`/business/${biz.id}/setup`)}>
                          <Wand2 className="mr-1 h-3 w-3" /> Set Up
                        </Button>
                      )}
                    </div>
                    <Progress value={score} className="h-1.5" />
                  </div>
                );
              })()}

              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/business/${biz.id}/setup`)}
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  Edit Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/business/${biz.id}`)}
                >
                  <Settings className="h-3.5 w-3.5" />
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
