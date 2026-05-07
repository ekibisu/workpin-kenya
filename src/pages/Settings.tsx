import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountrySelect from "@/components/CountrySelect";
import RegionSelect from "@/components/RegionSelect";
import { toast } from "@/hooks/use-toast";
import { useActiveCountry } from "@/contexts/CountryContext";

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const { setActiveCountry } = useActiveCountry();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countryCode, setCountryCode] = useState("KE");
  const [regionId, setRegionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("country_code, region_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCountryCode((data as any).country_code || "KE");
          setRegionId((data as any).region_id || null);
        }
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ country_code: countryCode, region_id: regionId } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setActiveCountry(countryCode);
    toast({ title: "Preferences saved" });
  };

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
          <h1 className="mb-6 text-2xl font-extrabold text-foreground">Settings</h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <CountrySelect
                  value={countryCode}
                  onChange={(c) => {
                    setCountryCode(c);
                    setRegionId(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Filters pros and services to this country.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Region</Label>
                <RegionSelect
                  countryCode={countryCode}
                  value={regionId}
                  onChange={setRegionId}
                />
              </div>

              <Button onClick={save} disabled={saving} className="shadow-brand-3d">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
