
-- Add topic field to all content tables
ALTER TABLE vocab_cards ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT 'Allgemein';
ALTER TABLE grammar_lessons ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT 'Allgemein';
ALTER TABLE grammar_questions ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT 'Allgemein';
ALTER TABLE reading_texts ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT 'Allgemein';
ALTER TABLE listening_texts ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT 'Allgemein';
