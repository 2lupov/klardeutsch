import { useEffect } from "react";
import MAP from "@/lib/ru-ui-map.json";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsManagedStudent } from "@/hooks/useIsManagedStudent";

/** Для учнів із російською мовою профілю перекладає українські написи кабінету на льоту. */
const dict = MAP as Record<string, string>;
const ATTRS = ["placeholder", "title", "aria-label"];

function tr(s: string): string | null {
  const t = s.trim();
  if (!t || !/[іїєґІЇЄҐА-Яа-я]/.test(t)) return null;
  const v = dict[t];
  return v ? s.replace(t, v) : null;
}

function walk(root: Node) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = root;
  while (n) {
    if (n.nodeType === 3) {
      const r = tr(n.nodeValue || "");
      if (r !== null) n.nodeValue = r;
    } else if (n.nodeType === 1) {
      const el = n as Element;
      if (el.tagName === "IFRAME" || el.isContentEditable) { n = w.nextSibling() || w.nextNode(); continue; }
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (v) { const r = tr(v); if (r !== null) el.setAttribute(a, r); }
      }
    }
    n = w.nextNode();
  }
}

export default function RuStudentTranslator() {
  const { lang } = useLanguage();
  const isStudent = useIsManagedStudent();
  const on = lang === "ru" && !!isStudent;
  useEffect(() => {
    if (!on) return;
    walk(document.body);
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") walk(m.target);
        else if (m.type === "attributes") walk(m.target);
        else m.addedNodes.forEach((x) => walk(x));
      }
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => mo.disconnect();
  }, [on]);
  return null;
}
