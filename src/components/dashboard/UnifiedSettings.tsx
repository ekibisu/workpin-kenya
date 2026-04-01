import { useState } from "react";
import { Bell, ShieldAlert, Mail, MessageSquare, Smartphone } from "lucide-react";
import ChangePasswordCard from "@/components/settings/ChangePasswordCard";
import { Button } from "@/components/ui/button";

interface NotificationSetting {
  id: string;
  label: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

const UnifiedSettings = () => {
  const [activeStatus, setActiveStatus] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: "1", label: "New Quote Received", email: true, sms: false, push: true },
    { id: "2", label: "Job Status Updates", email: true, sms: true, push: true },
    { id: "3", label: "Marketing & Promos", email: false, sms: false, push: false },
  ]);

  const toggleNotification = (id: string, field: keyof Omit<NotificationSetting, "id" | "label">) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, [field]: !n[field] } : n))
    );
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
              onClick={() => setActiveStatus(!activeStatus)}
              className={activeStatus ? "border-destructive/30 text-destructive hover:bg-destructive/10" : ""}
            >
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
