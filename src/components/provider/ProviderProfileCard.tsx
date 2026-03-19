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
import Image from "@/components/ui/Image";
import { useMediaUpload } from "@/hooks/useMediaUpload";

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
  username: string | null;
}

interface ProfileData {
  full_name: string;
  phone: string;
  email: string;
  provider_profiles: ProviderProfile;
}

const ProviderProfileCard = ({ userId }: ProviderProfileCardProps) => {
  const isOwner = true; // TODO: Replace with actual ownership logic

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");

  const { toast } = useToast();
  const { upload, uploading } = useMediaUpload();

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
          portfolio_photos, response_time_minutes, location_name, username
        )
      `)
      .eq("id", userId)
      .maybeSingle();

    if (profileData) {
      if (profileData.provider_profiles) {
        if (!Array.isArray(profileData.provider_profiles.portfolio_photos)) {
          profileData.provider_profiles.portfolio_photos = [];
        }
      }
      setData(profileData as unknown as ProfileData);

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
    <div className="max-w-5xl mx-auto bg-card text-foreground">
      {/* HEADER */}
      <section className="flex flex-col md:flex-row justify-between pt-8 pb-4 px-4 gap-8">
        <div className="flex-1 flex flex-col space-y-3">
          <h1 className="text-3xl font-bold uppercase">
            {prov.business_name || "Business Name"}
          </h1>
          <p className="text-xl text-muted-foreground">{data.full_name}</p>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{prov?.location_name || "Location not set"}</span>
          </div>
          <p className="text-muted-foreground italic">{prov.bio || "No description provided."}</p>

          <div className="flex gap-4 pt-4 w-full md:w-auto mt-4">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 font-bold uppercase text-xs tracking-widest rounded-sm">
              Request a Quote
            </Button>
            <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-primary text-primary px-10 py-6 font-bold uppercase text-xs tracking-widest rounded-sm"
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
                      className="bg-primary text-primary-foreground"
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
        <div className="relative group w-64 h-72 bg-muted rounded-sm overflow-hidden border shadow-sm self-start">
          <Image
            src={prov?.portfolio_photos?.[0]}
            alt={`${prov.business_name} profile photo`}
            className="w-full h-full object-cover"
          />
          {isOwner && (
            <>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded shadow hover:bg-black/90 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                ) : (
                  <Camera className="h-4 w-4 inline mr-1" />
                )}
                {uploading ? "Uploading..." : prov?.portfolio_photos?.[0] ? "Change Photo" : "Upload Photo"}
              </button>
            </>
          )}
        </div>
      </section>

      {/* BUSINESS HOURS & PAYMENT METHODS ROW */}
      <div className="p-8 flex flex-col md:flex-row gap-8">
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
        <div className="flex-1 min-w-[220px]">
          <h3 className="font-bold mb-3">Payment Methods</h3>
          <p className="text-muted-foreground">
            This pro accepts Cash, Cheque, Credit Card, and M-Pesa.
          </p>
        </div>
      </div>

      {/* SERVICES */}
      <div ref={servicesRef} className="p-10 bg-primary text-primary-foreground text-center">
        <h2 className="text-xl font-bold mb-6">Services</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {prov?.categories?.map((cat: string) => (
            <Badge key={cat} className="bg-card text-primary">
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
            <Image
              key={index}
              src={url}
              alt={`${prov.business_name} portfolio work ${index + 1}`}
              className="w-full h-48 object-cover rounded"
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProviderProfileCard;
