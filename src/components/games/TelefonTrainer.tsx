import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Phone, PhoneOff, RotateCcw, ChevronRight, Mic, MicOff, Send, Volume2, Bot, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type DialogOption = { text: string; correct: boolean; feedbackRu: string; feedbackUk: string };
type DialogLine = {
  speaker: "other" | "you";
  text: string;
  options?: DialogOption[];
};

type PhoneScenario = {
  title: string;
  descRu: string;
  descUk: string;
  emoji: string;
  callerName: string;
  lines: DialogLine[];
};

const scenarios: PhoneScenario[] = [
  {
    title: "Termin beim Arzt",
    descRu: "Запись к врачу по телефону",
    descUk: "Запис до лікаря по телефону",
    emoji: "🏥",
    callerName: "Praxis Dr. Müller",
    lines: [
      { speaker: "other", text: "Praxis Dr. Müller, guten Tag. Was kann ich für Sie tun?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich möchte bitte einen Termin vereinbaren.", correct: true, feedbackRu: "Отлично! Вежливая и правильная формулировка.", feedbackUk: "Чудово! Ввічливе і правильне формулювання." },
        { text: "Hallo, ich brauche Arzt.", correct: false, feedbackRu: "Грамматически неверно. Лучше: «Ich möchte einen Termin vereinbaren.»", feedbackUk: "Граматично невірно. Краще: «Ich möchte einen Termin vereinbaren.»" },
        { text: "Ja, Termin bitte schnell.", correct: false, feedbackRu: "Слишком грубо для немецкого телефонного этикета.", feedbackUk: "Занадто грубо для німецького телефонного етикету." },
      ]},
      { speaker: "other", text: "Natürlich. Waren Sie schon einmal bei uns?" },
      { speaker: "you", text: "", options: [
        { text: "Nein, ich bin ein neuer Patient.", correct: true, feedbackRu: "Правильно! Neuer Patient — стандартное выражение.", feedbackUk: "Правильно! Neuer Patient — стандартний вираз." },
        { text: "Ja, ich war schon da.", correct: true, feedbackRu: "Тоже правильно, если вы уже были у врача.", feedbackUk: "Теж правильно, якщо ви вже були у лікаря." },
        { text: "Ich weiß nicht.", correct: false, feedbackRu: "Странный ответ — вы должны знать, были ли у врача.", feedbackUk: "Дивна відповідь — ви повинні знати, чи були у лікаря." },
      ]},
      { speaker: "other", text: "Gut. Hätten Sie am Donnerstag um 10 Uhr Zeit?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, das passt mir gut. Vielen Dank!", correct: true, feedbackRu: "Идеально! «Das passt mir» — ключевая фраза для подтверждения времени.", feedbackUk: "Ідеально! «Das passt mir» — ключова фраза для підтвердження часу." },
        { text: "Geht es auch am Freitag?", correct: true, feedbackRu: "Хороший вариант, если четверг не подходит.", feedbackUk: "Гарний варіант, якщо четвер не підходить." },
        { text: "Nein.", correct: false, feedbackRu: "Слишком коротко. Предложите альтернативу.", feedbackUk: "Занадто коротко. Запропонуйте альтернативу." },
      ]},
    ],
  },
  {
    title: "Vertrag kündigen",
    descRu: "Отмена договора по телефону",
    descUk: "Скасування договору по телефону",
    emoji: "📞",
    callerName: "Kundenservice",
    lines: [
      { speaker: "other", text: "Kundenservice, mein Name ist Schmidt. Wie kann ich Ihnen helfen?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich möchte meinen Vertrag kündigen.", correct: true, feedbackRu: "Прямо и вежливо — именно так и нужно.", feedbackUk: "Прямо і ввічливо — саме так і потрібно." },
        { text: "Ich will nicht mehr zahlen!", correct: false, feedbackRu: "Агрессивно. Лучше: «Ich möchte meinen Vertrag kündigen.»", feedbackUk: "Агресивно. Краще: «Ich möchte meinen Vertrag kündigen.»" },
        { text: "Kündigung machen bitte.", correct: false, feedbackRu: "Грамматически неверно. «Kündigung» не используется с «machen».", feedbackUk: "Граматично невірно. «Kündigung» не використовується з «machen»." },
      ]},
      { speaker: "other", text: "Das tut mir leid zu hören. Darf ich nach dem Grund fragen?" },
      { speaker: "you", text: "", options: [
        { text: "Ich bin mit dem Service nicht zufrieden.", correct: true, feedbackRu: "Стандартная формулировка для выражения неудовлетворённости.", feedbackUk: "Стандартне формулювання для вираження незадоволеності." },
        { text: "Ich ziehe um und brauche den Vertrag nicht mehr.", correct: true, feedbackRu: "Хорошая причина — переезд.", feedbackUk: "Гарна причина — переїзд." },
        { text: "Das geht Sie nichts an.", correct: false, feedbackRu: "Очень грубо! По закону вы не обязаны называть причину, но вежливее ответить.", feedbackUk: "Дуже грубо! За законом ви не зобов'язані називати причину, але ввічливіше відповісти." },
      ]},
      { speaker: "other", text: "Ich verstehe. Möchten Sie die Kündigung schriftlich bestätigen?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, bitte schicken Sie mir die Bestätigung per E-Mail.", correct: true, feedbackRu: "Правильно! Всегда просите письменное подтверждение.", feedbackUk: "Правильно! Завжди просіть письмове підтвердження." },
        { text: "Nein, das reicht so.", correct: false, feedbackRu: "Осторожно! Без письменного подтверждения договор может продолжаться.", feedbackUk: "Обережно! Без письмового підтвердження договір може продовжуватися." },
        { text: "Ja, per Post an meine Adresse bitte.", correct: true, feedbackRu: "Тоже хороший вариант — почтой.", feedbackUk: "Теж гарний варіант — поштою." },
      ]},
    ],
  },
  {
    title: "Wohnung besichtigen",
    descRu: "Звонок по объявлению о квартире",
    descUk: "Дзвінок за оголошенням про квартиру",
    emoji: "🏠",
    callerName: "Vermieter Herr Weber",
    lines: [
      { speaker: "other", text: "Weber, hallo?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, Herr Weber. Ich rufe wegen der Wohnungsanzeige an.", correct: true, feedbackRu: "Идеально! «Wegen der Anzeige anrufen» — стандартный оборот.", feedbackUk: "Ідеально! «Wegen der Anzeige anrufen» — стандартний зворот." },
        { text: "Hallo, ist die Wohnung noch frei?", correct: true, feedbackRu: "Прямо к делу — тоже нормально.", feedbackUk: "Прямо до справи — теж нормально." },
        { text: "Ich will Wohnung.", correct: false, feedbackRu: "Грамматически неверно и грубо.", feedbackUk: "Граматично невірно та грубо." },
      ]},
      { speaker: "other", text: "Ja, die ist noch frei. Möchten Sie einen Besichtigungstermin?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, sehr gern. Wann wäre es möglich?", correct: true, feedbackRu: "Вежливая форма Konjunktiv II — «Wann wäre es möglich?»", feedbackUk: "Ввічлива форма Konjunktiv II — «Wann wäre es möglich?»" },
        { text: "Ja, morgen!", correct: false, feedbackRu: "Слишком настойчиво. Лучше спросить, когда удобно.", feedbackUk: "Занадто наполегливо. Краще запитати, коли зручно." },
        { text: "Darf ich fragen, wie hoch die Miete ist?", correct: true, feedbackRu: "Хороший вопрос — уточнить цену перед просмотром.", feedbackUk: "Гарне питання — уточнити ціну перед переглядом." },
      ]},
    ],
  },
];

