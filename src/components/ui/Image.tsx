import React, { useState, useEffect, useRef } from 'react';
import { Skeleton } from './skeleton';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaFileMetadata {
  alt_text?: string | null;
  caption?: string | null;
  seo_title?: string | null;
}

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  mediaFile?: MediaFileMetadata;
}

const Image = ({
  src,
  alt = '',
  className = '',
  fallback,
  mediaFile,
  ...props
}: ImageProps) => {
  const resolvedAlt = mediaFile?.alt_text || alt;
  const resolvedTitle = mediaFile?.seo_title || props.title;


  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);


  useEffect(() => {
    if (src) { setIsLoading(true); setError(false); }
    if (imgRef.current?.complete) { setIsLoading(false); setError(false); }
  }, [src, retryCount]);


  const handleLoad = () => { setIsLoading(false); setError(false); };
  const handleError = () => { setIsLoading(false); setError(true); };
  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };


  const defaultFallback = (
    <div className={cn('flex flex-col items-center justify-center bg-muted text-muted-foreground', className)}>
      <AlertCircle className="h-6 w-6 mb-1" />
      <span className="text-xs">Image error</span>
      <button
        type="button"
        className="mt-1 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-300"
        onClick={handleRetry}
      >
        Retry
      </button>
    </div>
  );


  if (!src || error) {
    return <>{fallback || defaultFallback}</>;
  }

  return (
    <>
      {isLoading && <Skeleton className={className} />}
      <img
        ref={imgRef}
        src={src + (retryCount ? `?retry=${retryCount}` : '')}
        alt={resolvedAlt}
        title={resolvedTitle}
        loading="lazy"
        className={cn(className, isLoading && 'hidden')}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </>
  );
};

export default Image;
