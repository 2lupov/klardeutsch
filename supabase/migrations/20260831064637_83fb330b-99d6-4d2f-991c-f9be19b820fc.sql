ALTER TABLE public.book_lektionen
  ADD CONSTRAINT book_lektionen_book_number_unique UNIQUE (book_id, number);