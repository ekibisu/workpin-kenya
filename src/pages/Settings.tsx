import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountrySelect from "@/components/CountrySelect";
import RegionSelect from "@/components/RegionSelect";
import { toast } from "@/hooks/use-toast";
import { useActiveCountry } from "@/contexts/CountryContext";

const KE_PHONE_RE = /^(?:(?:\+?254)|0)(7\d{8}|1\d{8})$/;
const normalizeKePhone = (v: string) => {
  const digits = v.replace(/\s|-/g, "");
  const m = digits.match(KE_PHONE_RE);
  if (!m) return null;
  return "254" + m[1];
};

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const { setActiveCountry } = useActiveCountry();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countryCode, setCountryCode] = useState("KE");
  const [regionId, setRegionId] = useState<string | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState<string>("");
  const [savedMpesaPhone, setSavedMpesaPhone] = useState<string>("");
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("country_code, region_id, mpesa_phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCountryCode((data as any).country_code || "KE");
          setRegionId((data as any).region_id || null);
          const p = (data as any).mpesa_phone || "";
          setMpesaPhone(p);
          setSavedMpesaPhone(p);
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

  const savePayout = async () => {
    if (!user) return;
    const normalized = normalizeKePhone(mpesaPhone);
    if (!normalized) {
      toast({
        title: "Invalid phone number",
        description: "Enter a Kenyan number like 0712345678 or 254712345678.",
        variant: "destructive",
      });
      return;
    }
    setSavingPayout(true);
    const { error } = await supabase
      .from("profiles")
      .update({ mpesa_phone: normalized } as any)
      .eq("id", user.id);
    setSavingPayout(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setMpesaPhone(normalized);
    setSavedMpesaPhone(normalized);
    toast({ title: "Payout method saved" });
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Payout Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                <Input
                  id="mpesa-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="0712345678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Kenyan Safaricom number (e.g. 0712345678 or 254712345678). Payouts from your wallet will be sent here.
                </p>
                {savedMpesaPhone && (
                  <p className="text-xs text-primary">
                    Current: {savedMpesaPhone}
                  </p>
                )}
              </div>
              <Button
                onClick={savePayout}
                disabled={savingPayout || mpesaPhone === savedMpesaPhone}
                className="shadow-brand-3d"
              >
                {savingPayout ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Payout Method
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
