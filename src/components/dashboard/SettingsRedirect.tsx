import { useAuth } from "@/contexts/AuthContext";
import ClientAccountSettings from "@/pages/ClientAccountSettings";
import ProviderAccountSettings from "@/pages/ProviderAccountSettings";

const SettingsRedirect = () => {
  const { user } = useAuth();

  if (user?.role === "provider") {
    return <ProviderAccountSettings />;
  }

  return <ClientAccountSettings />;
};

export default SettingsRedirect;
