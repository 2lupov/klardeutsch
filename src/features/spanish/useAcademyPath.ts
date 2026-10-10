import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ACADEMY_PATH, academyPathFor } from "./access";

// Remembered per account so every "Академія" entry resolves without a refetch.
const resolved = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

const resolveAcademyPath = (userId: string) => {
  const hit = resolved.get(userId);
  if (hit) return Promise.resolve(hit);
  let job = pending.get(userId);
  if (!job) {
    job = Promise.resolve(
      supabase
        .from("profiles")
        .select("nickname")
        .eq("user_id", userId)
        .maybeSingle(),
    )
      .then(({ data }) =>
        academyPathFor((data as { nickname?: string | null } | null)?.nickname),
      )
      .catch(() => ACADEMY_PATH)
      .then((path) => {
        resolved.set(userId, path);
        pending.delete(userId);
        return path;
      });
    pending.set(userId, job);
  }
  return job;
};

/**
 * Destination of the "Академія" navigation entry. Some accounts get their own
 * course instead of the academy, so every entry point asks this instead of
 * hard-coding the route.
 */
export const useAcademyPath = () => {
  const { user } = useAuth();
  const id = user?.id;
  const [path, setPath] = useState(() => (id ? resolved.get(id) ?? ACADEMY_PATH : ACADEMY_PATH));

  useEffect(() => {
    if (!id) {
      setPath(ACADEMY_PATH);
      return;
    }
    const hit = resolved.get(id);
    if (hit) {
      setPath(hit);
      return;
    }
    let alive = true;
    resolveAcademyPath(id).then((p) => {
      if (alive) setPath(p);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return path;
};
