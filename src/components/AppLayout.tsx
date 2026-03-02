import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/hooks/usePlatform";
import MobileBottomNav from "@/components/MobileBottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";

const AppLayout = () => {
  const { user, loading } = useAuth();
  const { isMobile } = usePlatform();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <span className="text-muted-foreground animate-pulse font-display">KLAR</span>
      </div>
    );
  }

  if (!user) return null;

  if (isMobile) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col pb-24 overflow-hidden">
        <div className="flex-1 overflow-y-auto overscroll-none">
          <Outlet />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-[100dvh] bg-background flex">
      <DesktopSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
