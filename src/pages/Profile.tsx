import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProviderProfileCard from "@/components/provider/ProviderProfileCard";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Profile = () => {
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container max-w-lg py-10">
          <h1 className="mb-6 text-2xl font-extrabold text-foreground">My Profile</h1>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : user ? (
            <ProviderProfileCard userId={user.id} />
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
