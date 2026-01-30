import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Public Pages
import CoursesPage from "./pages/courses/CoursesPage";
import CourseDetailPage from "./pages/courses/CourseDetailPage";
import CourseCheckoutPage from "./pages/courses/CourseCheckoutPage";
import JobsPage from "./pages/jobs/JobsPage";
import InstitutesPage from "./pages/institutes/InstitutesPage";

// Layouts
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";

// Dashboard Pages
import Dashboard from "./pages/dashboard/Dashboard";
import Profile from "./pages/dashboard/Profile";
import Competitions from "./pages/dashboard/Competitions";
import Mentors from "./pages/dashboard/Mentors";
import Learning from "./pages/dashboard/Learning";
import Jobs from "./pages/dashboard/Jobs";
import Badges from "./pages/dashboard/Badges";
import Sessions from "./pages/dashboard/Sessions";
import Settings from "./pages/dashboard/Settings";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCompetitions from "./pages/admin/AdminCompetitions";
import AdminInstitutions from "./pages/admin/AdminInstitutions";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminMentors from "./pages/admin/AdminMentors";
import AdminBadges from "./pages/admin/AdminBadges";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLMS from "./pages/admin/AdminLMS";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminQueries from "./pages/admin/AdminQueries";
import AdminManagement from "./pages/admin/AdminManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Public Landing Pages */}
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailPage />} />
            <Route path="/courses/:id/checkout" element={<CourseCheckoutPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/institutes" element={<InstitutesPage />} />

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
              <Route path="jobs" element={<Jobs />} />
              <Route path="badges" element={<Badges />} />
              <Route path="sessions" element={<Sessions />} />
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
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="queries" element={<AdminQueries />} />
              <Route path="admins" element={<AdminManagement />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
