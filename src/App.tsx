import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CrmLayout } from "@/components/CrmLayout";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Holidays from "./pages/Holidays";
import AdminDashboard from "./pages/AdminDashboard";
import TaskAssignment from "./pages/TaskAssignment";
import TeamRoles from "./pages/TeamRoles";
import Helpdesk from "./pages/Helpdesk";
import Quotations from "./pages/Quotations";
import Profile from "./pages/Profile";
import MyTasks from "./pages/MyTasks";
import TeamTaskReport from "./pages/TeamTaskReport";
import DigiLocker from "./pages/DigiLocker";
import BroadcastNotifications from "./pages/BroadcastNotifications";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import AllUsers from "./pages/AllUsers";
import { RoleGuard } from "@/components/RoleGuard";
import Projects from "./pages/Projects";
import CrmMessenger from "@/components/CrmMessenger";

const queryClient = new QueryClient();

const adminRoles = ["admin"] as const;

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  // ⚡ TURANT LOAD: Background prefetch projects as soon as CRM loads
  useEffect(() => {
    if (!user) return;
    queryClient.prefetchQuery({
      queryKey: ["projects"],
      staleTime: 10 * 60 * 1000,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("id, project_id, lead_id, name, brand_name, project_type, project_value, start_date, expected_launch_date, project_manager, current_stage, completion_percentage, status, priority, client_address, client_phone, client_email, image_url, product_category, products_to_launch, product_category_note, created_at, updated_at")
          .order("created_at", { ascending: false });
        if (!error && data) {
          try {
            localStorage.setItem("banega_projects_cache", JSON.stringify(data));
          } catch (e) {}
        }
        return data || [];
      },
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Landing />;

  return (
    <CrmLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/leads" replace />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/holidays" element={<Holidays />} />
        <Route path="/helpdesk" element={<Helpdesk />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<Projects />} />
        <Route path="/projects/:projectId/:tabName" element={<Projects />} />
        <Route path="/messenger" element={<CrmMessenger />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/team-tasks" element={<RoleGuard allowed={[...adminRoles]}><TeamTaskReport /></RoleGuard>} />
        <Route path="/digilocker" element={<DigiLocker />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<RoleGuard allowed={[...adminRoles]}><AdminDashboard /></RoleGuard>} />
        <Route path="/admin/tasks" element={<RoleGuard allowed={[...adminRoles]}><TaskAssignment /></RoleGuard>} />
        <Route path="/admin/users" element={<RoleGuard allowed={[...adminRoles]}><AllUsers /></RoleGuard>} />
        <Route path="/admin/roles" element={<RoleGuard allowed={[...adminRoles]}><TeamRoles /></RoleGuard>} />
        <Route path="/admin/notifications" element={<RoleGuard allowed={[...adminRoles]}><BroadcastNotifications /></RoleGuard>} />
        <Route path="/admin/employees" element={<RoleGuard allowed={[...adminRoles]}><EmployeeDirectory /></RoleGuard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </CrmLayout>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
