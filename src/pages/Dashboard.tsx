import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, FileText, MessageCircle, Settings, Plus,
  TrendingUp, Clock, CheckCircle, DollarSign,
} from "lucide-react";

const stats = [
  { label: "Active Requests", value: "3", icon: FileText, trend: "+2 this week" },
  { label: "Quotes Received", value: "12", icon: TrendingUp, trend: "4 pending" },
  { label: "Jobs Completed", value: "8", icon: CheckCircle, trend: "This month" },
  { label: "Total Spent", value: "KES 45K", icon: DollarSign, trend: "Lifetime" },
];

const sideLinks = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "My Requests", icon: FileText, href: "/dashboard/requests" },
  { label: "Messages", icon: MessageCircle, href: "/dashboard/messages" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const Dashboard = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <div className="flex flex-1">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 lg:block">
        <nav className="space-y-1">
          {sideLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-background p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back! Here's your activity overview.</p>
          </div>
          <Button asChild>
            <Link to="/request">
              <Plus className="h-4 w-4" />
              New Request
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light">
                  <stat.icon className="h-4 w-4 text-primary-dark" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.trend}</p>
            </div>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Recent Activity</h2>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Your recent requests and jobs will appear here</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/request">Post your first request</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  </div>
);

export default Dashboard;
