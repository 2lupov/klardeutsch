create table if not exists public.dutch_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  status text not null default 'unlocked',
  best_score numeric,
  attempts int not null default 0,
  content_json jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, module_id)
);
grant select, insert, update, delete on public.dutch_module_progress to authenticated;
grant all on public.dutch_module_progress to service_role;
alter table public.dutch_module_progress enable row level security;
create policy "own module progress select" on public.dutch_module_progress for select to authenticated using (auth.uid() = user_id);
create policy "own module progress insert" on public.dutch_module_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "own module progress update" on public.dutch_module_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.dutch_vocab (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lemma text not null,
  article text,
  translation_ru text,
  translation_de text,
  example text,
  example_ru text,
  source text not null default 'manual',
  status text not null default 'new',
  ease numeric not null default 2.5,
  interval_days numeric not null default 0,
  reps int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, lemma)
);
grant select, insert, update, delete on public.dutch_vocab to authenticated;
grant all on public.dutch_vocab to service_role;
alter table public.dutch_vocab enable row level security;
create policy "own vocab select" on public.dutch_vocab for select to authenticated using (auth.uid() = user_id);
create policy "own vocab insert" on public.dutch_vocab for insert to authenticated with check (auth.uid() = user_id);
create policy "own vocab update" on public.dutch_vocab for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own vocab delete" on public.dutch_vocab for delete to authenticated using (auth.uid() = user_id);
create index if not exists dutch_vocab_due_idx on public.dutch_vocab (user_id, due_at) where status <> 'known';
create index if not exists dutch_vocab_lemma_idx on public.dutch_vocab (user_id, lower(lemma));