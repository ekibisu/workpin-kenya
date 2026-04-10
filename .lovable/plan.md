

# Fix Image Loading + 3D Button Effects

## Root Cause: Images Not Loading

The `Image` component (`src/components/ui/Image.tsx`) has a critical bug on line 76:

```tsx
className={cn(className, isLoading && 'hidden')}
```

When `isLoading` is true, the `<img>` gets `display: none` via Tailwind's `hidden` class. Combined with `loading="lazy"` on line 75, this creates a deadlock: lazy-loaded images only load when they enter the viewport, but `display: none` elements are never observed by the Intersection Observer. The image never loads, so `isLoading` never becomes false, so the image stays hidden forever.

**Fix**: Replace `hidden` with `invisible h-0 overflow-hidden` (or `opacity-0 absolute`) so the element remains in the DOM flow and can trigger the lazy load, while still being visually hidden during the loading state.

## 3D Button Effects

The current `default` button variant uses `shadow-brand` which is a soft colored shadow. To create a raised, 3D look:

### Changes to `src/components/ui/button.tsx`
- Update the `default` variant with a multi-layer box shadow (bottom highlight + deeper shadow) and a subtle `translate-y` on hover/active for a press effect
- Add `active:translate-y-0.5` and `active:shadow-sm` for a tactile "push down" feel

### Changes to `src/index.css`
- Add new utility `.shadow-brand-3d` with a layered shadow: a tight bottom edge shadow for the "raised" look plus a softer ambient shadow beneath

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/ui/Image.tsx` | Replace `hidden` with `invisible h-0 overflow-hidden` to fix lazy-load deadlock |
| `src/components/ui/button.tsx` | Add 3D raised effect with layered shadows and active press animation to `default` and `hero` variants |
| `src/index.css` | Add `.shadow-brand-3d` utility with multi-layer shadow for raised look |

No database changes needed.

