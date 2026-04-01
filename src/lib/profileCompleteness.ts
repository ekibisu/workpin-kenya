export interface CompletenessInput {
  business_name?: string;
  tagline?: string | null;
  bio?: string | null;
  hero_image_url?: string | null;
  location_name?: string | null;
  availability_json?: any;
  years_experience?: number | null;
  certifications?: string[] | null;
  galleryCount?: number;
  servicesCount?: number;
  faqCount?: number;
}

export function computeCompleteness(input: CompletenessInput): number {
  let score = 0;
  if (input.business_name) score += 10;
  if (input.tagline) score += 10;
  if (input.bio && input.bio.length >= 100) score += 10;
  if (input.hero_image_url) score += 15;
  if ((input.galleryCount ?? 0) >= 3) score += 15;
  if ((input.servicesCount ?? 0) >= 2) score += 15;
  if (input.location_name) score += 5;
  if (input.availability_json && Object.keys(input.availability_json).length > 0) score += 5;
  if ((input.faqCount ?? 0) >= 1) score += 5;
  if ((input.years_experience ?? 0) > 0 || (input.certifications?.length ?? 0) > 0) score += 10;
  return score;
}
