import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Інтерактивна HTML/SVG-презентація в ізольованому iframe.
 * Якщо передано syncKey — кліки, клавіші й введення тексту передаються
 * між викладачем і учнем у реальному часі (обидва бачать одне й те саме).
 */
const BRIDGE = `<script>(function(){
var replay=false;
function path(el){var p=[];while(el&&el.nodeType===1&&el!==document.documentElement){var i=0,s=el;while((s=s.previousElementSibling))i++;p.unshift(i);el=el.parentElement;}return p;}
function find(p){var el=document.documentElement;for(var i=0;i<p.length;i++){if(!el)return null;el=el.children[p[i]];}return el;}
function send(m){if(!replay)parent.postMessage({__klar:1,m:m},"*");}
document.addEventListener("click",function(e){send({k:"click",p:path(e.target)});},true);
document.addEventListener("keydown",function(e){var t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"))return;send({k:"key",key:e.key,code:e.code,keyCode:e.keyCode});},true);
document.addEventListener("input",function(e){var t=e.target;if(t&&"value" in t)send({k:"input",p:path(t),v:t.value});},true);
window.addEventListener("message",function(ev){var m=ev.data&&ev.data.__klarIn;if(!m)return;replay=true;try{
if(m.k==="click"){var el=find(m.p);if(el){if(typeof el.click==="function")el.click();else el.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));}}
else if(m.k==="key"){var o={key:m.key,code:m.code,keyCode:m.keyCode,which:m.keyCode,bubbles:true};(document.activeElement||document.body).dispatchEvent(new KeyboardEvent("keydown",o));document.dispatchEvent(new KeyboardEvent("keyup",o));}
else if(m.k==="input"){var t=find(m.p);if(t){t.value=m.v;t.dispatchEvent(new Event("input",{bubbles:true}));t.dispatchEvent(new Event("change",{bubbles:true}));}}
}finally{setTimeout(function(){replay=false;},0);}});
})();<\/script>`;

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

export function wrapHtml(src: string): string {
  const code = cleanHtml(src);
  const isSvg = /^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(code);
  const base = isSvg
    ? `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#0f172a}body{display:flex;align-items:center;justify-content:center}svg{max-width:100%;max-height:100%;width:100%;height:100%}</style></head><body>${code.replace(/^<\?xml[^>]*>/i, "")}</body></html>`
    : /<html[\s>]/i.test(code) ? code : `<!doctype html><html><head><meta charset="utf-8"></head><body>${code}</body></html>`;
  return /<\/body>/i.test(base) ? base.replace(/<\/body>/i, `${BRIDGE}</body>`) : base + BRIDGE;
}

export default function HtmlSlides({ html, syncKey, className }: { html: string; syncKey?: string; className?: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => wrapHtml(html), [html]);

  useEffect(() => {
    const ch = syncKey ? supabase.channel(`live-html:${syncKey}`) : null;
    ch?.on("broadcast", { event: "ev" }, ({ payload }) => {
      frame.current?.contentWindow?.postMessage({ __klarIn: payload }, "*");
    }).subscribe();
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data?.__klar) return;
      ch?.send({ type: "broadcast", event: "ev", payload: e.data.m });
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
