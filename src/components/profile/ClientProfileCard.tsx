import { useEffect, useState } from "react";
import { MapPin, Calendar, Briefcase, Mail, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

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
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url, created_at")
        .eq("id", userId)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);

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
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
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
