import { useMemo, useState } from "react";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ARTIKEL_CLASS, type Artikel, type BlockPayload } from "./types";

export interface ModelPart {
  id: string;
  label: string;
  article?: Artikel | null;
  text?: string;
}

/** Built-in, hand-drawn anatomy models. Each shape carries data-part for clicks. */
const MODELS: Record<string, { label: string; viewBox: string; svg: JSX.Element; parts: ModelPart[] }> = {
  auge: {
    label: "Das Auge (Око)",
    viewBox: "0 0 520 360",
    svg: (
      <g>
        <ellipse cx="250" cy="180" rx="180" ry="150" className="model-shape" data-part="netzhaut" />
        <ellipse cx="250" cy="180" rx="180" ry="150" fill="none" className="model-outline" />
        <ellipse cx="258" cy="180" rx="150" ry="122" className="model-shape" data-part="glaskoerper" />
        <path d="M90 180c0-58 34-96 74-96s70 40 70 96-30 96-70 96-74-38-74-96z" className="model-shape" data-part="hornhaut" />
        <circle cx="150" cy="180" r="62" className="model-shape" data-part="iris" />
        <ellipse cx="168" cy="180" rx="30" ry="44" className="model-shape" data-part="linse" />
        <circle cx="150" cy="180" r="24" className="model-shape" data-part="pupille" />
        <path d="M418 176c28-6 62-30 78-52M418 184c28 6 62 30 78 52" fill="none" strokeWidth="26" strokeLinecap="round" className="model-shape" data-part="sehnerv" />
      </g>
    ),
    parts: [
      { id: "hornhaut", label: "Hornhaut", article: "die", text: "Прозора передня оболонка — світло входить тут." },
      { id: "iris", label: "Iris", article: "die", text: "Райдужка. Дає оку колір і керує зіницею." },
      { id: "pupille", label: "Pupille", article: "die", text: "Зіниця. На світлі вужча, у темряві ширша." },
      { id: "linse", label: "Linse", article: "die", text: "Кришталик наводить різкість на близьке й далеке." },
      { id: "glaskoerper", label: "Glaskörper", article: "der", text: "Скловидне тіло — прозорий гель тримає форму ока." },
      { id: "netzhaut", label: "Netzhaut", article: "die", text: "Сітківка з палички та колбочками, тут виникає зображення." },
      { id: "sehnerv", label: "Sehnerv", article: "der", text: "Зоровий нерв несе сигнал у мозок." },
    ],
  },
  ohr: {
    label: "Das Ohr (Вухо)",
    viewBox: "0 0 520 360",
    svg: (
      <g>
        <path d="M40 60c70-30 150-10 168 70 10 46-14 84-14 120h-70c0-44 18-70 8-104-10-34-52-46-92-30z" className="model-shape" data-part="ohrmuschel" />
        <rect x="196" y="140" width="120" height="40" rx="18" className="model-shape" data-part="gehoergang" />
        <path d="M318 122l22 76-22 76z" className="model-shape" data-part="trommelfell" />
        <g className="model-shape" data-part="gehoerknoechelchen">
          <circle cx="358" cy="150" r="15" />
          <circle cx="386" cy="176" r="13" />
          <circle cx="408" cy="202" r="11" />
        </g>
        <path d="M430 212c34 0 54 26 46 58-8 30-46 40-66 18-18-20-8-46 6-58" className="model-shape" data-part="schnecke" />
        <path d="M410 96c26-16 54-4 58 24 4 24-16 40-36 34" fill="none" strokeWidth="16" strokeLinecap="round" className="model-shape" data-part="gleichgewichtsorgan" />
        <path d="M300 250c26 22 58 34 96 36" fill="none" strokeWidth="14" strokeLinecap="round" className="model-shape" data-part="hoernerv" />
      </g>
    ),
    parts: [
      { id: "ohrmuschel", label: "Ohrmuschel", article: "die", text: "Вушна раковина збирає звук." },
      { id: "gehoergang", label: "Gehörgang", article: "der", text: "Слуховий прохід веде звук углиб." },
      { id: "trommelfell", label: "Trommelfell", article: "das", text: "Барабанна перетинка вібрує від звуку." },
      { id: "gehoerknoechelchen", label: "Gehörknöchelchen", article: "plural", text: "Молоточок, коваделко і стремінце підсилюють вібрацію." },
      { id: "schnecke", label: "Schnecke", article: "die", text: "Завиток: рідина й волоскові клітини роблять із звуку сигнал." },
      { id: "gleichgewichtsorgan", label: "Gleichgewichtsorgan", article: "das", text: "Орган рівноваги — три півкружні канали." },
      { id: "hoernerv", label: "Hörnerv", article: "der", text: "Слуховий нерв передає сигнал у мозок." },
    ],
  },
  nase: {
    label: "Die Nase (Ніс)",
    viewBox: "0 0 520 360",
    svg: (
      <g>
        <path d="M300 30c-16 70-60 120-120 150 40 22 90 26 130 10 28-12 46-40 46-76 0-34-20-66-56-84z" className="model-shape" data-part="nasenruecken" />
        <ellipse cx="196" cy="204" rx="22" ry="12" className="model-shape" data-part="nasenloch" />
        <path d="M250 96c40 8 68 36 74 76" fill="none" strokeWidth="16" strokeLinecap="round" className="model-shape" data-part="nasenhoehle" />
        <path d="M262 70c34-14 66-4 76 26" fill="none" strokeWidth="14" strokeLinecap="round" className="model-shape" data-part="riechschleimhaut" />
        <path d="M330 52c30-18 62-8 66 22" fill="none" strokeWidth="12" strokeLinecap="round" className="model-shape" data-part="riechnerv" />
        <path d="M150 232c60 34 140 34 200-4" fill="none" strokeWidth="12" strokeLinecap="round" className="model-shape" data-part="nasenscheidewand" />
      </g>
    ),
    parts: [
      { id: "nasenruecken", label: "Nasenrücken", article: "der", text: "Спинка носа з кістки та хряща." },
      { id: "nasenloch", label: "Nasenloch", article: "das", text: "Ніздря — тут повітря входить." },
      { id: "nasenhoehle", label: "Nasenhöhle", article: "die", text: "Носова порожнина гріє й зволожує повітря." },
      { id: "riechschleimhaut", label: "Riechschleimhaut", article: "die", text: "Нюхова слизова з мільйонами клітин запаху." },
      { id: "riechnerv", label: "Riechnerv", article: "der", text: "Нюховий нерв веде запах у мозок." },
      { id: "nasenscheidewand", label: "Nasenscheidewand", article: "die", text: "Перегородка ділить ніс на дві половини." },
    ],
  },
  herz: {
    label: "Das Herz (Серце)",
    viewBox: "0 0 520 360",
    svg: (
      <g>
        <path d="M260 330c-90-62-150-112-150-186 0-46 34-78 76-78 32 0 58 18 74 44 16-26 42-44 74-44 42 0 76 32 76 78 0 74-60 124-150 186z" className="model-shape" data-part="herzmuskel" />
        <path d="M250 120c-40 0-66 26-66 64 0 34 24 60 66 92z" className="model-shape" data-part="rechte-kammer" />
        <path d="M268 120c40 0 68 26 68 64 0 34-26 60-68 92z" className="model-shape" data-part="linke-kammer" />
        <ellipse cx="206" cy="108" rx="34" ry="24" className="model-shape" data-part="rechter-vorhof" />
        <ellipse cx="316" cy="108" rx="34" ry="24" className="model-shape" data-part="linker-vorhof" />
        <path d="M258 96c0-40 14-64 40-80" fill="none" strokeWidth="20" strokeLinecap="round" className="model-shape" data-part="aorta" />
        <path d="M244 96c-6-36-24-56-52-66" fill="none" strokeWidth="16" strokeLinecap="round" className="model-shape" data-part="lungenarterie" />
      </g>
    ),
    parts: [
      { id: "herzmuskel", label: "Herzmuskel", article: "der", text: "Серцевий м'яз працює без перерви ціле життя." },
      { id: "rechter-vorhof", label: "rechter Vorhof", article: "der", text: "Праве передсердя приймає кров із тіла." },
      { id: "linker-vorhof", label: "linker Vorhof", article: "der", text: "Ліве передсердя приймає кров із легень." },
      { id: "rechte-kammer", label: "rechte Herzkammer", article: "die", text: "Правий шлуночок жене кров у легені." },
      { id: "linke-kammer", label: "linke Herzkammer", article: "die", text: "Лівий шлуночок жене кров у все тіло." },
      { id: "aorta", label: "Aorta", article: "die", text: "Аорта — найбільша артерія." },
      { id: "lungenarterie", label: "Lungenarterie", article: "die", text: "Легенева артерія веде кров до легень." },
    ],
  },
  zelle: {
    label: "Die Zelle (Клітина)",
    viewBox: "0 0 520 360",
    svg: (
      <g>
        <ellipse cx="260" cy="180" rx="220" ry="150" className="model-shape" data-part="zellmembran" />
        <ellipse cx="260" cy="180" rx="200" ry="132" className="model-shape" data-part="zytoplasma" />
        <circle cx="230" cy="170" r="60" className="model-shape" data-part="zellkern" />
        <path d="M212 150c14 14 22 26 36 40M248 148c-14 16-22 26-36 42" fill="none" strokeWidth="9" strokeLinecap="round" className="model-shape" data-part="dna" />
        <ellipse cx="376" cy="130" rx="46" ry="24" transform="rotate(-18 376 130)" className="model-shape" data-part="mitochondrium" />
        <path d="M330 240c30-16 60-16 88 2" fill="none" strokeWidth="14" strokeLinecap="round" className="model-shape" data-part="endoplasmatisches-retikulum" />
        <circle cx="150" cy="252" r="20" className="model-shape" data-part="lysosom" />
        <circle cx="120" cy="120" r="9" className="model-shape" data-part="ribosom" />
      </g>
    ),
    parts: [
      { id: "zellmembran", label: "Zellmembran", article: "die", text: "Мембрана вирішує, що входить у клітину." },
      { id: "zytoplasma", label: "Zytoplasma", article: "das", text: "Цитоплазма — рідина, у якій плавають органели." },
      { id: "zellkern", label: "Zellkern", article: "der", text: "Ядро — центр керування клітиною." },
      { id: "dna", label: "DNA", article: "die", text: "ДНК зберігає всю спадкову інформацію." },
      { id: "mitochondrium", label: "Mitochondrium", article: "das", text: "Мітохондрія виробляє енергію." },
      { id: "endoplasmatisches-retikulum", label: "endoplasmatisches Retikulum", article: "das", text: "Тут утворюються й транспортуються білки." },
      { id: "lysosom", label: "Lysosom", article: "das", text: "Лізосома розкладає відходи." },
      { id: "ribosom", label: "Ribosom", article: "das", text: "Рибосома збирає білки." },
    ],
  },
};

