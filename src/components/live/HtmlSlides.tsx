import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Інтерактивна HTML/SVG-презентація в ізольованому iframe.
 * Якщо передано syncKey — кліки, клавіші й введення тексту передаються
 * між викладачем і учнем у реальному часі (обидва бачать одне й те саме).
 */
const BRIDGE = `<script>(function(){
var replay=false,lastMove=0,ptrs={};
function path(el){var p=[];while(el&&el.nodeType===1&&el!==document.documentElement){var i=0,s=el;while((s=s.previousElementSibling))i++;p.unshift(i);el=el.parentElement;}return p;}
function find(p){var el=document.documentElement;for(var i=0;i<p.length;i++){if(!el)return null;el=el.children[p[i]];}return el;}
function send(m){parent.postMessage({__klar:1,m:m,r:replay},"*");}
function rel(e){var t=e.target,r=t&&t.getBoundingClientRect?t.getBoundingClientRect():{left:0,top:0,width:innerWidth,height:innerHeight};return{fx:r.width?(e.clientX-r.left)/r.width:0,fy:r.height?(e.clientY-r.top)/r.height:0,sx:e.clientX-r.left,sy:e.clientY-r.top};}
function at(el,m){var r=el.getBoundingClientRect();return{clientX:r.left+m.fx*r.width,clientY:r.top+m.fy*r.height};}
document.addEventListener("click",function(e){if(replay)return;var c=rel(e);send({k:"click",p:path(e.target),fx:c.fx,fy:c.fy});},true);
document.addEventListener("keydown",function(e){var t=e.target;if(replay||e.repeat||(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")))return;send({k:"key",t:"keydown",key:e.key,code:e.code,keyCode:e.keyCode});},true);
document.addEventListener("keyup",function(e){var t=e.target;if(replay||(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")))return;send({k:"key",t:"keyup",key:e.key,code:e.code,keyCode:e.keyCode});},true);
document.addEventListener("input",function(e){var t=e.target;if(!replay&&t&&"value" in t)send({k:"input",p:path(t),v:t.value});},true);
["pointerdown","pointermove","pointerup","pointercancel"].forEach(function(ty){document.addEventListener(ty,function(e){
if(replay)return;
if(ty==="pointermove"){var n=Date.now();if(n-lastMove<33)return;lastMove=n;}
var tg=ty==="pointerdown"?e.target:(ptrs[e.pointerId]||e.target);
if(ty==="pointerdown")ptrs[e.pointerId]=e.target;if(ty==="pointerup"||ty==="pointercancel")delete ptrs[e.pointerId];
var r=tg.getBoundingClientRect();
send({k:"ptr",t:ty,p:path(tg),fx:r.width?(e.clientX-r.left)/r.width:0,fy:r.height?(e.clientY-r.top)/r.height:0,pt:e.pointerType,b:e.buttons});
},true);});
var rcur=document.createElement("div");rcur.style.cssText="position:fixed;z-index:2147483647;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:rgba(250,204,21,.85);box-shadow:0 0 0 3px rgba(250,204,21,.3);pointer-events:none;display:none;transition:left .03s linear,top .03s linear";
document.addEventListener("DOMContentLoaded",function(){document.body.appendChild(rcur);});
window.addEventListener("message",function(ev){var m=ev.data&&ev.data.__klarIn;if(!m)return;replay=true;try{
if(m.k==="click"){var el=find(m.p);if(el){if(m.fx!=null){var c=at(el,m);el.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window,clientX:c.clientX,clientY:c.clientY}));}else if(typeof el.click==="function")el.click();}}
else if(m.k==="key"){var o={key:m.key,code:m.code,keyCode:m.keyCode,which:m.keyCode,bubbles:true};var ty=m.t||"keydown";(document.activeElement||document.body).dispatchEvent(new KeyboardEvent(ty,o));if(!m.t){document.dispatchEvent(new KeyboardEvent("keyup",o));}}
else if(m.k==="input"){var t=find(m.p);if(t){t.value=m.v;t.dispatchEvent(new Event("input",{bubbles:true}));t.dispatchEvent(new Event("change",{bubbles:true}));}}
else if(m.k==="ptr"){var pe=find(m.p);if(pe){var q=at(pe,m);if(document.body&&!rcur.parentNode)document.body.appendChild(rcur);rcur.style.display="block";rcur.style.left=q.clientX+"px";rcur.style.top=q.clientY+"px";
pe.dispatchEvent(new PointerEvent(m.t,{bubbles:true,cancelable:true,view:window,clientX:q.clientX,clientY:q.clientY,pointerId:777,pointerType:m.pt||"mouse",isPrimary:true,buttons:m.b||0}));}}
}finally{setTimeout(function(){replay=false;},0);}});
})();<\/script>`;

