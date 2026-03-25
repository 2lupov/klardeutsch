import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Phone, PhoneOff, RotateCcw, ChevronRight, Mic, MicOff, Send, Volume2, Bot, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// ========== TYPES ==========
type DialogOption = { text: string; correct: boolean; feedbackRu: string; feedbackUk: string };
type DialogLine = { speaker: "other" | "you"; text: string; options?: DialogOption[] };
type PhoneScenario = { title: string; descRu: string; descUk: string; emoji: string; callerName: string; lines: DialogLine[] };
type AiMsg = { role: "user" | "assistant"; content: string };

// ========== SCENARIOS ==========
const scenarios: PhoneScenario[] = [
  {
    title: "Termin beim Arzt", descRu: "Запись к врачу по телефону", descUk: "Запис до лікаря по телефону",
    emoji: "🏥", callerName: "Praxis Dr. Müller",
    lines: [
      { speaker: "other", text: "Praxis Dr. Müller, guten Tag. Was kann ich für Sie tun?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich möchte bitte einen Termin vereinbaren.", correct: true, feedbackRu: "Отлично! Вежливая и правильная формулировка.", feedbackUk: "Чудово! Ввічливе і правильне формулювання." },
        { text: "Hallo, ich brauche Arzt.", correct: false, feedbackRu: "Грамматически неверно. Лучше: «Ich möchte einen Termin vereinbaren.»", feedbackUk: "Граматично невірно. Краще: «Ich möchte einen Termin vereinbaren.»" },
        { text: "Ja, Termin bitte schnell.", correct: false, feedbackRu: "Слишком грубо для немецкого телефонного этикета.", feedbackUk: "Занадто грубо для німецького телефонного етикету." },
      ]},
      { speaker: "other", text: "Natürlich. Waren Sie schon einmal bei uns?" },
      { speaker: "you", text: "", options: [
        { text: "Nein, ich bin ein neuer Patient.", correct: true, feedbackRu: "Правильно!", feedbackUk: "Правильно!" },
        { text: "Ja, ich war schon da.", correct: true, feedbackRu: "Тоже правильно.", feedbackUk: "Теж правильно." },
        { text: "Ich weiß nicht.", correct: false, feedbackRu: "Странный ответ.", feedbackUk: "Дивна відповідь." },
      ]},
      { speaker: "other", text: "Gut. Hätten Sie am Donnerstag um 10 Uhr Zeit?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, das passt mir gut. Vielen Dank!", correct: true, feedbackRu: "Идеально! «Das passt mir» — ключевая фраза.", feedbackUk: "Ідеально! «Das passt mir» — ключова фраза." },
        { text: "Geht es auch am Freitag?", correct: true, feedbackRu: "Хороший вариант.", feedbackUk: "Гарний варіант." },
        { text: "Nein.", correct: false, feedbackRu: "Слишком коротко.", feedbackUk: "Занадто коротко." },
      ]},
    ],
  },
  {
    title: "Vertrag kündigen", descRu: "Отмена договора", descUk: "Скасування договору",
    emoji: "📞", callerName: "Kundenservice",
    lines: [
      { speaker: "other", text: "Kundenservice, mein Name ist Schmidt. Wie kann ich Ihnen helfen?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich möchte meinen Vertrag kündigen.", correct: true, feedbackRu: "Прямо и вежливо.", feedbackUk: "Прямо і ввічливо." },
        { text: "Ich will nicht mehr zahlen!", correct: false, feedbackRu: "Агрессивно.", feedbackUk: "Агресивно." },
        { text: "Kündigung machen bitte.", correct: false, feedbackRu: "Грамматически неверно.", feedbackUk: "Граматично невірно." },
      ]},
      { speaker: "other", text: "Das tut mir leid. Darf ich nach dem Grund fragen?" },
      { speaker: "you", text: "", options: [
        { text: "Ich bin mit dem Service nicht zufrieden.", correct: true, feedbackRu: "Стандартная формулировка.", feedbackUk: "Стандартне формулювання." },
        { text: "Ich ziehe um.", correct: true, feedbackRu: "Хорошая причина.", feedbackUk: "Гарна причина." },
        { text: "Das geht Sie nichts an.", correct: false, feedbackRu: "Очень грубо!", feedbackUk: "Дуже грубо!" },
      ]},
      { speaker: "other", text: "Möchten Sie die Kündigung schriftlich bestätigen?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, bitte per E-Mail.", correct: true, feedbackRu: "Правильно! Всегда просите подтверждение.", feedbackUk: "Правильно!" },
        { text: "Nein, das reicht so.", correct: false, feedbackRu: "Осторожно! Без подтверждения договор может продолжаться.", feedbackUk: "Обережно!" },
        { text: "Ja, per Post bitte.", correct: true, feedbackRu: "Тоже хороший вариант.", feedbackUk: "Теж гарний варіант." },
      ]},
    ],
  },
  {
    title: "Wohnung besichtigen", descRu: "Звонок по объявлению о квартире", descUk: "Дзвінок за оголошенням про квартиру",
    emoji: "🏠", callerName: "Herr Weber",
    lines: [
      { speaker: "other", text: "Weber, hallo?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich rufe wegen der Wohnungsanzeige an.", correct: true, feedbackRu: "Идеально!", feedbackUk: "Ідеально!" },
        { text: "Hallo, ist die Wohnung noch frei?", correct: true, feedbackRu: "Прямо к делу — нормально.", feedbackUk: "Прямо до справи." },
        { text: "Ich will Wohnung.", correct: false, feedbackRu: "Грамматически неверно.", feedbackUk: "Граматично невірно." },
      ]},
      { speaker: "other", text: "Ja, die ist noch frei. Möchten Sie einen Besichtigungstermin?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, sehr gern. Wann wäre es möglich?", correct: true, feedbackRu: "Отлично! Konjunktiv II.", feedbackUk: "Чудово! Konjunktiv II." },
        { text: "Ja, morgen!", correct: false, feedbackRu: "Слишком настойчиво.", feedbackUk: "Занадто наполегливо." },
        { text: "Wie hoch ist die Miete?", correct: true, feedbackRu: "Хороший вопрос.", feedbackUk: "Гарне питання." },
      ]},
    ],
  },
  {
    title: "Kind in der Schule anmelden", descRu: "Запись ребёнка в школу", descUk: "Запис дитини до школи",
    emoji: "🎒", callerName: "Sekretariat Grundschule",
    lines: [
      { speaker: "other", text: "Grundschule am Park, Sekretariat. Guten Tag!" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich möchte mein Kind an Ihrer Schule anmelden.", correct: true, feedbackRu: "Отлично! Правильная формулировка для записи.", feedbackUk: "Чудово! Правильне формулювання для запису." },
        { text: "Hallo, mein Kind braucht Schule.", correct: false, feedbackRu: "Грамматически неверно. Лучше: «Ich möchte mein Kind anmelden.»", feedbackUk: "Граматично невірно. Краще: «Ich möchte mein Kind anmelden.»" },
        { text: "Nehmen Sie noch Kinder?", correct: false, feedbackRu: "Невежливо для первого звонка.", feedbackUk: "Неввічливо для першого дзвінка." },
      ]},
      { speaker: "other", text: "Gerne! Wie alt ist Ihr Kind und in welche Klasse soll es gehen?" },
      { speaker: "you", text: "", options: [
        { text: "Mein Sohn ist sechs Jahre alt und kommt in die erste Klasse.", correct: true, feedbackRu: "Идеально! Полная и точная информация.", feedbackUk: "Ідеально! Повна і точна інформація." },
        { text: "Meine Tochter ist acht und geht in die dritte Klasse.", correct: true, feedbackRu: "Тоже правильно.", feedbackUk: "Теж правильно." },
        { text: "Sechs. Erste.", correct: false, feedbackRu: "Слишком коротко, невежливо по телефону.", feedbackUk: "Занадто коротко, неввічливо по телефону." },
      ]},
      { speaker: "other", text: "Gut. Können Sie am Montag um 9 Uhr mit den Unterlagen vorbeikommen?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, das passt. Welche Unterlagen brauche ich?", correct: true, feedbackRu: "Отлично! Важно спросить о документах.", feedbackUk: "Чудово! Важливо запитати про документи." },
        { text: "Geht es auch nachmittags? Ich arbeite vormittags.", correct: true, feedbackRu: "Хорошая альтернатива с объяснением.", feedbackUk: "Гарна альтернатива з поясненням." },
        { text: "Nein, keine Zeit.", correct: false, feedbackRu: "Грубо. Лучше предложить другое время.", feedbackUk: "Грубо. Краще запропонувати інший час." },
      ]},
    ],
  },
  {
    title: "Handwerker rufen", descRu: "Вызов мастера на дом", descUk: "Виклик майстра додому",
    emoji: "🔧", callerName: "Müller Sanitär & Heizung",
    lines: [
      { speaker: "other", text: "Müller Sanitär und Heizung, guten Tag. Was kann ich für Sie tun?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich habe ein Problem mit meiner Heizung. Sie funktioniert nicht mehr.", correct: true, feedbackRu: "Идеально! Чётко описана проблема.", feedbackUk: "Ідеально! Чітко описана проблема." },
        { text: "Hallo, meine Heizung ist kaputt. Können Sie jemanden schicken?", correct: true, feedbackRu: "Тоже хорошо — прямо и вежливо.", feedbackUk: "Теж добре — прямо і ввічливо." },
        { text: "Heizung kaputt, kommen Sie!", correct: false, feedbackRu: "Слишком резко, без приветствия.", feedbackUk: "Занадто різко, без привітання." },
      ]},
      { speaker: "other", text: "Das ist natürlich unangenehm. Seit wann haben Sie das Problem?" },
      { speaker: "you", text: "", options: [
        { text: "Seit gestern Abend. Die Heizung wird gar nicht mehr warm.", correct: true, feedbackRu: "Отлично! Конкретная информация помогает мастеру.", feedbackUk: "Чудово! Конкретна інформація допомагає майстру." },
        { text: "Seit ein paar Tagen, aber jetzt ist es ganz kalt.", correct: true, feedbackRu: "Хорошо описано.", feedbackUk: "Добре описано." },
        { text: "Weiß ich nicht genau.", correct: false, feedbackRu: "Постарайтесь вспомнить — это важно для диагностики.", feedbackUk: "Спробуйте згадати — це важливо для діагностики." },
      ]},
      { speaker: "other", text: "Wir könnten morgen Vormittag zwischen 8 und 12 Uhr kommen. Passt Ihnen das?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, das passt mir. Wie viel kostet der Einsatz ungefähr?", correct: true, feedbackRu: "Правильно! Всегда спрашивайте о стоимости заранее.", feedbackUk: "Правильно! Завжди питайте про вартість заздалегідь." },
        { text: "Geht es auch am Nachmittag? Vormittags bin ich nicht da.", correct: true, feedbackRu: "Хорошо — предлагаете альтернативу.", feedbackUk: "Добре — пропонуєте альтернативу." },
        { text: "Warum nicht heute?!", correct: false, feedbackRu: "Невежливо. Лучше: «Wäre es möglich, noch heute zu kommen?»", feedbackUk: "Неввічливо. Краще: «Wäre es möglich, noch heute zu kommen?»" },
      ]},
    ],
  },
  {
    title: "Lieferung bestellen", descRu: "Заказ доставки еды", descUk: "Замовлення доставки їжі",
    emoji: "🍕", callerName: "Pizzeria Roma",
    lines: [
      { speaker: "other", text: "Pizzeria Roma, guten Abend! Möchten Sie bestellen?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Abend! Ja, ich möchte gerne etwas zur Lieferung bestellen.", correct: true, feedbackRu: "Идеально! Вежливое начало заказа.", feedbackUk: "Ідеально! Ввічливий початок замовлення." },
        { text: "Hallo, kann ich bei Ihnen etwas bestellen und liefern lassen?", correct: true, feedbackRu: "Тоже правильно.", feedbackUk: "Теж правильно." },
        { text: "Pizza! Schnell!", correct: false, feedbackRu: "Грубо и невежливо.", feedbackUk: "Грубо і неввічливо." },
      ]},
      { speaker: "other", text: "Natürlich! Was darf es sein?" },
      { speaker: "you", text: "", options: [
        { text: "Ich hätte gerne eine Pizza Margherita und eine Cola, bitte.", correct: true, feedbackRu: "Отлично! «Ich hätte gerne» — идеальная формулировка для заказа.", feedbackUk: "Чудово! «Ich hätte gerne» — ідеальне формулювання для замовлення." },
        { text: "Eine große Pizza Salami und einen Salat dazu.", correct: true, feedbackRu: "Хорошо и конкретно.", feedbackUk: "Добре і конкретно." },
        { text: "Geben Sie mir irgendwas.", correct: false, feedbackRu: "Нужно конкретно назвать, что хотите.", feedbackUk: "Потрібно конкретно назвати, що хочете." },
      ]},
      { speaker: "other", text: "Gerne! Wie ist Ihre Adresse?" },
      { speaker: "you", text: "", options: [
        { text: "Berliner Straße 15, dritter Stock, bei Müller.", correct: true, feedbackRu: "Идеально! Улица, номер, этаж и фамилия на звонке.", feedbackUk: "Ідеально! Вулиця, номер, поверх і прізвище на дзвінку." },
        { text: "Hauptstraße 7. Soll ich den Namen auf der Klingel sagen?", correct: true, feedbackRu: "Хорошо! Предлагаете дополнительную информацию.", feedbackUk: "Добре! Пропонуєте додаткову інформацію." },
        { text: "Kommen Sie einfach, ich warte draußen.", correct: false, feedbackRu: "Нужно дать точный адрес.", feedbackUk: "Потрібно дати точну адресу." },
      ]},
    ],
  },
];

