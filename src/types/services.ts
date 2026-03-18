// Local service types — the DB services table has: id, name, category, icon, created_at
// We treat `category` as the archetype key.

export type ServiceArchetype =
  | 'home_maintenance'
  | 'lifestyle_wellness'
  | 'events_celebrations'
  | 'professional_business'
  | 'outdoor_heavy_duty'

export const ARCHETYPE_LABELS: Record<ServiceArchetype, string> = {
  home_maintenance: 'Home & Maintenance',
  lifestyle_wellness: 'Lifestyle & Wellness',
  events_celebrations: 'Events & Celebrations',
  professional_business: 'Professional & Business',
  outdoor_heavy_duty: 'Outdoor & Heavy Duty',
}

export interface Service {
  id: string
  name: string
  category: string
  icon: string | null
  created_at: string
  // Virtual fields used by UI — mapped from `category`
  archetype?: string | null
  description?: string | null
}
