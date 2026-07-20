import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, Users, TrendingUp, AlertCircle, Clock, CheckCircle,
  Calendar, MessageSquare, Settings, LogOut, Menu, X, Plus,
  ChevronRight, Search, Filter, Download, Upload, Eye, Edit,
  Trash2, Archive, Share2, MoreVertical, ExternalLink, Zap,
  Home, FolderOpen, User, Target, Briefcase, Layers, Grid3x3,
  ChevronDown, Bell, HelpCircle, MapPin, Phone, Mail, Globe,
  BarChart, PieChart, LineChart, Activity, Inbox, Badge,
  GitBranch, Gauge, Loader2, ArrowRight, Award, Rocket, Save
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// SUPABASE CONFIG
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'department_manager' | 'team_member' | 'sales' | 'client';
  department_id?: string;
  is_active: boolean;
}

interface Department {
  id: string;
  name: string;
  department_type: string;
  manager_id?: string;
  color_code: string;
  icon: string;
  total_projects?: number;
  active_projects?: number;
  avg_completion?: number;
  overdue_tasks?: number;
  description?: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  website?: string;
  total_departments?: number;
  completed_departments?: number;
  overall_completion?: number;
}

interface DepartmentProject {
  id: string;
  client_id: string;
  department_id: string;
  client_name?: string;
  department_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  status: string;
  completion_percentage: number;
  deadline?: string;
  description?: string;
  budget?: number;
  start_date?: string;
}

interface DepartmentTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  project_name?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department_id: string;
  projects?: number;
  active?: number;
  completion?: number;
  workload?: number;
}

// ============================================================
// HOOKS FOR DATA FETCHING
// ============================================================

