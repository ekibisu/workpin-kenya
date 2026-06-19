ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;