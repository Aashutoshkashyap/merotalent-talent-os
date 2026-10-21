"use client";
import { lazy, Suspense, useState } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { PrivateQueryCacheBoundary } from "@/components/auth/PrivateQueryCacheBoundary";
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
import LegacyAccountRecovery from "./screens/auth/LegacyAccountRecovery";

// Public Pages
const CoursesPage = lazy(() => import("./screens/courses/CoursesPage"));
const CourseDetailPage = lazy(() => import("./screens/courses/CourseDetailPage"));
const JobsPage = lazy(() => import("./screens/jobs/JobsPage"));
const JobDetailPage = lazy(() => import("./screens/jobs/JobDetailPage"));
const InstitutesPage = lazy(() => import("./screens/institutes/InstitutesPage"));
const InstituteDetailPage = lazy(() => import("./screens/institutes/InstituteDetailPage"));
const InstituteBlogsPage = lazy(() => import("./screens/institutes/InstituteBlogsPage"));
const InstituteBlogDetailPage = lazy(() => import("./screens/institutes/InstituteBlogDetailPage"));
const CompetitionsPage = lazy(() => import("./screens/competitions/CompetitionsPage"));
const MentorshipPage = lazy(() => import("./screens/mentorship/MentorshipPage"));
const MentorDetailPage = lazy(() => import("./screens/mentorship/MentorDetailPage"));
const EventsPage = lazy(() => import("./screens/events/EventsPage"));
const EventDetailPage = lazy(() => import("./screens/events/EventDetailPage"));

// Layouts
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));

// Dashboard Pages
const Dashboard = lazy(() => import("./screens/dashboard/Dashboard"));
const Profile = lazy(() => import("./screens/dashboard/Profile"));
const Competitions = lazy(() => import("./screens/dashboard/Competitions"));
const Mentors = lazy(() => import("./screens/dashboard/Mentors"));
const Jobs = lazy(() => import("./screens/dashboard/Jobs"));
const Sessions = lazy(() => import("./screens/dashboard/Sessions"));
const Settings = lazy(() => import("./screens/dashboard/Settings"));

const Colleges = lazy(() => import("./screens/dashboard/Colleges"));
const ActivityTracker = lazy(() => import("./screens/dashboard/ActivityTracker"));
const Payments = lazy(() => import("./screens/dashboard/Payments"));
const MyTickets = lazy(() => import("./screens/dashboard/MyTickets"));

// Admin Pages
const AdminDashboard = lazy(() => import("./screens/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./screens/admin/AdminUsers"));
const AdminCompetitions = lazy(() => import("./screens/admin/AdminCompetitions"));
const AdminInstitutions = lazy(() => import("./screens/admin/AdminInstitutions"));
const AdminCompanies = lazy(() => import("./screens/admin/AdminCompanies"));
const AdminMentors = lazy(() => import("./screens/admin/AdminMentors"));
const AdminSettings = lazy(() => import("./screens/admin/AdminSettings"));
const AdminLMS = lazy(() => import("./screens/admin/AdminLMS"));
const AdminJobs = lazy(() => import("./screens/admin/AdminJobs"));
const AdminNotifications = lazy(() => import("./screens/admin/AdminNotifications"));
const AdminQueries = lazy(() => import("./screens/admin/AdminQueries"));
const AdminManagement = lazy(() => import("./screens/admin/AdminManagement"));
const AdminEvents = lazy(() => import("./screens/admin/AdminEvents"));
const AdminPackages = lazy(() => import("./screens/admin/AdminPackages"));
const AdminSubscriptions = lazy(() => import("./screens/admin/AdminSubscriptions"));
const AdminPayments = lazy(() => import("./screens/admin/AdminPayments"));
const AdminAdvertisements = lazy(() => import("./screens/admin/AdminAdvertisements"));
const AdminFeaturedItems = lazy(() => import("./screens/admin/AdminFeaturedItems"));
const AdminLeads = lazy(() => import("./screens/admin/AdminLeads"));
const AdminReports = lazy(() => import("./screens/admin/AdminReports"));
const AdminApplications = lazy(() => import("./screens/admin/AdminApplications"));
const AdminBookings = lazy(() => import("./screens/admin/AdminBookings"));
const AdminPageEditor = lazy(() => import("./screens/admin/AdminPageEditor"));
const AdminAccessRequests = lazy(() => import("./screens/admin/AdminAccessRequests"));
const RequestSubAdminAccess = lazy(() => import("./screens/RequestSubAdminAccess"));

// Institute Pages
const InstituteDashboard = lazy(() => import("./screens/institute/InstituteDashboard"));
const InstituteNotices = lazy(() => import("./screens/institute/InstituteNotices"));
const InstituteBlogs = lazy(() => import("./screens/institute/InstituteBlogs"));
const RoleWorkspace = lazy(() => import("./screens/role/RoleWorkspace"));
const EventsWorkspace = lazy(() => import("./screens/role/EventsWorkspace"));
const ModuleAIWorkspace = lazy(() => import("./screens/role/ModuleAIWorkspace"));
import LegalPage from "./screens/LegalPage";

import ComingSoonPage from "./screens/ComingSoonPage";

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = ({ initialCmsSnapshot }: { initialCmsSnapshot?: CmsSnapshot | null }) => {
  // Never share a server-rendered user's cache between requests/app instances.
  const [queryClient] = useState(createQueryClient);
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PrivateQueryCacheBoundary />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ContentProtectionProvider enabled={true} showWarnings={true}>
            <Suspense fallback={<div role="status" aria-live="polite" className="grid min-h-48 place-items-center p-6 text-muted-foreground">Loading workspace…</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index initialCmsSnapshot={initialCmsSnapshot} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/account-recovery" element={<LegacyAccountRecovery />} />
              <Route path="/account-recovery/source" element={<LegacyAccountRecovery sourceCallback />} />
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
                  <Route path="tickets" element={<MyTickets />} />
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
              <Route path="/event-admin" element={<ProtectedRoute requiredModule="events"><EventsWorkspace /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </ContentProtectionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);
};

export default App;
