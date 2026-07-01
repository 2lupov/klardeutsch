
CREATE TABLE public.mono_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  ccy integer NOT NULL DEFAULT 980,
  status text NOT NULL DEFAULT 'created',
  payment_type text NOT NULL DEFAULT 'debit',
  reference text,
  destination text,
  page_url text,
  basket jsonb,
  discounts jsonb,
  webhook_data jsonb,
  modified_date timestamptz,
  finalized_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mono_payments TO authenticated;
GRANT ALL ON public.mono_payments TO service_role;
ALTER TABLE public.mono_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payments" ON public.mono_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all payments" ON public.mono_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.mono_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text,
  status text,
  signature_valid boolean,
  raw_body jsonb,
  headers jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mono_webhook_logs TO service_role;
ALTER TABLE public.mono_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook logs" ON public.mono_webhook_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX mono_payments_user_idx ON public.mono_payments(user_id);
CREATE INDEX mono_payments_status_idx ON public.mono_payments(status);