export const MODEL_KEYS = Object.keys(MODELS);
export const modelLabel = (key: string) => MODELS[key]?.label ?? "Власна модель (SVG)";
export const modelParts = (key: string): ModelPart[] => MODELS[key]?.parts ?? [];

/** Remove scripts and inline handlers from teacher-pasted SVG. */
function safeSvg(raw: string) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

interface Props {
  payload: BlockPayload;
  title?: string | null;
  value: Record<string, boolean>;
  onChange: (v: Record<string, boolean>) => void;
  readOnly?: boolean;
}

/** Клікабельна анатомічна модель: учень натискає на частину й бачить слово з артиклем. */
export default function InteractiveModel({ payload, title, value, onChange, readOnly }: Props) {
  const key = payload.model ?? "auge";
  const builtIn = MODELS[key];
  const parts = useMemo<ModelPart[]>(() => (payload.parts?.length ? payload.parts : builtIn?.parts ?? []), [payload.parts, builtIn]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [askIndex, setAskIndex] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const found = value ?? {};
  const seen = parts.filter((p) => found[p.id]).length;
  const active = parts.find((p) => p.id === activeId) ?? null;
  const asked = quiz ? parts[askIndex] : null;

  const click = (id: string) => {
    if (!parts.some((p) => p.id === id)) return;
    if (quiz && asked) {
      if (id === asked.id) {
        onChange({ ...found, [id]: true });
        setWrong(null);
        setActiveId(id);
        setAskIndex((i) => i + 1);
      } else {
        setWrong(id);
      }
      return;
    }
    setActiveId(id);
    onChange({ ...found, [id]: true });
  };

  const onSvgClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest?.("[data-part]");
    const id = el?.getAttribute("data-part");
    if (id) click(id);
  };

  return (
    <div className="space-y-4">
      {title && <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>}
      {payload.instructions && <p className="text-sm text-muted-foreground">{payload.instructions}</p>}

      {quiz && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          {asked ? <>Klicke auf: <strong className="text-foreground">{asked.article && asked.article !== "plural" ? `${asked.article} ` : ""}{asked.label}</strong>{wrong && <span className="ml-2 font-semibold text-destructive">Falsch, versuche es noch einmal.</span>}</> : <strong className="text-success">Alles gefunden! {parts.length} / {parts.length}</strong>}
        </div>
      )}

      <div className="model-stage overflow-hidden rounded-2xl border border-border bg-card p-3">
        {activeId && <style>{`.model-svg [data-part="${activeId}"]{fill:hsl(var(--primary)/.85);stroke:hsl(var(--primary));filter:drop-shadow(0 0 14px hsl(var(--primary)/.6));}`}</style>}
        {builtIn ? (
          <svg viewBox={builtIn.viewBox} role="img" aria-label={builtIn.label} className="model-svg h-auto w-full" onClick={onSvgClick}>
            {builtIn.svg}
          </svg>
        ) : payload.svg && /<!doctype|<html|<script|<body/i.test(payload.svg) ? (
          <iframe
            title={title || "Interaktives Modell"}
            srcDoc={payload.svg}
            sandbox="allow-scripts allow-popups allow-modals"
            className="block w-full rounded-xl border-0 bg-background"
            style={{ height: "var(--model-frame-h, min(85dvh, 900px))" }}
          />
        ) : payload.svg ? (
          <div className="model-svg [&_svg]:h-auto [&_svg]:w-full" onClick={onSvgClick} dangerouslySetInnerHTML={{ __html: safeSvg(payload.svg) }} />
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">Вставте SVG-код моделі або виберіть готову.</p>
        )}
      </div>

      {active && (
        <div className="rounded-2xl border border-primary/40 bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {active.article && <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${ARTIKEL_CLASS[active.article]}`}>{active.article === "plural" ? "die Pl." : active.article}</span>}
            <strong className="font-display text-lg text-foreground">{active.label}</strong>
          </div>
          {active.text && <p className="mt-2 text-sm leading-7 text-muted-foreground">{active.text}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Відкрито {seen} / {parts.length}</span>
        {!readOnly && <>
          <Button type="button" size="sm" variant={quiz ? "default" : "outline"} onClick={() => { setQuiz(!quiz); setAskIndex(0); setWrong(null); setActiveId(null); }}>
            {quiz ? <Check className="mr-1.5 h-4 w-4" /> : <Sparkles className="mr-1.5 h-4 w-4" />}{quiz ? "Вийти з тесту" : "Тест: знайди частину"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { onChange({}); setActiveId(null); setAskIndex(0); setWrong(null); }}><RotateCcw className="mr-1.5 h-4 w-4" />Zurücksetzen</Button>
        </>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {parts.map((p) => <button key={p.id} type="button" onClick={() => click(p.id)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${found[p.id] ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>{found[p.id] || !quiz ? p.label : "???"}</button>)}
      </div>
    </div>
  );
}
