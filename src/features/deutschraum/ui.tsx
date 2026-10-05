import { useMemo, useState } from "react";
import { Check, X, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { L, Question, isCorrect, seededShuffle } from "./data";

export const UI: Record<string, Record<L, string>> = {
  course: { ru: "Курс немецкого A2", uk: "Курс німецької A2", de: "Deutschkurs A2" },
  modules: { ru: "Модули", uk: "Модулі", de: "Module" },
  dictionary: { ru: "Словарь курса", uk: "Словник курсу", de: "Kurswörterbuch" },
  exam: { ru: "Тренажёр telc A2", uk: "Тренажер telc A2", de: "Prüfungstraining telc A2" },
  theory: { ru: "Теория", uk: "Теорія", de: "Theorie" },
  vocab: { ru: "Слова", uk: "Слова", de: "Wortschatz" },
  grammar: { ru: "Грамматика", uk: "Граматика", de: "Grammatik" },
  reading: { ru: "Чтение", uk: "Читання", de: "Lesen" },
  listening: { ru: "Аудирование", uk: "Аудіювання", de: "Hören" },
  writing: { ru: "Письмо", uk: "Письмо", de: "Schreiben" },
  speaking: { ru: "Говорение", uk: "Говоріння", de: "Sprechen" },
  check: { ru: "Проверить", uk: "Перевірити", de: "Prüfen" },
  done: { ru: "Урок пройден", uk: "Урок пройдено", de: "Lektion erledigt" },
  markDone: { ru: "Отметить урок пройденным", uk: "Позначити урок пройденим", de: "Als erledigt markieren" },
  next: { ru: "Дальше", uk: "Далі", de: "Weiter" },
  model: { ru: "Показать образец", uk: "Показати зразок", de: "Musterlösung zeigen" },
  draft: { ru: "Твой черновик (сохраняется автоматически)", uk: "Твоя чернетка (зберігається автоматично)", de: "Dein Entwurf (wird gespeichert)" },
  words: { ru: "слов", uk: "слів", de: "Wörter" },
  meaning: { ru: "Значение", uk: "Значення", de: "Bedeutung" },
  recall: { ru: "Написать по-немецки", uk: "Написати німецькою", de: "Auf Deutsch schreiben" },
  order: { ru: "Порядок слов", uk: "Порядок слів", de: "Satzbau" },
  reset: { ru: "Сначала", uk: "Спочатку", de: "Neu" },
  noAudio: { ru: "Запись ещё не добавлена — читай текст как сценарий.", uk: "Запис ще не додано — читай текст як сценарій.", de: "Noch keine Aufnahme – lies das Skript." },
  showScript: { ru: "Показать текст", uk: "Показати текст", de: "Skript zeigen" },
  search: { ru: "Поиск слова…", uk: "Пошук слова…", de: "Wort suchen…" },
  selfCheck: { ru: "Самопроверка: обращение, все пункты, приветствие/прощание, ~40 слов, глагол на 2 месте.", uk: "Самоперевірка: звертання, усі пункти, привітання/прощання, ~40 слів, дієслово на 2 місці.", de: "Selbstcheck: Anrede, alle Punkte, Gruß, ca. 40 Wörter, Verb auf Position 2." },
  disclaimer: { ru: "Это авторские тренировки, а не официальный тест telc. Сайт не связан с telc gGmbH.", uk: "Це авторські тренування, а не офіційний тест telc. Сайт не пов’язаний з telc gGmbH.", de: "Eigene Übungstests, kein offizieller telc-Test. Keine Verbindung zur telc gGmbH." },
  official: { ru: "Официальный пробный тест telc", uk: "Офіційний пробний тест telc", de: "Offizieller telc-Modelltest" },
  submit: { ru: "Завершить и посчитать баллы", uk: "Завершити й порахувати бали", de: "Abgeben & auswerten" },
  retry: { ru: "Пройти заново", uk: "Пройти заново", de: "Neu starten" },
  result: { ru: "Результат (только задания с однозначным ответом)", uk: "Результат (лише завдання з однозначною відповіддю)", de: "Ergebnis (nur eindeutige Aufgaben)" },
  passed: { ru: "Хороший уровень — от 60% обычно достаточно", uk: "Добрий рівень — від 60% зазвичай достатньо", de: "Gut – ab 60 % meist bestanden" },
  notPassed: { ru: "Пока меньше 60% — повтори модули и попробуй снова", uk: "Поки менше 60% — повтори модулі й спробуй ще", de: "Unter 60 % – wiederholen und neu versuchen" },
  timeLeft: { ru: "Осталось", uk: "Залишилось", de: "Restzeit" },
  media: { ru: "Ссылка на видео/аудио (MP4/MP3, только админ)", uk: "Посилання на відео/аудіо (MP4/MP3, лише адмін)", de: "Medien-URL (nur Admin)" },
  save: { ru: "Сохранить", uk: "Зберегти", de: "Speichern" },
  progress: { ru: "Прогресс", uk: "Прогрес", de: "Fortschritt" },
};

export function speakDe(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {}
}
export const SayBtn = ({ text }: { text: string }) => (
  <button type="button" onClick={() => speakDe(text)} className="inline-flex p-1 rounded-full text-muted-foreground hover:text-primary" aria-label="Aussprache">
    <Volume2 className="w-4 h-4" />
  </button>
);

/** Single question with choice or typed answer, feedback and explanation. */
export function QuestionCard({
  q, idx, lang, value, onAnswer, seed = 1, reveal = true,
}: { q: Question; idx: number; lang: L; value?: string; onAnswer: (v: string) => void; seed?: number; reveal?: boolean }) {
  const [typed, setTyped] = useState(value ?? "");
  const opts = useMemo(() => (q.options ? (q.options.length > 4 ? q.options : seededShuffle(q.options, seed + idx)) : null), [q, seed, idx]);
  const answered = value != null && value !== "";
  const ok = answered && isCorrect(value!, q.answer);
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
      <p className="font-medium text-foreground"><span className="text-muted-foreground mr-2">{idx + 1}.</span>{q.prompt}</p>
      {opts ? (
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => {
            const picked = value === o;
            const right = reveal && answered && isCorrect(o, q.answer);
            return (
              <button key={o} type="button" disabled={answered && reveal} onClick={() => onAnswer(o)}
                className={cn("px-3 py-2 rounded-xl border text-sm transition",
                  right ? "border-primary bg-primary/20 text-foreground" :
                  picked && reveal ? "border-destructive bg-destructive/15 text-foreground" :
                  picked ? "border-primary bg-primary/15" : "border-border hover:border-primary/60")}>
                {o}
              </button>
            );
          })}
        </div>
      ) : (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) onAnswer(typed); }}>
          <input value={typed} onChange={(e) => { setTyped(e.target.value); if (!reveal) onAnswer(e.target.value); }} disabled={answered && reveal}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="…" />
          {reveal && <button type="submit" disabled={answered} className="px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">{UI.check[lang]}</button>}
        </form>
      )}
      {reveal && answered && (
        <div className={cn("flex gap-2 text-sm rounded-xl p-3", ok ? "bg-primary/10" : "bg-destructive/10")}>
          {ok ? <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" /> : <X className="w-4 h-4 mt-0.5 text-destructive shrink-0" />}
          <div>
            {!ok && <p className="font-semibold">→ {q.answer}</p>}
            <p className="text-muted-foreground">{q.explanation[lang]}</p>
          </div>
        </div>
      )}
    </div>
  );
}
