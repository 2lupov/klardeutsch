import { useEffect } from "react";
import CoursesPage from "./CoursesPage";

export default function CoursesSection() {
  // Keep older course-builder events in the course catalogue: existing course
  // lessons are not lesson kits and cannot be edited by the new workshop.
  useEffect(() => {
    const h = (e: Event) => {
      if (!(e as CustomEvent).detail?.courseId) return;
      // Existing courses use course_lessons, while the workshop stores lesson_kits.
      // Keep the course in the catalogue rather than pretending the kit editor edits it.
      window.dispatchEvent(new CustomEvent("admin-v2:navigate", { detail: { key: "courses" } }));
    };
    window.addEventListener("admin-v2:open-builder", h);
    return () => window.removeEventListener("admin-v2:open-builder", h);
  }, []);

  return <CoursesPage />;
}
