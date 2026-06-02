-- ─────────────────────────────────────────────────────────────────────────────
-- Notification triggers
-- Uses pg_net to call the send-notification Edge Function on key events
-- ─────────────────────────────────────────────────────────────────────────────

-- Store the Edge Function URL so triggers can call it
-- Update this value after deploying the send-notification function:
--   UPDATE app_config SET value = 'https://<ref>.supabase.co/functions/v1/send-notification'
--   WHERE key = 'notification_function_url';

CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO app_config (key, value)
VALUES ('notification_function_url', 'https://placeholder.supabase.co/functions/v1/send-notification')
ON CONFLICT (key) DO NOTHING;

-- Allow service role to read config
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role reads config" ON public.app_config
  FOR SELECT TO service_role USING (true);

-- ── Helper: fire notification via pg_net ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_user(
  p_to_email  text,
  p_to_name   text,
  p_type      text,
  p_data      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  SELECT value INTO v_url FROM app_config WHERE key = 'notification_function_url';
  IF v_url IS NULL OR v_url LIKE '%placeholder%' THEN
    RAISE NOTICE 'notify_user: notification_function_url not configured, skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_url,
    body    := jsonb_build_object(
                 'type',     p_type,
                 'to_email', p_to_email,
                 'to_name',  p_to_name,
                 'data',     p_data
               )::text,
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user TO service_role;

-- ── Trigger 1: new quote → notify client ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_new_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_email  text;
  v_client_name   text;
  v_service_name  text;
BEGIN
  -- Get client email + name from job_request → profiles
  SELECT p.email, p.full_name
  INTO v_client_email, v_client_name
  FROM job_requests jr
  JOIN profiles p ON p.id = jr.client_id
  WHERE jr.id = NEW.request_id;

  -- Get service name
  SELECT s.name INTO v_service_name
  FROM job_requests jr
  JOIN services s ON s.id = jr.service_id
  WHERE jr.id = NEW.request_id;

  IF v_client_email IS NOT NULL THEN
    PERFORM public.notify_user(
      v_client_email,
      COALESCE(v_client_name, 'there'),
      'new_quote',
      jsonb_build_object(
        'service_name', COALESCE(v_service_name, 'your request'),
        'price_kes',    NEW.price_kes::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_quote ON public.quotes;
CREATE TRIGGER trg_notify_new_quote
  AFTER INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_quote();

-- ── Trigger 2: new job_request → notify matching providers ───────────────────

CREATE OR REPLACE FUNCTION public.notify_on_new_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_name  text;
  v_service_cat   text;
  v_rec           record;
  v_count         int := 0;
BEGIN
  -- Get service details
  SELECT name, category INTO v_service_name, v_service_cat
  FROM services WHERE id = NEW.service_id;

  -- Find matching provider businesses (by category and country), notify their owners
  -- Limit to 20 to avoid flooding on initial data loads
  FOR v_rec IN
    SELECT DISTINCT p.email, p.full_name, b.business_name
    FROM businesses b
    JOIN profiles p ON p.id = b.owner_id
    WHERE b.is_active = true
      AND b.owner_id != NEW.client_id             -- don't notify the client themselves
      AND (
        v_service_cat IS NULL
        OR b.categories @> ARRAY[v_service_cat]   -- business serves this category
      )
      AND (
        NEW.country_code IS NULL
        OR b.service_country_codes @> ARRAY[NEW.country_code]
        OR b.country_code = NEW.country_code
      )
    LIMIT 20
  LOOP
    PERFORM public.notify_user(
      v_rec.email,
      COALESCE(v_rec.full_name, 'there'),
      'new_job',
      jsonb_build_object(
        'service_name',  COALESCE(v_service_name, 'Service'),
        'location_name', COALESCE(NEW.location_name, 'Kenya')
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'notify_on_new_job: notified % providers for job %', v_count, NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_job ON public.job_requests;
CREATE TRIGGER trg_notify_new_job
  AFTER INSERT ON public.job_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_job();

-- ── Trigger 3: completion_pending → notify client ────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_completion_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_email   text;
  v_client_name    text;
  v_provider_name  text;
  v_service_name   text;
BEGIN
  IF NEW.status = 'completion_pending' AND OLD.status != 'completion_pending' THEN
    SELECT p.email, p.full_name INTO v_client_email, v_client_name
    FROM profiles p WHERE p.id = NEW.client_id;

    SELECT s.name INTO v_service_name
    FROM services s WHERE s.id = NEW.service_id;

    -- Get provider name from the accepted quote
    SELECT pr.full_name INTO v_provider_name
    FROM quotes q
    JOIN profiles pr ON pr.id = q.provider_id
    WHERE q.request_id = NEW.id AND q.status = 'accepted'
    LIMIT 1;

    IF v_client_email IS NOT NULL THEN
      PERFORM public.notify_user(
        v_client_email,
        COALESCE(v_client_name, 'there'),
        'job_complete_pending',
        jsonb_build_object(
          'provider_name', COALESCE(v_provider_name, 'Your provider'),
          'service_name',  COALESCE(v_service_name, 'your job')
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_completion_pending ON public.job_requests;
CREATE TRIGGER trg_notify_completion_pending
  AFTER UPDATE OF status ON public.job_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_completion_pending();
