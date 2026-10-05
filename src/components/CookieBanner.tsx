import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const COOKIE_KEY = "klar_cookie_consent";

const CookieBanner = () => {
  const [consent, setConsent] = useState<string | null>(() => {
    try { return localStorage.getItem(COOKIE_KEY); } catch { return null; }
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (consent) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [consent]);

  const accept = () => {
    try { localStorage.setItem(COOKIE_KEY, "accepted"); } catch {}
    setConsent("accepted");
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem(COOKIE_KEY, "declined"); } catch {}
    setConsent("declined");
    setVisible(false);
  };

  if (consent) return null;
  if (typeof window !== "undefined" && window.location.pathname === "/chat") return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-lg rounded-2xl border border-border bg-card/95 backdrop-blur-md px-3 py-2 shadow-xl flex items-center gap-2"
        >
          <p className="text-[11px] leading-snug text-muted-foreground flex-1">
            🍪 Мы используем cookies.{" "}
            <a href="/privacy" className="underline text-primary hover:text-primary/80">Подробнее</a>
          </p>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={decline}>
              Нет
            </Button>
            <Button size="sm" className="h-8 px-3 text-xs" onClick={accept}>
              Ок
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
