import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, FileText, MessageCircle, Settings, Plus,
  TrendingUp, Clock, CheckCircle, DollarSign, MapPin, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface ServiceRequest {
  id: string;
  description: string;
  budget: number | null;
  location_name: string | null;
  status: string;
  created_at: string;
  services: { name: string } | null;
  image_urls: string[] | null;
}

const sideLinks = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "My Requests", icon: FileText, href: "/dashboard/requests" },
  { label: "Messages", icon: MessageCircle, href: "/dashboard/messages" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("service_requests")
      .select("id, description, budget, location_name, status, created_at, image_urls, services(name)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRequests((data as unknown as ServiceRequest[]) || []);
        setLoading(false);
      });
  }, [user]);

  const activeCount = requests.filter((r) => r.status === "open").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;

  const stats = [
    { label: "Active Requests", value: String(activeCount), icon: FileText, trend: `${requests.length} total` },
    { label: "Quotes Received", value: "—", icon: TrendingUp, trend: "Coming soon" },
    { label: "Jobs Completed", value: String(completedCount), icon: CheckCircle, trend: "This month" },
    { label: "Total Spent", value: "—", icon: DollarSign, trend: "Lifetime" },
  ];

  const statusColor: Record<string, string> = {
    open: "bg-primary/10 text-primary",
    matched: "bg-accent text-accent-foreground",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 lg:block">
          <nav className="space-y-1">
            {sideLinks.map((link) => (
              <Link key={link.label} to={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                <link.icon className="h-4 w-4" />{link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 bg-background p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back! Here's your activity overview.</p>
            </div>
            <Button asChild><Link to="/request"><Plus className="h-4 w-4" />New Request</Link></Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.trend}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Your Requests</h2>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No requests yet</p>
                <Button variant="outline" size="sm" className="mt-4" asChild><Link to="/request">Post your first request</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-start justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{req.services?.name || "Service"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[req.status] || "bg-muted text-muted-foreground"}`}>{req.status}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{req.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        {req.location_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.location_name}</span>}
                        {req.budget && <span>KES {Number(req.budget).toLocaleString()}</span>}
                        <span>{format(new Date(req.created_at), "MMM d, yyyy")}</span>
                      </div>
                      {req.image_urls && req.image_urls.length > 0 && (
                        <div className="mt-2 flex gap-1.5">
                          {req.image_urls.slice(0, 3).map((url, i) => (
                            <div key={i} className="h-10 w-10 overflow-hidden rounded-md border border-border">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                          {req.image_urls.length > 3 && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground">
                              +{req.image_urls.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
