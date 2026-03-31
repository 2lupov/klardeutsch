import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LofiProvider } from "@/contexts/LofiContext";
import { ListeningAudioProvider } from "@/contexts/ListeningAudioContext";
import { usePlatform } from "@/hooks/usePlatform";
import AppLayout from "@/components/AppLayout";
import OfflineBanner from "@/components/OfflineBanner";
import ListeningFloatingPlayer from "@/components/ListeningFloatingPlayer";
import ReportErrorButton from "@/components/ReportErrorButton";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Dictionary from "./pages/Dictionary";
import Statistics from "./pages/Statistics";
import Shop from "./pages/Shop";
import Challenges from "./pages/Challenges";
import Dialogues from "./pages/Dialogues";
import Method from "./pages/Method";
import Games from "./pages/Games";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import QR from "./pages/QR";
import Course from "./pages/Course";
import Academy from "./pages/Academy";
import AcademyCourse from "./pages/AcademyCourse";
import AcademyLearn from "./pages/AcademyLearn";
import Onboarding from "./pages/Onboarding";
import Review from "./pages/Review";
import Certificate from "./pages/Certificate";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isTelegram } = usePlatform();

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/review" element={<Review />} />
      <Route path="/certificate/:code" element={<Certificate />} />
      {/* Web-only routes — redirect to home in Telegram */}
      <Route path="/admin" element={isTelegram ? <Navigate to="/" replace /> : <Admin />} />
      <Route path="/method" element={isTelegram ? <Navigate to="/" replace /> : <Method />} />
      <Route path="/privacy" element={isTelegram ? <Navigate to="/" replace /> : <Privacy />} />
      <Route path="/terms" element={isTelegram ? <Navigate to="/" replace /> : <Terms />} />
      <Route path="/qr" element={isTelegram ? <Navigate to="/" replace /> : <QR />} />
      {/* Authenticated routes with responsive layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dictionary" element={<Dictionary />} />
        <Route path="/stats" element={<Statistics />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/dialogues" element={<Dialogues />} />
        <Route path="/games" element={<Games />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/course/:id" element={<Course />} />
        <Route path="/academy" element={<Academy />} />
        <Route path="/academy/:courseId" element={<AcademyCourse />} />
        <Route path="/academy/:courseId/learn" element={<AcademyLearn />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <LofiProvider>
      <ListeningAudioProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineBanner />
          <BrowserRouter>
            <AppRoutes />
            <ListeningFloatingPlayer />
            <ReportErrorButton />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      </ListeningAudioProvider>
      </LofiProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
