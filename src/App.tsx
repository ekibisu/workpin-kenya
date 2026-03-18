import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Services from "./pages/Services";
import Providers from "./pages/Providers";
import ProviderLanding from "./pages/ProviderLanding";
import HowItWorks from "./pages/HowItWorks";
import RequestService from "./pages/RequestService";
import Dashboard from "./pages/Dashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import Profile from "./pages/Profile";
import ClientProfile from "./pages/ClientProfile";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import SettingsRedirect from "./components/dashboard/SettingsRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/services" element={<Services />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/request" element={<RequestService />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client-profile"
              element={
                <ProtectedRoute>
                  <ClientProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider-dashboard"
              element={
                <ProtectedRoute>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider-dashboard/*"
              element={
                <ProtectedRoute>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
