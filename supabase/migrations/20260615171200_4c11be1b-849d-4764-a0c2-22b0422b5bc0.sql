CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_user(p_user_id uuid, p_to_email text, p_to_phone text, p_subject text, p_message text, p_template text, p_data jsonb, p_channels text[] DEFAULT ARRAY['in_app'::text, 'email'::text])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_url text;
BEGIN
  SELECT value INTO v_url FROM app_config WHERE key = 'notification_function_url';
  IF v_url IS NULL OR v_url LIKE '%placeholder%' THEN
    RAISE NOTICE 'notify_user: notification_function_url not configured, skipping';
    RETURN;
  END IF;

  BEGIN
    PERFORM extensions.http_post(
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
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_user: http_post failed: %', SQLERRM;
  END;
END;
$function$;