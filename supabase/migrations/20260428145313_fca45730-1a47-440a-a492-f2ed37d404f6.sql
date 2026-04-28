ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_age_range CHECK (age IS NULL OR (age >= 5 AND age <= 120));