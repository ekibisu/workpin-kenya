CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

GRANT SELECT ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role reads config" ON public.app_config;
CREATE POLICY "Service role reads config" ON public.app_config
  FOR SELECT TO service_role USING (true);

INSERT INTO public.app_config (key, value)
VALUES ('notification_function_url',
        'https://ebfewhicwahypqabtpbs.supabase.co/functions/v1/send-notification')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;