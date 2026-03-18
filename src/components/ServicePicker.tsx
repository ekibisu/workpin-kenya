import { useState } from 'react'
import {
  Home, Heart, PartyPopper, Briefcase, Truck,
  Wrench, Scissors, Music, Laptop, Leaf,
  Droplet, Zap, Sparkles, Camera, Paintbrush,
  Dog, HeartPulse, Apple, Hand, UserRound, Smile,
  Star, ShieldCheck, Key,
  Wind, Monitor, Settings, Layout, Layers, Waves,
  Hammer, Activity, Coffee, Calendar, Mic, Flower,
  ShoppingCart, Video, Bug, Trash, BookOpen, Code,
  Image, FileText, DollarSign, Navigation, Map,
  Trees, UtensilsCrossed, Dumbbell, Car, Palette,
  // New icons from DB
  Fan, Settings2, Droplets, PawPrint, Stethoscope, HeartHandshake,
  TreePine, Sun, Sparkle, Receipt, Mic2, Mail, Shield,
  Circle, Square, Speaker, Stamp, Flower2, Tent,
  CheckCircle2, Search,
  ChevronDown,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useServicesByArchetype } from '@/hooks/useServices'
import {
  ARCHETYPE_LABELS,
  type Service,
  type ServiceArchetype,
} from '@/types/services'

// ── Archetype section icons ───────────────────────────────────────────────────

const ARCHETYPE_ICONS: Record<ServiceArchetype, React.ElementType> = {
  home_maintenance:      Home,
  lifestyle_wellness:    Heart,
  events_celebrations:   PartyPopper,
  professional_business: Briefcase,
  outdoor_heavy_duty:    Truck,
}


// ── Icon key → Lucide (DB icon field) ────────────────────────────────────────

const ICON_KEY_MAP: Record<string, React.ElementType> = {
  // Core — synced with DB icon field values
  home: Home, wrench: Wrench, zap: Zap, paintbrush: Paintbrush,
  truck: Truck, trees: Trees, camera: Camera, utensils: UtensilsCrossed,
  music: Music, calendar: Calendar, 'book-open': BookOpen, dumbbell: Dumbbell,
  car: Car, settings: Settings, 'settings-2': Settings2, code: Code, palette: Palette,
  briefcase: Briefcase, laptop: Laptop, leaf: Leaf,
  droplet: Droplet, droplets: Droplets, hammer: Hammer,
  'party-popper': PartyPopper, party: PartyPopper,
  sparkles: Sparkles, sparkle: Sparkle, scissors: Scissors, star: Star,
  dog: Dog, 'heart-pulse': HeartPulse, apple: Apple, hand: Hand,
  'user-round': UserRound, smile: Smile, heart: Heart,
  'shield-check': ShieldCheck, shield: Shield, key: Key,
  wind: Wind, fan: Fan, monitor: Monitor, layout: Layout,
  layers: Layers, waves: Waves, activity: Activity,
  mic: Mic, 'mic-2': Mic2, video: Video,
  'flower-2': Flower2, flower: Flower,
  circle: Circle, square: Square, tent: Tent,
  mail: Mail, speaker: Speaker, stamp: Stamp,
  'paw-print': PawPrint, stethoscope: Stethoscope,
  'heart-handshake': HeartHandshake,
  'tree-pine': TreePine, sun: Sun,
  receipt: Receipt, bug: Bug, trash: Trash,
  // Unmapped DB strings — reasonable fallbacks
  rings: Heart, gate: Key, drill: Wrench, wall: Layers, sofa: Briefcase, grid: Layers,
}

// ── Normalize helper ──────────────────────────────────────────────────────────

// Strips extra whitespace and lowercases for case-insensitive lookups
function normalizeServiceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

// ── Service name → Lucide (synced with Services.tsx + extended) ───────────────

// Keys stored as lowercase for case-insensitive matching via normalizeServiceName
const SERVICE_NAME_MAP: Record<string, React.ElementType> = {
  // Home — synced with Services.tsx
  'house cleaning':               Home,
  'plumbing':                     Droplet,
  'electrical repair':            Zap,
  'painting':                     Paintbrush,
  'moving & packing':             Truck,
  // Home — extended
  'hvac repair & installation':   Wind,
  'fan installation':             Wind,
  'appliance repair':             Monitor,
  'locksmith services':           Key,
  'roofing & gutter repair':      Home,
  'cctv installation':            Camera,
  'gate automation & repair':     Settings,
  'window repair':                Layout,
  'masonry & tiling':             Layers,
  'waterproofing':                Waves,
  'security / usalama':           ShieldCheck,
  'carpentry / useremala':        Hammer,
  // Lifestyle & wellness — synced with Services.tsx
  'personal training':            Activity,
  // Lifestyle — extended
  'beauty / uzuri':               Sparkles,
  'mobile massage therapy':       Hand,
  'hair braiding & styling':      Scissors,
  'makeup artistry':              Star,
  'dog walking':                  Dog,
  'pet grooming':                 Scissors,
  'veterinary home visits':       HeartPulse,
  'nutrition coaching':           Apple,
  'yoga & pilates instruction':   Smile,
  'home care for elderly':        UserRound,
  // Events — synced with Services.tsx
  'photography':                  Camera,
  'catering':                     UtensilsCrossed,
  'dj & music':                   Music,
  'event planning':               Calendar,
  // Events — extended
  'mcs & hosts':                  Mic,
  'decor & florists':             Flower,
  'tent & chair rental':          ShoppingCart,
  'video production':             Video,
  'wedding officiant':            Heart,
  // Outdoor
  'landscaping':                  Trees,
  'landscaping & mowing':         Trees,
  'car wash':                     Car,
  'mechanic':                     Settings,
  'pest control & fumigation':    Bug,
  'garbage collection':           Trash,
  // Professional — synced with Services.tsx
  'tutoring':                     BookOpen,
  'web development':              Code,
  'graphic design':               Palette,
  // Professional — extended
  'legal consultation':           FileText,
  'accounting & tax':             DollarSign,
  'driving lessons':              Navigation,
}

