import { Routes, Route } from "react-router-dom";
import Home from "./Pages/Home/Home";
import Report from "./Pages/Report/Report";
import Login from "./Pages/Auth/Login";
import Dashboard from "./Pages/AdminDashboard/Dashboard";
import Resources from "./Pages/Resources/Resources";
import Stories from "./Pages/Stories/Stories";
import Support from "./Pages/Support/Support";
import AdminManagement from "./Pages/AdminDashboard/AdminManagement";
import { Settings } from "lucide-react";
import ResourcesManagement from "./Pages/AdminDashboard/ResourcesManagement";
import IncidentMap from "./Pages/AdminDashboard/IncidentMap";
import Analytics from "./Pages/AdminDashboard/Analytics";
import CommunityManagement from "./Pages/AdminDashboard/CommunityManagement";
import ReportManagement from "./Pages/AdminDashboard/ReportManagement";
import SupportServiceApprovals from "./Pages/AdminDashboard/SupportServiceApprovals";
import SystemSettings from "./Pages/AdminDashboard/SystemSettings";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/report" element={<Report/>} />
      <Route path="/resources" element={<Resources/>} />
      <Route path="/stories" element={<Stories/>} />
      <Route path="/stories/:storyId" element={<Stories/>} />
      <Route path="/support" element={<Support/>} />
      <Route path="/login" element={<Login/>} />
      <Route path="/admin-dashboard" element={<Dashboard />} />
      <Route path="/admin-dashboard/reports" element={<ReportManagement />} />
      <Route path="/admin-dashboard/community" element={<CommunityManagement />} />
      <Route path="/admin-dashboard/analytics" element={<Analytics/>} />
      <Route path="/admin-dashboard/incident-map" element={<IncidentMap />} />
      <Route path="/admin-dashboard/resources" element={<ResourcesManagement />} />
      <Route path="/admin-dashboard/settings" element={<SystemSettings />} />
      <Route path="/admin-dashboard/admins" element={<AdminManagement />} />
      <Route path="/admin-dashboard/support-service-approvals" element={<SupportServiceApprovals />} />

    </Routes>
  );
}

export default App;