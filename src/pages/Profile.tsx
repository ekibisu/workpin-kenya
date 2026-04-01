import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Mail, Phone, Briefcase, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProfileData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  location_name: string | null;
  mpesa_phone: string | null;
  subscription_tier: string;
}

interface BusinessSummary {
  id: string;
  business_name: string;
  categories: string[] | null;
  is_active: boolean;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone, avatar_url, location_name, mpesa_phone, subscription_tier").eq("id", user.id).maybeSingle(),
        supabase.from("businesses").select("id, business_name, categories, is_active").eq("owner_id", user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(p as ProfileData);
      setBusinesses((b as BusinessSummary[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container max-w-2xl py-10">
          <h1 className="mb-6 text-2xl font-extrabold text-foreground">My Profile</h1>

          {/* Personal Info Card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">{profile?.full_name || "No name set"}</h2>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {profile?.email && (
                    <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{profile.email}</p>
                  )}
                  {profile?.phone && (
                    <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{profile.phone}</p>
                  )}
                  {profile?.location_name && (
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{profile.location_name}</p>
                  )}
                </div>
                <Badge variant="outline" className="mt-3 text-[10px]">
                  {profile?.subscription_tier || "free"} plan
                </Badge>
              </div>
            </div>
          </div>

          {/* Businesses Section */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">My Businesses</h2>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/businesses">
                  <Settings className="mr-1.5 h-3.5 w-3.5" /> Manage
                </Link>
              </Button>
            </div>

            {businesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                <Briefcase className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No businesses yet.</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/dashboard/businesses">Create a Business</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {businesses.map((biz) => (
                  <Link
                    key={biz.id}
                    to={`/business/${biz.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <div>
                      <h3 className="font-semibold text-foreground">{biz.business_name}</h3>
                      {biz.categories && biz.categories.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {biz.categories.slice(0, 3).map(c => (
                            <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge variant={biz.is_active ? "default" : "secondary"} className="text-[10px]">
                      {biz.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
