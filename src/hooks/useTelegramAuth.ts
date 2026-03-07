import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that auto-authenticates users when running inside Telegram Mini App.
 * Sends initData to the telegram-auth edge function, receives session tokens,
 * and sets the Supabase session.
 */
export function useTelegramAuth() {
  const tg = (window as any).Telegram?.WebApp;
  const isTMA = !!tg?.initData;
  
  const [loading, setLoading] = useState(isTMA); // Start loading if inside TMA
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) return; // Not inside TMA

    const initData = tg.initData;
    if (!initData || attempted) return;

    setAttempted(true);

    const authenticate = async () => {
      // Check if already logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return; // Already authenticated

      setLoading(true);
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/telegram-auth`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": anonKey,
              "Authorization": `Bearer ${anonKey}`,
            },
            body: JSON.stringify({ initData }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Auth failed");
        }

        // Set the session in Supabase client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          throw sessionError;
        }

        console.log("Telegram auto-login successful");
      } catch (err: any) {
        console.error("Telegram auto-login failed:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, [attempted]);

  return { loading, error, attempted };
}

/**
 * Login via Telegram Login Widget callback data.
 */
export async function loginWithTelegramWidget(widgetData: Record<string, string>) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/telegram-auth`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ loginWidget: widgetData }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Auth failed");

  const { error } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  if (error) throw error;
  return data;
}
