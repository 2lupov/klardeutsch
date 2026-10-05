import StudentPresentationTask from "@/pages/StudentPresentationTask";
import RuStudentTranslator from "@/components/RuStudentTranslator";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { TargetLanguageProvider } from "@/contexts/TargetLanguageContext";
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
import RequireTeacher from "@/components/guards/RequireTeacher";
import TeachLayout from "./pages/teach/TeachLayout";
import TeachDashboard from "./pages/teach/TeachDashboard";
import TeachPlaceholder from "./pages/teach/TeachPlaceholder";
import TeachLibrary from "./pages/teach/TeachLibrary";
import TeachLessons from "./pages/teach/TeachLessons";
import TeachLessonBuilder from "./pages/teach/TeachLessonBuilder";
import TeachGroups from "./pages/teach/TeachGroups";
import TeachSchedule from "./pages/teach/TeachSchedule";
import TeachStudents from "./pages/teach/TeachStudents";
import TeachAttendance from "./pages/teach/TeachAttendance";
import TeachFinance from "./pages/teach/TeachFinance";
import Index from "./pages/Index";
import Dutch from "./pages/Dutch";
import CourseA2 from "./pages/CourseA2";
import DeutschraumApp from "./features/deutschraum/DeutschraumApp";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import OAuthConsent from "./pages/OAuthConsent";
import AdminV2 from "./pages/admin-v2/AdminV2";
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
import PassportPage from "./features/academy-engine/PassportPage";
import CoursePlayer from "./features/academy-engine/CoursePlayer";
import Onboarding from "./pages/Onboarding";
import Review from "./pages/Review";
import Certificate from "./pages/Certificate";
import Chat from "./pages/Chat";
import WordLookup from "./pages/WordLookup";
import Assistant from "./pages/Assistant";
import Tutoring from "./pages/Tutoring";
import TutoringLesson from "./pages/TutoringLesson";
import PlacementTest from "./pages/PlacementTest";
import StudentHomework from "./pages/StudentHomework";
import StudentTask from "./pages/StudentTask";
import StudentBookHomework from "./pages/StudentBookHomework";
import StudentBlocksTask from "./pages/StudentBlocksTask";
import StudentMiniCourse from "./pages/StudentMiniCourse";

import StudentView from "./pages/StudentView";
import LiveClass from "./pages/LiveClass";
import StudentDictionary from "./pages/StudentDictionary";
import TeacherStudentDashboard from "./pages/TeacherStudentDashboard";
import NotFound from "./pages/NotFound";
import PaymentResult from "./pages/PaymentResult";
import Trial from "./pages/Trial";
import HomeGate from "@/components/klar/HomeGate";
import KlarPrivacy from "./pages/KlarPrivacy";
import InteractivePage from "./pages/InteractivePage";


