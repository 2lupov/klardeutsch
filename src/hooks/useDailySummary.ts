import { useState, useCallback } from "react";

const SHOWN_KEY_PREFIX = "klar_daily_summary_shown_";

export const useDailySummary = () => {
  const dateKey = new Date().toISOString().slice(0, 10);
  const shownKey = SHOWN_KEY_PREFIX + dateKey;
  const [showSummary, setShowSummary] = useState(false);

  const triggerSummary = useCallback(() => {
    if (localStorage.getItem(shownKey)) return;
    setShowSummary(true);
    localStorage.setItem(shownKey, "1");
  }, [shownKey]);

  const closeSummary = useCallback(() => {
    setShowSummary(false);
  }, []);

  return { showSummary, triggerSummary, closeSummary };
};
