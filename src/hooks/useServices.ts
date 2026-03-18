import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Service, ServiceArchetype } from '@/types/services'

// Fetch all active services
export const useServices = () =>
  useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data as Service[]
    },
  })

// Normalise non-standard archetype strings from the DB to our 5 canonical keys
const VALID_ARCHETYPES = new Set<ServiceArchetype>([
  'home_maintenance', 'lifestyle_wellness', 'events_celebrations',
  'professional_business', 'outdoor_heavy_duty',
])

// Catch-all map for legacy / non-standard DB values
const ARCHETYPE_REMAP: Record<string, ServiceArchetype> = {
  event:       'events_celebrations',
  maintenance: 'home_maintenance',
  // "session" services — routed by name for precision
}

// Per-name overrides for services whose archetype can't be inferred from the group
const NAME_ARCHETYPE_OVERRIDE: Record<string, ServiceArchetype> = {
  'Tutoring':                  'professional_business',
  'Personal Training':         'lifestyle_wellness',
  'Yoga & Pilates Instruction':'lifestyle_wellness',
}

function normaliseArchetype(archetype: string | null, name: string): ServiceArchetype {
  if (!archetype) return NAME_ARCHETYPE_OVERRIDE[name] ?? 'home_maintenance'
  if (VALID_ARCHETYPES.has(archetype as ServiceArchetype)) return archetype as ServiceArchetype
  if (NAME_ARCHETYPE_OVERRIDE[name]) return NAME_ARCHETYPE_OVERRIDE[name]
  return ARCHETYPE_REMAP[archetype] ?? 'professional_business'
}

// Fetch services grouped by archetype
export const useServicesByArchetype = () =>
  useQuery({
    queryKey: ['services', 'by-archetype'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      const grouped = (data as Service[]).reduce((acc, service) => {
        const key = normaliseArchetype(service.archetype, service.name)
        if (!acc[key]) acc[key] = []
        acc[key].push(service)
        return acc
      }, {} as Record<ServiceArchetype, Service[]>)

      return grouped
    },
  })

// Fetch a single service by ID
export const useService = (id: string) =>
  useQuery({
    queryKey: ['services', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Service
    },
    enabled: !!id,
  })
