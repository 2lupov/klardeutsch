import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Menu, X, GraduationCap } from "lucide-react";
import LearnSidebar from "@/components/academy/LearnSidebar";
import VideoLessonPlayer from "@/components/academy/lessons/VideoLessonPlayer";
import VideoQuizLesson from "@/components/academy/lessons/VideoQuizLesson";
import AITutorLesson from "@/components/academy/lessons/AITutorLesson";
import WritingTaskLesson from "@/components/academy/lessons/WritingTaskLesson";
import TeacherChatPanel from "@/components/academy/TeacherChatPanel";
import SpeakingChallengeLesson from "@/components/academy/lessons/SpeakingChallengeLesson";
import FinalExamLesson from "@/components/academy/lessons/FinalExamLesson";
import NotebookLesson from "@/components/academy/lessons/NotebookLesson";
import ArticleLesson from "@/components/academy/lessons/ArticleLesson";
import GrammarLesson from "@/components/academy/lessons/GrammarLesson";
import ReadingLesson from "@/components/academy/lessons/ReadingLesson";
import DialogueTextLesson from "@/components/academy/lessons/DialogueTextLesson";
import WordListLesson from "@/components/academy/lessons/WordListLesson";
import QuizLesson from "@/components/academy/lessons/QuizLesson";
import TeacherChat from "@/components/academy/TeacherChat";
import CohortChat from "@/components/academy/CohortChat";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface ModuleRow {
  id: string;
  title: string;
  sort_order: number;
  is_free_preview: boolean;
}

interface LessonRow {
  id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  lesson_type: string;
  estimated_minutes: number;
  is_free_preview: boolean;
  video_url: string | null;
  video_duration_sec: number | null;
  video_subtitles_url: string | null;
  content: any;
  xp_reward: number;
  coins_reward: number;
}

interface ProgressRow {
  lesson_id: string;
  status: string;
  score: number | null;
}

