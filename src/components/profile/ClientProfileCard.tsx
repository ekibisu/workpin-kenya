import { useEffect, useRef, useState, ElementType } from "react";
import MapPicker from "@/components/MapPicker";
import {
  MapPin,
  Calendar,
  Mail,
  User,
  Loader2,
  Upload,
  Clock,
  Hammer,
  Phone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadMediaFile } from "@/hooks/useMediaUpload";

interface ClientProfileCardProps {
  userId: string;
}

const ClientProfileCard = ({ userId }: ClientProfileCardProps) => {
  const [loading, setLoading] = useState(true);
  type ProfileType = {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
    avatar_url: string | null;
  };
  type ClientProfileType = {
    lat: number | null;
    lng: number | null;
    location_name: string | null;
    mpesa_phone: string | null;
  };
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfileType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editProfile, setEditProfile] = useState<ProfileType | null>(null);
  const [editClientProfile, setEditClientProfile] = useState<ClientProfileType | null>(null);
  const [saving, setSaving] = useState(false);
  const [jobCount, setJobCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchProfile = async () => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email, phone, avatar_url, created_at")
      .eq("id", userId)
      .maybeSingle();

    setProfile(profileData as ProfileType | null);

    const { data: clientProfileData } = await supabase
      .from("client_profiles")
      .select("lat, lng, location_name, mpesa_phone")
      .eq("user_id", userId)
      .maybeSingle();

    setClientProfile(clientProfileData as ClientProfileType | null);

    const { count, error } = await supabase
      .from("job_requests")
      .select("id", { count: "exact", head: true })
      .eq("client_id", userId);

    if (!error && typeof count === "number") {
      setJobCount(count);
    } else {
      setJobCount(0);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (profile) setEditProfile(profile);
  }, [profile]);
  useEffect(() => {
    if (clientProfile) setEditClientProfile(clientProfile);
  }, [clientProfile]);

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
      const result = await uploadMediaFile({
        file,
        context: 'avatar',
        tags: ['avatar', 'client'],
        userName: profile?.full_name ?? undefined,
      });

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: result.public_url })
        .eq("id", userId);
      if (updateError) throw updateError;

      toast({
        title: "Avatar updated!",
        description: "Your profile picture was updated successfully.",
      });
      await fetchProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not upload avatar.";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
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

  const handleEditChange = (
    field: keyof ProfileType,
    value: string | number,
  ) => {
    setEditProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };
  const handleEditClientChange = (
    field: keyof ClientProfileType,
    value: string | number | null,
  ) => {
    setEditClientProfile((prev) =>
      prev ? { ...prev, [field]: value } : { lat: null, lng: null, location_name: null, mpesa_phone: null, [field]: value },
    );
  };

  const handleSave = async () => {
    if (!editProfile) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editProfile.full_name,
          email: editProfile.email,
          phone: editProfile.phone,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      if (editClientProfile) {
        const { error: clientError } = await supabase
          .from("client_profiles")
          .upsert({
            user_id: userId,
            lat: editClientProfile.lat,
            lng: editClientProfile.lng,
            location_name: editClientProfile.location_name,
            mpesa_phone: editClientProfile.mpesa_phone,
          }, { onConflict: "user_id" });
        if (clientError) throw clientError;
      }

      toast({ title: "Profile updated!" });
      setEditMode(false);
      await fetchProfile();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update profile.";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditProfile(profile);
    setEditClientProfile(clientProfile);
    setEditMode(false);
  };

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMMM yyyy")
    : "—";

  function maskPhone(phone: string | null | undefined): string {
    if (!phone || phone.length < 2) return "—";
    const visible = phone.slice(-2);
    return `******${visible}`;
  }

  type DetailItem = {
    icon: ElementType;
    label: string;
    value: string;
    field?: string;
    isClient?: boolean;
  };

  const details: DetailItem[] = [
    { icon: Calendar, label: "Member Since", value: memberSince },
    {
      icon: Mail,
      label: "Contact Email",
      field: "email",
      value: editProfile?.email ?? "—",
    },
    {
      icon: Phone,
      label: "Phone Number",
      field: "phone",
      value: !editMode
        ? maskPhone(editProfile?.phone)
        : (editProfile?.phone ?? ""),
    },
    { icon: Clock, label: "Response Time", value: "~1 Hour" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Client Profile
        </h3>
        {!editMode ? (
          <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* User header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar
            className="h-16 w-16 cursor-pointer border-2 border-background shadow-sm"
            onClick={handleAvatarClick}
          >
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
            className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 shadow-md hover:bg-primary/80"
            style={{ transform: "translate(20%, 20%)" }}
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
                onChange={(e) => handleEditChange("full_name", e.target.value)}
                placeholder="Full Name"
              />
            )}
          </div>
          {!editMode ? (
            <p className="text-sm text-muted-foreground">
              {profile?.email || "—"}
            </p>
          ) : (
            <Input
              className="text-sm text-muted-foreground max-w-xs"
              value={editProfile?.email || ""}
              onChange={(e) => handleEditChange("email", e.target.value)}
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

      {/* Location field with map picker */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground mb-1">Location</p>
            {editMode ? (
              <>
                <MapPicker
                  lat={editClientProfile?.lat ?? null}
                  lng={editClientProfile?.lng ?? null}
                  onChange={(lat, lng, locationName) => {
                    handleEditClientChange("lat", lat);
                    handleEditClientChange("lng", lng);
                    if (locationName !== undefined) {
                      handleEditClientChange("location_name", locationName);
                    }
                  }}
                />
                {typeof editClientProfile?.lat === "number" &&
                  typeof editClientProfile?.lng === "number" && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Lat: {editClientProfile.lat}, Lng: {editClientProfile.lng}
                    </div>
                  )}
                {editClientProfile?.location_name && (
                  <div className="text-xs text-primary mt-1">
                    {editClientProfile.location_name}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  {clientProfile?.location_name ?? "Nairobi, Kenya"}
                </p>
                {typeof clientProfile?.lat === "number" &&
                  typeof clientProfile?.lng === "number" && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Lat: {clientProfile.lat}, Lng: {clientProfile.lng}
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Other details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {details.map(({ icon: Icon, label, value, field }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/10"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[11px] text-muted-foreground">{label}</p>
              {editMode && field ? (
                <Input
                  className="text-sm font-medium text-foreground"
                  value={String(editProfile?.[field as keyof ProfileType] || "")}
                  onChange={(e) =>
                    handleEditChange(field as keyof ProfileType, e.target.value)
                  }
                  placeholder={label}
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Reputation Scoreboard */}
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground mb-4">
          Reputation Scoreboard
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-accent/50 border border-border p-4 rounded-2xl flex flex-col items-center shadow-sm">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="text-xl font-black">{jobCount}</span>
              <Hammer className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold text-primary uppercase mt-1">
              Jobs Posted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfileCard;
