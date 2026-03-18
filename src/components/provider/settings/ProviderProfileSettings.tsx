import { useEffect, useState, useRef, useCallback } from "react";
import {
  Star,
  MapPin,
  CheckCircle2,
  Loader2,
  XCircle,
  Check,
  Camera,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface ProviderProfileCardProps {
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
}

interface ProfileData {
  full_name: string;
  phone: string;
  email: string;
  provider_profiles: ProviderProfile;
}

const ProviderAccountSettings = ({ userId }: ProviderProfileCardProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Handle photo upload
  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `profile-photos/${userId}-${Math.random()}.${fileExt}`;
    await supabase.storage
      .from("avatars_pro")
      .upload(filePath, file, { upsert: true });
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars_pro").getPublicUrl(filePath);
    const currentPhotos = data?.provider_profiles?.portfolio_photos || [];
    const updatedPhotos = [publicUrl, ...currentPhotos.slice(1, 4)];
    await supabase
      .from("provider_profiles")
      .update({ portfolio_photos: updatedPhotos })
      .eq("user_id", userId);
    setUploading(false);
    toast({ title: "Photo uploaded" });
    // Refetch profile to update photo
    const { data: profileData } = await supabase
      .from("profiles")
      .select(
        `
          full_name, phone, email,
          provider_profiles (
            business_name, bio, avg_rating, total_reviews,
            is_verified, categories, availability_json,
            portfolio_photos, response_time_minutes, location_name
          )
        `,
      )
      .eq("id", userId)
      .maybeSingle();
    if (profileData) setData(profileData as unknown as ProfileData);
  };
  const { toast } = useToast();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          `
          full_name, phone, email, location_name,
          provider_profiles (
            business_name, bio, avg_rating, total_reviews,
            is_verified, categories, availability_json,
            portfolio_photos, response_time_minutes
          )
        `,
        )
        .eq("id", userId)
        .maybeSingle();
      if (profileData) {
        setData(profileData as ProfileData);
        setBusinessName(profileData.provider_profiles?.business_name || "");
        setBio(profileData.provider_profiles?.bio || "");
        setLocation(profileData.location_name || "");
        // Fix: Only set hours if availability_json is a record of string:string
        const avail = profileData.provider_profiles?.availability_json;
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
    fetchProfile();
  }, [userId]);

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
    <div className="max-w-5xl mx-auto bg-white text-slate-800">
      {/* Profile Information Section */}
      <h2 className="text-2xl font-bold mb-6 px-4 pt-8 bg-green-50 rounded-md py-4">
        Profile Information
      </h2>
      <section className="flex flex-col md:flex-row justify-between pb-4 px-4 gap-8">
        {/* Left: Editable Info */}
        <div className="flex-1 flex flex-col space-y-3">
          <h1 className="text-3xl font-bold uppercase">
            <Input
              className="text-3xl font-bold uppercase bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business Name"
            />
          </h1>
          <p className="text-xl text-slate-600">{data.full_name}</p>
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
              className="text-slate-500 italic bg-transparent border rounded p-2 min-h-[60px] w-full"
              value={bio}
              onChange={(e) => {
                const newValue = e.target.value;
                const newWords = newValue.trim().split(/\s+/).filter(Boolean);
                const prevWords = bio.trim().split(/\s+/).filter(Boolean);
                // If new value is shorter, always allow (removal)
                if (newValue.length < bio.length) {
                  setBio(newValue);
                } else if (newWords.length <= 15) {
                  setBio(newValue);
                } else if (newWords.length < prevWords.length) {
                  setBio(newValue);
                }
                // Otherwise, block input (do not update state)
              }}
              placeholder="No description provided."
              maxLength={500}
            />
            <div className="text-xs text-right text-slate-400 mt-1">
              {bio.trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>
          <div className="flex gap-4 pt-4 w-full md:w-auto mt-4">
            <Button
              className="bg-[#16a34a] hover:bg-[#15803d] text-white px-10 py-6 font-bold uppercase text-xs tracking-widest rounded-sm"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </div>
        {/* Right: Profile Photo Box (display only, editing not implemented here) */}
        <div className="relative group w-64 h-72 bg-slate-100 rounded-sm overflow-hidden border shadow-sm self-start">
          <img
            src={
              data?.provider_profiles?.portfolio_photos?.[0] ||
              "https://via.placeholder.com/300?text=No+Image"
            }
            alt="Provider Profile"
            className="w-full h-full object-cover"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handlePhotoUpload}
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
        {/* Business Hours (left) */}
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
              // If the current value is not in the options, show it as the first option
              const showCurrent = !options.includes(current);
              return (
                <div key={day} className="flex items-center gap-9 mb-1 ">
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
          {data?.provider_profiles?.portfolio_photos
            ?.slice(1, 4)
            .map((url: string, index: number) => (
              <div
                key={index}
                className="relative w-full h-48 rounded overflow-hidden group"
              >
                <img src={url} className="w-full h-48 object-cover rounded" />
                <input
                  id={`portfolio-upload-${index}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    const fileExt = file.name.split(".").pop();
                    const filePath = `portfolio-photos/${userId}-${Date.now()}.${fileExt}`;
                    await supabase.storage
                      .from("avatars_pro")
                      .upload(filePath, file, { upsert: true });
                    const {
                      data: { publicUrl },
                    } = supabase.storage
                      .from("avatars_pro")
                      .getPublicUrl(filePath);
                    const currentPhotos =
                      data?.provider_profiles?.portfolio_photos || [];
                    // Replace the selected photo (index+1 because slice(1,4))
                    const updatedPhotos = [...currentPhotos];
                    updatedPhotos[index + 1] = publicUrl;
                    await supabase
                      .from("provider_profiles")
                      .update({ portfolio_photos: updatedPhotos })
                      .eq("user_id", userId);
                    setUploading(false);
                    toast({ title: "Portfolio photo updated" });
                    // Refetch profile to update photos
                    const { data: profileData } = await supabase
                      .from("profiles")
                      .select(
                        `
                      full_name, phone, email, location_name,
                      provider_profiles (
                        business_name, bio, avg_rating, total_reviews,
                        is_verified, categories, availability_json,
                        portfolio_photos, response_time_minutes
                      )
                    `,
                      )
                      .eq("id", userId)
                      .maybeSingle();
                    if (profileData) setData(profileData as ProfileData);
                  }}
                  disabled={uploading}
                />
                <label
                  htmlFor={`portfolio-upload-${index}`}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded shadow hover:bg-black/90 text-xs font-semibold cursor-pointer"
                  style={{ zIndex: 2 }}
                >
                  {uploading ? "Uploading..." : "Change Photo"}
                </label>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default ProviderAccountSettings;
