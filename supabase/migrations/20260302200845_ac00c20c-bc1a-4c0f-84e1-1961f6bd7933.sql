ALTER TABLE public.grammar_lessons DROP CONSTRAINT grammar_lessons_level_key;
ALTER TABLE public.grammar_lessons ADD CONSTRAINT grammar_lessons_level_topic_key UNIQUE (level, topic);