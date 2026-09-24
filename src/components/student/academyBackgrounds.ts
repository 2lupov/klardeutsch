export const ACADEMY_BGS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Klar", css: "" },
  { id: "planets", label: "🪐 Планети", css: "radial-gradient(circle at 80% 20%, hsl(35 90% 60% / .55) 0 60px, transparent 62px), radial-gradient(circle at 15% 70%, hsl(200 80% 55% / .45) 0 40px, transparent 42px), radial-gradient(1px 1px at 30% 30%, hsl(0 0% 100% / .8), transparent), radial-gradient(1px 1px at 60% 80%, hsl(0 0% 100% / .7), transparent), linear-gradient(180deg, hsl(250 50% 10%), hsl(230 60% 18%))" },
  { id: "mountains", label: "🏔 Гори", css: "linear-gradient(160deg, transparent 55%, hsl(220 25% 30%) 55.2%), linear-gradient(20deg, transparent 50%, hsl(220 30% 22%) 50.2%), linear-gradient(180deg, hsl(25 80% 65%), hsl(260 40% 35%))" },
  { id: "sea", label: "🌊 Море", css: "linear-gradient(180deg, hsl(200 80% 70%) 0%, hsl(195 70% 55%) 45%, hsl(205 80% 35%) 46%, hsl(215 80% 18%) 100%)" },
  { id: "forest", label: "🌲 Ліс", css: "linear-gradient(180deg, hsl(150 40% 25%), hsl(160 50% 10%))" },
  { id: "sunset", label: "🌅 Захід", css: "linear-gradient(180deg, hsl(330 70% 55%), hsl(25 90% 60%), hsl(260 50% 20%))" },
];
export const bgCss = (id?: string | null) => ACADEMY_BGS.find((b) => b.id === id)?.css || "";
