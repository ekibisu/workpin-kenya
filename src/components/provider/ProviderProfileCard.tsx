import { useEffect, useState } from "react";
import { Star, MapPin, CheckCircle2, Loader2, XCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}

interface ProfileData {
  full_name: string;
  phone: string;
  email: string;
  location_name: string;
  provider_profiles: ProviderProfile;
}

const ProviderProfileCard = ({ userId }: ProviderProfileCardProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);

  useEffect(() => {
    const fetchFullProfile = async () => {
      // Fetching joined data from profiles and provider_profiles
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(`
          full_name, phone, email, location_name,
          provider_profiles (
            business_name, bio, avg_rating, total_reviews, 
            is_verified, categories, availability_json, 
            portfolio_photos, response_time_minutes
          )
        `)
        .eq("id", userId)
        .maybeSingle();

      if (profileData) {
        setData(profileData as ProfileData);
      }
      setLoading(false);
    };

    fetchFullProfile();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div>Provider not found.</div>;

  const prov = data.provider_profiles;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];
  const availability = prov?.availability_json || {};

  return (
    <div className="max-w-5xl mx-auto bg-white font-sans text-slate-800">
      {/* --- HEADER SECTION --- */}
      <section className="flex flex-col md:flex-row justify-between pt-8 pb-4 px-4 gap-8">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-900">
              {prov?.business_name || "BUSINESS NAME"}
            </h1>
            {prov?.is_verified && <CheckCircle2 className="h-6 w-6 text-green-500 fill-white" />}
          </div>
          
          <p className="text-xl text-slate-600 font-medium">{data.full_name}</p>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill={i < Math.floor(prov?.avg_rating || 0) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="font-bold ml-1">{prov?.avg_rating || "0.0"}</span>
              <span className="text-slate-500 text-sm">({prov?.total_reviews || 0} Reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <MapPin size={16} />
              <span>{data.location_name || "Location not set"}</span>
            </div>
          </div>

          <p className="text-slate-500 italic max-w-lg text-sm leading-relaxed">
            {prov?.bio || "No description provided."}
          </p>

          <div className="flex gap-4 pt-4">
            <Button className="bg-[#16a34a] hover:bg-[#15803d] text-white px-10 py-6 font-bold uppercase text-xs tracking-widest rounded-sm">
              Request a Quote
            </Button>
            <Button variant="outline" className="border-[#16a34a] text-[#16a34a] px-10 py-6 font-bold uppercase text-xs tracking-widest rounded-sm">
              Book Now
            </Button>
          </div>
        </div>

        <div className="w-64 h-72 rounded-sm overflow-hidden shadow-sm border">
          <img 
            src={prov?.portfolio_photos?.[0] || "https://via.placeholder.com/300"} 
            alt="Provider" 
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* --- TABS --- */}
      <div className="flex gap-10 border-b border-slate-100 px-4 mt-8 text-[11px] font-bold uppercase tracking-[0.2em]">
        <span className="pb-3 border-b-2 border-green-600 text-green-600 cursor-pointer">About</span>
        <span className="pb-3 text-slate-400 cursor-pointer">Services</span>
        <span className="pb-3 text-slate-400 cursor-pointer">Reviews</span>
        <span className="pb-3 text-slate-400 cursor-pointer">Photos</span>
      </div>

      {/* --- ABOUT & HOURS --- */}
      <div className="grid md:grid-cols-2 gap-12 p-8 text-sm">
        <div>
          <h3 className="font-bold mb-3">About</h3>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">
            {prov?.bio}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-3">Business Hours</h3>
            <div className="space-y-1 text-slate-600">
              {days.map(day => (
                <div key={day} className="flex justify-between max-w-[180px]">
                  <span>{day}</span>
                  <span>{availability[day] || "n/a"}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-3">Payment methods</h3>
            <p className="text-slate-600">This pro accepts Cash, Check, Credit Card, and M-Pesa.</p>
          </div>
        </div>
      </div>

      {/* --- SERVICES SECTION (The Green Box) --- */}
      <div className="mx-4 my-8 bg-[#16a34a] rounded-lg p-10 text-center">
        <h2 className="text-white text-xl font-bold mb-6">Services</h2>
        <div className="bg-white rounded-lg p-8 max-w-3xl mx-auto shadow-sm">
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {prov?.categories?.map((cat: string) => (
              <Badge key={cat} variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-none px-4 py-1.5 rounded-full flex gap-1">
                <Check size={14} /> {cat}
              </Badge>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-100">
            <div className="inline-flex items-center gap-2 text-slate-400 text-xs uppercase font-bold border rounded-md px-4 py-2">
              <XCircle size={14} className="text-slate-300" />
              Does not offer: Washing Machine Repair
            </div>
          </div>
        </div>
        <div className="mt-8 space-y-2">
          <Button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 font-bold uppercase px-12 py-6 rounded-sm">
            Request a Quote
          </Button>
          <p className="text-white text-xs opacity-90">Free quote with no obligation</p>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfileCard;