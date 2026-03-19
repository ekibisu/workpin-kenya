import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { uploadMediaFile } from '@/hooks/useMediaUpload'
import questionsData from '@/data/questions.json'

// ── Types ────────────────────────────────────────────────────────────────────

type Pillar = 'Task' | 'Extent' | 'Deadline'

interface QuestionBase {
  id: string
  pillar: Pillar
  label: string
  required: boolean
  placeholder?: string
}

interface TextareaQuestion extends QuestionBase { type: 'textarea' }
interface SelectQuestion   extends QuestionBase { type: 'select'; options: string[] }
interface DateQuestion     extends QuestionBase { type: 'date' }
interface ImageQuestion    extends QuestionBase { type: 'image_upload'; max_files: number }

type Question = TextareaQuestion | SelectQuestion | DateQuestion | ImageQuestion

// ── Sub-components ────────────────────────────────────────────────────────────

function PillarBadge({ pillar }: { pillar: Pillar }) {
  return (
    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {pillar[0]}
    </span>
  )
}

function QuestionLabel({ question }: { question: Question }) {
  return (
    <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
      <PillarBadge pillar={question.pillar} />
      {question.label}
      {question.required && <span className="text-red-500">*</span>}
    </Label>
  )
}

// ── Image upload field ───────────────────────────────────────────────────────

interface ImageUploadFieldProps {
  question: ImageQuestion
  onImagesChange: (files: File[]) => void
  serviceName?: string | null
}

function ImageUploadField({ question, onImagesChange, serviceName }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<{ url: string; uploading: boolean; error?: boolean }[]>([])
  const [files, setFiles] = useState<File[]>([])

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    const remaining = question.max_files - files.length
    const toAdd = selected.slice(0, remaining)
    if (toAdd.length === 0) return

    // Optimistic previews
    const newPreviews: { url: string; uploading: boolean; error?: boolean }[] = toAdd.map((f) => ({ url: URL.createObjectURL(f), uploading: true }))
    const nextPreviews = [...previews, ...newPreviews]
    setPreviews(nextPreviews)

    // Upload each file
    const uploadedFiles: File[] = [...files]
    const finalPreviews = [...nextPreviews]

    await Promise.all(
      toAdd.map(async (file, idx) => {
        const previewIdx = previews.length + idx
        try {
          const result = await uploadMediaFile({
            file,
            context: 'request-image',
            tags: ['request-image'],
            serviceName: serviceName ?? undefined,
          })
          if (result) {
            uploadedFiles.push(file)
            finalPreviews[previewIdx] = { ...finalPreviews[previewIdx], uploading: false }
          }
        } catch {
          finalPreviews[previewIdx] = { ...finalPreviews[previewIdx], uploading: false, error: true }
        }
      })
    )

    setPreviews([...finalPreviews])
    setFiles(uploadedFiles)
    onImagesChange(uploadedFiles)

    // Reset input so the same file can be re-selected if needed
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (idx: number) => {
    const nextPreviews = previews.filter((_, i) => i !== idx)
    const nextFiles = files.filter((_, i) => i !== idx)
    setPreviews(nextPreviews)
    setFiles(nextFiles)
    onImagesChange(nextFiles)
  }

  const canAdd = previews.length < question.max_files

  return (
    <div className="space-y-2">
      <QuestionLabel question={question} />
      <div className="flex flex-wrap gap-2">
        {previews.map((p, idx) => (
          <div
            key={idx}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200"
          >
            <img
              src={p.url}
              alt={`upload-${idx}`}
              className={`h-full w-full object-cover ${p.uploading || p.error ? 'opacity-50' : ''}`}
            />
            {p.uploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
              </div>
            )}
            {p.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50/80">
                <span className="text-xs text-red-600">Failed</span>
              </div>
            )}
            {!p.uploading && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 shadow"
                aria-label="Remove image"
              >
                <X className="h-3 w-3 text-gray-700" />
              </button>
            )}
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-gray-400 hover:bg-gray-100"
            aria-label="Add image"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px]">Add photo</span>
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Up to {question.max_files} photo{question.max_files > 1 ? 's' : ''} · JPG, PNG, WebP
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={handleSelect}
      />
    </div>
  )
}

