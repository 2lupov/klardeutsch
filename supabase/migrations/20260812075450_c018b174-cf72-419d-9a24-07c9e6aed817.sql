CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  phone TEXT NOT NULL CHECK (char_length(phone) BETWEEN 5 AND 30),
  telegram TEXT CHECK (telegram IS NULL OR char_length(telegram) <= 40),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 255),
  level TEXT CHECK (level IS NULL OR char_length(level) <= 40),
  consent BOOLEAN NOT NULL DEFAULT false CHECK (consent = true),
  consent_at TIMESTAMP WITH TIME ZONE,
  discount TEXT CHECK (discount IS NULL OR char_length(discount) <= 60),
  utm_source TEXT CHECK (utm_source IS NULL OR char_length(utm_source) <= 120),
  utm_medium TEXT CHECK (utm_medium IS NULL OR char_length(utm_medium) <= 120),
  utm_campaign TEXT CHECK (utm_campaign IS NULL OR char_length(utm_campaign) <= 120),
  status TEXT NOT NULL DEFAULT 'new' CHECK (char_length(status) <= 30),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.leads TO anon;
GRANT INSERT ON public.leads TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (consent = true AND status = 'new');

CREATE POLICY "Admins can view leads"
ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leads"
ON public.leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete leads"
ON public.leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));