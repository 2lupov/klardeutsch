ALTER TABLE public.demo_leaderboard
  ADD COLUMN words_learned integer NOT NULL DEFAULT 0,
  ADD COLUMN lessons_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN duels_won integer NOT NULL DEFAULT 0,
  ADD COLUMN duels_played integer NOT NULL DEFAULT 0;