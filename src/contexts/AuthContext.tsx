import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-login for Telegram Mini App
  const { loading: tgLoading } = useTelegramAuth();

  useEffect(() => {
    const notifiedUsers = new Set<string>();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Update last_active on login/session refresh
      if (session?.user) {
        supabase
          .from("profiles")
          .update({ last_active: new Date().toISOString() } as any)
          .eq("user_id", session.user.id)
          .then();

        // Notify admin on new signup (user created within last 60 seconds)
        if (event === "SIGNED_IN" && session.user.created_at) {
          const createdAt = new Date(session.user.created_at).getTime();
          const now = Date.now();
          if (now - createdAt < 60000 && !notifiedUsers.has(session.user.id)) {
            notifiedUsers.add(session.user.id);
            supabase.functions.invoke("notify-new-user", {
              body: {
                email: session.user.email || session.user.phone || "—",
                method: session.user.app_metadata?.provider || "email",
                timestamp: session.user.created_at,
                userAgent: navigator.userAgent,
              },
            }).catch(() => {});
          }
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        supabase
          .from("profiles")
          .update({ last_active: new Date().toISOString() } as any)
          .eq("user_id", session.user.id)
          .then();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isLoading = loading || tgLoading;

  return (
    <AuthContext.Provider value={{ user, session, loading: isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
