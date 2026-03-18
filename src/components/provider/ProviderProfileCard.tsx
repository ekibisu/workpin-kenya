import { useEffect, useState, useRef, useCallback } from "react";
import { Star, MapPin, CheckCircle2, Loader2, XCircle, Check, Camera, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
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
}

interface ProfileData {
  full_name: string;
  phone: string;
  email: string;
  provider_profiles: ProviderProfile;
}

const ProviderProfileCard = ({ userId }: ProviderProfileCardProps) => {

  // TODO: Replace with actual ownership logic
  const isOwner = true;

  const servicesRef = useRef<HTMLDivElement | null>(null);
  const reviewsRef = useRef<HTMLDivElement | null>(null);
  const portfolioRef = useRef<HTMLDivElement | null>(null);

  const scrollToServices = useCallback(() => {
    servicesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToReviews = useCallback(() => {
    reviewsRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToPortfolio = useCallback(() => {
    portfolioRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [hours, setHours] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");

  const { toast } = useToast();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];

  const fetchFullProfile = async () => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select(`
        full_name, phone, email,
        provider_profiles (
          business_name, bio, avg_rating, total_reviews,
          is_verified, categories, availability_json,
          portfolio_photos, response_time_minutes, location_name
        )
      `)
      .eq("id", userId)
      .maybeSingle();

    if (profileData) {
      // Ensure portfolio_photos is always an array
      if (profileData.provider_profiles) {
        if (!Array.isArray(profileData.provider_profiles.portfolio_photos)) {
          profileData.provider_profiles.portfolio_photos = [];
        }
      }
      setData(profileData as ProfileData);

      // Validate that availability_json is a record of string:string
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

  useEffect(() => {
    fetchFullProfile();
  }, [userId]);


  const handleSaveHours = async () => {

    const { error } = await supabase
      .from("provider_profiles")
      .update({ availability_json: hours })
      .eq("user_id", userId);

    if (!error) {
      toast({ title: "Business hours saved" });
      fetchFullProfile();
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `profile-photos/${userId}-${Math.random()}.${fileExt}`;

    await supabase.storage
      .from("avatars_pro")
      .upload(filePath, file, { upsert: true });

    const { data: { publicUrl } } = supabase.storage
      .from("avatars_pro")
      .getPublicUrl(filePath);

    const currentPhotos = data?.provider_profiles?.portfolio_photos || [];

    const updatedPhotos = [...currentPhotos, publicUrl].slice(0, 4);

    await supabase
      .from("provider_profiles")
      .update({ portfolio_photos: updatedPhotos })
      .eq("user_id", userId);

    setUploading(false);

    toast({ title: "Photo uploaded" });

    fetchFullProfile();
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!data) return <div className="p-8 text-center">Provider not found.</div>;

  const prov = data.provider_profiles;
  const availability = prov?.availability_json || {};

  return (

    <div className="max-w-5xl mx-auto bg-white text-slate-800">

      {/* HEADER */}
      <section className="flex flex-col md:flex-row justify-between pt-8 pb-4 px-4 gap-8">
        {/* Left: Info and Actions */}
        <div className="flex-1 flex flex-col space-y-3">
          {/* BUSINESS NAME */}
          <h1 className="text-3xl font-bold uppercase">
            {prov.business_name || "Business Name"}
          </h1>
          <p className="text-xl text-slate-600">{data.full_name}</p>
          {/* LOCATION */}
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{prov?.location_name || "Location not set"}</span>
          </div>
          {/* BIO */}
          <p className="text-slate-500 italic">{prov.bio || "No description provided."}</p>

          {/* --- ACTION BUTTONS --- */}
          <div className="flex gap-4 pt-4 w-full md:w-auto mt-4">
            <Button className="bg-[#16a34a] hover:bg-[#15803d] text-white px-10 py-6 font-bold uppercase text-xs tracking-widest rounded-sm">
              Request a Quote
            </Button>
            <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[#16a34a] text-[#16a34a] px-10 py-6 font-bold uppercase text-xs tracking-widest rounded-sm"
                >
                  Book Now
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Date & Time</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    fromDate={new Date()}
                    disabled={(date) => {
                      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"][date.getDay()];
                      return hours[dayName] === "Closed";
                    }}
                  />
                  <div>
                    <label className="block mb-1 font-medium">Time</label>
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      onClick={() => {
                        if (!selectedDate || !selectedTime) {
                          toast({
                            variant: "destructive",
                            title: "Select date and time",
                            description: "Please select both a date and time to book.",
                          });
                          setCalendarOpen(true);
                          return;
                        }
                        toast({
                          title: "Booking requested",
                          description: `You selected ${selectedDate.toLocaleDateString()} at ${selectedTime}`,
                        });
                        setSelectedDate(undefined);
                        setSelectedTime("");
                      }}
                      className="bg-[#16a34a] text-white"
                    >
                      Confirm Booking
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Right: Profile Photo Box */}
        <div className="relative group w-64 h-72 bg-slate-100 rounded-sm overflow-hidden border shadow-sm self-start">
          <img 
            src={prov?.portfolio_photos?.[0] || "https://via.placeholder.com/300?text=No+Image"} 
            alt="Provider Profile" 
            className="w-full h-full object-cover"
          />
          {isOwner && (
            (prov?.portfolio_photos?.length === 0 || !prov?.portfolio_photos?.[0]) ? (
              // Always show upload button if no photo
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="shadow-xl flex gap-2 font-bold"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload Photo"}
                </Button>
              </div>
            ) : null
          )}
        </div>
      </section>


      {/* BUSINESS HOURS & PAYMENT METHODS ROW */}
      <div className="p-8 flex flex-col md:flex-row gap-8">
        {/* Business Hours (left) */}
        <div className="flex-1 min-w-[220px]">
          <h3 className="font-bold mb-3">Business Hours</h3>
          <div className="space-y-1">
            {days.map((day) => (
              <div key={day} className="flex justify-between">
                <span>{day}</span>
                <span>{availability[day] || "Closed"}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Payment Methods (right) */}
        <div className="flex-1 min-w-[220px]">
          <h3 className="font-bold mb-3">Payment Methods</h3>
          <p className="text-slate-600">
            This pro accepts Cash, Cheque, Credit Card, and M-Pesa.
          </p>
        </div>
      </div>
      
      

      {/* SERVICES */}

      <div ref={servicesRef} className="p-10 bg-green-600 text-white text-center">

        <h2 className="text-xl font-bold mb-6">Services</h2>

        <div className="flex flex-wrap justify-center gap-3">

          {prov?.categories?.map((cat: string) => (
            <Badge key={cat} className="bg-white text-green-800">
              <Check size={14} /> {cat}
            </Badge>
          ))}

        </div>

      </div>

      {/* PORTFOLIO */}

      <section ref={portfolioRef} className="px-4 py-12">

        <h2 className="text-xl font-bold mb-8">Portfolio Photos</h2>

        <div className="grid md:grid-cols-3 gap-4">

          {prov?.portfolio_photos?.slice(1, 4).map((url: string, index: number) => (
            <img
              key={index}
              src={url}
              className="w-full h-48 object-cover rounded"
            />
          ))}

        </div>

      </section>

    </div>
  );
};

export default ProviderProfileCard;