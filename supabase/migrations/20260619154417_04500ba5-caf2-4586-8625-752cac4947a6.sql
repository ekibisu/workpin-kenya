
ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS completion_pending_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_reminder_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.track_completion_pending_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completion_pending' AND OLD.status != 'completion_pending' THEN
    NEW.completion_pending_at := now();
    NEW.completion_reminder_sent_at := NULL;
  END IF;
  IF NEW.status != 'completion_pending' AND OLD.status = 'completion_pending' THEN
    NEW.completion_pending_at := NULL;
    NEW.completion_reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_completion_pending_at ON public.job_requests;
CREATE TRIGGER trg_track_completion_pending_at
  BEFORE UPDATE OF status ON public.job_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.track_completion_pending_at();

CREATE OR REPLACE FUNCTION public.send_completion_reminders()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT jr.id, jr.client_id, s.name AS service_name,
           p.email AS client_email, p.full_name AS client_name, p.phone AS client_phone
    FROM job_requests jr
    JOIN services s ON s.id = jr.service_id
    JOIN profiles p ON p.id = jr.client_id
    WHERE jr.status = 'completion_pending'
      AND jr.completion_pending_at <= now() - interval '5 days'
      AND jr.completion_reminder_sent_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM disputes d
        JOIN work_threads wt ON wt.id = d.work_thread_id
        WHERE wt.job_request_id = jr.id
          AND d.status IN ('open', 'investigating')
      )
  LOOP
    PERFORM public.notify_user(
      v_rec.client_id,
      v_rec.client_email,
      public.normalize_ke_phone(v_rec.client_phone),
      'Please confirm your ' || COALESCE(v_rec.service_name, 'job'),
      'Your provider marked this job complete 5 days ago. Please confirm '
        || 'completion or let us know if there''s an issue — we''ll '
        || 'automatically release payment in 2 more days if we don''t hear from you.',
      'generic',
      jsonb_build_object('job_request_id', v_rec.id),
      ARRAY['in_app', 'email', 'sms']
    );
    UPDATE job_requests SET completion_reminder_sent_at = now() WHERE id = v_rec.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_release_overdue_completions()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rec record;
  v_payment_id uuid;
BEGIN
  FOR v_rec IN
    SELECT jr.id, jr.client_id, s.name AS service_name,
           p.email AS client_email, p.full_name AS client_name, p.phone AS client_phone
    FROM job_requests jr
    JOIN services s ON s.id = jr.service_id
    JOIN profiles p ON p.id = jr.client_id
    WHERE jr.status = 'completion_pending'
      AND jr.completion_pending_at <= now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM disputes d
        JOIN work_threads wt ON wt.id = d.work_thread_id
        WHERE wt.job_request_id = jr.id
          AND d.status IN ('open', 'investigating')
      )
  LOOP
    UPDATE job_requests SET status = 'completed' WHERE id = v_rec.id;
    UPDATE work_threads SET status = 'completed'
    WHERE job_request_id = v_rec.id AND status = 'active';

    SELECT pay.id INTO v_payment_id
    FROM payments pay
    JOIN work_threads wt ON wt.id = pay.work_thread_id
    WHERE wt.job_request_id = v_rec.id
    LIMIT 1;

    PERFORM public.notify_user(
      v_rec.client_id,
      v_rec.client_email,
      public.normalize_ke_phone(v_rec.client_phone),
      'Payment released for your ' || COALESCE(v_rec.service_name, 'job'),
      'We didn''t hear back within 7 days, so this job was automatically '
        || 'marked complete and payment was released to your provider. '
        || 'Contact support if this wasn''t expected.',
      'generic',
      jsonb_build_object('job_request_id', v_rec.id),
      ARRAY['in_app', 'email']
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_completion_reminders TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_release_overdue_completions TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'send-completion-reminders-daily',
  '0 9 * * *',
  $$SELECT public.send_completion_reminders();$$
);

SELECT cron.schedule(
  'auto-release-overdue-completions-daily',
  '15 9 * * *',
  $$SELECT public.auto_release_overdue_completions();$$
);