/** Перехоплює браузерну озвучку презентації — батьківське вікно грає її голосом ElevenLabs (de / nl). */
const TTS_HOOK = `<script>(function(){try{var S=window.speechSynthesis;if(!S)return;var cur=null;
function det(u){var l=(u.lang||document.documentElement.lang||"").toLowerCase();return l.indexOf("nl")===0?"nl":"de";}
S.speak=function(u){cur=u;try{u.onstart&&u.onstart(new Event("start"));}catch(e){}parent.postMessage({__klarTts:{text:String(u.text||""),lang:det(u),rate:u.rate||1}},"*");};
S.cancel=function(){parent.postMessage({__klarTts:{cancel:1}},"*");};
window.addEventListener("message",function(ev){if(ev.data&&ev.data.__klarTtsEnd&&cur){var u=cur;cur=null;try{u.onend&&u.onend(new Event("end"));}catch(e){}}});
}catch(e){}})();<\/script>`;

const VOICE_DE = "aTTiK3YzK3dXETpuDE2h";
const VOICE_NL = "pFZP5JQG7iQjIQuC4Bku";
const ttsCache = new Map<string, string>();
let ttsAudio: HTMLAudioElement | null = null;
async function playTts(text: string, lang: string, rate: number): Promise<void> {
  const t = text.trim().slice(0, 800);
  if (!t) return;
  const voice = lang === "nl" ? VOICE_NL : VOICE_DE;
  const speed = Math.min(1.2, Math.max(0.7, rate || 0.9));
  const key = `${voice}|${speed}|${t}`;
  let url = ttsCache.get(key);
  if (!url) {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/elevenlabs-tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ text: t, voiceId: voice, speed }),
    });
    if (!res.ok) throw new Error("tts");
    url = URL.createObjectURL(await res.blob());
    if (ttsCache.size > 200) { const k = ttsCache.keys().next().value; if (k) { URL.revokeObjectURL(ttsCache.get(k)!); ttsCache.delete(k); } }
    ttsCache.set(key, url);
  }
  ttsAudio?.pause();
  const a = new Audio(url);
  ttsAudio = a;
  await new Promise<void>((resolve) => { a.onended = () => resolve(); a.onerror = () => resolve(); a.play().catch(() => resolve()); });
}
/** Запасний варіант: системний голос строго потрібної мови (ніколи не російський). */
function browserTts(text: string, lang: string, rate: number, done: () => void) {
  try {
    const S = window.speechSynthesis; const code = lang === "nl" ? "nl" : "de";
    const v = S.getVoices().find((x) => x.lang.toLowerCase().startsWith(code));
    if (!v) { done(); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = v.lang; u.voice = v; u.rate = rate || 0.9; u.onend = done; u.onerror = done;
    S.cancel(); S.speak(u);
  } catch { done(); }
}

/** Однаковий генератор випадкових чисел у вчителя й учня — щоб ігри (Suchspiel) питали те саме. */
function seedScript(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return `<script>(function(){var s=${h >>> 0};Math.random=function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();<\/script>`;
}

/** Прибирає markdown-обгортки й текстові хвости ШІ навколо HTML/SVG. */
export function cleanHtml(src: string): string {
  let code = (src || "").trim();
  code = code.replace(/^```[a-z]*\s*/i, "");
  const start = code.search(/<!doctype|<html[\s>]|<\?xml|<svg[\s>]/i);
  if (start > 0) code = code.slice(start);
  const endHtml = code.search(/<\/html>/i);
  if (endHtml >= 0) return code.slice(0, endHtml + 7);
  if (/^(<\?xml[^>]*>\s*)?<svg/i.test(code)) {
    const i = code.toLowerCase().lastIndexOf("</svg>");
    if (i >= 0) return code.slice(0, i + 6);
  }
  return code.replace(/```[\s\S]*$/, "").trim();
}

const BASE_W = 640;

export function wrapHtml(src: string, seed?: string): string {
  const code = cleanHtml(src);
  const isSvg = /^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(code);
  const base = isSvg
    ? `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#0f172a}body{display:flex;align-items:center;justify-content:center}svg{max-width:100%;max-height:100%;width:100%;height:100%}</style></head><body>${code.replace(/^<\?xml[^>]*>/i, "")}</body></html>`
    : /<html[\s>]/i.test(code) ? code : `<!doctype html><html><head><meta charset="utf-8"></head><body>${code}</body></html>`;
  let out = /<\/body>/i.test(base) ? base.replace(/<\/body>/i, `${BRIDGE}</body>`) : base + BRIDGE;
  if (seed) {
    const sc = seedScript(seed);
    out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (m) => m + sc) : sc + out;
  }
  out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (m) => m + TTS_HOOK) : TTS_HOOK + out;
  return out;
}

