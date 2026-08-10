"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ContentProtectionProvider from "@/providers/ContentProtectionProvider";

// Pages
import Index from "./screens/Index";
import NotFound from "./screens/NotFound";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import Onboarding from "./screens/Onboarding";
import ResetPassword from "./screens/ResetPassword";

// Public Pages
import CoursesPage from "./screens/courses/CoursesPage";
import CourseDetailPage from "./screens/courses/CourseDetailPage";
import CourseCheckoutPage from "./screens/courses/CourseCheckoutPage";
import JobsPage from "./screens/jobs/JobsPage";
import InstitutesPage from "./screens/institutes/InstitutesPage";
import InstituteDetailPage from "./screens/institutes/InstituteDetailPage";
import CompetitionsPage from "./screens/competitions/CompetitionsPage";
import MentorshipPage from "./screens/mentorship/MentorshipPage";
import EventsPage from "./screens/events/EventsPage";

// Layouts
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";

// Dashboard Pages
import Dashboard from "./screens/dashboard/Dashboard";
import Profile from "./screens/dashboard/Profile";
import Competitions from "./screens/dashboard/Competitions";
import Mentors from "./screens/dashboard/Mentors";
import Learning from "./screens/dashboard/Learning";
import LessonPlayer from "./screens/dashboard/LessonPlayer";
import QuizPage from "./screens/dashboard/QuizPage";
import Jobs from "./screens/dashboard/Jobs";
import Badges from "./screens/dashboard/Badges";
import Sessions from "./screens/dashboard/Sessions";
import Messages from "./screens/dashboard/Messages";
import Settings from "./screens/dashboard/Settings";

// Admin Pages
import AdminDashboard from "./screens/admin/AdminDashboard";
import AdminUsers from "./screens/admin/AdminUsers";
import AdminCompetitions from "./screens/admin/AdminCompetitions";
import AdminInstitutions from "./screens/admin/AdminInstitutions";
import AdminCompanies from "./screens/admin/AdminCompanies";
import AdminMentors from "./screens/admin/AdminMentors";
import AdminBadges from "./screens/admin/AdminBadges";
import AdminSettings from "./screens/admin/AdminSettings";
import AdminLMS from "./screens/admin/AdminLMS";
import AdminJobs from "./screens/admin/AdminJobs";
import AdminNotifications from "./screens/admin/AdminNotifications";
import AdminQueries from "./screens/admin/AdminQueries";
import AdminManagement from "./screens/admin/AdminManagement";
import AdminRoleManagement from "./screens/admin/AdminRoleManagement";
import AdminEvents from "./screens/admin/AdminEvents";
import AdminPackages from "./screens/admin/AdminPackages";
import AdminSubscriptions from "./screens/admin/AdminSubscriptions";
import AdminPayments from "./screens/admin/AdminPayments";
import AdminAdvertisements from "./screens/admin/AdminAdvertisements";
import AdminFeaturedItems from "./screens/admin/AdminFeaturedItems";
import AdminLeads from "./screens/admin/AdminLeads";
import AdminReports from "./screens/admin/AdminReports";
import AdminApplications from "./screens/admin/AdminApplications";
import AdminBookings from "./screens/admin/AdminBookings";

// Institute Pages
import InstituteDashboard from "./screens/institute/InstituteDashboard";
import InstituteNotices from "./screens/institute/InstituteNotices";
import RoleWorkspace from "./screens/role/RoleWorkspace";
import LegalPage from "./screens/LegalPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ContentProtectionProvider enabled={true} showWarnings={true}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Public Landing Pages */}
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetailPage />} />
              <Route path="/courses/:id/checkout" element={<CourseCheckoutPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/institutes" element={<InstitutesPage />} />
              <Route path="/institutes/:slug" element={<InstituteDetailPage />} />
              <Route path="/competitions" element={<CompetitionsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/mentorship" element={<MentorshipPage />} />
              <Route path="/privacy" element={<LegalPage type="privacy" />} />
              <Route path="/terms" element={<LegalPage type="terms" />} />

              {/* Protected Dashboard Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
              <Route index element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="competitions" element={<Competitions />} />
                <Route path="mentors" element={<Mentors />} />
                <Route path="learning" element={<Learning />} />
                <Route path="learn/:courseId" element={<LessonPlayer />} />
                <Route path="learn/:courseId/:lessonId" element={<LessonPlayer />} />
                <Route path="quiz/:quizId" element={<QuizPage />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="badges" element={<Badges />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="messages" element={<Messages />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="competitions" element={<AdminCompetitions />} />
                <Route path="institutions" element={<AdminInstitutions />} />
                <Route path="companies" element={<AdminCompanies />} />
                <Route path="mentors" element={<AdminMentors />} />
                <Route path="badges" element={<AdminBadges />} />
                <Route path="lms" element={<AdminLMS />} />
                <Route path="jobs" element={<AdminJobs />} />
                <Route path="events" element={<AdminEvents />} />
                <Route path="packages" element={<AdminPackages />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="advertisements" element={<AdminAdvertisements />} />
                <Route path="featured" element={<AdminFeaturedItems />} />
                <Route path="leads" element={<AdminLeads />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="applications" element={<AdminApplications />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="queries" element={<AdminQueries />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="roles" element={<AdminRoleManagement />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Protected Institute Routes */}
              <Route
                path="/institute"
                element={
                  <ProtectedRoute requiredRole="institution">
                    <InstituteDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/institute/notices"
                element={
                  <ProtectedRoute requiredRole="institution">
                    <InstituteNotices />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/company"
                element={
                  <ProtectedRoute requiredRole="company">
                    <RoleWorkspace role="company" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mentor"
                element={
                  <ProtectedRoute requiredRole="mentor">
                    <RoleWorkspace role="mentor" />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ContentProtectionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
