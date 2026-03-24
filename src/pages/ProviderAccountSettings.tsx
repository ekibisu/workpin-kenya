import { useAuth } from "@/contexts/AuthContext";
import ProviderProfileSettings from "@/components/provider/settings/ProviderProfileSettings";
import NotificationSettings from "@/components/provider/settings/NotificationSettings";
import ChangePasswordCard from "@/components/settings/ChangePasswordCard";

const ProviderAccountSettings: React.FC = () => {
  const { user } = useAuth(); // get userId from your auth context

  return (
    <div className="provider-account-settings">
      <h1>Provider Account Settings</h1>
      <ProviderProfileSettings userId={user?.id || ""} />
      <NotificationSettings
        initialSettings={{ email: true, sms: false, push: true }}
        onSave={(settings) => console.log("Saved settings:", settings)}
      />
      <ChangePasswordCard />
      {/* Add provider-specific settings here */}
    </div>
  );
};

export default ProviderAccountSettings;
