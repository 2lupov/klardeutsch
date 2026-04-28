import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Главная",
  "/profile": "Профиль",
  "/dictionary": "Словарь",
  "/stats": "Статистика",
  "/shop": "Магазин",
  "/games": "Игры",
  "/chat": "Чат",
  "/word-lookup": "Поиск слова",
  "/assistant": "AI Ассистент",
  "/tutoring": "Уроки с преподавателем",
  "/assignments": "Задания",
  "/review": "Повторение слов",
  "/academy": "Академия",
  "/onboarding": "Онбординг",
};

function labelForRoute(path: string): string {
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path];
  if (path.startsWith("/tutoring/lesson/")) return "Урок с преподавателем";
  if (path.startsWith("/tutoring/homework/")) return "Домашнее задание";
  if (path.startsWith("/tutoring/placement/")) return "Тест на уровень";
  if (path.startsWith("/course/")) return "Курс";
  if (path.startsWith("/academy/") && path.endsWith("/learn")) return "Академия — урок";
  if (path.startsWith("/academy/")) return "Академия — курс";
  if (path.startsWith("/certificate/")) return "Сертификат";
  return path;
}

/**
 * Публикует presence ученика и слушает команды от учителя.
 * Вызывается один раз в AppLayout для авторизованного пользователя.
 */
export function useTeacherLink(userId: string | undefined) {
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for teacher commands (broadcast)
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`teacher-cmd:${userId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on("broadcast", { event: "navigate" }, ({ payload }) => {
      if (payload?.path) {
        toast.info(`👨‍🏫 ${payload.message || "Преподаватель открыл задание"}`);
        navigate(payload.path);
      }
    });

    ch.on("broadcast", { event: "message" }, ({ payload }) => {
      if (payload?.text) {
        toast(`👨‍🏫 ${payload.text}`, { duration: 8000 });
      }
    });

    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, navigate]);

  // Publish presence (route + page label)
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`student-presence:${userId}`, {
      config: { presence: { key: userId } },
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          route: location.pathname,
          label: labelForRoute(location.pathname),
          last_seen: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, location.pathname]);
}
