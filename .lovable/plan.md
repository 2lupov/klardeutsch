

# Plan: Create full course content for A1-C1

## Current State
- 1 course exists: "KLAR A1" (id: `284c5efe-c520-47a0-9bf1-06aa6030ae10`) with 2 lessons (both duplicates of Lesson 1)
- Theory uses structured JSON blocks (TheoryBlock[] format)
- Exercises use a rich JSON format with: `topic`, `vocabulary`, `exercises` (cloze + MC), `reading`

## Scope
- **125 lessons total**: 25 per level (A1, A2, B1, B2, C1)
- Each lesson needs: structured theory blocks, 10-15 vocab words, 5-8 exercises (cloze + MC), reading text with questions

## Approach

This is too much content to write manually. The project already has a `generate-course-prompt` edge function that generates AI prompts for Claude. I propose a **different, more efficient approach**:

### Step 1: Create courses A2-C1 in the database
Insert 4 new courses into the `courses` table with appropriate titles, levels, and prices.

### Step 2: Generate and insert lessons via an edge function
Create a new edge function `generate-course-lessons` that:
1. Takes a course level and lesson number range
2. Uses the Lovable AI gateway (Gemini 2.5 Flash) to generate 5 lessons at a time (to stay within token limits)
3. Generates structured theory (TheoryBlock[] JSON), vocabulary, exercises (cloze + MC), and reading texts
4. Inserts directly into `course_lessons` table
5. Returns progress status

### Step 3: Add a "Generate All Lessons" button in CourseEditor
A button in the admin panel that calls the edge function in batches (5 lessons at a time × 5 batches = 25 lessons per course), showing progress.

### Lesson Topics per Level

**A1** (25 lessons): Greetings, Numbers, Family, Colors, Food/Drink, Daily Routine, Weather, Clothing, House/Apartment, Directions, Shopping, Body/Health, Time/Days, Professions, Hobbies, Transport, At the Doctor, At the Restaurant, At School, Animals, Seasons, In the City, Phone/Email, Holidays, Review

**A2** (25 lessons): Travel, Apartment Search, Job Interview, Media/Internet, Cooking, Sports, Banking, Post Office, At the Market, Neighbors, Celebrations, Environment, Education, Childhood Memories, Plans/Future, Comparisons, Emotions, German Culture, Accidents/Emergency, Bureaucracy, Music/Art, Relationships, Technology, Traditions, Review

**B1** (25 lessons): News/Media, Work Life, Health System, Environment/Climate, Immigration, Education System, Economy, Politics Basics, Social Media, Law/Rights, Housing Market, Family Models, Gender Equality, Volunteering, Literature, Film/Theater, Philosophy, Science, Globalization, Intercultural Communication, Conflict Resolution, Financial Planning, Career Development, German History, Review

**B2** (25 lessons): Academic Writing, Debate/Argumentation, Media Analysis, Economics Deep, Political Discourse, Legal German, Medical German, Technical German, Business Communication, Research Methods, Ethics, Psychology, Sociology, Art History, Architecture, Music Theory, Philosophy of Language, Environmental Policy, International Relations, Marketing, Journalism, Translation Theory, Literary Analysis, Cultural Studies, Review

**C1** (25 lessons): Scientific Writing, Rhetorics, Linguistics, Advanced Grammar Nuances, Idiomatic Expressions, Regional Dialects, Historical Linguistics, Academic Presentations, Critical Analysis, Discourse Analysis, Pragmatics, Sociolinguistics, Psycholinguistics, Corpus Linguistics, Translation Studies, Comparative Literature, Media Theory, Political Philosophy, Economic Theory, Legal Philosophy, Aesthetics, Epistemology, Ethics in Technology, German in Global Context, Review

### Technical Details

1. **New edge function**: `generate-full-course/index.ts`
   - Accepts `{ level, courseId, batchStart, batchSize }` 
   - Generates `batchSize` lessons starting from `batchStart`
   - Uses structured prompts requiring TheoryBlock[] JSON format for theory
   - Uses exercise format matching existing schema
   - Inserts into `course_lessons` with service role key

2. **CourseEditor update**: Add "Auto-generate 25 lessons" button per course that calls the function in 5 batches of 5, with a progress bar

3. **Database inserts**: 4 new courses (A2-C1) via insert tool

### Execution Order
1. Insert 4 courses (A2-C1)
2. Delete duplicate A1 lesson, clean up existing
3. Deploy edge function for batch generation
4. Add UI button in admin CourseEditor
5. User triggers generation per course from admin panel

This approach lets the AI generate high-quality, level-appropriate content with proper TheoryBlock[] formatting, bilingual translations (RU+UK), and progressive difficulty -- all triggered from the admin panel rather than trying to hardcode 125 lessons.

