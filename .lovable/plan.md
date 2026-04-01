

# Premium Business Profile System

## Current State

The `businesses` table stores flat data: name, bio, categories (text array of names), portfolio_photos (text array of URLs), a single location, and basic rates. The profile page (`/pro/:slug`) renders this as a simple list — no hero image, no service descriptions, no gallery captions, no credentials. The create form is a single dialog with plain inputs. There's no wizard flow.

## What's Missing for a "Website-Grade" Profile

| Feature | Current | Needed |
|---------|---------|--------|
| Hero/cover image | None | Dedicated `hero_image_url` column |
| Service descriptions | Category names only (text[]) | Per-service rows with description, price, duration |
| Gallery | Flat URL array, no captions | Ordered gallery items with captions, alt text, categories |
| Tagline | None | Short pitch line for hero |
| Operating hours | JSON blob, never rendered on profile | Structured display |
| Credentials | None | Certifications, licenses, years of experience |
| FAQs | None | Business-specific Q&A section |
| Profile completeness | None | Score to encourage filling out all sections |
| Wizard | Single dialog | Multi-step guided flow matching RequestService UX |

## Database Changes

### 1. Add columns to `businesses`

```sql
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{English}',
  ADD COLUMN IF NOT EXISTS service_area_description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;
```

### 2. Create `business_services` table

Links businesses to the platform `services` catalog with per-business descriptions and pricing. This replaces the flat `categories` text array for profile display while keeping `categories` for search/filtering.

```sql
CREATE TABLE public.business_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  custom_name text NOT NULL,
  description text,
  price_kes integer,
  price_type text DEFAULT 'starting_at',  -- starting_at | fixed | hourly | quote
  duration_estimate text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_services ENABLE ROW LEVEL SECURITY;

-- RLS: owner manages, anyone reads active
CREATE POLICY "Anyone can view active business services"
  ON business_services FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Business owners manage own services"
  ON business_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_services.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_services.business_id AND b.owner_id = auth.uid()));
```

### 3. Create `business_gallery` table

Replaces the flat `portfolio_photos` array with ordered, captioned media entries.

```sql
CREATE TABLE public.business_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  thumbnail_url text,
  caption text,
  alt_text text,
  category text,  -- e.g. "Before & After", "Completed Work", "Team"
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery"
  ON business_gallery FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Business owners manage own gallery"
  ON business_gallery FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_gallery.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_gallery.business_id AND b.owner_id = auth.uid()));
```

### 4. Create `business_faqs` table

```sql
CREATE TABLE public.business_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view FAQs"
  ON business_faqs FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Business owners manage own FAQs"
  ON business_faqs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_faqs.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_faqs.business_id AND b.owner_id = auth.uid()));
```

## Frontend Changes

### 5. Business Profile Wizard (`src/pages/BusinessProfileWizard.tsx`)

A 6-step guided flow at `/business/:id/setup` (or `/create-business` for new), mirroring the RequestService UX with progress bar and animated transitions:

```text
Step 1: Basics       → Business name, tagline, bio, location
Step 2: Services     → Pick from catalog + add descriptions & pricing per service
Step 3: Gallery      → Upload hero image + portfolio photos with captions
Step 4: Credentials  → Years experience, certifications, languages, operating hours
Step 5: Contact      → M-Pesa phone, WhatsApp, website URL, social links
Step 6: Preview      → Live preview of the profile page + "Publish" button
```

Each step auto-saves progress. The wizard generates the slug on Step 1 and uploads media to SEO-friendly paths (`{slug}/hero-{ts}.webp`, `{slug}/gallery-{caption}-{ts}.webp`).

### 6. Enhanced Profile Landing Page (`src/pages/ProviderLanding.tsx`)

Rebuild the profile page with premium sections:

- **Hero section**: Full-width cover image with overlay showing business name, tagline, rating, location, and CTA buttons
- **Services section**: Cards with service name, description, price, and "Request Quote" button per service
- **Gallery section**: Filterable masonry/grid with lightbox, captions, and category tabs
- **About section**: Bio, years of experience, certifications, languages
- **Hours section**: Visual weekly schedule
- **FAQ section**: Accordion with business-specific Q&A
- **Reviews section**: Enhanced with rating breakdown bar chart
- **Bottom CTA**: "Ready to work with [Business]?" section
- **JSON-LD**: Enhanced `LocalBusiness` + `Service` + `FAQPage` structured data
- **OpenGraph meta tags**: For social sharing with hero image

### 7. Update existing files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/business/:id/setup` route for wizard |
| `src/pages/BusinessManage.tsx` | Add "Edit Profile" button linking to wizard, add gallery/services/FAQ tabs |
| `src/components/dashboard/BusinessesPanel.tsx` | Show profile completeness score, "Set Up Profile" CTA for incomplete profiles |
| `src/components/dashboard/CreateBusinessForm.tsx` | After creation, redirect to wizard instead of closing dialog |
| `src/utils/mediaPath.ts` | Add gallery-specific path pattern with caption in filename |
| `src/lib/slugify.ts` | Auto-generate slug on business creation (already exists, just wire it) |

### 8. Profile Completeness Score

Computed client-side from the business data:

```text
Business name     → 10%
Tagline           → 10%
Bio (100+ chars)  → 10%
Hero image        → 15%
3+ gallery items  → 15%
2+ services       → 15%
Location          → 5%
Operating hours   → 5%
1+ FAQ            → 5%
Credentials       → 10%
```

Displayed as a progress ring on the dashboard business card and in the wizard.

## Implementation Order

1. **Migration** — Add columns + create 3 new tables
2. **Wizard** — Build the 6-step `BusinessProfileWizard.tsx`
3. **Landing page** — Rebuild `ProviderLanding.tsx` with all new sections
4. **Dashboard integration** — Wire completeness score, "Set Up Profile" CTA, redirect after create
5. **SEO** — OpenGraph tags, enhanced JSON-LD, friendly media paths

## Files

| Action | File |
|--------|------|
| Migration | Add columns to `businesses`, create `business_services`, `business_gallery`, `business_faqs` |
| Create | `src/pages/BusinessProfileWizard.tsx` |
| Edit | `src/pages/ProviderLanding.tsx` — premium profile page |
| Edit | `src/App.tsx` — add wizard route |
| Edit | `src/pages/BusinessManage.tsx` — add profile editing tabs |
| Edit | `src/components/dashboard/BusinessesPanel.tsx` — completeness score + CTA |
| Edit | `src/components/dashboard/CreateBusinessForm.tsx` — redirect to wizard |
| Edit | `src/utils/mediaPath.ts` — gallery path pattern |