const AcademyLearn = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();
  const navigate = useNavigate();

  const [courseTitle, setCourseTitle] = useState("");
  const [courseLevel, setCourseLevel] = useState("A1");
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId || !user) return;
    const load = async () => {
      const [{ data: course }, { data: mods }, { data: lsns }, { data: prog }] = await Promise.all([
        supabase.from("courses").select("title, level").eq("id", courseId).single(),
        supabase.from("course_modules").select("id, title, sort_order, is_free_preview").eq("course_id", courseId).order("sort_order"),
        supabase.from("course_lessons").select("id, module_id, title, description, sort_order, lesson_type, estimated_minutes, is_free_preview, video_url, video_duration_sec, video_subtitles_url, content, xp_reward, coins_reward").eq("course_id", courseId).order("sort_order"),
        supabase.from("course_lesson_progress").select("lesson_id, status, score").eq("user_id", user.id).eq("course_id", courseId),
      ]);

      setCourseTitle(course?.title ?? "");
      setCourseLevel(course?.level ?? "A1");
      setModules((mods as ModuleRow[]) ?? []);
      const lessonsList = (lsns as LessonRow[]) ?? [];
      setLessons(lessonsList);
      setProgress((prog as ProgressRow[]) ?? []);

      // Set initial active lesson: first incomplete or first
      const completedIds = new Set((prog ?? []).filter((p: any) => p.status === "completed").map((p: any) => p.lesson_id));
      const firstIncomplete = lessonsList.find((l) => !completedIds.has(l.id));
      setActiveLessonId(firstIncomplete?.id ?? lessonsList[0]?.id ?? null);
      setLoading(false);
    };
    load();
  }, [courseId, user]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? null;
  const activeLessonIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const completedIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));

  const handleComplete = useCallback(async (score?: number) => {
    if (!user || !activeLessonId || !courseId) return;
    await supabase.rpc("complete_course_lesson", {
      p_user_id: user.id,
      p_lesson_id: activeLessonId,
      p_score: score ?? null,
      p_answers: null,
    });
    setProgress((prev) => {
      const existing = prev.find((p) => p.lesson_id === activeLessonId);
      if (existing) return prev.map((p) => p.lesson_id === activeLessonId ? { ...p, status: "completed", score: score ?? null } : p);
      return [...prev, { lesson_id: activeLessonId, status: "completed", score: score ?? null }];
    });
    // Auto-advance
    if (activeLessonIndex < lessons.length - 1) {
      setActiveLessonId(lessons[activeLessonIndex + 1].id);
    }
  }, [user, activeLessonId, courseId, activeLessonIndex, lessons]);

  const goNext = () => {
    if (activeLessonIndex < lessons.length - 1) setActiveLessonId(lessons[activeLessonIndex + 1].id);
  };
  const goPrev = () => {
    if (activeLessonIndex > 0) setActiveLessonId(lessons[activeLessonIndex - 1].id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const renderLesson = () => {
    if (!activeLesson) return <div className="text-center text-muted-foreground py-20">No lesson selected</div>;

    const key = activeLesson.id;
    const content = activeLesson.content as any;

    switch (activeLesson.lesson_type) {
      case "video":
        return <VideoLessonPlayer key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
      case "video_quiz":
        return <VideoQuizLesson key={key} lesson={activeLesson} onComplete={(s) => handleComplete(s)} lang={lang} />;
      case "article":
        return <ArticleLesson key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
      case "grammar":
        return <GrammarLesson key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
      case "reading":
        return <ReadingLesson key={key} lesson={activeLesson} onComplete={(s) => handleComplete(s)} lang={lang} />;
      case "dialogue_text":
        return <DialogueTextLesson key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
      case "word_list":
        return <WordListLesson key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
      case "quiz":
        return <QuizLesson key={key} lesson={activeLesson} onComplete={(s) => handleComplete(s)} lang={lang} />;
      case "ai_tutor":
        return <AITutorLesson key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
      case "writing":
        return <WritingTaskLesson key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
      case "speaking":
        return <SpeakingChallengeLesson key={key} lesson={activeLesson} onComplete={(s) => handleComplete(s)} lang={lang} />;
      case "exam":
        return <FinalExamLesson key={key} lesson={activeLesson} courseId={courseId!} onComplete={(s) => handleComplete(s)} lang={lang} />;
      case "notebook":
        return <NotebookLesson key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
      default:
        return <ArticleLesson key={key} lesson={activeLesson} onComplete={() => handleComplete()} lang={lang} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-12 border-b border-border/30 bg-card/50 backdrop-blur-xl shrink-0 z-20">
        <button onClick={() => navigate(`/academy/${courseId}`)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-display font-bold text-foreground truncate flex-1">{courseTitle}</span>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main content */}
        <div className={`flex-1 overflow-y-auto transition-all ${sidebarOpen && !isMobile ? "mr-80" : ""}`}>
          <div className="max-w-4xl mx-auto px-4 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeLessonId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {renderLesson()}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrev}
                disabled={activeLessonIndex <= 0}
                className="text-xs"
              >
                ← {lang === "uk" ? "Попередній" : "Предыдущий"}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {activeLessonIndex + 1} / {lessons.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={goNext}
                disabled={activeLessonIndex >= lessons.length - 1}
                className="text-xs"
              >
                {lang === "uk" ? "Наступний" : "Следующий"} →
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {(sidebarOpen || !isMobile) && (
          <div
            className={`${
              isMobile
                ? "absolute inset-y-0 right-0 w-72 z-30"
                : "w-80 shrink-0"
            } border-l border-border/30 bg-card/50 backdrop-blur-xl overflow-y-auto transition-all ${
              !sidebarOpen && !isMobile ? "hidden" : ""
            }`}
            style={!isMobile ? { position: "absolute", right: 0, top: 0, bottom: 0 } : undefined}
          >
            <LearnSidebar
              modules={modules}
              lessons={lessons}
              completedIds={completedIds}
              activeLessonId={activeLessonId}
              onSelectLesson={(id) => {
                setActiveLessonId(id);
                if (isMobile) setSidebarOpen(false);
              }}
              lang={lang}
            />
          </div>
        )}

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-20" onClick={() => setSidebarOpen(false)} />
        )}
      </div>

      {/* Teacher Chat FAB */}
      {activeLessonId && courseId && (
        <TeacherChat lessonId={activeLessonId} courseId={courseId} lang={lang} />
      )}

      {/* Cohort Chat FAB */}
      {courseId && (
        <CohortChat courseId={courseId} lang={lang} />
      )}
    </div>
  );
};

export default AcademyLearn;
