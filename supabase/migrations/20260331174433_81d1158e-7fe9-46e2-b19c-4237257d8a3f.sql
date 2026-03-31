ALTER TABLE course_lessons DROP CONSTRAINT IF EXISTS course_lessons_lesson_type_check;

ALTER TABLE course_lessons ADD CONSTRAINT course_lessons_lesson_type_check 
  CHECK (lesson_type IN (
    'video', 'video_quiz', 'article', 'reading', 'grammar', 'dialogue_text', 
    'word_list', 'ai_tutor', 'teacher_chat', 'writing', 'speaking', 
    'notebook', 'quiz', 'exam'
  ));