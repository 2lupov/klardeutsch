import { useMemo, useState, useEffect } from "react";

/**
 * Detects whether the app is running inside Telegram Mini App
 * or on a regular desktop browser. Also tracks TMA viewport height.
 */
export function usePlatform() {
  const isTelegram = useMemo(() => {
    const hasTgProxy = typeof window !== "undefined" && !!(window as any).TelegramWebviewProxy;
    const hasTgInUrl = typeof window !== "undefined" && window.location.hash.includes("tgWebAppData");
    const hasTgInitData = typeof window !== "undefined" && !!(window as any).Telegram?.WebApp?.initData;
    return hasTgProxy || hasTgInUrl || hasTgInitData;
  }, []);

  const isMobileViewport = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  }, []);

  const isMobile = isTelegram || isMobileViewport;

  // Track Telegram viewport height for proper sizing
  const [tgViewportHeight, setTgViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!isTelegram) return;

    const tgApp = (window as any).Telegram?.WebApp;
    if (!tgApp) return;

    // Expand to standard TMA height (not fullscreen)
    if (tgApp.expand) tgApp.expand();

    const update = () => {
      const h = tgApp.viewportStableHeight || tgApp.viewportHeight;
      if (h && h > 0) setTgViewportHeight(h);
    };

    update();
    tgApp.onEvent?.("viewportChanged", update);
    // Also listen to visualViewport for fallback
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", update);

    return () => {
      tgApp.offEvent?.("viewportChanged", update);
      if (vv) vv.removeEventListener("resize", update);
    };
  }, [isTelegram]);

  // CSS height value to use for full-screen containers
  const viewportHeight = tgViewportHeight ? `${tgViewportHeight}px` : "100dvh";

  return { isTelegram, isMobile, tgViewportHeight, viewportHeight };
}
