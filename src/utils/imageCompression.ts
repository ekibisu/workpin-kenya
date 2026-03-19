export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  maxSizeKB?: number;
}

export const COMPRESSION_PRESETS: Record<string, CompressionOptions> = {
  logo: { maxWidth: 400, maxHeight: 400, quality: 0.85, format: 'webp', maxSizeKB: 100 },
  'profile-photo': { maxWidth: 600, maxHeight: 600, quality: 0.8, format: 'webp', maxSizeKB: 200 },
  portfolio: { maxWidth: 1200, maxHeight: 800, quality: 0.8, format: 'jpeg', maxSizeKB: 500 },
  hero: { maxWidth: 1600, maxHeight: 900, quality: 0.8, format: 'jpeg', maxSizeKB: 600 },
  general: { maxWidth: 1200, maxHeight: 800, quality: 0.8, format: 'jpeg', maxSizeKB: 500 },
};

function fitDimensions(w: number, h: number, maxW: number, maxH: number) {
  let width = w;
  let height = h;
  const ratio = width / height;
  if (width > maxW) { width = maxW; height = width / ratio; }
  if (height > maxH) { height = maxH; width = height * ratio; }
  return { width: Math.round(width), height: Math.round(height) };
}

export async function compressImage(
  file: File | Blob,
  options: CompressionOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();

    img.onload = () => {
      const { width, height } = fitDimensions(
        img.width, img.height,
        options.maxWidth ?? 1200, options.maxHeight ?? 800
      );
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          const sizeKB = blob.size / 1024;
          if (options.maxSizeKB && sizeKB > options.maxSizeKB && (options.quality ?? 0.8) > 0.3) {
            compressImage(blob, { ...options, quality: (options.quality ?? 0.8) - 0.1 })
              .then(resolve).catch(reject);
          } else {
            resolve(blob);
          }
        },
        `image/${options.format ?? 'jpeg'}`,
        options.quality ?? 0.8
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function needsCompression(file: File | Blob, maxSizeKB = 500): boolean {
  return file.size / 1024 > maxSizeKB;
}
