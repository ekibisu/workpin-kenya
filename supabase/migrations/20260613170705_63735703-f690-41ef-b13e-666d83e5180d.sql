-- Drop old notify_user (signature changes)
DROP FUNCTION IF EXISTS public.notify_user(text, text, text, jsonb);

-- ── Phone normalizer: returns +254XXXXXXXXX or NULL ──────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_ke_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v text;
BEGIN
  IF p_phone IS NULL THEN RETURN NULL; END IF;
  v := regexp_replace(p_phone, '[^0-9+]', '', 'g');
  IF v = '' THEN RETURN NULL; END IF;
  IF v LIKE '+254%' THEN RETURN v; END IF;
  IF v LIKE '254%'  THEN RETURN '+' || v; END IF;
  IF v LIKE '0%'    THEN RETURN '+254' || substring(v from 2); END IF;
  IF v LIKE '7%' OR v LIKE '1%' THEN RETURN '+254' || v; END IF;
  RETURN NULL;
END;
$$;

-- ── New notify_user ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id  uuid,
  p_to_email text,
  p_to_phone text,
  p_subject  text,
  p_message  text,
  p_template text,
  p_data     jsonb,
  p_channels text[] DEFAULT ARRAY['in_app','email']
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
    url := v_url,
    body := jsonb_build_object(
      'user_id',  p_user_id,
      'to_email', p_to_email,
      'to_phone', p_to_phone,
      'channels', to_jsonb(p_channels),
      'subject',  p_subject,
      'message',  p_message,
      'template', p_template,
      'data',     p_data
    )::text,
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user TO service_role;

-- ── Trigger 1: new quote → notify client ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_new_quote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id     uuid;
  v_client_email  text;
  v_client_phone  text;
  v_service_name  text;
BEGIN
  SELECT jr.client_id, p.email, public.normalize_ke_phone(p.phone), s.name
    INTO v_client_id, v_client_email, v_client_phone, v_service_name
  FROM job_requests jr
  JOIN profiles p ON p.id = jr.client_id
  LEFT JOIN services s ON s.id = jr.service_id
  WHERE jr.id = NEW.request_id;

  IF v_client_id IS NOT NULL THEN
    PERFORM public.notify_user(
      v_client_id,
      v_client_email,
      v_client_phone,
      'New quote received',
      'A provider submitted a quote of KES ' || NEW.price_kes::text ||
        ' for your ' || COALESCE(v_service_name, 'request'),
      'quote_received',
      jsonb_build_object(
        'service_name', COALESCE(v_service_name, 'your request'),
        'price_kes',    NEW.price_kes::text,
        'quote_id',     NEW.id,
        'request_id',   NEW.request_id
      ),
      ARRAY['in_app','email']
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_quote ON public.quotes;
CREATE TRIGGER trg_notify_new_quote
  AFTER INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_quote();

-- ── Trigger 2: new job_request → notify matching providers ───────────────────
CREATE OR REPLACE FUNCTION public.notify_on_new_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_service_name  text;
  v_service_cat   text;
  v_rec           record;
  v_count         int := 0;
BEGIN
  SELECT name, category INTO v_service_name, v_service_cat
  FROM services WHERE id = NEW.service_id;

  FOR v_rec IN
    SELECT DISTINCT p.id AS user_id, p.email, public.normalize_ke_phone(p.phone) AS phone
    FROM businesses b
    JOIN profiles p ON p.id = b.owner_id
    WHERE b.is_active = true
      AND b.owner_id != NEW.client_id
      AND (v_service_cat IS NULL OR b.categories @> ARRAY[v_service_cat])
      AND (
        NEW.country_code IS NULL
        OR b.service_country_codes @> ARRAY[NEW.country_code]
        OR b.country_code = NEW.country_code
      )
    LIMIT 20
  LOOP
    PERFORM public.notify_user(
      v_rec.user_id,
      v_rec.email,
      v_rec.phone,
      'New job request near you',
      'A new ' || COALESCE(v_service_name, 'job') || ' request was posted in ' ||
        COALESCE(NEW.location_name, 'your area'),
      'generic',
      jsonb_build_object(
        'service_name',  COALESCE(v_service_name, 'Service'),
        'location_name', COALESCE(NEW.location_name, 'Kenya'),
        'request_id',    NEW.id
      ),
      ARRAY['in_app','email','sms']
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
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_job();

-- ── Trigger 3: completion_pending → notify client ────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_completion_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_email   text;
  v_client_phone   text;
  v_provider_name  text;
  v_service_name   text;
BEGIN
  IF NEW.status = 'completion_pending' AND OLD.status != 'completion_pending' THEN
    SELECT p.email, public.normalize_ke_phone(p.phone)
      INTO v_client_email, v_client_phone
    FROM profiles p WHERE p.id = NEW.client_id;

    SELECT s.name INTO v_service_name FROM services s WHERE s.id = NEW.service_id;

    SELECT pr.full_name INTO v_provider_name
    FROM quotes q
    JOIN profiles pr ON pr.id = q.provider_id
    WHERE q.request_id = NEW.id AND q.status = 'accepted'
    LIMIT 1;

    PERFORM public.notify_user(
      NEW.client_id,
      v_client_email,
      v_client_phone,
      'Please confirm job completion',
      COALESCE(v_provider_name, 'Your provider') ||
        ' marked your ' || COALESCE(v_service_name, 'job') ||
        ' as complete. Please confirm.',
      'generic',
      jsonb_build_object(
        'provider_name', COALESCE(v_provider_name, 'Your provider'),
        'service_name',  COALESCE(v_service_name, 'your job'),
        'request_id',    NEW.id
      ),
      ARRAY['in_app','email']
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_completion_pending ON public.job_requests;
CREATE TRIGGER trg_notify_completion_pending
  AFTER UPDATE OF status ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_completion_pending();

-- ── Trigger 4: payment released → notify provider ────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_payment_released()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_provider_id    uuid;
  v_provider_email text;
  v_provider_phone text;
BEGIN
  SELECT wt.provider_id INTO v_provider_id
  FROM work_threads wt WHERE wt.id = NEW.work_thread_id;

  IF v_provider_id IS NULL THEN RETURN NEW; END IF;

  SELECT p.email, public.normalize_ke_phone(p.phone)
    INTO v_provider_email, v_provider_phone
  FROM profiles p WHERE p.id = v_provider_id;

  PERFORM public.notify_user(
    v_provider_id,
    v_provider_email,
    v_provider_phone,
    'Payment released to your wallet',
    'KES ' || NEW.amount_kes::text || ' has been released to your wallet.',
    'payment_success',
    jsonb_build_object(
      'amount_kes', NEW.amount_kes::text,
      'payment_id', NEW.id,
      'work_thread_id', NEW.work_thread_id
    ),
    ARRAY['in_app','email','sms']
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payment_released ON public.payments;
CREATE TRIGGER trg_notify_payment_released
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'released' AND OLD.status IS DISTINCT FROM 'released')
  EXECUTE FUNCTION public.notify_on_payment_released();
