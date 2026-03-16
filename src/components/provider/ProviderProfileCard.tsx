import { useEffect, useState, useRef } from "react";
import MapPicker from "@/components/MapPicker";
import { Star, MapPin, CheckCircle2, Loader2, XCircle, Check, ChevronLeft, ChevronRight, Camera, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
  location_name: string;
  provider_profiles: ProviderProfile;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

const ProviderProfileCard = ({ userId }: ProviderProfileCardProps) => {
      // Location edit state
  const [editLocationMode, setEditLocationMode] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

      // Save location to backend
      const handleSaveLocation = async () => {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ location_name: locationInput })
            .eq("id", userId);
          if (error) throw error;
          toast({
            title: "Location updated",
            description: "Your location has been saved.",
          });
          setEditLocationMode(false);
          fetchFullProfile();
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Update failed",
            description: error.message || "An error occurred while saving location.",
          });
        }
      };
    // Save updated business hours to backend
  const handleSaveHours = async () => {
    try {
      console.log('Saving business hours:', hours);
      // 1. Get the provider_profiles row for this user (userId is profiles.id)
      const { data: providerProfile, error: selectError } = await supabase
        .from('provider_profiles')
        .select('id, user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (selectError) throw selectError;
      const profileId = userId;
      // 2. If no provider profile, create one
      if (!providerProfile) {
        const { data: insertData, error: insertError } = await supabase
          .from('provider_profiles')
          .insert([
            {
              user_id: profileId,
              availability_json: hours,
              business_name: 'New Provider', // Default, update as needed
            }
          ])
          .select()
          .maybeSingle();
        if (insertError) throw insertError;
        toast({
          title: 'Provider profile created',
          description: 'A new provider profile was created and business hours saved.',
        });
        setEditHoursMode(false);
        await fetchFullProfile();
        return;
      }
      // 3. Update provider_profiles.availability_json in Supabase
      const { error } = await supabase
        .from('provider_profiles')
        .update({ availability_json: hours })
        .eq('user_id', providerProfile.user_id);
      console.log('Supabase update error:', error);
      if (error) throw error;
      toast({
        title: 'Business hours updated',
        description: 'Your business hours have been saved.',
      });
      setEditHoursMode(false);
      await fetchFullProfile(); // Refresh profile to reflect changes
    } catch (error) {
      console.log('Error in handleSaveHours:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.message || 'An error occurred while saving hours.',
      });
    }
  };
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const { toast } = useToast();
  const [hours, setHours] = useState<{ [key: string]: string }>({});

  // Controls whether business hours are in edit mode
  const [editHoursMode, setEditHoursMode] = useState(false);

  // Handles changes to business hours input fields
  const handleHoursChange = (day: string, value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: value,
    }));
  };

  const fetchFullProfile = async () => {
    setLoading(true);
    try {
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
        // If location is a string with lat/lng, parse it here if you store it that way
        // For now, just clear map state
        setLocationLat(null);
        setLocationLng(null);
      }

      // Check if logged in user is the owner to show upload buttons
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(user?.id === userId);

    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullProfile();
  }, [userId]);

  // 3. Update hours state when data is fetched
  useEffect(() => {
    if (data && data.provider_profiles && data.provider_profiles.availability_json) {
      setHours(data.provider_profiles.availability_json);
    }
  }, [data]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Limit to 3 photos
      const currentPhotos = data?.provider_profiles?.portfolio_photos || [];
      if (currentPhotos.length >= 3) {
        toast({
          variant: "destructive",
          title: "Photo limit reached",
          description: "You can only upload up to 3 photos.",
        });
        return;
      }

      setUploading(true);

      // 1. Create a unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `profile-photos/${userId}-${Math.random()}.${fileExt}`;

      // 2. Upload to Supabase Storage (Bucket name: 'avatars_pro')
      const { error: uploadError } = await supabase.storage
        .from('avatars_pro')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars_pro')
        .getPublicUrl(filePath);

      // 4. Update the database 
      // Add new photo to the end, max 3
      const updatedPhotos = [...currentPhotos, publicUrl].slice(0, 3);

      const { error: updateError } = await supabase
        .from('provider_profiles')
        .update({ portfolio_photos: updatedPhotos })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({
        title: "Profile updated",
        description: "Your photo has been added successfully.",
      });

      // Refresh data to show new image
      await fetchFullProfile();
    } catch (error)  {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="p-8 text-center">Provider not found.</div>;

  const prov = data.provider_profiles;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];
  const availability = prov && prov.availability_json ? prov.availability_json : {};
  // Always show the latest hours (from backend or local state)
  const displayHours = Object.keys(hours).length > 0 ? hours : availability;

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
              {isOwner && editLocationMode ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      className="border rounded px-2 py-1 text-sm w-40"
                      value={locationInput}
                      onChange={e => setLocationInput(e.target.value)}
                      placeholder="Enter location"
                      autoFocus
                    />
                    <Button size="sm" variant="outline" onClick={() => setMapDialogOpen(true)}>
                      Pick from Map
                    </Button>
                    <Button size="sm" className="ml-2" onClick={handleSaveLocation}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditLocationMode(false); setLocationInput(data.location_name || ""); }}>Cancel</Button>
                  </div>
                  <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Pick Location from Map</DialogTitle>
                      </DialogHeader>
                      <div className="my-2">
                        <MapPicker
                          lat={locationLat}
                          lng={locationLng}
                          onChange={(lat, lng, name) => {
                            setLocationLat(lat);
                            setLocationLng(lng);
                            if (name) setLocationInput(name);
                          }}
                        />
                      </div>
                      <DialogFooter>
                        <Button onClick={() => setMapDialogOpen(false)}>Done</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <>
                  <span>{data.location_name || "Location not set"}</span>
                  {isOwner && (
                    <Button size="sm" variant="ghost" className="ml-1 px-1 py-0.5" onClick={() => {
                      setEditLocationMode(true);
                      setLocationInput(data.location_name || "");
                      setLocationLat(null);
                      setLocationLng(null);
                    }}>
                      Edit
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <p className="text-slate-500 italic max-w-lg text-sm leading-relaxed">
            {prov?.bio || "No description provided."}
          </p>

          <div className="flex gap-4 pt-4">
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
                  />
                  <div>
                    <label className="block mb-1 font-medium">Time</label>
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      onClick={() => {
                        // Here you would handle the booking logic
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

        {/* --- PROFILE PHOTO BOX WITH UPLOAD --- */}
        <div className="relative group w-64 h-72 bg-slate-100 rounded-sm overflow-hidden border shadow-sm">
          <img 
            src={prov?.portfolio_photos?.[0] || "https://via.placeholder.com/300?text=No+Image"} 
            alt="Provider Profile" 
            className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
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
            ) : (
              // Show change button only on hover if photo exists
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
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
                  {uploading ? "Uploading..." : "Change Photo"}
                </Button>
              </div>
            )
          )}
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
      <div className="p-8 text-sm space-y-8">
        <div>
          <h3 className="font-bold mb-3">About</h3>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">
            {prov?.bio || "No description provided."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
        {/* --- BUSINESS HOURS SECTION --- */}
  <div>
    <div className="flex items-center gap-2 mb-3">
      <h3 className="font-bold">Business Hours</h3>
      {isOwner && !editHoursMode && (
        <Button size="sm" variant="outline" onClick={() => setEditHoursMode(true)}>
          Edit
        </Button>
      )}
    </div>
    {!editHoursMode ? (
      <div className="space-y-1 text-slate-600 max-w-xs">
        {days.map((day) => (
          <div key={day} className="flex justify-between">
            <span>{day}</span>
            {/* Show the latest hours, fallback to "Closed" */}
            <span>{displayHours[day] || "Closed"}</span>
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-1 text-slate-600 max-w-xs">
        {days.map((day) => (
          <div key={day} className="flex justify-between items-center gap-2">
            <span className="w-12">{day}</span>
            <Select
              value={hours[day] || ""}
              onValueChange={value => handleHoursChange(day, value)}
            >
              <SelectTrigger className="w-44 text-xs">
                <SelectValue placeholder="Select hours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="8:00 AM - 5:00 PM">8:00 AM - 5:00 PM</SelectItem>
                <SelectItem value="9:00 AM - 6:00 PM">9:00 AM - 6:00 PM</SelectItem>
                <SelectItem value="10:00 AM - 7:00 PM">10:00 AM - 7:00 PM</SelectItem>
                <SelectItem value="7:00 AM - 3:00 PM">7:00 AM - 3:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="default" onClick={handleSaveHours}>Save</Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => { 
              setEditHoursMode(false); 
              setHours(availability); 
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )}
  </div>
          <div>
            <h3 className="font-bold mb-3">Payment Methods</h3>
            <p className="text-slate-600">
              This pro accepts Cash, Check, Credit Card, and M-Pesa.
            </p>
          </div>
        </div>
      </div>

      {/* --- SERVICES SECTION --- */}
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

      {/* --- REVIEWS SECTION --- */}
      <section className="px-4 py-12 border-t border-slate-100">
        <h2 className="text-xl font-bold mb-4">Reviews</h2>
        {/* Placeholder review layout logic remains same as original */}
        <div className="flex flex-col gap-1 mb-8">
          <span className="text-green-600 font-bold">Great {prov?.avg_rating}</span>
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} fill={i < Math.floor(prov?.avg_rating || 0) ? "currentColor" : "none"} />
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-1">{prov?.total_reviews} reviews</p>
        </div>
      </section>

      {/* --- PHOTOS SECTION --- */}
      <section className="px-4 py-12 border-t border-slate-100">
        <h2 className="text-xl font-bold mb-8">Portfolio Photos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {prov?.portfolio_photos?.slice(0, 3).map((url: string, index: number) => (
            <div key={index} className="relative aspect-[4/3] rounded-lg overflow-hidden border">
              <img src={url} alt="Work portfolio" className="w-full h-full object-cover" />
            </div>
          ))}
          {isOwner && (prov?.portfolio_photos?.length ?? 0) < 3 && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/3] border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <Upload size={24} />
              <span className="text-xs font-bold mt-2 uppercase">Add Portfolio</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProviderProfileCard;