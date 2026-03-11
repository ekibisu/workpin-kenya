import { useEffect, useRef, useState } from "react";
import { MapPin, Calendar, Briefcase, Mail, User, Loader2, Upload, Clock, Hammer, Star, CheckCircle2, Linkedin, Instagram, Facebook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    neighborhood?: string | null;
    property_type?: string | null;
    jobs_posted?: number | null;
    client_rating?: string | null;
    is_verified?: boolean | null;
    linkedin_url?: string | null;
    instagram_url?: string | null;
    facebook_url?: string | null;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, phone, avatar_url, created_at, neighborhood, property_type")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data);
    setLoading(false);
  };


  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (profile) setEditProfile(profile);
  }, [profile]);

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
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${userId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      if (updateError) throw updateError;

      toast({ title: "Avatar updated!", description: "Your profile picture was updated successfully." });
      await fetchProfile();
    } catch (err: unknown) {
      let message = "Could not upload avatar.";
      if (err && typeof err === "object" && "message" in err) {
        message = (err as { message: string }).message;
      }
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }


  const handleEditChange = (field: string, value: string) => {
    setEditProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editProfile.full_name,
          email: editProfile.email,
          phone: editProfile.phone,
          neighborhood: editProfile.neighborhood,
          property_type: editProfile.property_type,
          linkedin_url: editProfile.linkedin_url,
          instagram_url: editProfile.instagram_url,
          facebook_url: editProfile.facebook_url,
        })
        .eq("id", userId);
      if (error) throw error;
      toast({ title: "Profile updated!", description: "Your profile was updated successfully." });
      setEditMode(false);
      await fetchProfile();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditProfile(profile);
    setEditMode(false);
  };

  const memberSince = profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "—";


  const details = [
    { icon: MapPin, label: "Location", field: "neighborhood", value: editProfile?.neighborhood ?? "Nairobi, Kenya" },
    { icon: Calendar, label: "Member Since", value: memberSince },
    { icon: Briefcase, label: "Property Type", field: "property_type", value: editProfile?.property_type ?? "Not specified" },
    { icon: Mail, label: "Contact Email", field: "email", value: editProfile?.email ?? "—" },
    { icon: Clock, label: "Response Time", value: "~1 Hour" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm">

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Client Profile</h3>
        {!editMode ? (
          <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
          </div>
        )}
      </div>

      {/* User header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16 cursor-pointer border-2 border-background shadow-sm" onClick={handleAvatarClick}>
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="Avatar" />
            ) : (
              <AvatarFallback>
                <User className="h-8 w-8 text-primary" />
              </AvatarFallback>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </Avatar>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 shadow-md hover:bg-primary/80"
            style={{ transform: 'translate(20%, 20%)' }}
            onClick={handleAvatarClick}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {!editMode ? (
              <p className="text-lg font-bold text-foreground leading-tight">
                {profile?.full_name || "Unnamed User"}
              </p>
            ) : (
              <Input
                className="text-lg font-bold text-foreground leading-tight max-w-xs"
                value={editProfile?.full_name || ""}
                onChange={e => handleEditChange("full_name", e.target.value)}
                placeholder="Full Name"
              />
            )}
            
            {/* Dynamic Verification Badge */}
            {profile?.is_verified ? (
              <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 shadow-sm shrink-0">
                <CheckCircle2 className="h-3 w-3 fill-blue-600 text-white" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 shadow-sm shrink-0">
                <Clock className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Unverified</span>
              </div>
            )}
          </div>
          {!editMode ? (
            <p className="text-sm text-muted-foreground">{profile?.email || "—"}</p>
          ) : (
            <Input
              className="text-sm text-muted-foreground max-w-xs"
              value={editProfile?.email || ""}
              onChange={e => handleEditChange("email", e.target.value)}
              placeholder="Email"
              type="email"
            />
          )}
        </div>
      </div>

      <Separator />

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Client Details
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {details.map(({ icon: Icon, label, value, field }) => (
          <div key={label} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/10">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[11px] text-muted-foreground">{label}</p>
              {editMode && field ? (
                <Input
                  className="text-sm font-medium text-foreground"
                  value={editProfile?.[field] || ""}
                  onChange={e => handleEditChange(field, e.target.value)}
                  placeholder={label}
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Social Links */}
      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Connected Accounts
        </p>
        {!editMode ? (
          <div className="flex gap-4">
            {profile?.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all" title="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
            )}
            {profile?.instagram_url && (
              <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-50 text-slate-600 hover:text-pink-600 hover:bg-pink-50 transition-all" title="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {profile?.facebook_url && (
              <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-50 text-slate-600 hover:text-blue-700 hover:bg-blue-100 transition-all" title="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
            )}
            {/* Fallback if no socials are linked */}
            {!profile?.linkedin_url && !profile?.instagram_url && !profile?.facebook_url && (
              <p className="text-xs text-muted-foreground italic">No social accounts linked</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-xs">
            <Input
              className=""
              value={editProfile?.linkedin_url || ""}
              onChange={e => handleEditChange("linkedin_url", e.target.value)}
              placeholder="LinkedIn URL"
              type="url"
            />
            <Input
              className=""
              value={editProfile?.instagram_url || ""}
              onChange={e => handleEditChange("instagram_url", e.target.value)}
              placeholder="Instagram URL"
              type="url"
            />
            <Input
              className=""
              value={editProfile?.facebook_url || ""}
              onChange={e => handleEditChange("facebook_url", e.target.value)}
              placeholder="Facebook URL"
              type="url"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Reputation Scoreboard */}
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground mb-4">Reputation Scoreboard</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="text-xl font-black">{profile?.client_rating || "0.0"}</span>
              <Star className="h-5 w-5 fill-emerald-500 text-emerald-500" />
            </div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Client Rating</p>
          </div>
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex flex-col items-center shadow-sm">
            <div className="flex items-center gap-1.5 text-blue-700">
              <span className="text-xl font-black">{profile?.jobs_posted || "0"}</span>
              <Hammer className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">Jobs Posted</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfileCard;