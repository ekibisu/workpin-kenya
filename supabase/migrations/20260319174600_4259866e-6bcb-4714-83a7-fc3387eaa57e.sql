
-- Create media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', true, 5242880);

-- Storage RLS: anyone can view
CREATE POLICY "Anyone can view media files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'media');

-- Storage RLS: authenticated can upload
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Storage RLS: owners can update
CREATE POLICY "Users can update own media objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

-- Storage RLS: owners can delete
CREATE POLICY "Users can delete own media objects"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- Create media_files tracking table
CREATE TABLE public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  bucket_id TEXT NOT NULL DEFAULT 'media',

  provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  alt_text TEXT,
  caption TEXT,
  seo_title TEXT,

  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  usage_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  last_accessed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_media_files_provider ON public.media_files(provider_id) WHERE is_deleted = false;
CREATE INDEX idx_media_files_uploaded_by ON public.media_files(uploaded_by) WHERE is_deleted = false;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_media_files_updated_at
  BEFORE UPDATE ON public.media_files
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read non-deleted media or own media"
  ON public.media_files FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid() OR is_deleted = false);

CREATE POLICY "Users insert own media"
  ON public.media_files FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users update own media"
  ON public.media_files FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins full access to media"
  ON public.media_files FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
