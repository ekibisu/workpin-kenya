import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface NotificationSettingsProps {
  initialSettings?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  onSave?: (settings: { email: boolean; sms: boolean; push: boolean }) => void;
}

const NotificationSettings = ({ initialSettings = { email: true, sms: false, push: true }, onSave }: NotificationSettingsProps) => {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  const handleChange = (type: keyof typeof settings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [type]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      if (onSave) onSave(settings);
      // Show toast or feedback here if needed
    }, 1000);
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-md shadow p-6">
      <h2 className="text-2xl font-bold mb-6 px-4 pt-8 bg-green-50 rounded-md py-4">
        Notification Settings
      </h2>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span>Email Notifications</span>
          <Switch checked={settings.email} onCheckedChange={(v) => handleChange("email", v)} />
        </div>
        <div className="flex items-center justify-between">
          <span>SMS Notifications</span>
          <Switch checked={settings.sms} onCheckedChange={(v) => handleChange("sms", v)} />
        </div>
        <div className="flex items-center justify-between">
          <span>Push Notifications</span>
          <Switch checked={settings.push} onCheckedChange={(v) => handleChange("push", v)} />
        </div>
      </div>
      <Button className="mt-8 w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
};

export default NotificationSettings;