// ── Service-specific placeholders for the task_description field ──────────────

const SERVICE_PLACEHOLDERS: Record<string, string> = {
  // Home maintenance
  'House Cleaning':             'e.g. I need a deep clean of my 3-bedroom apartment — kitchen, bathrooms and floors',
  'Plumbing':                   'e.g. My kitchen tap is leaking and the water pressure is very low',
  'Electrical Repair':          'e.g. Two power sockets in my living room have stopped working',
  'Painting':                   'e.g. I need my 3-bedroom house repainted — walls only, light colours preferred',
  'Moving & Packing':           'e.g. I need help moving a 2-bedroom apartment from Westlands to Karen',
  'HVAC Repair & Installation': 'e.g. My AC unit is not cooling properly and makes a rattling noise',
  'Fan Installation':           'e.g. I need a ceiling fan installed in my living room',
  'Appliance Repair':           'e.g. My washing machine stops mid-cycle and shows an error code',
  'Locksmith Services':         'e.g. I lost my house keys and need the lock changed urgently',
  'Roofing & Gutter Repair':    'e.g. My roof is leaking above the master bedroom after heavy rain',
  'CCTV Installation':          'e.g. I need 4 CCTV cameras installed — 2 outside, 2 inside my home',
  'Gate Automation & Repair':   'e.g. My sliding gate motor is broken and the gate won\'t open',
  'Window Repair':              'e.g. Two windows won\'t close properly and one pane is cracked',
  'Masonry & Tiling':           'e.g. I need the bathroom floor retiled — approx 8 square metres',
  'Waterproofing':              'e.g. My basement wall seeps water during heavy rains',
  'Security / Usalama':         'e.g. I need a day guard for my residential compound, Monday to Saturday',
  'Carpentry / Useremala':      'e.g. I need a custom wooden wardrobe built for a master bedroom, 3 m wide',
  // Lifestyle & wellness
  'Personal Training':          'e.g. I want a personal trainer for 3 sessions per week focused on weight loss',
  'Beauty / Uzuri':             'e.g. I need a full hair and makeup session at home for a formal event',
  'Mobile Massage Therapy':     'e.g. I need a 90-minute deep tissue massage at my home in Lavington',
  'Hair Braiding & Styling':    'e.g. I want box braids, medium length, ready for a wedding next Saturday',
  'Makeup Artistry':            'e.g. I need bridal makeup and hair styling for my wedding on 15th March',
  'Dog Walking':                'e.g. I need someone to walk my Labrador every weekday morning for 45 minutes',
  'Pet Grooming':               'e.g. My Golden Retriever needs a full groom — bath, trim and nail clip',
  'Veterinary Home Visits':     'e.g. My cat has been limping for 2 days and I\'d like a home visit',
  'Nutrition Coaching':         'e.g. I want a personalised meal plan to lose weight and manage my blood sugar',
  'Yoga & Pilates Instruction': 'e.g. I need a yoga instructor for private home sessions, 3× per week',
  'Home Care for Elderly':      'e.g. My mother needs daytime care assistance Monday to Friday',
  // Events & celebrations
  'Photography':                'e.g. I need a photographer for a birthday party, 50 guests, in Karen on 20th April',
  'Catering':                   'e.g. I need catering for a corporate lunch — 30 people, buffet style',
  'DJ & Music':                 'e.g. Looking for a DJ for a wedding reception in Nairobi, approx 6 hours',
  'Event Planning':             'e.g. I need help planning a 50th birthday party for 80 guests',
  'MCs & Hosts':                'e.g. I need a bilingual MC (English/Swahili) for a corporate awards night',
  'Decor & Florists':           'e.g. I need floral decor for a wedding — church and reception hall',
  'Tent & Chair Rental':        'e.g. I need a 20×10 m tent, 100 chairs and 10 tables for an outdoor event',
  'Video Production':           'e.g. I need a videographer to film and edit a 3-minute highlight reel of my event',
  'Wedding Officiant':          'e.g. I need a licensed officiant for a civil wedding ceremony for 60 guests',
  // Outdoor & heavy duty
  'Landscaping':                'e.g. My compound needs mowing and the hedges need trimming — approx 200 sqm',
  'Landscaping & Mowing':       'e.g. My compound needs mowing and the hedges need trimming — approx 200 sqm',
  'Car Wash':                   'e.g. I need a full exterior and interior wash for my SUV at my home',
  'Mechanic':                   'e.g. My car makes a grinding noise when braking and the check-engine light is on',
  'Pest Control & Fumigation':  'e.g. I have a cockroach infestation in my kitchen and need immediate treatment',
  'Garbage Collection':         'e.g. I need weekly garbage collection for my 3-bedroom house in Ruaka',
  // Professional & business
  'Tutoring':                   'e.g. My Form 3 student needs weekly Maths and Physics tutoring sessions',
  'Web Development':            'e.g. I need a 5-page business website with a contact form and online booking',
  'Graphic Design':             'e.g. I need a logo and full brand kit for my new restaurant',
  'Legal Consultation':         'e.g. I need help reviewing a commercial lease agreement for my new office',
  'Accounting & Tax':           'e.g. I need my business accounts reconciled and KRA returns filed for 2024',
  'Driving Lessons':            'e.g. I am a beginner and need 10 lessons to prepare for my driving test',
}

