import { FileText, TrendingUp, CheckCircle, DollarSign } from "lucide-react";
import type { JobRequest, Quote } from "./dashboardTypes";

interface StatsGridProps {
  requests: JobRequest[];
  quotes: Quote[];
}

export default function StatsGrid({ requests, quotes }: StatsGridProps) {
  const activeCount = requests.filter((r) => r.status === "open").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;

  const stats = [
    { label: "Active Requests", value: String(activeCount), icon: FileText, trend: `${requests.length} total` },
    { label: "Quotes Received", value: String(quotes.length), icon: TrendingUp, trend: "Across all requests" },
    { label: "Jobs Completed", value: String(completedCount), icon: CheckCircle, trend: "This month" },
    { label: "Total Spent", value: "—", icon: DollarSign, trend: "Lifetime" },
  ];

  return (
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
  );
}
