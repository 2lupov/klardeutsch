/** Спільні хелпери для «живих» аркушів (письмо, читання, нотатки). */

export const HIGHLIGHT = "#FDE047";

/** Старий простий текст → безпечний HTML; уже готовий HTML — чистимо. */
export function toHtml(v: string) {
  if (!v) return "";
  if (!/<[a-z][\s\S]*>|&[a-z]+;|&#\d+;/i.test(v))
    return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
  const doc = new DOMParser().parseFromString(v.replace(/&amp;(nbsp|amp|lt|gt);/g, "&$1;"), "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) =>
    [...el.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) el.removeAttribute(a.name);
    }),
  );
  return doc.body.innerHTML;
}

export function plain(html: string) {
  const d = document.createElement("div");
  d.innerHTML = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p)>/gi, "\n");
  return (d.textContent || "").trim();
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
