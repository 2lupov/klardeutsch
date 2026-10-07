/** Спільні хелпери для «живих» аркушів (письмо, читання, нотатки). */

export const HIGHLIGHT = "#FDE047";

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "BR", "P", "DIV", "SPAN", "MARK", "UL", "OL", "LI", "FONT", "SUB", "SUP", "H1", "H2", "H3", "BLOCKQUOTE"]);
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "BASE", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "SVG", "MATH", "TEMPLATE", "NOSCRIPT", "AUDIO", "VIDEO", "IMG", "PICTURE", "SOURCE", "TRACK", "CANVAS", "FRAME", "FRAMESET", "APPLET"]);
const ALLOWED_STYLE_PROPS = new Set(["color", "background", "background-color", "font-weight", "font-style", "text-decoration", "text-decoration-line", "text-decoration-color", "text-decoration-style"]);
const SAFE_STYLE_VALUE = /^[#a-z0-9(),.\s%-]+$/i;

function cleanStyle(style: string): string {
  return style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(":");
      if (i < 0) return "";
      const prop = d.slice(0, i).trim().toLowerCase();
      const val = d.slice(i + 1).trim();
      if (!ALLOWED_STYLE_PROPS.has(prop) || !SAFE_STYLE_VALUE.test(val) || /url\(|expression|@import/i.test(val)) return "";
      return `${prop}: ${val}`;
    })
    .filter(Boolean)
    .join("; ");
}

function cleanNode(node: Node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) continue; // текст
    if (child.nodeType !== 1) { node.removeChild(child); continue; } // коментарі тощо
    const el = child as HTMLElement;
    if (DROP_TAGS.has(el.tagName)) { node.removeChild(el); continue; }
    cleanNode(el);
    if (!ALLOWED_TAGS.has(el.tagName)) {
      // невідомий тег: лишаємо текст, прибираємо обгортку
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      node.removeChild(el);
      continue;
    }
    for (const a of Array.from(el.attributes)) {
      if (a.name === "style") {
        const st = cleanStyle(a.value);
        if (st) el.setAttribute("style", st); else el.removeAttribute("style");
      } else if (!(el.tagName === "FONT" && (a.name === "color" || a.name === "size")) || /[^#a-z0-9]/i.test(a.value)) {
        el.removeAttribute(a.name);
      }
    }
  }
}

/** Старий простий текст → безпечний HTML; уже готовий HTML — чистимо за білим списком тегів і стилів. */
export function toHtml(v: string) {
  if (!v) return "";
  if (!/<[a-z][\s\S]*>|&[a-z]+;|&#\d+;/i.test(v))
    return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
  const doc = new DOMParser().parseFromString(v.replace(/&amp;(nbsp|amp|lt|gt);/g, "&$1;"), "text/html");
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

/** Звичайний текст з HTML. Через DOMParser: на відміну від innerHTML на живому елементі, нічого не виконується й не вантажиться. */
export function plain(html: string) {
  const doc = new DOMParser().parseFromString(
    (html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p)>/gi, "\n"),
    "text/html",
  );
  return (doc.body.textContent || "").trim();
}

/* ───────── Спільне редагування: свій ввід важливіший за чужий ───────── */

/** Позиція курсору як зсув у тексті (переживає заміну innerHTML). */
function caretOffset(el: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !el.contains(sel.anchorNode)) return null;
  const r = sel.getRangeAt(0).cloneRange();
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.endContainer, r.endOffset);
  return pre.toString().length;
}

function restoreCaret(el: HTMLElement, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let left = offset;
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const len = n.textContent?.length ?? 0;
    if (left <= len) {
      const r = document.createRange();
      r.setStart(n, left);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
    left -= len;
  }
}

/** Скільки мс після власного натискання клавіші чужі зміни не перезаписують поле. */
export const LOCAL_TYPING_GRACE_MS = 1800;

/**
 * Застосувати зміну з іншої сторони до редактора.
 * Якщо людина друкує просто зараз — її текст має пріоритет (повертає false, чужа версія пропускається;
 * вона все одно отримає наш текст у наступному оновленні). Інакше підміняємо вміст і повертаємо курсор.
 */
export function applyRemoteHtml(el: HTMLElement | null, html: string, lastLocalEditAt: number): boolean {
  if (!el || el.innerHTML === html) return true;
  const focused = document.activeElement === el;
  if (focused && Date.now() - lastLocalEditAt < LOCAL_TYPING_GRACE_MS) return false;
  const off = focused ? caretOffset(el) : null;
  el.innerHTML = html;
  if (off != null) restoreCaret(el, off);
  return true;
}

export const countWords = (html: string) => plain(html).split(/\s+/).filter(Boolean).length;

/** Текст із абзацами → HTML для аркуша читання. */
export const paragraphsToHtml = (text: string) =>
  (text || "")
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
    .join("");

export const SHEET_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, hsl(var(--border)) 31px, hsl(var(--border)) 32px)",
  backgroundAttachment: "local" as const,
  backgroundPosition: "0 16px",
};
