// src/constants/archetypes.ts

export type ServiceArchetype =
  | 'home_maintenance'
  | 'lifestyle_wellness'
  | 'events_celebrations'
  | 'professional_business'
  | 'outdoor_heavy_duty';

export const ARCHETYPE_LABELS: Record<ServiceArchetype, string> = {
  home_maintenance: 'Home Maintenance',
  lifestyle_wellness: 'Lifestyle & Wellness',
  events_celebrations: 'Events & Celebrations',
  professional_business: 'Professional & Business',
  outdoor_heavy_duty: 'Outdoor & Heavy Duty',
};
