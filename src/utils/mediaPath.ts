export function generateMediaPath(
  file: File,
  providerSlug?: string,
  providerName?: string,
  context: string = 'general'
): { filePath: string; fileName: string } {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const ts = Date.now();

  if (providerSlug && providerName) {
    const clean = providerName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    const fileName = `${clean}-${context}-${ts}.${ext}`;
    return { filePath: `${providerSlug}/${fileName}`, fileName };
  }

  // Fallback for uploads without a provider
  const fallbackId = crypto.randomUUID?.() ?? `${ts}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${fallbackId}-${context}.${ext}`;
  return { filePath: `user-uploads/general/${fileName}`, fileName };
}

export function sanitizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/^\//, '');
}