// ── Icon resolution ───────────────────────────────────────────────────────────

function resolveIcon(iconKey: string | null, name?: string | null): React.ElementType {
  // 1. DB icon field
  if (iconKey) {
    const fromKey = ICON_KEY_MAP[iconKey.toLowerCase()]
    if (fromKey) return fromKey
  }
  // 2. Service name (normalized, case-insensitive)
  if (name) {
    const fromName = SERVICE_NAME_MAP[normalizeServiceName(name)]
    if (fromName) return fromName
  }
  // 3. Neutral fallback
  return Briefcase
}

// ── Ordered archetype list ────────────────────────────────────────────────────

const ARCHETYPE_ORDER: ServiceArchetype[] = [
  'home_maintenance',
  'lifestyle_wellness',
  'events_celebrations',
  'professional_business',
  'outdoor_heavy_duty',
]

// ── ServiceCard ───────────────────────────────────────────────────────────────

interface ServiceCardProps {
  service: Service
  selected: boolean
  onSelect: () => void
}

function ServiceCard({ service, selected, onSelect }: ServiceCardProps) {
  const Icon = resolveIcon(service.icon, service.name)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group relative flex flex-col items-center gap-2 rounded-xl border bg-white p-3 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        selected
          ? 'border-2 border-emerald-600 bg-emerald-50/40 shadow-sm'
          : 'border-slate-100 hover:border-emerald-600 hover:shadow-sm',
      ].join(' ')}
    >
      {selected && (
        <CheckCircle2
          className="absolute right-2 top-2 h-4 w-4 text-emerald-600"
          aria-hidden
        />
      )}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <span className="text-xs font-medium leading-tight text-slate-700">
        {service.name}
      </span>
      {service.description && (
        <span className="line-clamp-2 text-[10px] leading-snug text-slate-400">
          {service.description}
        </span>
      )}
    </button>
  )
}

// ── ArchetypeSection ──────────────────────────────────────────────────────────

interface ArchetypeSectionProps {
  archetype: ServiceArchetype
  services: Service[]
  value: string | null
  onChange: (id: string) => void
  defaultOpen: boolean
}

function ArchetypeSection({
  archetype,
  services,
  value,
  onChange,
  defaultOpen,
}: ArchetypeSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = ARCHETYPE_ICONS[archetype]
  const label = ARCHETYPE_LABELS[archetype]

  if (services.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border-b border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <Icon className="h-4 w-4 text-slate-500" aria-hidden />
          <span className="flex-1 text-sm font-semibold text-slate-900">{label}</span>
          <span className="text-xs text-slate-400">{services.length}</span>
          <ChevronDown
            className={[
              'h-4 w-4 text-slate-400 transition-transform duration-200',
              open ? 'rotate-180' : '',
            ].join(' ')}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={value === service.id}
              onSelect={() => onChange(service.id)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {ARCHETYPE_ORDER.map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-11 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── ServicePicker ─────────────────────────────────────────────────────────────

interface ServicePickerProps {
  value: string | null
  onChange: (id: string) => void
}

export function ServicePicker({ value, onChange }: ServicePickerProps) {
  const [search, setSearch] = useState('')
  const { data: grouped, isLoading } = useServicesByArchetype()

  if (isLoading) return <LoadingSkeleton />

  const query = search.trim().toLowerCase()

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          placeholder="Search services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-slate-200 pl-9 shadow-sm focus-visible:ring-emerald-500"
        />
      </div>

      {/* Archetype sections */}
      <div className="space-y-2">
        {ARCHETYPE_ORDER.map((archetype, index) => {
          const services = grouped?.[archetype] ?? []
          const filtered = query
            ? services.filter((s) => s.name.toLowerCase().includes(query))
            : services

          return (
            <ArchetypeSection
              key={archetype}
              archetype={archetype}
              services={filtered}
              value={value}
              onChange={onChange}
              defaultOpen={index === 0}
            />
          )
        })}
      </div>

      {/* Empty state */}
      {query &&
        ARCHETYPE_ORDER.every(
          (a) => !(grouped?.[a] ?? []).some((s) => s.name.toLowerCase().includes(query))
        ) && (
          <p className="py-6 text-center text-sm text-slate-500">
            No services match &ldquo;{search}&rdquo;
          </p>
        )}
    </div>
  )
}