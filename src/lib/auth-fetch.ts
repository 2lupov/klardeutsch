import { supabase } from "@/integrations/supabase/client";

/**
 * Get the current user's access token, falling back to anon key.
 */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

/**
 * Fetch an edge function with proper auth headers.
 */
export async function fetchEdgeFunction(
  functionName: string,
  options: {
    method?: string;
    body?: BodyInit | null;
    headers?: Record<string, string>;
    json?: unknown;
  } = {}
): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  let body = options.body ?? null;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  return fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
    { method: options.method || "POST", headers, body }
  );
}
