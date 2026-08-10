// Client-side holding area for photos picked by logged-out guests.
// Anon users can't write to Supabase Storage (RLS), so we stash the raw blob
// in IndexedDB and upload it after they sign in.

const DB_NAME = "workpin-media";
const DB_VERSION = 1;
const STORE = "pending-photos";
const DRAFT_INDEX = "draftSessionId";

export const MAX_PENDING_FILE_BYTES = 5 * 1024 * 1024; // matches useMediaUpload
export const MAX_PENDING_TOTAL_BYTES = 15 * 1024 * 1024; // ~3 files per draft

export interface PendingPhoto {
  id: string;
  draftSessionId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  createdAt: number;
}

function isSupported() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex(DRAFT_INDEX, "draftSessionId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = fn(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
        transaction.oncomplete = () => db.close();
      })
  );
}

export function newDraftSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export async function getPendingPhotosByDraftSessionId(
  draftSessionId: string
): Promise<PendingPhoto[]> {
  if (!isSupported() || !draftSessionId) return [];
  try {
    const rows = await tx<PendingPhoto[]>("readonly", (store) =>
      store.index(DRAFT_INDEX).getAll(draftSessionId) as IDBRequest<PendingPhoto[]>
    );
    return rows ?? [];
  } catch {
    return [];
  }
}

export async function getPendingPhoto(id: string): Promise<PendingPhoto | null> {
  if (!isSupported()) return null;
  try {
    const row = await tx<PendingPhoto | undefined>("readonly", (store) => store.get(id));
    return row ?? null;
  } catch {
    return null;
  }
}

export async function savePendingPhoto(
  file: File,
  draftSessionId: string
): Promise<PendingPhoto> {
  if (!isSupported()) throw new Error("Offline photo storage is not available in this browser");
  if (file.size > MAX_PENDING_FILE_BYTES) {
    throw new Error(`File exceeds ${MAX_PENDING_FILE_BYTES / (1024 * 1024)}MB limit`);
  }

  const existing = await getPendingPhotosByDraftSessionId(draftSessionId);
  const usedBytes = existing.reduce((sum, p) => sum + (p.blob?.size ?? 0), 0);
  if (usedBytes + file.size > MAX_PENDING_TOTAL_BYTES) {
    throw new Error("Too many photos — remove one and try again");
  }

  const record: PendingPhoto = {
    id: newDraftSessionId(),
    draftSessionId,
    blob: file,
    fileName: file.name,
    mimeType: file.type,
    createdAt: Date.now(),
  };
  await tx("readwrite", (store) => store.put(record));
  return record;
}

export async function deletePendingPhoto(id: string): Promise<void> {
  if (!isSupported()) return;
  try {
    await tx("readwrite", (store) => store.delete(id));
  } catch {
    // ignore
  }
}

export async function deletePendingPhotosByDraftSessionId(
  draftSessionId: string
): Promise<void> {
  if (!isSupported() || !draftSessionId) return;
  const rows = await getPendingPhotosByDraftSessionId(draftSessionId);
  await Promise.all(rows.map((r) => deletePendingPhoto(r.id)));
}

export async function sweepExpiredPendingPhotos(maxAgeMs: number): Promise<void> {
  if (!isSupported()) return;
  try {
    const rows = await tx<PendingPhoto[]>("readonly", (store) => store.getAll() as IDBRequest<PendingPhoto[]>);
    const cutoff = Date.now() - maxAgeMs;
    await Promise.all(
      (rows ?? [])
        .filter((r) => !r.createdAt || r.createdAt < cutoff)
        .map((r) => deletePendingPhoto(r.id))
    );
  } catch {
    // ignore
  }
}
