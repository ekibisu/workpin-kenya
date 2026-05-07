import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CountryProvider } from "@/contexts/CountryContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Services from "./pages/Services";
import Providers from "./pages/Providers";
import ProviderLanding from "./pages/ProviderLanding";
import HowItWorks from "./pages/HowItWorks";
import RequestService from "./pages/RequestService";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import BusinessManage from "./pages/BusinessManage";
import BusinessProfileWizard from "./pages/BusinessProfileWizard";
import Pricing from "./pages/Pricing";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CountryProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/services" element={<Services />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/pro/:slug" element={<ProviderLanding />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
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
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <Dashboard />
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
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/:id"
              element={
                <ProtectedRoute>
                  <BusinessManage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/:id/setup"
              element={
                <ProtectedRoute>
                  <BusinessProfileWizard />
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
          </CountryProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
