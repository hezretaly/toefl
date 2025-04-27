
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Main Pages
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Section Selection Pages
import ReadingSectionsPage from "./pages/sections/ReadingSectionsPage";
import ListeningSectionsPage from "./pages/sections/ListeningSectionsPage";
import SpeakingSectionsPage from "./pages/sections/SpeakingSectionsPage";
import WritingSectionsPage from "./pages/sections/WritingSectionsPage";

// Section Intro Pages
import ReadingSectionIntroPage from "./pages/intro/ReadingSectionIntroPage";
import ListeningSectionIntroPage from "./pages/intro/ListeningSectionIntroPage";
import SpeakingSectionIntroPage from "./pages/intro/SpeakingSectionIntroPage";
import WritingSectionIntroPage from "./pages/intro/WritingSectionIntroPage";

// Test Section Pages
import ReadingSectionPage from "./pages/test/ReadingSectionPage";
import ListeningSectionPage from "./pages/test/ListeningSectionPage";
import SpeakingSectionPage from "./pages/test/SpeakingSectionPage";
import WritingSectionPage from "./pages/test/WritingSectionPage";

// Review Pages
import ReviewPage from "./pages/review/ReviewPage";
import SpeakingSectionReviewPage from "./pages/review/SpeakingSectionReviewPage";
import SpeakingFeedbackPage from "./pages/review/SpeakingFeedbackPage";
import WritingSectionReviewPage from "./pages/review/WritingSectionReviewPage";
import WritingFeedbackPage from "./pages/review/WritingFeedbackPage";

// Admin Pages
import ChooseSectionTypePage from "./pages/admin/ChooseSectionTypePage";
import AddReadingSectionPage from "./pages/admin/AddReadingSectionPage";
import AddListeningSection from "./pages/admin/AddListeningSection";
import AddSpeakingSection from "./pages/admin/AddSpeakingSection";
import AddWritingSection from "./pages/admin/AddWritingSection";
// Feedback
import AdminFeedbackFormPage from "./pages/admin/AdminFeedbackFormPage";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage";
import ReadingReviewDetailPage from "./pages/review/ReadingReviewDetailPage";
import ListeningReviewDetailPage from "./pages/review/ListeningReviewDetailPage";
import SpeakingReviewDetailPage from "./pages/review/SpeakingReviewDetailPage";
import WritingReviewDetailPage from "./pages/review/WritingReviewDetailPage";
import AdminSpeakingFeedbackPage from './pages/admin/SpeakingFeedbackPage';
import AdminWritingFeedbackPage from './pages/admin/WritingFeedbackPage';
import ReadingListeningFeedbackPage from './pages/admin/ReadingListeningFeedbackPage';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Section Selection Routes */}
            <Route path="/reading" element={<ReadingSectionsPage />} />
            <Route path="/listening" element={<ListeningSectionsPage />} />
            <Route path="/speaking" element={<SpeakingSectionsPage />} />
            <Route path="/writing" element={<WritingSectionsPage />} />
            
            {/* Section Intro Routes */}
            <Route path="/reading-intro/:sectionId" element={<ReadingSectionIntroPage />} />
            <Route path="/listening-intro/:sectionId" element={<ListeningSectionIntroPage />} />
            <Route path="/speaking-intro/:sectionId" element={<SpeakingSectionIntroPage />} />
            <Route path="/writing-intro/:sectionId" element={<WritingSectionIntroPage />} />
            
            {/* Test Section Routes */}
            <Route path="/reading/:sectionId" element={<ReadingSectionPage />} />
            <Route path="/listening/:sectionId" element={<ListeningSectionPage />} />
            <Route path="/speaking/:sectionId" element={<SpeakingSectionPage />} />
            <Route path="/writing/:sectionId" element={<WritingSectionPage />} />
            
            {/* Review Routes */}
            <Route path="/review" element={<ReviewPage />} />
            {/* <Route path="/review/speaking/:secId" element={<SpeakingSectionReviewPage />} />
            <Route path="/review/speaking/:secId/feedback/:studentId" element={<SpeakingFeedbackPage />} />
            <Route path="/review/writing/:secId" element={<WritingSectionReviewPage />} />
            <Route path="/review/writing/:secId/feedback/:studentId" element={<WritingFeedbackPage />} /> */}
            <Route path="/review/speaking/:sectionId" element={<SpeakingReviewDetailPage />} />
            <Route path="/review/writing/:sectionId" element={<WritingReviewDetailPage />} />
            <Route path="/review/reading/:sectionId" element={<ReadingReviewDetailPage />} />
            <Route path="/review/listening/:sectionId" element={<ListeningReviewDetailPage />} />
            
            {/* Admin Routes */}
            <Route path="/create-section" element={<ChooseSectionTypePage /> } />
            <Route path="/add-reading-section" element={<AddReadingSectionPage />} />
            <Route path="/add-listening-section" element={<AddListeningSection />} />
            <Route path="/add-speaking-section" element={<AddSpeakingSection />} />
            <Route path="/add-writing-section" element={<AddWritingSection />} />

            <Route path="/admin/review" element={<AdminFeedbackPage />} />
            <Route path="/admin/feedback/response/:responseId" element={<AdminFeedbackFormPage />} />
            <Route path="/admin/feedback/response/speaking/:responseId" element={<AdminSpeakingFeedbackPage />} />
            <Route path="/admin/feedback/response/writing/:responseId" element={<AdminWritingFeedbackPage />} />
            {/* Route for both Reading and Listening feedback */}
            <Route path="/admin/feedback/response/:responseType(reading|listening)/:responseId" element={<ReadingListeningFeedbackPage />} />

            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
