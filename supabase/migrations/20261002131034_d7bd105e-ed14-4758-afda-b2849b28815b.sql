alter table public.dutch_vocab
  add column if not exists folder text not null default 'Без папки',
  add column if not exists image_url text,
  add column if not exists image_credit text,
  add column if not exists image_query text;
create index if not exists dutch_vocab_folder_idx on public.dutch_vocab (user_id, folder);