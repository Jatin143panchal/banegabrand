import {
  Users,
  UserPlus,
  Handshake,
  Settings,
  Building2,
  Shield,
  ClipboardList,
  Megaphone,
  UserCog,
  Users2,
  UserCircle,
  Tent,
  GraduationCap,
  Briefcase,
  ListTodo,
  BarChart2,
  Megaphone as MegaphoneIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useIsOwnerOrAdmin, useIsManager, useHasRole } from "@/hooks/useAdmin";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Leads", url: "/leads", icon: UserPlus },
  { title: "Expo Leads", url: "/expo-leads", icon: Tent },
  { title: "Workshop Leads", url: "/workshop-leads", icon: GraduationCap },
  { title: "Deals", url: "/deals", icon: Handshake },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "My Tasks", url: "/my-tasks", icon: ListTodo },
  { title: "Projects", url: "/projects", icon: Briefcase },
];

const fullAdminItems = [
  { title: "Admin Dashboard", url: "/admin", icon: Shield },
  { title: "All Users", url: "/admin/users", icon: Users },
  { title: "Task Assignment", url: "/admin/tasks", icon: ClipboardList },
  { title: "Team Roles", url: "/admin/roles", icon: UserCog },
  { title: "Team Attendance", url: "/admin/attendance", icon: Users2 },
  { title: "Team Task Report", url: "/team-tasks", icon: BarChart2 },
  { title: "Send Notifications", url: "/admin/notifications", icon: MegaphoneIcon },
  { title: "Employee Directory", url: "/admin/employees", icon: Users },
];

const managerItems = [
  { title: "Task Assignment", url: "/admin/tasks", icon: ClipboardList },
  { title: "Team Task Report", url: "/team-tasks", icon: BarChart2 },
];

const hrItems = [
  { title: "Team Attendance", url: "/admin/attendance", icon: Users2 },
  { title: "Send Notifications", url: "/admin/notifications", icon: MegaphoneIcon },
  { title: "Employee Directory", url: "/admin/employees", icon: Users },
];

const settingsItems = [
  { title: "My Profile", url: "/profile", icon: UserCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

function SidebarNavGroup({
  label,
  items,
  collapsed,
  isActive,
}: {
  label: string;
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[];
  collapsed: boolean;
  isActive: (path: string) => boolean;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink
                  to={item.url}
                  end
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function CrmSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + "/");
  const isOwnerOrAdmin = useIsOwnerOrAdmin();
  const isManager = useIsManager();
  const isHR = useHasRole("hr_manager");

  return
