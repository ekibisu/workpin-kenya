
-- Drop the legacy role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Drop the unused direct_messages table
DROP TABLE IF EXISTS public.direct_messages;

-- Drop the sync trigger if it still exists
DROP TRIGGER IF EXISTS trg_sync_user_role ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_user_role();
