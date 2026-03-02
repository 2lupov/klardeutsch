
-- Add last_active and telegram_chat_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS telegram_chat_id bigint;

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
