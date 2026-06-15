export interface JobRequest {
  id: string;
  description: string;
  location_name: string | null;
  status: string;
  created_at: string;
  services: { name: string; archetype: string | null } | null;
  image_urls: string[] | null;
}

export interface Quote {
  id: string;
  price_kes: number;
  message: string | null;
  status: string;
  created_at: string;
  request_id: string;
  provider_id: string;
  work_thread_id: string | null;
  profiles: { full_name: string | null } | null;
  business_name?: string | null;
  business_ratings?: { avg_rating: number | null; total_reviews: number | null } | null;
  job_requests: { description: string; services: { name: string } | null } | null;
}

const VALID_ARCHETYPES = new Set([
  "home_maintenance",
  "lifestyle_wellness",
  "events_celebrations",
  "professional_business",
  "outdoor_heavy_duty",
]);

export function deriveArchetype(archetype: string | null | undefined): string {
  if (archetype && VALID_ARCHETYPES.has(archetype)) return archetype;
  return "home_maintenance";
}

export function parseDescriptionSummary(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed.task_description || raw;
  } catch {
    return raw;
  }
}

export function normalizeImageUrls(urls: string[] | null | undefined): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter(
    (u) =>
      typeof u === "string" &&
      u.trim() !== "" &&
      !u.includes("deleted-bucket") &&
      !u.startsWith("blob:")
  );
}

export const statusColor: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  pending: "bg-accent text-accent-foreground",
  completion_pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  matched: "bg-accent text-accent-foreground",
  completed: "bg-muted text-muted-foreground",
};
