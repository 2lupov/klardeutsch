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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
