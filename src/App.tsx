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
import CookieBanner from "@/components/CookieBanner";
import RequireAuth from "@/components/guards/RequireAuth";
import RequirePremium from "@/components/guards/RequirePremium";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Dictionary from "./pages/Dictionary";
import Statistics from "./pages/Statistics";
import Shop from "./pages/Shop";
import Challenges from "./pages/Challenges";

import Method from "./pages/Method";
import Games from "./pages/Games";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import QR from "./pages/QR";
import LandingUk from "./pages/LandingUk";
import Course from "./pages/Course";
import Academy from "./pages/Academy";
import AcademyCourse from "./pages/AcademyCourse";
import AcademyLearn from "./pages/AcademyLearn";
import Onboarding from "./pages/Onboarding";
import Review from "./pages/Review";
import Certificate from "./pages/Certificate";
import Chat from "./pages/Chat";
import WordLookup from "./pages/WordLookup";
import Assistant from "./pages/Assistant";
import Tutoring from "./pages/Tutoring";
import TutoringLesson from "./pages/TutoringLesson";
import PlacementTest from "./pages/PlacementTest";
import StudentAssignments from "./pages/StudentAssignments";
import StudentHomework from "./pages/StudentHomework";
import StudentView from "./pages/StudentView";
import TeacherStudentDashboard from "./pages/TeacherStudentDashboard";
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
      <Route path="/student-view/:sessionId" element={<StudentView />} />
      {/* Web-only routes — redirect to home in Telegram */}
      <Route path="/admin" element={isTelegram ? <Navigate to="/" replace /> : <Admin />} />
      <Route path="/method" element={isTelegram ? <Navigate to="/" replace /> : <Method />} />
      <Route path="/privacy" element={isTelegram ? <Navigate to="/" replace /> : <Privacy />} />
      <Route path="/terms" element={isTelegram ? <Navigate to="/" replace /> : <Terms />} />
      <Route path="/qr" element={isTelegram ? <Navigate to="/" replace /> : <QR />} />
      <Route path="/uk" element={isTelegram ? <Navigate to="/" replace /> : <LandingUk />} />
      {/* Authenticated routes with responsive layout */}
      <Route element={<AppLayout />}>
        {/* PUBLIC — guests + everyone */}
        <Route path="/" element={<Index />} />
        <Route path="/dictionary" element={<Dictionary />} />
        <Route path="/word-lookup" element={<WordLookup />} />
        <Route path="/games" element={<Games />} />

        {/* AUTH — registered free users */}
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/stats" element={<RequireAuth><Statistics /></RequireAuth>} />
        <Route path="/shop" element={<RequireAuth><Shop /></RequireAuth>} />
        <Route path="/challenges" element={<RequireAuth><Challenges /></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
        <Route path="/assignments" element={<RequireAuth><StudentAssignments /></RequireAuth>} />
        <Route path="/course/:id" element={<RequireAuth><Course /></RequireAuth>} />

        {/* PREMIUM — paid plans */}
        <Route path="/assistant" element={<RequirePremium><Assistant /></RequirePremium>} />
        <Route path="/tutoring" element={<RequirePremium><Tutoring /></RequirePremium>} />
        <Route path="/tutoring/student/:studentId" element={<RequirePremium><TeacherStudentDashboard /></RequirePremium>} />
        <Route path="/tutoring/lesson/:id" element={<RequirePremium><TutoringLesson /></RequirePremium>} />
        <Route path="/tutoring/placement/:id" element={<RequirePremium><PlacementTest /></RequirePremium>} />
        <Route path="/tutoring/homework/:id" element={<RequirePremium><StudentHomework /></RequirePremium>} />
        <Route path="/academy" element={<RequirePremium><Academy /></RequirePremium>} />
        <Route path="/academy/:courseId" element={<RequirePremium><AcademyCourse /></RequirePremium>} />
        <Route path="/academy/:courseId/learn" element={<RequirePremium><AcademyLearn /></RequirePremium>} />
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
            <CookieBanner />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      </ListeningAudioProvider>
      </LofiProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
