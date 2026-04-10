

# Amplify 3D Effects Across the Entire UI

## Problem
The current 3D button shadows are subtle — the bottom edge is only 2px and the ambient shadows are light. Cards use a flat `shadow-sm`. Text, icons, and badges have no depth treatment at all. The UI feels flat instead of tactile and lifelike.

## Changes

### 1. `src/index.css` — Deeper 3D shadows + new utilities

**Buttons**: Increase the bottom edge from 2px to 4px, darken and enlarge the ambient shadows significantly. Add an `inset` highlight at the top for a glossy convex feel.

```css
.shadow-brand-3d {
  box-shadow:
    inset 0 1px 0 0 hsl(160 70% 45% / 0.5),   /* top highlight */
    0 4px 0 0 hsl(160 95% 18%),                  /* thick bottom edge */
    0 6px 16px -2px hsl(160 95% 20% / 0.45),     /* mid shadow */
    0 12px 32px -4px hsl(160 95% 20% / 0.2);     /* deep shadow */
}
```

Same pattern scaled up for hover, scaled down for pressed.

**New utilities for cards, text, and icons**:
- `.shadow-card-raised` — subtle multi-layer shadow for cards (neutral, not green) with a 1px bottom edge for a "lifted paper" look
- `.text-raised` — `text-shadow` with a tiny light highlight above and dark shadow below to emboss headings
- `.icon-raised` — `filter: drop-shadow(...)` for SVG icons to appear slightly lifted

### 2. `src/components/ui/card.tsx` — Raised cards
Replace `shadow-sm` with the new `shadow-card-raised` utility on the base `Card` component. Add `hover:shadow-card-raised-hover` with a subtle lift transition.

### 3. `src/components/ui/button.tsx` — Bolder 3D
The variants already reference the shadow utilities, so they'll get the deeper shadows automatically from the CSS change. Add `border-b-2 border-primary-dark/30` to `default` and `hero` for an additional bottom border that reinforces the edge.

### 4. `src/index.css` base layer — Global raised text + icons
- Apply `text-raised` to `h1-h6` headings globally
- Apply a subtle `text-shadow` to body text for micro-depth
- Apply `icon-raised` via a global `[data-lucide]` or `svg` selector for all Lucide icons

### 5. `src/components/ui/badge.tsx` — Raised badges
Add a small `shadow-sm` and `border-b` to default/secondary badge variants for a pill-button depth effect.

## Files

| File | Change |
|------|--------|
| `src/index.css` | Amplify 3D shadow utilities; add card-raised, text-raised, icon-raised utilities; global heading/body text-shadow |
| `src/components/ui/card.tsx` | Replace `shadow-sm` with `shadow-card-raised` + hover lift |
| `src/components/ui/button.tsx` | Add bottom border accent to reinforce 3D edge |
| `src/components/ui/badge.tsx` | Add subtle shadow + bottom border for raised pill effect |

No database changes needed.

