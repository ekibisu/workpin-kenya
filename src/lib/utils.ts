import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Verifies the location object for a client or provider.
 * Returns true if the location is valid (has lat/lng or required fields), false otherwise.
 * Extend this logic as needed for your app's requirements.
 */
export interface LocationLike {
  lat?: number | null;
  lng?: number | null;
  location_name?: string | null;
}

/**
 * Verifies the location object for a client or provider.
 * If lat/lng are missing, attempts to use browser geolocation.
 * Returns a Promise<boolean> indicating if a valid location is available or obtained.
 */
export async function verifyLocation(location: LocationLike): Promise<boolean> {
  // If lat/lng are present and valid
  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return true;
  }
  // Optionally, check for a non-empty location_name as a fallback
  if (location.location_name && location.location_name.trim() !== '') {
    return true;
  }
  // Try browser geolocation
  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      return (
        typeof pos.coords.latitude === 'number' &&
        typeof pos.coords.longitude === 'number'
      );
    } catch (e) {
      return false;
    }
  }
  return false;
}
