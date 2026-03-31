
SELECT cron.unschedule('broadcast-nickname-update');

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname_changed_at timestamptz DEFAULT NULL;
