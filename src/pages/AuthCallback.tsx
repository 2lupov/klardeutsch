import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Handles the return leg of the OAuth redirect flow (Google, etc.).
 * The broker redirects back here with tokens either in the hash or query string.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const pick = (key: string) => hash.get(key) ?? query.get(key);

      const errDesc = pick("error_description") ?? pick("error");
      const accessToken = pick("access_token");
      const refreshToken = pick("refresh_token");

      if (errDesc) {
        setError(errDesc);
        setTimeout(() => navigate("/auth", { replace: true }), 2000);
        return;
      }

      if (accessToken && refreshToken) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setErr) {
          setError(setErr.message);
          setTimeout(() => navigate("/auth", { replace: true }), 2000);
          return;
        }
        navigate("/home", { replace: true });
        return;
      }

      // Fallback: session may already be hydrated by the Supabase client.
      const { data } = await supabase.auth.getSession();
      navigate(data.session ? "/home" : "/auth", { replace: true });
    };

    void run();
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground font-display">
        {error ? error : "Завершуємо вхід…"}
      </p>
    </div>
  );
};

export default AuthCallback;
