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
import { useTeacherLink } from "@/hooks/useTeacherLink";
import { useStudentLiveSync } from "@/hooks/useStudentLiveSync";
import { LogOut } from "lucide-react";

// Routes a managed student is allowed to visit. Anything else
// is redirected to /assignments (their only home).
const STUDENT_ALLOWED = [
  /^\/assignments$/,
  /^\/tutoring\/lesson\/[^/]+$/,
  /^\/tutoring\/homework\/[^/]+$/,
  /^\/tutoring\/placement\/[^/]+$/,
  /^\/onboarding$/,
];

const isStudentAllowed = (path: string) =>
  STUDENT_ALLOWED.some((re) => re.test(path));

const AppLayout = () => {
  const { user, loading, signOut } = useAuth();
  const { isMobile, viewportHeight } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasNickname, setHasNickname] = useState(true);
  const [isStudent, setIsStudent] = useState(false);

  useTeacherLink(user?.id);
  useStudentLiveSync(user?.id);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nickname, onboarding_completed, created_by_teacher_id")
        .eq("user_id", user.id)
        .single();
      const student = !!(data as any)?.created_by_teacher_id;
      setIsStudent(student);
      // Students are managed by their teacher → no nickname gate for them.
      setHasNickname(student ? true : !!data?.nickname?.trim());
      if (data && !(data as any).onboarding_completed) {
        navigate("/onboarding", { replace: true });
      }
      setProfileChecked(true);
    };
    check();
  }, [user, navigate]);

  // Lock students out of every non-student route.
  useEffect(() => {
    if (!profileChecked || !isStudent) return;
    if (!isStudentAllowed(location.pathname)) {
      navigate("/assignments", { replace: true });
    }
  }, [isStudent, profileChecked, location.pathname, navigate]);

  if (loading || !profileChecked) {
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

  // ===== Managed-student layout: minimal shell, single screen =====
  if (isStudent) {
    return (
      <div
        className="bg-background flex flex-col overflow-hidden"
        style={{ height: isMobile ? viewportHeight : "100dvh" }}
      >
        <button
          onClick={signOut}
          aria-label="Logout"
          className="fixed top-3 right-3 z-50 w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition shadow-sm"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none">
          <PageTransition><Outlet /></PageTransition>
        </div>
      </div>
    );
  }

  const isChat = location.pathname === "/chat";

  if (isMobile) {
    return (
      <div className="bg-background flex flex-col overflow-hidden" style={{ height: viewportHeight }}>
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
