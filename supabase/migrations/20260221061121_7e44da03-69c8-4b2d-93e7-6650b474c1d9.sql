-- First, find and drop the existing check constraint on job_requests.status
-- Then add a new one that includes 'completion_pending'
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'job_requests'
    AND att.attname = 'status'
    AND con.contype = 'c';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.job_requests DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.job_requests ADD CONSTRAINT job_requests_status_check
  CHECK (status IN ('open', 'pending', 'matched', 'filled', 'completed', 'expired', 'completion_pending'));

NOTIFY pgrst, 'reload schema';