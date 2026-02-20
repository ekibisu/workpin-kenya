import { useEffect, useRef, useState } from "react";
import { MapPin, Calendar, Briefcase, Mail, User, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface ClientProfileCardProps {
  userId: string;
}

const ClientProfileCard = ({ userId }: ClientProfileCardProps) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
    avatar_url: string | null;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, phone, avatar_url, created_at")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAvatarClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      if (updateError) throw updateError;

      toast({ title: "Avatar updated!", description: "Your profile picture was updated successfully." });
      await fetchProfile();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload avatar.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMMM yyyy")
    : "—";

  const details = [
    { icon: MapPin, label: "Location", value: "Nairobi, Kenya" },
    { icon: Calendar, label: "Member Since", value: memberSince },
    { icon: Briefcase, label: "Industry", value: "Not specified" },
    { icon: Mail, label: "Contact Email", value: profile?.email || "—" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Client Profile</h3>

      {/* User header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-12 w-12 cursor-pointer" onClick={handleAvatarClick}>
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="Avatar" />
            ) : (
              <AvatarFallback>
                <User className="h-6 w-6 text-primary" />
              </AvatarFallback>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 shadow hover:bg-primary/80 focus:outline-none"
            style={{ transform: 'translate(25%, 25%)' }}
            onClick={handleAvatarClick}
            disabled={uploading}
            aria-label="Upload avatar"
          >
            <Upload className="h-4 w-4" />
          </button>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {profile?.full_name || "Unnamed User"}
          </p>
          <p className="text-sm text-muted-foreground">{profile?.email || "—"}</p>
        </div>
      </div>

      <Separator />

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Client Details
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {details.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientProfileCard;