// ── Props & main component ────────────────────────────────────────────────────

interface TedQuestionFormProps {
  archetypeId: string
  serviceName?: string | null
  value: Record<string, string>
  onChange: (answers: Record<string, string>) => void
  onImagesChange: (files: File[]) => void
}

export function TedQuestionForm({
  archetypeId,
  serviceName,
  value,
  onChange,
  onImagesChange,
}: TedQuestionFormProps) {
  const archetypeData = (questionsData as any).archetypes?.[archetypeId]
  const questions: Question[] = archetypeData?.questions ?? []

  if (questions.length === 0) {
    return (
      <p className="py-4 text-sm text-gray-500">
        No questions configured for this service type.
      </p>
    )
  }

  const set = (id: string, val: string) => onChange({ ...value, [id]: val })

  return (
    <div className="space-y-5">
      {questions.map((q) => {
        if (q.type === 'image_upload') {
          return (
            <div key={q.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <ImageUploadField question={q} onImagesChange={onImagesChange} />
            </div>
          )
        }

        return (
          <div key={q.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <QuestionLabel question={q} />

              {q.type === 'textarea' && (
                <Textarea
                  value={value[q.id] ?? ''}
                  onChange={(e) => set(q.id, e.target.value)}
                  placeholder={
                    q.id === 'task_description' && serviceName
                      ? (SERVICE_PLACEHOLDERS[serviceName] ?? q.placeholder)
                      : q.placeholder
                  }
                  rows={3}
                  required={q.required}
                />
              )}

              {q.type === 'select' && (
                <Select
                  value={value[q.id] ?? ''}
                  onValueChange={(v) => set(q.id, v)}
                  required={q.required}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option…" />
                  </SelectTrigger>
                  <SelectContent>
                    {q.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {q.type === 'date' && (
                <Input
                  type="date"
                  value={value[q.id] ?? ''}
                  onChange={(e) => set(q.id, e.target.value)}
                  required={q.required}
                  min={new Date().toISOString().split('T')[0]}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Validation helper (exported for use in parent) ────────────────────────────

export function validateTedAnswers(
  archetypeId: string,
  answers: Record<string, string>
): string[] {
  const archetypeData = (questionsData as any).archetypes?.[archetypeId]
  const questions: Question[] = archetypeData?.questions ?? []
  return questions
    .filter((q) => q.required && q.type !== 'image_upload' && !answers[q.id]?.trim())
    .map((q) => q.label)
}
