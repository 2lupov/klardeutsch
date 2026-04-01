import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import MobileBottomNav from "@/components/MobileBottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import PageTransition from "@/components/PageTransition";
import LofiFloatingPlayer from "@/components/LofiFloatingPlayer";
import ListeningFloatingPlayer from "@/components/ListeningFloatingPlayer";
import NicknameGate from "@/components/NicknameGate";
import EditModeToolbar from "@/components/EditModeToolbar";
import DailyBonusDialog from "@/components/DailyBonusDialog";

const AppLayout = () => {
  const { user, loading } = useAuth();
  const { isMobile } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [hasNickname, setHasNickname] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, onboarding_completed")
        .eq("user_id", user.id)
        .single();
      setHasNickname(!!data?.display_name?.trim());
      // Check onboarding
      if (data && !(data as any).onboarding_completed) {
        navigate("/onboarding", { replace: true });
      }
      setNicknameChecked(true);
    };
    check();
  }, [user]);

  if (loading || !nicknameChecked) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <span className="text-muted-foreground animate-pulse font-display">KLAR</span>
      </div>
    );
  }

  if (!user) return null;

  if (!hasNickname) {
    return <NicknameGate onComplete={() => setHasNickname(true)} />;
  }

  const isChat = location.pathname === "/chat";

  if (isMobile) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <EditModeToolbar />
        <LofiFloatingPlayer />
        <ListeningFloatingPlayer />
        <DailyBonusDialog />
        <div className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-none ${isChat ? "" : "pb-14"}`}>
          <PageTransition><Outlet /></PageTransition>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex overflow-hidden">
      <DesktopSidebar />
      <main className="flex-1 overflow-y-auto relative w-full">
        <EditModeToolbar />
        <LofiFloatingPlayer />
        <ListeningFloatingPlayer />
        <DailyBonusDialog />
        <PageTransition><Outlet /></PageTransition>
      </main>
    </div>
  );
};

export default AppLayout;
