import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";

interface SimpleCaptchaProps {
  onVerified: (verified: boolean) => void;
}

const generateChallenge = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { a, b, answer: a + b };
};

const SimpleCaptcha = ({ onVerified }: SimpleCaptchaProps) => {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");

  const refresh = useCallback(() => {
    setChallenge(generateChallenge());
    setInput("");
    setStatus("idle");
    onVerified(false);
  }, [onVerified]);

  useEffect(() => {
    if (input === "") { setStatus("idle"); return; }
    const num = parseInt(input, 10);
    if (isNaN(num)) return;
    if (num === challenge.answer) {
      setStatus("correct");
      onVerified(true);
    } else if (input.length >= String(challenge.answer).length) {
      setStatus("wrong");
      onVerified(false);
    }
  }, [input, challenge.answer, onVerified]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-foreground select-none">
        {challenge.a} + {challenge.b} =
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={input}
        onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
        className={`w-16 px-3 py-2 rounded-lg bg-secondary text-foreground text-center font-mono border transition-colors ${
          status === "correct" ? "border-green-500" : status === "wrong" ? "border-destructive" : "border-border"
        } focus:outline-none`}
        placeholder="?"
      />
      <button type="button" onClick={refresh} className="text-muted-foreground hover:text-foreground transition-colors">
        <RefreshCw className="w-4 h-4" />
      </button>
      {status === "correct" && <span className="text-green-500 text-sm">✓</span>}
    </div>
  );
};

export default SimpleCaptcha;
