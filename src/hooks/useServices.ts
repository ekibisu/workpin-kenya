import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Service, ServiceArchetype } from '@/types/services'

// Fetch all active services
export const useServices = () =>
  useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('services')
        .select('*') as any)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Service[]
    },
  })

// Normalise archetype strings to canonical keys
const VALID_ARCHETYPES = new Set<ServiceArchetype>([
  'home_maintenance', 'lifestyle_wellness', 'events_celebrations',
  'professional_business', 'outdoor_heavy_duty',
])

function normaliseArchetype(archetype: string | null, name: string): ServiceArchetype {
  if (archetype && VALID_ARCHETYPES.has(archetype as ServiceArchetype)) {
    return archetype as ServiceArchetype
  }
  return 'professional_business'
}

// Fetch services grouped by archetype
export const useServicesByArchetype = () =>
  useQuery({
    queryKey: ['services', 'by-archetype'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('services')
        .select('*') as any)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error

      const grouped = (data as Service[]).reduce((acc: Record<ServiceArchetype, Service[]>, service: Service) => {
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
      return data as unknown as Service
    },
    enabled: !!id,
  })
