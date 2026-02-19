import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProviderProfileCard from "@/components/provider/ProviderProfileCard";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Shield, Eye, EyeOff, Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const { user, loading } = useAuth();
  const [showAmount, setShowAmount] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container max-w-2xl py-10">
          <h1 className="mb-6 text-2xl font-extrabold text-foreground">Professional Profile</h1>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : user ? (
            <Tabs defaultValue="public" className="w-full">
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="public" className="flex-1">Public Profile</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">
                  <Settings className="mr-1.5 h-3.5 w-3.5" /> Account Settings
                </TabsTrigger>
                <TabsTrigger value="financials" className="flex-1">Financials</TabsTrigger>
              </TabsList>

              <TabsContent value="public">
                <ProviderProfileCard userId={user.id} />
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    Account settings coming soon.
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financials">
                <Card className="mx-auto max-w-md">
                  <CardContent className="flex flex-col items-center gap-4 py-10">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wider">Private &middot; Only visible to you</span>
                    </div>

                    <h2 className="text-lg font-semibold text-foreground">Total Lifetime Earnings</h2>

                    <p className="text-4xl font-extrabold tracking-tight text-foreground">
                      {showAmount ? "KES 0.00" : "KES ****"}
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAmount((v) => !v)}
                      className="mt-2 gap-2"
                    >
                      {showAmount ? (
                        <><EyeOff className="h-4 w-4" /> Hide amount</>
                      ) : (
                        <><Eye className="h-4 w-4" /> Show amount</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
