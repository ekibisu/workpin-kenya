import { useEffect, useState } from "react";
import { Bell, ShieldAlert, Mail, MessageSquare, Smartphone, Loader2 } from "lucide-react";
import ChangePasswordCard from "@/components/settings/ChangePasswordCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface NotificationSetting {
  id: string;
  label: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

type Channel = "email" | "sms" | "push";
type PrefsShape = Record<string, Record<Channel, boolean>>;

const PREF_KEYS: { id: string; key: string; label: string }[] = [
  { id: "1", key: "new_quote", label: "New Quote Received" },
  { id: "2", key: "job_updates", label: "Job Status Updates" },
  { id: "3", key: "marketing", label: "Marketing & Promos" },
];

const DEFAULT_NOTIFS: NotificationSetting[] = [
  { id: "1", label: "New Quote Received", email: true, sms: false, push: true },
  { id: "2", label: "Job Status Updates", email: true, sms: true, push: true },
  { id: "3", label: "Marketing & Promos", email: false, sms: false, push: false },
];

function mapPrefsToState(prefs: PrefsShape): NotificationSetting[] {
  return PREF_KEYS.map(({ id, key, label }) => {
    const p = prefs?.[key] ?? {} as Record<Channel, boolean>;
    return {
      id, label,
      email: !!p.email,
      sms: !!p.sms,
      push: !!p.push,
    };
  });
}

function mapStateToPrefs(state: NotificationSetting[]): PrefsShape {
  const out: PrefsShape = {};
  PREF_KEYS.forEach(({ id, key }) => {
    const n = state.find((s) => s.id === id);
    if (n) out[key] = { email: n.email, sms: n.sms, push: n.push };
  });
  return out;
}

const UnifiedSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationSetting[]>(DEFAULT_NOTIFS);
  const [saving, setSaving] = useState(false);

  const [bizId, setBizId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["notif_prefs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("notification_prefs")
        .eq("id", user!.id)
        .maybeSingle();
      return (data?.notification_prefs as PrefsShape) ?? null;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (prefs) setNotifications(mapPrefsToState(prefs));
  }, [prefs]);

  // Load first business is_active
  useEffect(() => {
    if (!user) return;
    supabase
      .from("businesses")
      .select("id, is_active")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBizId(data.id);
          setActiveStatus(!!data.is_active);
        }
      });
  }, [user]);

  const toggleNotification = (id: string, field: Channel) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [field]: !n[field] } : n))
    );
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_prefs: mapStateToPrefs(notifications) })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Could not save preferences.", variant: "destructive" });
      return;
    }
    toast({ title: "Notification preferences saved." });
  };

  const handleToggleActive = async () => {
    if (!bizId) {
      toast({ title: "No business yet", description: "Create a business first." });
      return;
    }
    setTogglingActive(true);
    const next = !activeStatus;
    const { error } = await supabase
      .from("businesses")
      .update({ is_active: next })
      .eq("id", bizId);
    setTogglingActive(false);
    if (error) {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
      return;
    }
    setActiveStatus(next);
    toast({ title: `Business set to ${next ? "active" : "inactive"}` });
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border p-5">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Notifications & Alerts</h2>
        </div>
        <div className="p-5">
          <div className="mb-3 grid grid-cols-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
            <div className="col-span-6">Activity</div>
            <div className="col-span-2 flex justify-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</div>
            <div className="col-span-2 flex justify-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> SMS</div>
            <div className="col-span-2 flex justify-center gap-1"><Smartphone className="h-3.5 w-3.5" /> Push</div>
          </div>
          {notifications.map((n) => (
            <div key={n.id} className="grid grid-cols-12 items-center py-3 px-2 border-t border-border">
              <div className="col-span-6 text-sm font-medium text-foreground">{n.label}</div>
              {(["email", "sms", "push"] as const).map((type) => (
                <div key={type} className="col-span-2 flex justify-center">
                  <input
                    type="checkbox"
                    checked={n[type]}
                    onChange={() => toggleNotification(n.id, type)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              ))}
            </div>
          ))}
          <div className="mt-4 flex justify-end border-t border-border pt-4">
            <Button size="sm" onClick={handleSavePrefs} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save preferences
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <ChangePasswordCard />

      {/* Account Status */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border p-5">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Account Status</h2>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Status:{" "}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${activeStatus ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {activeStatus ? "Active" : "Deactivated"}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Deactivating will hide your profile and pause active requests.
              </p>
            </div>
            <Button
              variant={activeStatus ? "outline" : "default"}
              size="sm"
              onClick={handleToggleActive}
              disabled={togglingActive || !bizId}
              className={activeStatus ? "border-destructive/30 text-destructive hover:bg-destructive/10" : ""}
            >
              {togglingActive && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {activeStatus ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
          <div className="border-t border-border pt-4 flex gap-4">
            <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              Request Data Export
            </button>
            <button className="text-xs font-medium text-destructive/60 hover:text-destructive transition-colors">
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSettings;
