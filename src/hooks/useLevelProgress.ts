import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Level } from "@/data/lessons";

const CATEGORIES = ["vocabulary", "grammar", "reading"] as const;

/**
 * Returns a 0–100 percentage representing how many categories
 * have been completed for the given level.
 */
export const useLevelProgress = (level: Level) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setProgress(0);
      setCompleted(false);
      return;
    }

    const { data } = await supabase
      .from("user_progress")
      .select("category, completed")
      .eq("user_id", user.id)
      .eq("level", level)
      .eq("completed", true);

    const done = new Set((data ?? []).map((r) => r.category));
    const pct = Math.round((done.size / CATEGORIES.length) * 100);
    setProgress(pct);
    setCompleted(pct >= 100);
  }, [user, level]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { progress, completed, refresh };
};