function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as Department[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      if (error) throw error;
      return data as Client[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

function useDepartmentProjects() {
  return useQuery({
    queryKey: ['department_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_projects')
        .select('*')
        .limit(100);
      if (error) throw error;
      return data as DepartmentProject[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

function useDepartmentTasks() {
  return useQuery({
    queryKey: ['department_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_tasks')
        .select('*')
        .limit(100);
      if (error) throw error;
      return data as DepartmentTask[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

function useTeamMembers() {
  return useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as User[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OpsSystem() {
  const queryClient = useQueryClient();
  
  const [currentUser, setCurrentUser] = useState<User>({
    id: '1',
    email: 'admin@banega.com',
    full_name: 'Admin User',
    role: 'super_admin',
    is_active: true,
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'departments' | 'clients' | 'analytics' | 'team' | 'settings'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);

  // Form states
  const [newProject, setNewProject] = useState({
    client_id: '',
    department_id: '',
    assigned_to: '',
    status: 'in_progress',
    deadline: '',
    description: '',
    budget: '',
  });

  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    website: '',
  });

  // Data fetching
  const departmentsQuery = useDepartments();
  const clientsQuery = useClients();
  const projectsQuery = useDepartmentProjects();
  const tasksQuery = useDepartmentTasks();
  const teamQuery = useTeamMembers();

  const departments = departmentsQuery.data || [];
  const clients = clientsQuery.data || [];
  const projects = projectsQuery.data || [];
  const tasks = tasksQuery.data || [];
  const teamMembers = teamQuery.data || [];

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('department_projects')
        .insert([data])
        .select();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department_projects'] });
      setShowNewProjectDialog(false);
      setNewProject({
        client_id: '',
        department_id: '',
        assigned_to: '',
        status: 'in_progress',
        deadline: '',
        description: '',
        budget: '',
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('clients')
        .insert([{ ...data, created_by: currentUser.id }])
        .select();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowNewClientDialog(false);
      setNewClient({
        name: '',
        email: '',
        phone: '',
        city: '',
        address: '',
        website: '',
      });
    },
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      const { error } = await supabase
        .from('department_projects')
        .update({ status })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department_projects'] });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase
        .from('department_tasks')
        .update({ status })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department_tasks'] });
    },
  });

  // ============================================================
  // CALCULATED DATA
  // ============================================================

  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'in_progress').length,
    overdueTasks: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
    avgCompletion: projects.length > 0
      ? Math.round(projects.reduce((acc, p) => acc + (p.completion_percentage || 0), 0) / projects.length)
      : 0,
  };

  const departmentStats = departments.map(dept => ({
    ...dept,
    total_projects: projects.filter(p => p.department_id === dept.id).length,
    active_projects: projects.filter(p => p.department_id === dept.id && p.status === 'in_progress').length,
    avg_completion: projects.filter(p => p.department_id === dept.id).length > 0
      ? Math.round(
          projects
            .filter(p => p.department_id === dept.id)
            .reduce((acc, p) => acc + (p.completion_percentage || 0), 0) /
            projects.filter(p => p.department_id === dept.id).length
        )
      : 0,
    overdue_tasks: tasks.filter(
      t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed' &&
        projects.find(p => p.id === t.project_id)?.department_id === dept.id
    ).length,
  }));

  // ============================================================
  // COMPONENTS
  // ============================================================

  const NavBar = () => (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              BB
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-900">Banega Brand</p>
              <p className="text-xs text-gray-500">Operations Hub</p>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects, clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <HelpCircle className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
              {currentUser.full_name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="h-20 flex items-center px-6 border-b border-gray-800">
        <div className="flex items-center gap-2 w-full">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg"></div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Banega Brand</p>
            <p className="text-xs text-gray-400">Ops v1.0</p>
          </div>
        </div>
      </div>

      <nav className="px-4 py-6 space-y-2 flex-1 overflow-y-auto">
        {[
          { icon: Home, label: 'Dashboard', view: 'dashboard' },
          { icon: Grid3x3, label: 'Departments', view: 'departments' },
          { icon: Users, label: 'Clients', view: 'clients' },
          { icon: BarChart3, label: 'Analytics', view: 'analytics' },
          { icon: User, label: 'Team', view: 'team' },
          { icon: Settings, label: 'Settings', view: 'settings' },
        ].map((item) => (
          <button
            key={item.view}
            onClick={() => {
              setCurrentView(item.view as any);
              setSelectedDepartment(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              currentView === item.view
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  // ============================================================
  // DASHBOARD VIEW
  // ============================================================

  const DashboardView = () => (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Welcome back! Here's your operations overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProjects}</p>
              <p className="text-xs text-green-600 mt-2">↑ 12% from last month</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeProjects}</p>
              <p className="text-xs text-gray-500 mt-2">{((stats.activeProjects / stats.totalProjects) * 100 || 0).toFixed(1)}% of total</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.overdueTasks}</p>
              <p className="text-xs text-red-600 mt-2">Needs attention</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Completion</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgCompletion}%</p>
              <p className="text-xs text-gray-500 mt-2">Across all departments</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Department Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Departments Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {departmentStats.slice(0, 6).map((dept) => (
            <div
              key={dept.id}
              onClick={() => {
                setSelectedDepartment(dept.id);
                setCurrentView('departments');
              }}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dept.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                    <p className="text-xs text-gray-500">{dept.total_projects} projects</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Completion</span>
                    <span className="font-semibold text-gray-900">{dept.avg_completion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${dept.avg_completion}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="text-lg font-bold text-gray-900">{dept.active_projects}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-900">{dept.total_projects}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Overdue</p>
                    <p className={`text-lg font-bold ${dept.overdue_tasks > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {dept.overdue_tasks}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recent Projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.slice(0, 5).map((project) => {
                const client = clients.find(c => c.id === project.client_id);
                const dept = departments.find(d => d.id === project.department_id);
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{client?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{dept?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${project.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-900">{project.completion_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full capitalize">
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // DEPARTMENTS VIEW
  // ============================================================

  const DepartmentsView = () => (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <p className="text-gray-500 mt-2">Manage department teams and projects</p>
      </div>

      {selectedDepartment ? (
        <DepartmentDetail deptId={selectedDepartment} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {departmentStats.map((dept) => (
            <div key={dept.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{dept.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{dept.name}</h3>
                      <p className="text-sm text-gray-500">{dept.total_projects} active projects</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDepartment(dept.id)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Completion</span>
                    <span className="font-bold text-gray-900">{dept.avg_completion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-700 h-3 rounded-full"
                      style={{ width: `${dept.avg_completion}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold">TOTAL</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{dept.total_projects}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold">ACTIVE</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{dept.active_projects}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold">OVERDUE</p>
                    <p className={`text-2xl font-bold mt-1 ${dept.overdue_tasks > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {dept.overdue_tasks}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDepartment(dept.id)}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const DepartmentDetail = ({ deptId }: { deptId: string }) => {
    const dept = departmentStats.find(d => d.id === deptId);
    const deptProjects = projects.filter(p => p.department_id === deptId);
    const deptTeam = teamMembers.filter(m => m.department_id === deptId);

    if (!dept) return null;

    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setSelectedDepartment(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 rotate-180" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dept.name}</h1>
            <p className="text-gray-500 mt-2">{dept.total_projects} projects • {dept.active_projects} active</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Team Members ({deptTeam.length})</h2>
              <div className="space-y-3">
                {deptTeam.map((member: any) => (
                  <div key={member.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Projects</h2>
              <div className="space-y-3">
                {deptProjects.map((proj) => {
                  const client = clients.find(c => c.id === proj.client_id);
                  return (
                    <div key={proj.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{client?.name}</h3>
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Completion</span>
                          <span className="font-bold text-gray-900">{proj.completion_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                            style={{ width: `${proj.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Deadline: {proj.deadline ? new Date(proj.deadline).toLocaleDateString() : 'No deadline'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // CLIENTS VIEW
  // ============================================================

  const ClientsView = () => (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-2">{clients.length} total clients</p>
        </div>
        <button
          onClick={() => setShowNewClientDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          New Client
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {clients.map((client) => {
          const clientProjects = projects.filter(p => p.client_id === client.id);
          const completedDepts = clientProjects.filter(p => p.status === 'completed').length;
          const avgCompletion = clientProjects.length > 0
            ? Math.round(clientProjects.reduce((acc, p) => acc + (p.completion_percentage || 0), 0) / clientProjects.length)
            : 0;

          return (
            <div key={client.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{client.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{client.city}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              <div className="space-y-2 mb-4 py-4 border-t border-b border-gray-200">
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="font-bold text-gray-900">{avgCompletion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                    style={{ width: `${avgCompletion}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 font-semibold mb-2">Departments ({clientProjects.length})</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[...Array(Math.min(clientProjects.length, 6))].map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        i < completedDepts ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      {i < completedDepts ? '✓' : i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Client Dialog */}
      {showNewClientDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Client</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Client Name *</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter phone"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={newClient.city}
                  onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter city"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowNewClientDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => createClientMutation.mutate(newClient)}
                disabled={!newClient.name}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {createClientMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  // ANALYTICS VIEW
  // ============================================================

  const AnalyticsView = () => (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-2">Performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Completion by Department</h2>
          <div className="space-y-4">
            {departmentStats.map((dept) => (
              <div key={dept.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{dept.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{dept.avg_completion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                    style={{ width: `${dept.avg_completion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Overdue Tasks</h2>
          <div className="space-y-3">
            {departmentStats
              .filter((d) => d.overdue_tasks > 0)
              .map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="text-lg">{dept.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{dept.name}</p>
                      <p className="text-xs text-gray-500">{dept.overdue_tasks} overdue</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // TEAM VIEW
  // ============================================================

  const TeamView = () => (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-500 mt-2">{teamMembers.length} team members</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {departments.map((dept) => {
        const deptMembers = teamMembers.filter(m => m.department_id === dept.id);
        return (
          <div key={dept.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{dept.name}</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {deptMembers.map((member: any) => (
                <div key={member.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {member.full_name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{member.full_name}</p>
                        <p className="text-sm text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ============================================================
  // SETTINGS VIEW
  // ============================================================

  const SettingsView = () => (
    <div className="space-y-6 pb-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-2">Manage system configuration</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">General</h2>
        </div>
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-900">Enable email notifications</span>
            </label>
          </div>
          <div className="px-6 py-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-900">Allow team members to edit projects</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">System Information</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600">Total Projects</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{projects.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{clients.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Team Members</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{teamMembers.length}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : ''}`}>
        <NavBar />
        <div className="p-6 md:p-8">
          {departmentsQuery.isLoading || clientsQuery.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && <DashboardView />}
              {currentView === 'departments' && <DepartmentsView />}
              {currentView === 'clients' && <ClientsView />}
              {currentView === 'analytics' && <AnalyticsView />}
              {currentView === 'team' && <TeamView />}
              {currentView === 'settings' && <SettingsView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
