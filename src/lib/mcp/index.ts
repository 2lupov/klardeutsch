import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProgress from "./tools/get-progress";
import listMyWords from "./tools/list-my-words";
import listCourses from "./tools/list-courses";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "klar-academy-mcp",
  title: "KLAR Academy",
  version: "0.1.0",
  instructions:
    "Tools for the KLAR language academy. Use get_progress to read the signed-in user's XP/coins, list_my_words to browse their saved German vocabulary, and list_courses to see available Academy courses.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProgress, listMyWords, listCourses],
});
