
-- Create reviews table for client feedback
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.service_requests(id),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Customer can create a review for their own request
CREATE POLICY "Customer can create own review"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Anyone authenticated can view reviews
CREATE POLICY "Authenticated can view reviews"
ON public.reviews FOR SELECT
USING (true);

-- Customer can update own review
CREATE POLICY "Customer can update own review"
ON public.reviews FOR UPDATE
USING (auth.uid() = customer_id);
