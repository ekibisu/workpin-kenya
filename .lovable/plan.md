

# Fix: Smart CTA Routing for Authenticated Users

## Problem
All home page CTAs ("Hire a Verified Pro", "Get Started", "Join as a Pro", "Become a Pro") link to `/register`. When a logged-in user clicks "Hire a Verified Pro", they land on the signup form — a dead end since they already have an account. The experience should route them to where they can actually hire someone.

## Desired Behavior

| Button | Logged Out | Logged In |
|--------|-----------|-----------|
| "Hire a Verified Pro" | `/register` | `/request` (service request flow) |
| "Get Started" | `/register` | `/request` |
| "Join as a Pro" | `/register` | `/dashboard/businesses` (create a business) |
| "Become a Pro" | `/register` | `/dashboard/businesses` |

## Changes

### 1. `src/components/home/HeroSection.tsx`
- Import `useAuth` from `AuthContext`
- Read `user` from context
- "Hire a Verified Pro" links to `/request` if authenticated, `/register` if not
- "Join as a Pro" links to `/dashboard/businesses` if authenticated, `/register` if not

### 2. `src/components/home/CTASection.tsx`
- Same pattern: import `useAuth`
- "Get Started" links to `/request` if authenticated, `/register` if not
- "Become a Pro" links to `/dashboard/businesses` if authenticated, `/register` if not

### Files changed

| File | Change |
|------|--------|
| `src/components/home/HeroSection.tsx` | Add auth-aware routing for both CTAs |
| `src/components/home/CTASection.tsx` | Add auth-aware routing for both CTAs |

No database changes needed.

