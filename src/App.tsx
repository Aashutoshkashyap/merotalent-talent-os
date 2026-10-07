"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ContentProtectionProvider from "@/providers/ContentProtectionProvider";
import type { CmsSnapshot } from "@/hooks/useSiteCMS";

// Pages
import Index from "./screens/Index";
import NotFound from "./screens/NotFound";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import Onboarding from "./screens/Onboarding";
import ResetPassword from "./screens/ResetPassword";
import PendingApproval from "./screens/auth/PendingApproval";
import OAuthCallback from "./screens/auth/OAuthCallback";

// Public Pages
import CoursesPage from "./screens/courses/CoursesPage";
import CourseDetailPage from "./screens/courses/CourseDetailPage";
import JobsPage from "./screens/jobs/JobsPage";
import JobDetailPage from "./screens/jobs/JobDetailPage";
import InstitutesPage from "./screens/institutes/InstitutesPage";
import InstituteDetailPage from "./screens/institutes/InstituteDetailPage";
import InstituteBlogsPage from "./screens/institutes/InstituteBlogsPage";
import InstituteBlogDetailPage from "./screens/institutes/InstituteBlogDetailPage";
import CompetitionsPage from "./screens/competitions/CompetitionsPage";
import MentorshipPage from "./screens/mentorship/MentorshipPage";
import MentorDetailPage from "./screens/mentorship/MentorDetailPage";
import EventsPage from "./screens/events/EventsPage";
import EventDetailPage from "./screens/events/EventDetailPage";

// Layouts
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";

// Dashboard Pages
import Dashboard from "./screens/dashboard/Dashboard";
import Profile from "./screens/dashboard/Profile";
import Competitions from "./screens/dashboard/Competitions";
import Mentors from "./screens/dashboard/Mentors";
import Jobs from "./screens/dashboard/Jobs";
import Sessions from "./screens/dashboard/Sessions";
import Settings from "./screens/dashboard/Settings";

import Colleges from "./screens/dashboard/Colleges";
import ActivityTracker from "./screens/dashboard/ActivityTracker";
import Payments from "./screens/dashboard/Payments";

// Admin Pages
import AdminDashboard from "./screens/admin/AdminDashboard";
import AdminUsers from "./screens/admin/AdminUsers";
import AdminCompetitions from "./screens/admin/AdminCompetitions";
import AdminInstitutions from "./screens/admin/AdminInstitutions";
import AdminCompanies from "./screens/admin/AdminCompanies";
import AdminMentors from "./screens/admin/AdminMentors";
import AdminSettings from "./screens/admin/AdminSettings";
import AdminLMS from "./screens/admin/AdminLMS";
import AdminJobs from "./screens/admin/AdminJobs";
import AdminNotifications from "./screens/admin/AdminNotifications";
import AdminQueries from "./screens/admin/AdminQueries";
import AdminManagement from "./screens/admin/AdminManagement";
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
import AdminPageEditor from "./screens/admin/AdminPageEditor";
import AdminAccessRequests from "./screens/admin/AdminAccessRequests";
import RequestSubAdminAccess from "./screens/RequestSubAdminAccess";

// Institute Pages
import InstituteDashboard from "./screens/institute/InstituteDashboard";
import InstituteNotices from "./screens/institute/InstituteNotices";
import InstituteBlogs from "./screens/institute/InstituteBlogs";
import RoleWorkspace from "./screens/role/RoleWorkspace";
import ModuleAIWorkspace from "./screens/role/ModuleAIWorkspace";
import LegalPage from "./screens/LegalPage";

import ComingSoonPage from "./screens/ComingSoonPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = ({ initialCmsSnapshot }: { initialCmsSnapshot?: CmsSnapshot | null }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ContentProtectionProvider enabled={true} showWarnings={true}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index initialCmsSnapshot={initialCmsSnapshot} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Public Landing Pages */}
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetailPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/institutes" element={<InstitutesPage />} />
              <Route path="/institutes/:slug" element={<InstituteDetailPage />} />
              <Route path="/institutes/:slug/blogs" element={<InstituteBlogsPage />} />
              <Route path="/institutes/:slug/blogs/:blogSlug" element={<InstituteBlogDetailPage />} />
              <Route path="/competitions" element={<ComingSoonPage moduleKey="competitions" />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/mentorship" element={<MentorshipPage />} />
              <Route path="/mentorship/:id" element={<MentorDetailPage />} />
              <Route path="/request-access" element={<RequestSubAdminAccess />} />
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
                <Route path="colleges" element={<Colleges />} />
                <Route path="profile" element={<Profile />} />
                <Route path="competitions" element={<Competitions />} />
                <Route path="mentors" element={<Mentors />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="activity" element={<ActivityTracker />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="ai-workspace" element={<ModuleAIWorkspace />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="messages" element={<Navigate to="/dashboard" replace />} />
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
                <Route path="roles" element={<Navigate to="/admin/users" replace />} />
                <Route path="access-requests" element={<AdminAccessRequests />} />
                <Route path="access-matrix" element={<Navigate to="/admin/users" replace />} />
                <Route path="pages" element={<AdminPageEditor />} />
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
                path="/institute/blogs"
                element={<ProtectedRoute requiredRole="institution"><InstituteBlogs /></ProtectedRoute>}
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
