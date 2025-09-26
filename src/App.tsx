import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AuthInit from "@/lib/AuthInit";
import { Suspense, lazy } from "react";
import { Toaster } from "sonner";
import Loading from "./components/utils/Loading";
import RequireAdmin from "@/components/admin/RequireAdmin";
import SOSButton from "@/components/utils/SOSButton";

// Route-based code splitting (lazy loading)
const Home = lazy(() => import("./Pages/Home/Home"));
const Report = lazy(() => import("./Pages/Report/Report"));
const AdminLogin = lazy(() => import("./Pages/Auth/AdminLogin/Login"));
const AdminLogout = lazy(() => import("./Pages/Auth/AdminLogin/AdminLogout"));
const Dashboard = lazy(() => import("./Pages/AdminDashboard/Dashboard"));
const Resources = lazy(() => import("./Pages/Resources/Resources"));
const Stories = lazy(() => import("./Pages/Stories/Stories"));
const Support = lazy(() => import("./Pages/Support/Support"));
const AdminManagement = lazy(() => import("./Pages/AdminDashboard/AdminManagement"));
const ResourcesManagement = lazy(() => import("./Pages/AdminDashboard/ResourcesManagement"));
const Analytics = lazy(() => import("./Pages/AdminDashboard/Analytics"));
const CommunityManagement = lazy(() => import("./Pages/AdminDashboard/CommunityManagement"));
const ReportManagement = lazy(() => import("./Pages/AdminDashboard/ReportManagement"));
const SupportServiceApprovals = lazy(() => import("./Pages/AdminDashboard/SupportServiceApprovals"));
const SystemSettings = lazy(() => import("./Pages/AdminDashboard/SystemSettings"));
const ForgotPassword = lazy(() => import("./Pages/Auth/CommunityLogin/ForgotPassword"));
const ResetPassword = lazy(() => import("./Pages/Auth/CommunityLogin/ResetPassword"));
const Login = lazy(() => import("./Pages/Auth/CommunityLogin/Login"));
const SignUp = lazy(() => import("./Pages/Auth/CommunityLogin/SignUp"));
const SupportServiceApplication = lazy(() => import("./Pages/SupportServiceApplication/SupportServiceApplication"));
const Story = lazy(() => import("./Pages/Stories/[Stories]/Story"));
const CommunityLogout = lazy(() => import("./Pages/Auth/CommunityLogin/CommunityLogout"));
const Profile = lazy(() => import("./Pages/Users/Profile/Profile"));
const PasswordSettings = lazy(() => import("./Pages/Users/Settings/PasswordSettings"));
const Settings = lazy(() => import("./Pages/Users/Settings/Settings"));
const Saved = lazy(() => import("./Pages/Users/Saved/Saved"));
const MyStories = lazy(() => import("./Pages/Users/Stories/MyStories"));
const SubmitStory = lazy(() => import("./Pages/Users/Stories/SubmitStory"));
const EditStory = lazy(() => import("./Pages/Users/Stories/EditStory"));
const About = lazy(() => import("./Pages/About/About"));
const Unauthorized = lazy(() => import("./Pages/Unauthorized"));

function App() {
  const location = useLocation();
  const path = location.pathname || "";
  const hideSos = path.startsWith("/admin") || path === "/auth/login";
  return (
    <>
      <Toaster richColors position="top-center" closeButton={true} />
      {/* Let routed pages control their own layout; avoid centering the entire app */}
      <div className="min-h-screen">
        <AuthInit />
        <Suspense
          fallback={
            <div className="flex w-full min-h-screen items-center justify-center p-6">
              <Loading />
            </div>
          }
        >
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<Report />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/about" element={<About />} />
        <Route path="/stories" element={<Stories />} />
        <Route path="/support/apply" element={<SupportServiceApplication />} />
        {/* Use id to match stories table primary key */}
        <Route path="/stories/:id" element={<Story />} />
        <Route path="/support" element={<Support />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/reset-password/:token" element={<ResetPassword />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/logout" element={<CommunityLogout />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/account/profile" element={<Profile />} />
        <Route path="/account/settings" element={<Settings />} />
        <Route path="/account/password-settings" element={<PasswordSettings />} />
        <Route path="/account/my-stories" element={<MyStories />} />
        <Route path="/account/my-stories/new" element={<SubmitStory />} />
        <Route path="/account/my-stories/:id/edit" element={<EditStory />} />
        <Route path="/account/saved" element={<Saved />} />

        {/* Admin Login Route */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/logout" element={<AdminLogout />} />

        {/* Admin Dashboard Routes */}
        <Route
          path="/admin-dashboard/*"
          element={
            <RequireAdmin>
              <Routes>
                <Route path="" element={<Navigate to="dashboard" />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="reports" element={<ReportManagement />} />
                <Route path="community" element={<CommunityManagement />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="resources" element={<ResourcesManagement />} />
                <Route path="settings" element={<SystemSettings />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="support-service-approvals" element={<SupportServiceApprovals />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </RequireAdmin>
          }
        />
      </Routes>
        </Suspense >
    {!hideSos && <SOSButton />}
    </div>
    </>
  );
}

export default App;
