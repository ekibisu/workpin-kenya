TRUNCATE TABLE
  public.notifications,
  public.profile_views,
  public.media_files,
  public.wallet_transactions,
  public.provider_wallets,
  public.payout_requests,
  public.pending_subscription_payments,
  public.payments,
  public.disputes,
  public.reviews,
  public.bookings,
  public.conversation_read_status,
  public.messages,
  public.work_threads,
  public.quotes,
  public.job_requests,
  public.provider_templates,
  public.fixed_price_services,
  public.business_subscriptions,
  public.business_services,
  public.business_gallery,
  public.business_faqs,
  public.businesses,
  public.user_roles,
  public.profiles
RESTART IDENTITY CASCADE;

DELETE FROM auth.users;