const aiTopics = [
  { id: "arzt", emoji: "🏥", titleDe: "Arzttermin", titleRu: "Запись к врачу", titleUk: "Запис до лікаря" },
  { id: "wohnung", emoji: "🏠", titleDe: "Wohnungssuche", titleRu: "Поиск квартиры", titleUk: "Пошук квартири" },
  { id: "kuendigung", emoji: "📄", titleDe: "Vertrag kündigen", titleRu: "Отмена договора", titleUk: "Скасування договору" },
  { id: "behoerde", emoji: "🏛", titleDe: "Amt anrufen", titleRu: "Звонок в ведомство", titleUk: "Дзвінок у відомство" },
  { id: "restaurant", emoji: "🍽", titleDe: "Tisch reservieren", titleRu: "Бронь столика", titleUk: "Бронювання столика" },
  { id: "versicherung", emoji: "🛡", titleDe: "Versicherung", titleRu: "Страховка", titleUk: "Страхування" },
  { id: "schule", emoji: "🎒", titleDe: "Schulanmeldung", titleRu: "Запись в школу", titleUk: "Запис до школи" },
  { id: "handwerker", emoji: "🔧", titleDe: "Handwerker rufen", titleRu: "Вызов мастера", titleUk: "Виклик майстра" },
  { id: "lieferung", emoji: "🍕", titleDe: "Lieferung bestellen", titleRu: "Заказ доставки", titleUk: "Замовлення доставки" },
];

