import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a business name (+ optional location) into a URL-friendly slug.
 * "Mwangi Plumbing" + "Westlands, Nairobi" → "mwangi-plumbing-westlands"
 */
export function generateSlug(businessName: string, location?: string): string {
  const parts = [businessName];
  if (location) {
    // Take just the first part of the location (before the comma)
    const area = location.split(",")[0].trim();
    if (area) parts.push(area);
  }

  return parts
    .join(" ")
    .toLowerCase()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, "") // Strip non-alphanumeric
    .replace(/\s+/g, "-") // Spaces → hyphens
    .replace(/-+/g, "-") // Dedupe hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing
}

/**
 * Check if a slug is already taken. Returns `true` if available.
 */
export async function isSlugAvailable(
  slug: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from("provider_profiles")
    .select("user_id")
    .eq("username", slug);

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId);
  }

  const { data } = await query.maybeSingle();
  return !data;
}

/**
 * Generate a unique slug. If collision, appends -2, -3, etc.
 */
export async function generateUniqueSlug(
  businessName: string,
  location?: string,
  excludeUserId?: string
): Promise<string> {
  const base = generateSlug(businessName, location);
  if (!base) return "";

  if (await isSlugAvailable(base, excludeUserId)) return base;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${base}-${i}`;
    if (await isSlugAvailable(candidate, excludeUserId)) return candidate;
  }

  // Fallback: append random suffix
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
