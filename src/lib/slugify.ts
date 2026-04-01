import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a business name (+ optional location) into a URL-friendly slug.
 * "Mwangi Plumbing" + "Westlands, Nairobi" → "mwangi-plumbing-westlands"
 */
export function generateSlug(businessName: string, location?: string): string {
  const parts = [businessName];
  if (location) {
    const area = location.split(",")[0].trim();
    if (area) parts.push(area);
  }

  return parts
    .join(" ")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Check if a slug is already taken. Returns `true` if available.
 */
export async function isSlugAvailable(
  slug: string,
  excludeOwnerId?: string
): Promise<boolean> {
  let query = supabase
    .from("businesses")
    .select("owner_id")
    .eq("username", slug);

  if (excludeOwnerId) {
    query = query.neq("owner_id", excludeOwnerId);
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
  excludeOwnerId?: string
): Promise<string> {
  const base = generateSlug(businessName, location);
  if (!base) return "";

  if (await isSlugAvailable(base, excludeOwnerId)) return base;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${base}-${i}`;
    if (await isSlugAvailable(candidate, excludeOwnerId)) return candidate;
  }

  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
