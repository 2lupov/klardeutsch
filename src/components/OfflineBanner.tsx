import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-600/95 backdrop-blur-sm text-white text-center py-2 px-4 flex items-center justify-center gap-2 text-xs font-display font-medium shadow-lg animate-slide-down">
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      <span>Офлайн-режим · Карточки и уроки доступны из кэша</span>
    </div>
  );
};

export default OfflineBanner;
