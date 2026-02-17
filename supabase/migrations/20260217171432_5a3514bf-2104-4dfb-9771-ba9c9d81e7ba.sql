
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('request-images', 'request-images', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload request images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'request-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view request images (public bucket)
CREATE POLICY "Anyone can view request images"
ON storage.objects FOR SELECT
USING (bucket_id = 'request-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own request images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'request-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add image_urls column to service_requests
ALTER TABLE public.service_requests ADD COLUMN image_urls text[] DEFAULT '{}';