const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isTelegram } = usePlatform();

  return (
    <Routes>
      <Route path="/" element={<HomeGate />} />
      <Route path="/klar-privacy" element={<KlarPrivacy />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/review" element={<Review />} />
      <Route path="/certificate/:code" element={<Certificate />} />
      <Route path="/payment-result" element={<PaymentResult />} />
      <Route path="/trial" element={<Trial />} />

      <Route path="/student-view/:sessionId" element={<StudentView />} />
      <Route path="/live/:id" element={<LiveClass />} />
      {/* Standalone student task pages — no app shell, no student redirects */}
      <Route path="/task/:id" element={<RequireAuth><StudentTask /></RequireAuth>} />
      <Route path="/presentation-task/:id" element={<RequireAuth><StudentPresentationTask /></RequireAuth>} />
      <Route path="/blocks-task/:id" element={<RequireAuth><StudentBlocksTask /></RequireAuth>} />
      <Route path="/book-task/:id" element={<RequireAuth><StudentBookHomework /></RequireAuth>} />
      <Route path="/minicourse/:id" element={<RequireAuth><StudentMiniCourse /></RequireAuth>} />
      {/* Web-only routes — redirect to home in Telegram */}
      <Route path="/admin" element={isTelegram ? <Navigate to="/" replace /> : <AdminV2 />} />
      <Route path="/dutch" element={<RequireAuth><Dutch /></RequireAuth>} />
      <Route path="/method" element={isTelegram ? <Navigate to="/" replace /> : <Method />} />
      {/* Teacher workspace (school staff only) */}
      <Route path="/teach" element={isTelegram ? <Navigate to="/" replace /> : <RequireTeacher><TeachLayout /></RequireTeacher>}>
        <Route index element={<TeachDashboard />} />
        <Route path="schedule" element={<TeachSchedule />} />
        <Route path="library" element={<TeachLibrary />} />
        <Route path="lessons" element={<TeachLessons />} />
        <Route path="lesson/:id/build" element={<TeachLessonBuilder />} />
        <Route path="class" element={<TeachPlaceholder title="Live-клас" description="Запустіть Presenter Mode з будь-якого уроку в розділі «Уроки»." />} />
        <Route path="groups" element={<TeachGroups />} />
        <Route path="students" element={<TeachStudents />} />
        <Route path="attendance" element={<TeachAttendance />} />
        <Route path="finance" element={<TeachFinance />} />
        <Route path="homework" element={<TeachPlaceholder title="Домашні завдання" description="Призначення на групу, автоперевірка, feedback. Розширення tutoring_homework." />} />
      </Route>
      <Route path="/privacy" element={isTelegram ? <Navigate to="/" replace /> : <Privacy />} />
      <Route path="/terms" element={isTelegram ? <Navigate to="/" replace /> : <Terms />} />
      <Route path="/qr" element={isTelegram ? <Navigate to="/" replace /> : <QR />} />
      <Route path="/uk" element={isTelegram ? <Navigate to="/" replace /> : <LandingUk />} />
      {/* Authenticated routes with responsive layout */}
      <Route element={<AppLayout />}>
        {/* PUBLIC — guests + everyone */}
        <Route path="/home" element={<Index />} />
        <Route path="/dictionary" element={<Dictionary />} />
        <Route path="/word-lookup" element={<WordLookup />} />
        <Route path="/games" element={<Games />} />

        {/* AUTH — registered free users */}
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/stats" element={<RequireAuth><Statistics /></RequireAuth>} />
        <Route path="/shop" element={<RequireAuth><Shop /></RequireAuth>} />
        <Route path="/challenges" element={<RequireAuth><Challenges /></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
        <Route path="/assignments" element={<Navigate to="/academy" replace />} />
        <Route path="/vocabulary" element={<RequireAuth><StudentDictionary /></RequireAuth>} />

        <Route path="/interactive/:id" element={<RequireAuth><InteractivePage /></RequireAuth>} />
        <Route path="/course/a2" element={<RequireAuth><CourseA2 /></RequireAuth>} />
        <Route path="/a2/*" element={<RequireAuth><DeutschraumApp /></RequireAuth>} />
        <Route path="/course/:id" element={<RequireAuth><Course /></RequireAuth>} />

        {/* PREMIUM — paid plans */}
        <Route path="/assistant" element={<RequirePremium><Assistant /></RequirePremium>} />
        <Route path="/tutoring" element={<RequirePremium><Tutoring /></RequirePremium>} />
        <Route path="/tutoring/student/:studentId" element={<RequirePremium><TeacherStudentDashboard /></RequirePremium>} />
        <Route path="/tutoring/lesson/:id" element={<RequirePremium><TutoringLesson /></RequirePremium>} />
        <Route path="/tutoring/placement/:id" element={<RequirePremium><PlacementTest /></RequirePremium>} />
        <Route path="/tutoring/homework/:id" element={<RequirePremium><StudentHomework /></RequirePremium>} />
        <Route path="/academy" element={<RequireAuth><Academy /></RequireAuth>} />
        <Route path="/academy/passport" element={<RequireAuth><PassportPage /></RequireAuth>} />
        <Route path="/academy/program/:code" element={<RequireAuth><CoursePlayer /></RequireAuth>} />
        <Route path="/academy/:courseId" element={<RequireAuth><AcademyCourse /></RequireAuth>} />
        <Route path="/academy/:courseId/learn" element={<RequireAuth><AcademyLearn /></RequireAuth>} />
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
        <TargetLanguageProvider>
        <TooltipProvider>
          <Toaster />
          <RuStudentTranslator />
          <Sonner />
          <OfflineBanner />
          <BrowserRouter>
            <AppRoutes />
            <ListeningFloatingPlayer />
            <ReportErrorButton />
            <CookieBanner />
          </BrowserRouter>
        </TooltipProvider>
        </TargetLanguageProvider>
      </AuthProvider>
      </ListeningAudioProvider>
      </LofiProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
