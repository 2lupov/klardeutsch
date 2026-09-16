import { useEffect, useRef, useState } from "react";
import { BookOpen, Sparkles, Camera, BookMarked } from "lucide-react";
import { SubTabs } from "./_ui";
import CoursesPage from "./CoursesPage";
import CourseBuilderPage from "./CourseBuilderPage";
import BookCoursePage from "./BookCoursePage";
import BookLessonPlansPage from "./BookLessonPlansPage";

type Tab = "catalog" | "builder" | "book" | "plans";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "catalog", label: "Каталог", icon: BookOpen },
  { key: "builder", label: "AI-конструктор", icon: Sparkles },
  { key: "book", label: "Із книги (фото)", icon: Camera },
  { key: "plans", label: "Плани з підручника", icon: BookMarked },
];

const KEY = "klar-admin-courses-tab";

export default function CoursesSection() {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem(KEY) as Tab) || "catalog");
  const [pendingCourse, setPendingCourse] = useState<string | null>(null);
  const replaying = useRef(false);

  const change = (key: Tab) => {
    setTab(key);
    localStorage.setItem(KEY, key);
  };

  // Opening the builder from the catalog / students page: switch tab first, then
  // replay the event so the freshly mounted builder receives it.
  useEffect(() => {
    const h = (e: Event) => {
      if (replaying.current) {
        replaying.current = false;
        return;
      }
      const courseId = (e as CustomEvent).detail?.courseId as string | undefined;
      if (!courseId) return;
      change("builder");
      setPendingCourse(courseId);
    };
    window.addEventListener("admin-v2:open-builder", h);
    return () => window.removeEventListener("admin-v2:open-builder", h);
  }, []);

  useEffect(() => {
    if (tab !== "builder" || !pendingCourse) return;
    const courseId = pendingCourse;
    setPendingCourse(null);
    const id = requestAnimationFrame(() => {
      replaying.current = true;
      window.dispatchEvent(new CustomEvent("admin-v2:open-builder", { detail: { courseId } }));
    });
    return () => cancelAnimationFrame(id);
  }, [tab, pendingCourse]);

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={change} />
      {tab === "catalog" && <CoursesPage />}
      {tab === "builder" && <CourseBuilderPage />}
      {tab === "book" && <BookCoursePage />}
      {tab === "plans" && <BookLessonPlansPage />}
    </div>
  );
}
