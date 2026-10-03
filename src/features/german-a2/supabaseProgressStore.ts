import { supabase } from "@/integrations/supabase/client";
import type { Progress, ProgressStore } from "./progress";

const EMPTY: Progress = { sections: {}, drafts: {} };
const COURSE = "german-a2";
const XP_FOR_TEST = 100;

/** Saves course progress per user and awards XP once when the final test is passed. */
export function createSupabaseProgressStore(userId: string): ProgressStore {
  let testRewarded = false;
  return {
    async load() {
      const { data } = await supabase
        .from("course_progress" as any)
        .select("data")
        .eq("user_id", userId)
        .eq("course", COURSE)
        .maybeSingle();
      const p = ((data as any)?.data as Progress) ?? EMPTY;
      testRewarded = Boolean((p as any).xpAwarded);
      return { ...EMPTY, ...p };
    },
    async save(p) {
      const testPassed = Object.entries(p.sections).some(([k, s]) => k.endsWith("test") && s.done);
      const payload: any = { ...p, xpAwarded: testRewarded || testPassed };
      await supabase
        .from("course_progress" as any)
        .upsert({ user_id: userId, course: COURSE, data: payload } as any, { onConflict: "user_id,course" });
      if (testPassed && !testRewarded) {
        testRewarded = true;
        await supabase.rpc("award_xp", { p_user_id: userId, p_amount: XP_FOR_TEST });
      }
    },
  };
}
