

# Add Photo Uploads to Service Requests

Allow customers to attach up to 5 photos when describing a job, so providers can better understand the work needed.

## What Changes

### 1. Storage Setup (Database Migration)
- Create a **public storage bucket** called `request-images` for storing uploaded job photos.
- Add RLS policies so authenticated users can upload to their own folder and anyone authenticated can view images.
- Add an `image_urls` column (text array) to the `service_requests` table to store the image paths.

### 2. Image Upload UI (Step 1 -- Details Step)
- Add a drag-and-drop / click-to-upload area below the description field on **Step 2 (Details)**.
- Support up to **5 images**, max 5MB each, image types only (jpg, png, webp).
- Show thumbnail previews with a remove button for each selected image.
- Use the Camera and ImagePlus icons from lucide-react for visual cues.

### 3. Upload Logic on Submit
- When the user submits the request, upload all selected images to the `request-images` bucket under the path `{user_id}/{request_id}/`.
- After inserting the service request row, update it with the array of public image URLs.
- Show upload progress feedback during submission.

### 4. Review Step Update
- Display uploaded image thumbnails in the **Review step (Step 4)** so customers can verify before submitting.

### 5. Dashboard Update
- Show image thumbnails (if any) on the request cards in the dashboard.

---

## Technical Details

**Migration SQL:**
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('request-images', 'request-images', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload request images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'request-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to view all request images
CREATE POLICY "Anyone can view request images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'request-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own request images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'request-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add image_urls column to service_requests
ALTER TABLE service_requests ADD COLUMN image_urls text[] DEFAULT '{}';
```

**Frontend changes:**
- `src/pages/RequestService.tsx`: Add `File[]` state for selected images, image picker UI in step 1, thumbnail previews, upload logic in `handleSubmit` using `supabase.storage.from('request-images').upload(...)`, and image display in review step.
- `src/pages/Dashboard.tsx`: Show image thumbnails on request cards if `image_urls` is populated.

**Upload flow:**
1. User selects files locally (stored in component state, not uploaded yet).
2. On submit: insert service_request row first to get the `id`.
3. Upload each file to `request-images/{user_id}/{request_id}/{filename}`.
4. Get public URLs and update the service_request row with the `image_urls` array.