// ========== AI PHONE CONVERSATION ==========

const aiTopics = [
  { id: "arzt", emoji: "🏥", titleDe: "Arzttermin", titleRu: "Запись к врачу", titleUk: "Запис до лікаря" },
  { id: "wohnung", emoji: "🏠", titleDe: "Wohnungssuche", titleRu: "Поиск квартиры", titleUk: "Пошук квартири" },
  { id: "kuendigung", emoji: "📄", titleDe: "Vertrag kündigen", titleRu: "Отмена договора", titleUk: "Скасування договору" },
  { id: "behoerde", emoji: "🏛", titleDe: "Amt anrufen", titleRu: "Звонок в ведомство", titleUk: "Дзвінок у відомство" },
  { id: "restaurant", emoji: "🍽", titleDe: "Tisch reservieren", titleRu: "Бронь столика", titleUk: "Бронювання столика" },
  { id: "versicherung", emoji: "🛡", titleDe: "Versicherung", titleRu: "Страховка", titleUk: "Страхування" },
];

type AiMsg = { role: "user" | "assistant"; content: string };

interface Props { onBack: () => void; }

const TelefonTrainer = ({ onBack }: Props) => {
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();

  // Mode: "menu" | "scenario" | "ai-pick" | "ai-chat"
  const [mode, setMode] = useState<"menu" | "scenario" | "ai-pick" | "ai-chat">("menu");

  // === SCENARIO MODE STATE ===
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [totalQ, setTotalQ] = useState(0);
  const [finished, setFinished] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ speaker: "other" | "you"; text: string; correct?: boolean }[]>([]);
  const [showingFeedback, setShowingFeedback] = useState(false);

  // === AI MODE STATE ===
  const [aiTopic, setAiTopic] = useState<string>("");
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  // === SCENARIO LOGIC (fixed) ===
  const scenario = scenarios[scenarioIndex];

  // Find current interactive step (the Nth "you" line)
  const youLineIndices = scenario?.lines
    .map((l, i) => l.speaker === "you" ? i : -1)
    .filter(i => i >= 0) ?? [];

  const startScenario = (idx: number) => {
    setScenarioIndex(idx);
    setCurrentStep(0);
    setSelectedOption(null);
    setScore(0);
    setTotalQ(0);
    setFinished(false);
    setShowingFeedback(false);
    // Build initial chat: all "other" lines before first "you" line
    const s = scenarios[idx];
    const initial: { speaker: "other" | "you"; text: string }[] = [];
    for (const line of s.lines) {
      if (line.speaker === "other") initial.push({ speaker: "other", text: line.text });
      else break;
    }
    setChatHistory(initial);
    setMode("scenario");
  };

  const handleOptionSelect = (optIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optIdx);
    setShowingFeedback(true);
    const youIdx = youLineIndices[currentStep];
    const line = scenario.lines[youIdx];
    const opt = line.options?.[optIdx];
    if (opt?.correct) setScore(s => s + 1);
    setTotalQ(t => t + 1);
    // Add user's answer to chat
    setChatHistory(prev => [...prev, { speaker: "you", text: opt?.text ?? "", correct: opt?.correct }]);
    scrollToBottom();
  };

  const advanceScenario = () => {
    const nextStep = currentStep + 1;
    if (nextStep >= youLineIndices.length) {
      setFinished(true);
      return;
    }
    // Add all "other" lines between current youLine and next youLine
    const currentYouIdx = youLineIndices[currentStep];
    const nextYouIdx = youLineIndices[nextStep];
    const newLines: { speaker: "other" | "you"; text: string }[] = [];
    for (let i = currentYouIdx + 1; i < nextYouIdx; i++) {
      if (scenario.lines[i].speaker === "other") {
        newLines.push({ speaker: "other", text: scenario.lines[i].text });
      }
    }
    setChatHistory(prev => [...prev, ...newLines]);
    setCurrentStep(nextStep);
    setSelectedOption(null);
    setShowingFeedback(false);
    scrollToBottom();
  };

  const currentYouLine = youLineIndices[currentStep] !== undefined
    ? scenario.lines[youLineIndices[currentStep]]
    : null;

  // === AI CHAT LOGIC ===
  const startAiChat = async (topicId: string) => {
    const topic = aiTopics.find(t => t.id === topicId);
    if (!topic) return;
    setAiTopic(topicId);
    setAiMessages([]);
    setAiInput("");
    setMode("ai-chat");
    setAiLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const systemTopicName = topic.titleDe;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-dialogue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Starte ein Telefongespräch zum Thema "${systemTopicName}". Du bist der Gesprächspartner am anderen Ende der Leitung. Beginne mit einer Begrüßung, als ob du den Anruf entgegennimmst. Halte deine Antworten kurz (2-3 Sätze).` }],
          topic: `Telefongespräch: ${systemTopicName}`,
          level: "A2",
          lang,
        }),
      });

      if (!resp.ok) throw new Error("AI error");

      let fullText = "";
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiMessages([{ role: "assistant", content: fullText }]);
            }
          } catch {}
        }
      }

      setAiMessages([{ role: "assistant", content: fullText }]);
    } catch (e) {
      console.error("AI phone error:", e);
      setAiMessages([{ role: "assistant", content: lang === "uk" ? "Помилка підключення. Спробуйте ще раз." : "Ошибка подключения. Попробуйте ещё раз." }]);
    } finally {
      setAiLoading(false);
      scrollToBottom();
    }
  };

  const sendAiMessage = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;

    const newMessages: AiMsg[] = [...aiMessages, { role: "user", content: text }];
    setAiMessages(newMessages);
    setAiInput("");
    setAiLoading(true);
    scrollToBottom();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const topic = aiTopics.find(t => t.id === aiTopic);
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-dialogue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          topic: `Telefongespräch: ${topic?.titleDe ?? "Allgemein"}`,
          level: "A2",
          lang,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          setAiMessages(prev => [...prev, { role: "assistant", content: lang === "uk" ? "Забагато запитів, зачекайте." : "Слишком много запросов, подождите." }]);
          return;
        }
        throw new Error("AI error");
      }

      let fullText = "";
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiMessages([...newMessages, { role: "assistant", content: fullText }]);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error("AI send error:", e);
      setAiMessages(prev => [...prev, { role: "assistant", content: lang === "uk" ? "Помилка. Спробуйте ще раз." : "Ошибка. Попробуйте ещё раз." }]);
    } finally {
      setAiLoading(false);
      scrollToBottom();
    }
  };

  // TTS for AI messages
  const speakText = async (text: string) => {
    if (aiSpeaking && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAiSpeaking(false);
      return;
    }
    setAiSpeaking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      // Extract only German text (before ---)
      const germanText = text.split("---")[0].trim();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: germanText, speed: 0.85 }),
      });
      if (!resp.ok) throw new Error("TTS error");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setAiSpeaking(false); audioRef.current = null; };
      await audio.play();
    } catch (e) {
      console.error("TTS error:", e);
      setAiSpeaking(false);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ========== RENDER ==========

  // MAIN MENU
  if (mode === "menu") {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <h1 className="font-display text-xl font-bold text-foreground mb-1">📞 Telefon-Trainer</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "uk" ? "Практикуй телефонні розмови німецькою" : "Практикуй телефонные разговоры на немецком"}
        </p>

        {/* AI Conversation mode */}
        <button onClick={() => setMode("ai-pick")}
          className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group mb-4 border-primary/10 bg-primary/5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              {lang === "uk" ? "Розмова з ІІ" : "Разговор с ИИ"}
              <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-semibold uppercase">AI</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {lang === "uk" ? "Вільна розмова по телефону з ІІ-співрозмовником" : "Свободный разговор по телефону с ИИ-собеседником"}
            </p>
          </div>
          <Phone className="w-5 h-5 text-primary flex-shrink-0" />
        </button>

        <p className="text-xs text-muted-foreground mb-3 mt-6 font-semibold uppercase tracking-wider">
          {lang === "uk" ? "Готові сценарії" : "Готовые сценарии"}
        </p>
        <div className="space-y-3">
          {scenarios.map((s, i) => (
            <button key={i} onClick={() => startScenario(i)}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-muted/30 flex items-center justify-center text-2xl flex-shrink-0">
                {s.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{lang === "uk" ? s.descUk : s.descRu}</p>
              </div>
              <Phone className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // AI TOPIC PICKER
  if (mode === "ai-pick") {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button onClick={() => setMode("menu")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <h1 className="font-display text-xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" /> {lang === "uk" ? "Обери тему розмови" : "Выбери тему разговора"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "uk" ? "ІІ буде грати роль співрозмовника по телефону" : "ИИ будет играть роль собеседника по телефону"}
        </p>
        <div className="space-y-3">
          {aiTopics.map(topic => (
            <button key={topic.id} onClick={() => startAiChat(topic.id)}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-muted/30 flex items-center justify-center text-2xl flex-shrink-0">
                {topic.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">{topic.titleDe}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{lang === "uk" ? topic.titleUk : topic.titleRu}</p>
              </div>
              <Phone className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // AI CHAT MODE
  if (mode === "ai-chat") {
    const topic = aiTopics.find(t => t.id === aiTopic);
    return (
      <div className={`w-full mx-auto px-4 py-6 flex flex-col ${isMobile ? "max-w-md h-[calc(100dvh-120px)]" : "max-w-2xl h-[calc(100vh-120px)]"}`}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setMode("menu"); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAiSpeaking(false); } }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
          </button>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-xs text-muted-foreground font-display">{topic?.titleDe}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          <AnimatePresence>
            {aiMessages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-2 items-start", msg.role === "user" ? "justify-end" : "")}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">📞</div>
                )}
                <div className={cn("max-w-[80%] p-3 rounded-xl text-sm",
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 rounded-tr-sm"
                    : "glass-card rounded-tl-sm"
                )}>
                  <p className="whitespace-pre-wrap text-foreground">{msg.content}</p>
                  {msg.role === "assistant" && (
                    <button onClick={() => speakText(msg.content)}
                      className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
                      <Volume2 className={cn("w-3 h-3", aiSpeaking && "animate-pulse")} />
                      {aiSpeaking ? (lang === "uk" ? "Стоп" : "Стоп") : "🔊"}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {aiLoading && (
            <div className="flex gap-2 items-start">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">📞</div>
              <div className="glass-card p-3 rounded-tl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendAiMessage()}
            placeholder={lang === "uk" ? "Напишіть відповідь німецькою..." : "Напишите ответ по-немецки..."}
            className="flex-1 glass-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30"
            disabled={aiLoading}
          />
          <Button onClick={sendAiMessage} disabled={!aiInput.trim() || aiLoading} size="icon" className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // SCENARIO MODE
  if (finished) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <div className="glass-card p-8 text-center space-y-4">
          <PhoneOff className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-display text-lg font-bold text-foreground">
            {lang === "uk" ? "Розмову завершено!" : "Разговор завершён!"}
          </h2>
          <p className="text-3xl font-display font-bold text-gradient">{score}/{totalQ}</p>
          <p className="text-sm text-muted-foreground">
            {score === totalQ
              ? "🔥 " + (lang === "uk" ? "Ідеально!" : "Идеально!")
              : lang === "uk" ? "Непогано, але є над чим працювати" : "Неплохо, но есть над чем работать"}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setMode("menu")}>
              {lang === "uk" ? "Інший сценарій" : "Другой сценарий"}
            </Button>
            <Button onClick={() => startScenario(scenarioIndex)}>
              <RotateCcw className="w-4 h-4 mr-1" /> {lang === "uk" ? "Ще раз" : "Ещё раз"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMode("menu")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="text-xs text-muted-foreground font-display">{scenario.callerName}</span>
        </div>
      </div>

      {/* Chat history */}
      <div className="space-y-3 mb-6">
        <AnimatePresence>
          {chatHistory.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: msg.speaker === "other" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
              className={cn("flex gap-2 items-start", msg.speaker === "you" ? "justify-end ml-auto max-w-[85%]" : "max-w-[85%]")}>
              {msg.speaker === "other" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">📞</div>
              )}
              <div className={cn("p-3 rounded-xl text-sm",
                msg.speaker === "other"
                  ? "glass-card rounded-tl-sm"
                  : msg.correct
                    ? "bg-primary/10 border border-primary/20 rounded-tr-sm"
                    : "bg-destructive/10 border border-destructive/20 rounded-tr-sm"
              )}>
                <p className="text-foreground">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Options */}
      {currentYouLine?.options && selectedOption === null && !showingFeedback && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mb-4">
          <p className="text-xs text-muted-foreground text-center mb-2">
            {lang === "uk" ? "Обери відповідь:" : "Выбери ответ:"}
          </p>
          {currentYouLine.options.map((opt, i) => (
            <button key={i} onClick={() => handleOptionSelect(i)}
              className="w-full glass-card p-3 text-left text-sm text-foreground hover:border-primary/30 transition-all">
              {opt.text}
            </button>
          ))}
        </motion.div>
      )}

      {/* Feedback */}
      {showingFeedback && currentYouLine?.options && selectedOption !== null && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className={cn("glass-card p-3 text-sm",
            currentYouLine.options[selectedOption].correct ? "border-primary/30" : "border-destructive/30"
          )}>
            <p className="text-xs text-muted-foreground">
              {lang === "uk" ? currentYouLine.options[selectedOption].feedbackUk : currentYouLine.options[selectedOption].feedbackRu}
            </p>
          </div>
          <Button className="w-full" onClick={advanceScenario}>
            {lang === "uk" ? "Продовжити" : "Продолжить"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default TelefonTrainer;
