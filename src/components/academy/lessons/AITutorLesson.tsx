import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send } from "lucide-react";
import type { Lang } from "@/i18n/translations";

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: () => void;
  lang: Lang;
}

const AITutorLesson = ({ lesson, onComplete, lang }: Props) => {
  const content = lesson.content as any;
  const scenario = content?.scenario ?? "Allgemein";
  const role = content?.role ?? "Partner";
  const context = content?.context ?? "";

  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: `Hallo! ${context || `Willkommen zum Szenario: ${scenario}. Ich bin dein ${role}.`}` },
  ]);
  const [input, setInput] = useState("");
  const [completed, setCompleted] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    // Simulated AI response (real implementation would call edge function)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `Das ist eine gute Antwort! Lass uns weitermachen. Was möchtest du als Nächstes sagen?` },
      ]);
    }, 1000);

    // Complete after 4+ user messages
    if (messages.filter((m) => m.role === "user").length >= 3) {
      setCompleted(true);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          🎭 {scenario} · {role}
        </p>
      </div>

      {/* Chat */}
      <div className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/50 text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "ai" && <Bot className="w-3.5 h-3.5 text-primary mb-1" />}
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={lang === "uk" ? "Напиши відповідь німецькою..." : "Напиши ответ на немецком..."}
          className="flex-1 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <Button onClick={handleSend} size="icon" className="shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {completed && (
        <div className="flex justify-center">
          <Button onClick={onComplete} className="font-display font-bold">
            {lang === "uk" ? "Завершити урок" : "Завершить урок"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AITutorLesson;
