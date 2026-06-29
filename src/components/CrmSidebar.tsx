import {
  LayoutDashboard,
  Users,
  UserPlus,
  Handshake,
  CalendarCheck,
  BarChart3,
  Settings,
  Building2,
  Shield,
  CalendarDays,
  ClipboardList,
  TicketCheck,
  Clock,
  Megaphone,
  FileText,
  UserCog,
  Users2,
  ClipboardCheck,
  CalendarRange,
  Phone,
  UserCircle,
  Tent,
  GraduationCap,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useIsOwnerOrAdmin, useIsManager, useHasRole } from "@/hooks/useAdmin";
import { ShieldCheck, ListTodo, BarChart2, Megaphone as MegaphoneIcon } from "lucide-react";
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

// ==================== MAIN MENU ====================
const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Lead Dashboard", url: "/leads/dashboard", icon: Phone },
  { title: "Leads", url: "/leads", icon: UserPlus },
  { title: "Expo Leads", url: "/expo-leads", icon: Tent },
  { title: "Workshop Leads", url: "/workshop-leads", icon: GraduationCap },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Deals", url: "/deals", icon: Handshake },
  { title: "Activities", url: "/activities", icon: CalendarCheck },
  { title: "Helpdesk", url: "/helpdesk", icon: TicketCheck },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Quotations", url: "/quotations", icon: FileText },
  { title: "My Tasks", url: "/my-tasks", icon: ListTodo },
  { title: "Daily Reports", url: "/daily-reports", icon: ClipboardCheck },
  { title: "Weekly Reports", url: "/weekly-reports", icon: CalendarRange },
  { title: "DigiLocker", url: "/digilocker", icon: ShieldCheck },
  { title: "PLOS", url: "/plos", icon: FileText },
  { title: "Projects", url: "/projects", icon: Briefcase },
  { title: "Holidays", url: "/holidays", icon: CalendarDays },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Sales Punch", url: "/sales-punch", icon: DollarSign },
];

// ==================== ADMIN ITEMS ====================
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

// ==================== SIDEBAR NAV GROUP ====================
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

// ==================== MAIN SIDEBAR ====================
export function CrmSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  const isOwnerOrAdmin = useIsOwnerOrAdmin();
  const isManager = useIsManager();
  const isHR = useHasRole("hr_manager");

  return (
    <Sidebar collapsible="icon">
      {/* HEADER */}
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-accent-foreground">BanegaBrand</span>
              <span className="text-xs text-sidebar-foreground/60">Sales CRM</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent>
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
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

        {/* Admin Groups - Only show if user has access */}
        {isOwnerOrAdmin && (
          <SidebarNavGroup
            label="Admin (Full Access)"
            items={fullAdminItems}
            collapsed={collapsed}
            isActive={isActive}
          />
        )}

        {isManager && !isOwnerOrAdmin && (
          <SidebarNavGroup
            label="Manager"
            items={managerItems}
            collapsed={collapsed}
            isActive={isActive}
          />
        )}

        {isHR && !isOwnerOrAdmin && (
          <SidebarNavGroup
            label="HR"
            items={hrItems}
            collapsed={collapsed}
            isActive={isActive}
          />
        )}
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter>
        <SidebarMenu>
          {settingsItems.map((item) => (
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
      </SidebarFooter>
    </Sidebar>
  );
}