interface Props { onBack: () => void; }

const TelefonTrainer = ({ onBack }: Props) => {
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();

  const [mode, setMode] = useState<"menu" | "scenario" | "ai-pick" | "ai-chat">("menu");

  // Scenario state
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [totalQ, setTotalQ] = useState(0);
  const [finished, setFinished] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ speaker: "other" | "you"; text: string; correct?: boolean }[]>([]);
  const [showingFeedback, setShowingFeedback] = useState(false);

  // AI voice state
  const [aiTopic, setAiTopic] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
    };
  }, []);

  // ========== SCENARIO LOGIC ==========
  const scenario = scenarios[scenarioIndex];
  const youLineIndices = scenario?.lines.map((l, i) => l.speaker === "you" ? i : -1).filter(i => i >= 0) ?? [];

  const startScenario = (idx: number) => {
    setScenarioIndex(idx);
    setCurrentStep(0);
    setSelectedOption(null);
    setScore(0);
    setTotalQ(0);
    setFinished(false);
    setShowingFeedback(false);
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
    setChatHistory(prev => [...prev, { speaker: "you", text: opt?.text ?? "", correct: opt?.correct }]);
    scrollToBottom();
  };

  const advanceScenario = () => {
    const nextStep = currentStep + 1;
    if (nextStep >= youLineIndices.length) { setFinished(true); return; }
    const currentYouIdx = youLineIndices[currentStep];
    const nextYouIdx = youLineIndices[nextStep];
    const newLines: { speaker: "other" | "you"; text: string }[] = [];
    for (let i = currentYouIdx + 1; i < nextYouIdx; i++) {
      if (scenario.lines[i].speaker === "other") newLines.push({ speaker: "other", text: scenario.lines[i].text });
    }
    setChatHistory(prev => [...prev, ...newLines]);
    setCurrentStep(nextStep);
    setSelectedOption(null);
    setShowingFeedback(false);
    scrollToBottom();
  };

  const currentYouLine = youLineIndices[currentStep] !== undefined ? scenario.lines[youLineIndices[currentStep]] : null;

  // ========== AI VOICE CONVERSATION ==========

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const callPhoneAI = async (msgs: AiMsg[], topicId: string): Promise<{ text: string; audio: string } | null> => {
    const token = await getToken();
    if (!token) return null;
    const topic = aiTopics.find(t => t.id === topicId);

    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: msgs,
        topic: `Telefongespräch: ${topic?.titleDe ?? "Allgemein"}`,
        level: "A2",
        lang,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402) {
        const err = await resp.json();
        throw new Error(err.error || "Error");
      }
      throw new Error("AI error");
    }

    return resp.json();
  };

  const playAudioBase64 = (base64: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!base64) { resolve(); return; }
      const audioUrl = `data:audio/mpeg;base64,${base64}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => { audioRef.current = null; resolve(); };
      audio.onerror = () => { audioRef.current = null; reject(new Error("Audio error")); };
      audio.play().catch(reject);
    });
  };

  const startAiChat = async (topicId: string) => {
    setAiTopic(topicId);
    setAiMessages([]);
    setAiInput("");
    setMode("ai-chat");
    setAiLoading(true);
    scrollToBottom();

    try {
      const startMsg: AiMsg[] = [{ role: "user", content: `Starte das Telefongespräch. Du nimmst den Anruf entgegen. Begrüße mich.` }];
      const result = await callPhoneAI(startMsg, topicId);
      if (!result) throw new Error("No result");

      setAiMessages([{ role: "assistant", content: result.text }]);
      scrollToBottom();

      // Auto-play the greeting
      if (result.audio) {
        await playAudioBase64(result.audio);
      }
    } catch (e: any) {
      console.error("AI start error:", e);
      setAiMessages([{ role: "assistant", content: e.message || (lang === "uk" ? "Помилка." : "Ошибка.") }]);
    } finally {
      setAiLoading(false);
      scrollToBottom();
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || aiLoading) return;

    const newMessages: AiMsg[] = [...aiMessages, { role: "user", content: text.trim() }];
    setAiMessages(newMessages);
    setAiInput("");
    setAiLoading(true);
    scrollToBottom();

    try {
      const result = await callPhoneAI(newMessages, aiTopic);
      if (!result) throw new Error("No result");

      setAiMessages([...newMessages, { role: "assistant", content: result.text }]);
      scrollToBottom();

      // Auto-play response
      if (result.audio) {
        await playAudioBase64(result.audio);
      }
    } catch (e: any) {
      console.error("AI send error:", e);
      setAiMessages(prev => [...prev, { role: "assistant", content: e.message || (lang === "uk" ? "Помилка." : "Ошибка.") }]);
    } finally {
      setAiLoading(false);
      scrollToBottom();
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        await transcribeAndSend(blob);
      };

      mediaRecorder.start(500);
      setRecording(true);
    } catch (e) {
      console.error("Mic error:", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setRecording(false);
  };

  const transcribeAndSend = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not auth");

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!resp.ok) throw new Error("STT error");
      const { text } = await resp.json();

      if (text && text.trim()) {
        await sendMessage(text.trim());
      }
    } catch (e) {
      console.error("Transcribe error:", e);
    } finally {
      setTranscribing(false);
    }
  };

  const replayAudio = async (msg: AiMsg) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    // Re-generate TTS for this message
    try {
      const token = await getToken();
      const germanText = msg.content.split("---")[0].trim();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: germanText, speed: 0.9 }),
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { audioRef.current = null; };
      await audio.play();
    } catch {}
  };

  const stopAll = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setMode("menu");
  };

  // ========== RENDERS ==========

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

        {/* AI Voice */}
        <button onClick={() => setMode("ai-pick")}
          className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group mb-6 border-primary/10 bg-primary/5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
            <Mic className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              {lang === "uk" ? "Голосова розмова з ІІ" : "Голосовой разговор с ИИ"}
              <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-semibold uppercase">voice</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {lang === "uk" ? "Говори в мікрофон — ІІ відповідає голосом" : "Говори в микрофон — ИИ отвечает голосом"}
            </p>
          </div>
          <Phone className="w-5 h-5 text-primary flex-shrink-0" />
        </button>

        <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
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
          <Mic className="w-5 h-5 text-primary" /> {lang === "uk" ? "Обери тему розмови" : "Выбери тему разговора"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "uk" ? "ІІ зателефонує тобі і відповідатиме голосом" : "ИИ позвонит тебе и будет отвечать голосом"}
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

  // AI VOICE CHAT
  if (mode === "ai-chat") {
    const topic = aiTopics.find(t => t.id === aiTopic);
    const isProcessing = aiLoading || transcribing;
    
    return (
      <div className={`w-full mx-auto px-4 py-6 flex flex-col ${isMobile ? "max-w-md h-[calc(100dvh-120px)]" : "max-w-2xl h-[calc(100vh-120px)]"}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={stopAll} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <PhoneOff className="w-4 h-4 text-destructive" />
            <span className="text-destructive">{lang === "uk" ? "Завершити" : "Завершить"}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground font-display">{topic?.titleDe}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          <AnimatePresence>
            {aiMessages.map((msg, i) => {
              const isAssistant = msg.role === "assistant";
              const germanPart = isAssistant ? msg.content.split("---")[0].trim() : "";
              const feedbackPart = isAssistant && msg.content.includes("---") ? msg.content.split("---").slice(1).join("---").trim() : "";

              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-2 items-start", !isAssistant && "justify-end")}>
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">📞</div>
                  )}
                  <div className={cn("max-w-[85%] rounded-xl text-sm",
                    !isAssistant
                      ? "bg-primary/10 border border-primary/20 rounded-tr-sm p-3"
                      : "space-y-1"
                  )}>
                    {isAssistant ? (
                      <>
                        <div className="glass-card rounded-tl-sm p-3">
                          <p className="text-foreground whitespace-pre-wrap">{germanPart}</p>
                          <button onClick={() => replayAudio(msg)}
                            className="mt-1.5 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
                            <Volume2 className="w-3 h-3" /> 🔊
                          </button>
                        </div>
                        {feedbackPart && (
                          <div className="glass-card p-2.5 text-[11px] text-muted-foreground border-primary/10">
                            <p className="whitespace-pre-wrap">{feedbackPart}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {(aiLoading || transcribing) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-start">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">📞</div>
              <div className="glass-card p-3 rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {transcribing
                    ? (lang === "uk" ? "Розпізнаю мову..." : "Распознаю речь...")
                    : (lang === "uk" ? "Думаю..." : "Думаю...")}
                </span>
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Voice + Text Input */}
        <div className="space-y-3">
          {/* Big mic button */}
          <div className="flex justify-center">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={cn(
                "relative w-16 h-16 rounded-full flex items-center justify-center transition-all",
                recording
                  ? "bg-destructive text-destructive-foreground scale-110"
                  : isProcessing
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
              )}
            >
              {recording && (
                <>
                  <span className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
                  <span className="absolute -inset-2 rounded-full border-2 border-destructive/40 animate-pulse" />
                </>
              )}
              {recording ? <MicOff className="w-7 h-7 relative z-10" /> : <Mic className="w-7 h-7" />}
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            {recording
              ? (lang === "uk" ? "🔴 Запис... Натисни щоб зупинити" : "🔴 Запись... Нажми чтобы остановить")
              : isProcessing
                ? ""
                : (lang === "uk" ? "Натисни мікрофон і говори німецькою" : "Нажми микрофон и говори по-немецки")}
          </p>

          {/* Text fallback */}
          <div className="flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(aiInput)}
              placeholder={lang === "uk" ? "Або напиши текстом..." : "Или напиши текстом..."}
              className="flex-1 glass-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30"
              disabled={isProcessing || recording}
            />
            <Button onClick={() => sendMessage(aiInput)} disabled={!aiInput.trim() || isProcessing || recording} size="icon" className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // SCENARIO: FINISHED
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
            {score === totalQ ? "🔥 " + (lang === "uk" ? "Ідеально!" : "Идеально!") : lang === "uk" ? "Непогано!" : "Неплохо!"}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setMode("menu")}>{lang === "uk" ? "Інший сценарій" : "Другой сценарий"}</Button>
            <Button onClick={() => startScenario(scenarioIndex)}>
              <RotateCcw className="w-4 h-4 mr-1" /> {lang === "uk" ? "Ще раз" : "Ещё раз"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // SCENARIO: IN PROGRESS
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

      <div className="space-y-3 mb-6">
        <AnimatePresence>
          {chatHistory.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: msg.speaker === "other" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn("flex gap-2 items-start", msg.speaker === "you" ? "justify-end ml-auto max-w-[85%]" : "max-w-[85%]")}>
              {msg.speaker === "other" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">📞</div>
              )}
              <div className={cn("p-3 rounded-xl text-sm",
                msg.speaker === "other" ? "glass-card rounded-tl-sm"
                  : msg.correct ? "bg-primary/10 border border-primary/20 rounded-tr-sm"
                  : "bg-destructive/10 border border-destructive/20 rounded-tr-sm"
              )}>
                <p className="text-foreground">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
