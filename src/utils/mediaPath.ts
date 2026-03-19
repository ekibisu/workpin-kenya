function cleanName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface MediaPathOptions {
  file: File;
  context?: string;
  providerSlug?: string;
  providerName?: string;
  userName?: string;
  serviceName?: string;
  userId?: string;
}

export function generateMediaPath(opts: MediaPathOptions): { filePath: string; fileName: string } {
  const { file, context = 'general', providerSlug, providerName, userName, serviceName, userId } = opts;
  const ext = file.name.split('.').pop() ?? 'jpg';
  const ts = Date.now();

  // 1. Provider media: {provider-slug}/{provider-name}-{context}-{timestamp}.{ext}
  if (providerSlug && providerName) {
    const clean = cleanName(providerName);
    const fileName = `${clean}-${context}-${ts}.${ext}`;
    return { filePath: `${providerSlug}/${fileName}`, fileName };
  }

  // 2. Client uploads (avatars etc): clients/{user-full-name}-{context}-{timestamp}.{ext}
  if (userName) {
    const clean = cleanName(userName);
    const fileName = `${clean}-${context}-${ts}.${ext}`;
    return { filePath: `clients/${fileName}`, fileName };
  }

  // 3. Request images: requests/{service-name}-{context}-{timestamp}.{ext}
  if (serviceName) {
    const clean = cleanName(serviceName);
    const fileName = `${clean}-${context}-${ts}.${ext}`;
    return { filePath: `requests/${fileName}`, fileName };
  }

  // 4. Fallback with user ID: user-uploads/{userId}/{context}-{timestamp}.{ext}
  const id = userId ?? crypto.randomUUID?.() ?? `${ts}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${context}-${ts}.${ext}`;
  return { filePath: `user-uploads/${id}/${fileName}`, fileName };
}

export function sanitizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/^\//, '');
}