export default function HtmlSlides({ html, syncKey, className, progress }: { html: string; syncKey?: string; className?: string; progress?: { studentId: string; presentationId: string } }) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Прогрес учня: журнал усіх дій (кліки/введення/клавіші) — відтворюється при поверненні.
  const log = useRef<any[]>([]);
  const restoring = useRef(true);
  const saveT = useRef<number | null>(null);
  const pk = progress ? `${progress.studentId}:${progress.presentationId}` : null;
  const flush = () => {
    if (!progress) return;
    const rows = log.current.slice(-3000);
    try { localStorage.setItem(`klar-pres:${pk}`, JSON.stringify(rows)); } catch { /* ignore */ }
    void (supabase as any).from("presentation_progress").upsert(
      { student_id: progress.studentId, presentation_id: progress.presentationId, log: rows },
      { onConflict: "student_id,presentation_id" },
    );
  };
  const record = (m: any) => {
    if (!progress || restoring.current || m.k === "ptr") return;
    const last = log.current[log.current.length - 1];
    if (m.k === "input" && last?.k === "input" && JSON.stringify(last.p) === JSON.stringify(m.p)) log.current[log.current.length - 1] = m;
    else log.current.push(m);
    if (saveT.current) window.clearTimeout(saveT.current);
    saveT.current = window.setTimeout(flush, 800);
  };
  useEffect(() => {
    // Закриття вкладки / згортання застосунку — дозберігаємо одразу, щоб не загубити останню відповідь
    const now = () => { if (saveT.current) { window.clearTimeout(saveT.current); saveT.current = null; flush(); } };
    const onVis = () => { if (document.visibilityState === "hidden") now(); };
    window.addEventListener("pagehide", now);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("pagehide", now); document.removeEventListener("visibilitychange", onVis); now(); };
  }, [pk]);
  const restore = async () => {
    restoring.current = true;
    if (progress) {
      let rows: any[] = [];
      const { data } = await (supabase as any).from("presentation_progress").select("log")
        .eq("student_id", progress.studentId).eq("presentation_id", progress.presentationId).maybeSingle();
      rows = (data?.log as any[]) || [];
      if (!rows.length) { try { rows = JSON.parse(localStorage.getItem(`klar-pres:${pk}`) || "[]"); } catch { rows = []; } }
      log.current = rows;
      for (const m of rows) {
        frame.current?.contentWindow?.postMessage({ __klarIn: m }, "*");
        await new Promise((r) => setTimeout(r, 15));
      }
    }
    setTimeout(() => { restoring.current = false; }, 100);
  };
  const srcDoc = useMemo(() => wrapHtml(html, syncKey), [html, syncKey]);

  useEffect(() => {
    const ch = syncKey ? supabase.channel(`live-html:${syncKey}`) : null;
    ch?.on("broadcast", { event: "ev" }, ({ payload }) => {
      frame.current?.contentWindow?.postMessage({ __klarIn: payload }, "*");
    }).subscribe();
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const tts = e.data?.__klarTts;
      if (tts) {
        const done = () => frame.current?.contentWindow?.postMessage({ __klarTtsEnd: 1 }, "*");
        if (tts.cancel) { ttsAudio?.pause(); return; }
        if (restoring.current) { done(); return; }
        playTts(tts.text, tts.lang, tts.rate).then(done).catch(() => browserTts(tts.text, tts.lang, tts.rate, done));
        return;
      }
      if (!e.data?.__klar) return;
      record(e.data.m);
      if (!e.data.r) ch?.send({ type: "broadcast", event: "ev", payload: e.data.m });
    };
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("message", onMsg);
      if (ch) supabase.removeChannel(ch);
    };
  }, [syncKey]);

  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [full, setFull] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    const onFs = () => setFull(document.fullscreenElement === el);
    document.addEventListener("fullscreenchange", onFs);
    return () => { ro.disconnect(); document.removeEventListener("fullscreenchange", onFs); };
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrap.current?.requestFullscreen?.().catch(() => {});
  };
  // На вузьких екранах рендеримо як десктоп (640px) і пропорційно зменшуємо.
  const scale = box.w > 0 && box.w < BASE_W ? box.w / BASE_W : 1;

  return (
    <div ref={wrap} className={`relative overflow-hidden bg-background ${className ?? "h-full w-full rounded-lg"}`}>
      <iframe
        ref={frame}
        title="Інтерактивна презентація"
        srcDoc={srcDoc}
        onLoad={() => { void restore(); }}
        sandbox="allow-scripts allow-forms allow-modals"
        className="absolute left-0 top-0 border-0 bg-background"
        style={scale < 1
          ? { width: BASE_W, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: "0 0" }
          : { width: "100%", height: "100%" }}
      />
      <button
        type="button"
        onClick={toggleFull}
        aria-label={full ? "Вийти з повного екрана" : "На весь екран"}
        className="absolute bottom-2 right-2 z-10 rounded-lg border border-border bg-card/80 p-1.5 text-foreground backdrop-blur hover:bg-card"
      >
        {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
