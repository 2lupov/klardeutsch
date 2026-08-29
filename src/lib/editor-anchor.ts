/**
 * "Якір" у редакторі курсу — запамʼятовує, де саме викладач працював
 * (курс → урок → секція), щоб можна було перейти туди з попереднього
 * перегляду курсу і швидко повернутись назад у те саме місце.
 */

export type EditorSection =
  | "theory" | "vocab" | "exercises" | "grammar" | "reading" | "dialog" | "culture";

export interface EditorAnchor {
  courseId: string;
  courseTitle?: string;
  level?: string | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  section?: EditorSection;
  at: number;
}

const KEY = "klar-editor-anchor";

export const saveEditorAnchor = (a: Omit<EditorAnchor, "at">) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...a, at: Date.now() }));
  } catch {}
};

export const readEditorAnchor = (): EditorAnchor | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw);
    return a?.courseId ? (a as EditorAnchor) : null;
  } catch {
    return null;
  }
};

export const clearEditorAnchor = () => {
  try { localStorage.removeItem(KEY); } catch {}
};

/** Побудувати URL легасі-редактора з якорем у query. */
export const editorUrl = (a: Omit<EditorAnchor, "at">) => {
  const p = new URLSearchParams({ tab: "courses" });
  if (a.level) p.set("level", a.level);
  p.set("course", a.courseId);
  if (a.lessonId) p.set("lesson", a.lessonId);
  if (a.section) p.set("sec", a.section);
  return `/admin?${p.toString()}`;
};
