import { useEffect, useState, useRef } from "react";
import {
  MapPin,
  Loader2,
  Camera,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Image from "@/components/ui/Image";
import { useMediaUpload } from "@/hooks/useMediaUpload";

interface ProviderProfileSettingsProps {
  userId: string;
}

interface ProviderProfile {
  business_name: string;
  bio: string;
  avg_rating: number;
  total_reviews: number;
  is_verified: boolean;
  categories: string[];
  availability_json: Record<string, string>;
  portfolio_photos: string[];
  response_time_minutes: number;
  location_name: string | null;
  username: string | null;
}

interface ProfileData {
  full_name: string;
  phone: string;
  email: string;
  provider_profiles: ProviderProfile;
}

const ProviderProfileSettings = ({ userId }: ProviderProfileSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const portfolioInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { toast } = useToast();
  const { upload, uploading } = useMediaUpload();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];

  const fetchProfile = async () => {
    setLoading(true);
    const { data: profileData } = await supabase
      .from("profiles")
      .select(`
        full_name, phone, email,
        provider_profiles (
          business_name, bio, avg_rating, total_reviews,
          is_verified, categories, availability_json,
          portfolio_photos, response_time_minutes, location_name, username
        )
      `)
      .eq("id", userId)
      .maybeSingle();

    if (profileData) {
      const typedData = profileData as unknown as ProfileData;
      if (!Array.isArray(typedData.provider_profiles?.portfolio_photos)) {
        typedData.provider_profiles.portfolio_photos = [];
      }
      setData(typedData);
      setBusinessName(typedData.provider_profiles?.business_name || "");
      setBio(typedData.provider_profiles?.bio || "");
      setLocation(typedData.provider_profiles?.location_name || "");

      const avail = typedData.provider_profiles?.availability_json;
      if (
        avail &&
        typeof avail === "object" &&
        !Array.isArray(avail) &&
        Object.values(avail).every((v) => typeof v === "string")
      ) {
        setHours(avail as Record<string, string>);
      } else {
        setHours({});
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const handleProfilePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const prov = data?.provider_profiles;
    const result = await upload({
      file,
      providerId: userId,
      providerSlug: prov?.username || userId,
      providerName: prov?.business_name,
      context: 'profile-photo',
      tags: ['profile-photo'],
    });

    if (!result) {
      toast({ title: "Upload failed", variant: "destructive" });
      return;
    }

    const currentPhotos = prov?.portfolio_photos || [];
    const updatedPhotos = [result.public_url, ...currentPhotos.slice(1)].slice(0, 4);

    await supabase
      .from("provider_profiles")
      .update({ portfolio_photos: updatedPhotos })
      .eq("user_id", userId);

    toast({ title: "Profile photo updated" });
    fetchProfile();
  };

  const handlePortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const prov = data?.provider_profiles;
    const result = await upload({
      file,
      providerId: userId,
      providerSlug: prov?.username || userId,
      providerName: prov?.business_name,
      context: 'portfolio',
      tags: ['portfolio'],
    });

    if (!result) {
      toast({ title: "Upload failed", variant: "destructive" });
      return;
    }

    const currentPhotos = [...(prov?.portfolio_photos || [])];
    // index+1 because slot 0 is profile photo
    currentPhotos[index + 1] = result.public_url;

    await supabase
      .from("provider_profiles")
      .update({ portfolio_photos: currentPhotos })
      .eq("user_id", userId);

    toast({ title: "Portfolio photo updated" });
    fetchProfile();
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("provider_profiles")
      .update({
        business_name: businessName,
        bio: bio,
        availability_json: hours,
      })
      .eq("user_id", userId);

    if (!error) {
      toast({ title: "Profile updated" });
    } else {
      toast({ title: "Update failed", variant: "destructive" });
    }
    setLoading(false);
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!data) return <div className="p-8 text-center">Provider not found.</div>;

  return (
    <div className="max-w-5xl mx-auto bg-card text-foreground">
      <h2 className="text-2xl font-bold mb-6 px-4 pt-8 bg-accent rounded-md py-4">
        Profile Information
      </h2>
      <section className="flex flex-col md:flex-row justify-between pb-4 px-4 gap-8">
        <div className="flex-1 flex flex-col space-y-3">
          <h1 className="text-3xl font-bold uppercase">
            <Input
              className="text-3xl font-bold uppercase bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business Name"
            />
          </h1>
          <p className="text-xl text-muted-foreground">{data.full_name}</p>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <Input
              className="bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
            />
          </div>
          <div className="relative">
            <textarea
              className="text-muted-foreground italic bg-transparent border rounded p-2 min-h-[60px] w-full"
              value={bio}
              onChange={(e) => {
                const newValue = e.target.value;
                const newWords = newValue.trim().split(/\s+/).filter(Boolean);
                if (newValue.length < bio.length || newWords.length <= 15) {
                  setBio(newValue);
                }
              }}
              placeholder="No description provided."
              maxLength={500}
            />
            <div className="text-xs text-right text-muted-foreground mt-1">
              {bio.trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>
          <div className="flex gap-4 pt-4 w-full md:w-auto mt-4">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 font-bold uppercase text-xs tracking-widest rounded-sm"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </div>

        {/* Profile Photo */}
        <div className="relative group w-64 h-72 bg-muted rounded-sm overflow-hidden border shadow-sm self-start">
          <Image
            src={data?.provider_profiles?.portfolio_photos?.[0]}
            alt="Provider Profile"
            className="w-full h-full object-cover"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleProfilePhotoUpload}
            disabled={uploading}
          />
          <button
            type="button"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded shadow hover:bg-black/90 text-xs font-semibold"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Change Photo"}
          </button>
        </div>
      </section>

      {/* BUSINESS HOURS */}
      <div className="p-4 flex flex-col md:flex-row gap-8">
        <div className="flex-1 min-w-[220px]">
          <h3 className="font-bold mb-3">Business Hours</h3>
          <div className="space-y-1">
            {days.map((day) => {
              const options = [
                "Closed",
                "8:00 AM - 5:00 PM",
                "9:00 AM - 6:00 PM",
                "10:00 AM - 7:00 PM",
                "7:00 AM - 3:00 PM",
                "8:00 AM - 1:00 PM",
                "Custom",
              ];
              const current = hours[day] || "Closed";
              const showCurrent = !options.includes(current);
              return (
                <div key={day} className="flex items-center gap-9 mb-1">
                  <span className="w-12 text-sm">{day}</span>
                  <Select
                    value={current}
                    onValueChange={(val) =>
                      setHours((prev) => ({ ...prev, [day]: val }))
                    }
                  >
                    <SelectTrigger className="w-44 text-sm">
                      <SelectValue>{current}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {showCurrent && (
                        <SelectItem value={current}>{current}</SelectItem>
                      )}
                      {options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Portfolio Photos */}
      <section className="px-4 py-12">
        <h2 className="text-xl font-bold mb-8">Portfolio Photos</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => {
            const url = data?.provider_profiles?.portfolio_photos?.[index + 1];
            return (
              <div
                key={index}
                className="relative w-full h-48 rounded overflow-hidden group border border-border bg-muted"
              >
                {url ? (
                  <Image
                    src={url}
                    alt={`Portfolio photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    <Camera className="h-6 w-6 mr-2" /> Add Photo
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => { portfolioInputRefs.current[index] = el; }}
                  onChange={(e) => handlePortfolioUpload(e, index)}
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded shadow hover:bg-black/90 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => portfolioInputRefs.current[index]?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : url ? "Change Photo" : "Upload"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ProviderProfileSettings;
