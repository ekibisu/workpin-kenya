

# Fix Profile Page Regressions and Elevate UI

## Problems Identified

From the screenshot and code:

1. **Empty hero area**: When `hero_image_url` is null, just a thin 32px gradient strip renders — looks broken, not intentional
2. **Flat buttons**: The green "Request a Quote" button uses the default `shadow-brand` but looks completely flat on the profile page — no depth, no hover lift
3. **No gallery/portfolio images visible**: The `Image` component returns an error fallback when `src` is falsy — but the page doesn't show a meaningful empty state for the portfolio section, it just vanishes
4. **Service cards are plain**: White boxes with thin borders, no visual weight
5. **Bottom CTA section is washed out**: `bg-accent/50` barely visible
6. **Avatar/initials square is tiny and generic**: 96px with no personality

## Changes

### 1. `src/index.css` — Add 3D button utility classes

Add new utility classes for elevated, 3D-feel buttons:

```css
.shadow-button-raised {
  box-shadow:
    0 4px 6px -1px hsl(160 95% 30% / 0.3),
    0 2px 4px -2px hsl(160 95% 30% / 0.2),
    0 -1px 0 0 hsl(160 95% 22%) inset;
  transition: all 0.2s ease;
}
.shadow-button-raised:hover {
  box-shadow:
    0 8px 16px -4px hsl(160 95% 30% / 0.35),
    0 4px 8px -4px hsl(160 95% 30% / 0.25);
  transform: translateY(-1px);
}
.shadow-button-raised:active {
  transform: translateY(0px);
  box-shadow:
    0 2px 4px -1px hsl(160 95% 30% / 0.2),
    0 1px 2px -1px hsl(160 95% 30% / 0.15);
}
```

### 2. `src/pages/ProviderLanding.tsx` — Visual overhaul

**Hero section (no image state):**
- Replace the thin 32px strip with a generous patterned gradient hero (h-48 with a subtle dot pattern or gradient mesh) so the page has visual weight even without a cover photo
- Add an "Add a cover photo" prompt for owners

**Avatar:**
- Increase to h-28 w-28 on desktop, with a thicker ring and subtle drop shadow

**CTA Buttons:**
- Apply `shadow-button-raised` class to primary "Request a Quote" buttons
- Make them `rounded-full` with slightly larger padding for a pill/capsule shape
- The outline "WhatsApp" button gets a matching raised outline style

**Service cards:**
- Add subtle shadow (`shadow-sm`) and a left border accent (`border-l-4 border-l-primary`)
- On hover: lift with `hover:shadow-md hover:-translate-y-0.5 transition-all`

**Gallery empty state:**
- When no gallery items AND no portfolio_photos, show a styled empty state with an icon and "No portfolio photos yet" message instead of hiding the section entirely

**Bottom CTA:**
- Stronger background: `bg-primary/5 border border-primary/10` with larger padding
- Button gets the raised 3D treatment

**Reviews empty state:**
- Add a subtle illustration placeholder instead of plain text

## Files

| File | Change |
|------|--------|
| `src/index.css` | Add `.shadow-button-raised` 3D button utilities |
| `src/pages/ProviderLanding.tsx` | Hero empty state, bigger avatar, 3D buttons, elevated service cards, gallery empty state, stronger bottom CTA |

No database changes needed.

