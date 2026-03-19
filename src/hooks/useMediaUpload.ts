import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressImage, needsCompression, COMPRESSION_PRESETS } from '@/utils/imageCompression';
import { generateMediaPath, sanitizePath } from '@/utils/mediaPath';
import { generateAltText } from '@/utils/mediaAltText';

const BUCKET = 'media';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface UploadOptions {
  file: File;
  providerId?: string;
  providerSlug?: string;
  providerName?: string;
  context?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface MediaFileRecord {
  id: string;
  file_name: string;
  file_path: string;
  public_url: string;
  mime_type: string;
  file_size: number;
  alt_text: string | null;
  tags: string[];
}

export async function uploadMediaFile(opts: UploadOptions): Promise<MediaFileRecord> {
  const { file, providerId, providerSlug, providerName, context = 'general', tags = [], metadata = {} } = opts;

  // 1. Validate
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }

  // 2. Compress (if image and oversized)
  let uploadFile: File = file;
  if (file.type.startsWith('image/') && needsCompression(file, 500)) {
    const preset = COMPRESSION_PRESETS[context] ?? COMPRESSION_PRESETS.general;
    try {
      const blob = await compressImage(file, preset);
      const newExt = preset.format === 'webp' ? 'webp' : 'jpg';
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      uploadFile = new File([blob], `${baseName}.${newExt}`, { type: blob.type });
    } catch {
      // Fall back to original file
    }
  }

  // 3. Generate path
  const { filePath } = generateMediaPath(uploadFile, providerSlug, providerName, context);
  const safePath = sanitizePath(filePath);

  // 4. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(safePath, uploadFile, { cacheControl: '31536000', upsert: true });

  if (uploadError) throw uploadError;

  // 5. Get public URL
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(safePath);

  // 6. Generate SEO alt text
  const altText = generateAltText(uploadFile.name, context, providerName);

  // 7. Record in database
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('media_files').insert([{
    file_name: uploadFile.name,
    file_path: safePath,
    public_url: publicUrl,
    mime_type: uploadFile.type,
    file_size: uploadFile.size,
    bucket_id: BUCKET,
    provider_id: providerId ?? null,
    uploaded_by: user?.user?.id ?? null,
    tags: [...tags, context],
    alt_text: altText,
    metadata: metadata as Record<string, unknown>,
  }]).select('*').single();

  if (error) throw error;
  return data as unknown as MediaFileRecord;
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (opts: UploadOptions): Promise<MediaFileRecord | null> => {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMediaFile(opts);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}
