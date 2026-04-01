
ALTER TABLE public.profiles ADD COLUMN nickname text;

UPDATE public.profiles SET nickname = display_name WHERE display_name IS NOT NULL;

UPDATE public.profiles SET nickname = 'Lubka_2' 
WHERE user_id = 'dffac486-fee4-4d53-aa49-d5dd9e0ea2a1';

CREATE UNIQUE INDEX unique_nickname ON public.profiles (lower(nickname)) WHERE nickname IS NOT NULL;
