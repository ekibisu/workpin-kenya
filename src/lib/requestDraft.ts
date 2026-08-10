// Persisted "Post a Job" wizard draft, used to survive the
// logged-out -> /auth -> logged-in handoff.

import {
  deletePendingPhotosByDraftSessionId,
  sweepExpiredPendingPhotos,
} from "@/lib/pendingPhotoStore";

export const REQUEST_DRAFT_KEY = "workpin_pending_request_draft";

export interface RequestDraft {
  serviceId: string | null;
  providerId: string | null;
  answers: Record<string, string>;
  imageUrls: string[];
  /** Scopes guest photos held in IndexedDB to this wizard session. */
  draftSessionId: string;
  /** IndexedDB ids of guest photos awaiting upload after login. */
  pendingPhotoIds: string[];
  location: string;
  step: number;
  savedAt: number;
}

// Drafts older than this are considered stale and ignored.
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

export function saveRequestDraft(draft: Omit<RequestDraft, "savedAt">) {
  try {
    const payload: RequestDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(REQUEST_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // storage unavailable — nothing to do
  }
}

export function loadRequestDraft(): RequestDraft | null {
  try {
    const raw = localStorage.getItem(REQUEST_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RequestDraft;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearRequestDraft();
      return null;
    }
    return {
      ...parsed,
      draftSessionId: parsed.draftSessionId ?? "",
      pendingPhotoIds: parsed.pendingPhotoIds ?? [],
    };
  } catch {
    return null;
  }
}

export function hasRequestDraft(): boolean {
  return loadRequestDraft() !== null;
}

export function clearRequestDraft() {
  try {
    const raw = localStorage.getItem(REQUEST_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RequestDraft>;
      if (parsed?.draftSessionId) {
        // Fire-and-forget: drop any guest photos tied to this draft.
        void deletePendingPhotosByDraftSessionId(parsed.draftSessionId);
      }
    }
  } catch {
    // ignore malformed draft
  }
  try {
    localStorage.removeItem(REQUEST_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** Purge guest photos left behind by visitors who never came back. Runs once per session. */
let sweptThisSession = false;
export function sweepStalePendingPhotos() {
  if (sweptThisSession) return;
  sweptThisSession = true;
  void sweepExpiredPendingPhotos(MAX_AGE_MS);
}

/** Where to send a user right after a successful sign-in / sign-up. */
export function postAuthRedirect(fallback = "/dashboard"): string {
  return hasRequestDraft() ? "/request?resume=1" : fallback;
}
