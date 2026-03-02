import { useMemo } from "react";

/**
 * Detects whether the app is running inside Telegram Mini App
 * or on a regular desktop browser.
 */
export function usePlatform() {
  const isTelegram = useMemo(() => {
    // Telegram Mini App injects TelegramWebviewProxy or sets tgWebAppData in the URL
    const hasTgProxy = typeof window !== "undefined" && !!(window as any).TelegramWebviewProxy;
    const hasTgInUrl = typeof window !== "undefined" && window.location.hash.includes("tgWebAppData");
    const hasTgInitData = typeof window !== "undefined" && !!(window as any).Telegram?.WebApp?.initData;
    return hasTgProxy || hasTgInUrl || hasTgInitData;
  }, []);

  const isMobileViewport = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  }, []);

  // If inside Telegram → always mobile layout. Otherwise, use viewport size.
  const isMobile = isTelegram || isMobileViewport;

  return { isTelegram, isMobile };
}
