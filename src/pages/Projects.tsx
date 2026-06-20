import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus, Search, Loader2, Trash2, Edit, Eye, Download, X,
  Users, Phone, Mail, Calendar, TrendingUp, Flag, XCircle,
  FileSignature, Flame, Snowflake, Sun, FolderKanban, 
  CheckCircle, AlertTriangle, DollarSign, Clock, Rocket,
  Package, MessageSquare, Share2, MoreVertical, UserCheck,
  FileText, CreditCard, ClipboardList, Building2, Send
} from "lucide-react";
import { format } from "date-fns";

// ── Constants ──────────────────────────────────────────────────────────────
const PROJECT_STAGES = [
  { value: "discovery", label: "Product Discovery & Validation", icon: "🔍" },
  { value: "development", label: "Product Development & Sourcing", icon: "🏭" },
  { value: "branding", label: "Brand Creation", icon: "🎨" },
  { value: "launch_prep", label: "Launch Preparation", icon: "🚀" },
  { value: "launch", label: "Product Launch", icon: "🎯" },
  { value: "growth", label: "Growth & Scale", icon: "📈" },
];

const PROJECT_STATUSES = [
  { value: "active", label: "Active", color: "#10b981" },
  { value: "on_hold", label: "On Hold", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#3b82f6" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
];

const PROJECT_TYPES = ["perfume", "ayurveda", "cosmetics", "food", "supplements"];

// ── Interfaces ─────────────────────────────────────────────────────────────
interface Project {
  id: string;
  project_id: string;
  lead_id: string | null;
  client_name: string;
  brand_name: string | null;
  project_type: string | null;
  project_value: number | null;
  start_date: string | null;
  expected_launch_date: string | null;
  project_manager: string | null;
  current_stage: string;
  completion_percentage: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProjectStage {
  id: string;
  project_id: string;
  stage_name: string;
  stage_order: number;
  status: string;
  start_date: string | null;
  completion_date: string | null;
}

interface ProjectTask {
  id: string;
  project_id: string;
  stage_id: string | null;
  task_name: string;
  description: string | null;
  department: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  priority: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  completion_date: string | null;
}

// ── Helper Functions ──────────────────────────────────────────────────────
function getStageLabel(value: string) {
  const stage = PROJECT_STAGES.find(s => s.value === value);
  return stage?.label || value;
}

function getStageIcon(value: string) {
  const stage = PROJECT_STAGES.find(s => s.value === value);
  return stage?.icon || "📋";
}

function getStatusColor(status: string) {
  const s = PROJECT_STATUSES.find(ps => ps.value === status);
  return s?.color || "#64748b";
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Components ────────────────────────────────────────────────────────────

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, subtitle }: any) {
  const colors: any = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    yellow: "bg-yellow-100 text-yellow-600",
    indigo: "bg-indigo-100 text-indigo-600",
    pink: "bg-pink-100 text-pink-600",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: any = {
    active: { label: "Active", color: "#10b981", bg: "#ecfdf5" },
    on_hold: { label: "On Hold", color: "#f59e0b", bg: "#fffbeb" },
    completed: { label: "Completed", color: "#3b82f6", bg: "#eff6ff" },
    cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fef2f2" },
  };
  
  const s = config[status] || { label: status, color: "#64748b", bg: "#f1f5f9" };
  
  return (
    <span style={{
      display: "inline-flex",
      padding: "2px 10px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.color}30`,
    }}>
      {s.label}
    </span>
  );
}

// ── Stage Badge ──────────────────────────────────────────────────────────
function StageBadge({ stage }: { stage: string }) {
  const label = getStageLabel(stage);
  const icon = getStageIcon(stage);
  
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 10px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 500,
      background: "#f1f5f9",
      color: "#475569",
    }}>
      {icon} {label}
    </span>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const progress = project.completion_percentage || 0;
  
  return (
    <div 
      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{project.client_name}</h4>
            <Badge variant="outline" className="text-xs font-mono">
              {project.project_id}
            </Badge>
          </div>
          {project.brand_name && (
            <p className="text-sm text-muted-foreground">{project.brand_name}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <StageBadge stage={project.current_stage} />
            <StatusBadge status={project.status} />
            {project.project_value && (
              <span className="text-sm font-medium">
                ₹{(project.project_value / 100000).toFixed(1)}L
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-24 h-2" />
              <span className="text-xs font-medium">{progress}%</span>
            </div>
            {project.expected_launch_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Launch: {format(new Date(project.expected_launch_date), "dd MMM yyyy")}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Project Detail View ──────────────────────────────────────────────────
function ProjectDetailView({ project, onBack, onUpdate }: { 
  project: Project; 
  onBack: () => void;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchProjectData();
  }, [project.id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // Fetch stages
      const { data: stagesData } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", project.id)
        .order("stage_order");
      
      if (stagesData) setStages(stagesData);

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", project.id)
        .order("due_date");
      
      if (tasksData) setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching project data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStageStatus = async (stageId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("project_stages")
        .update({ status })
        .eq("id", stageId);
      
      if (error) throw error;
      
      toast.success("Stage updated successfully");
      fetchProjectData();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status })
        .eq("id", taskId);
      
      if (error) throw error;
      
      toast.success("Task updated successfully");
      fetchProjectData();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{project.client_name}</h2>
            <p className="text-sm text-muted-foreground">
              {project.project_id} • {project.brand_name || "No brand"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {project.project_type || "N/A"}
          </Badge>
          <Button size="sm" variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Project Progress</span>
          <span className="font-semibold">{project.completion_percentage || 0}%</span>
        </div>
        <Progress value={project.completion_percentage || 0} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Started: {project.start_date ? format(new Date(project.start_date), "dd MMM yyyy") : "N/A"}</span>
          <span>Expected Launch: {project.expected_launch_date ? format(new Date(project.expected_launch_date), "dd MMM yyyy") : "N/A"}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge status={project.status} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Stage</p>
                <StageBadge stage={project.current_stage} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Project Value</p>
                <p className="text-xl font-bold">
                  ₹{(project.project_value || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stages Progress */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Stages Progress</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stages.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        stage.status === "completed" ? "bg-green-500" :
                        stage.status === "in_progress" ? "bg-blue-500" :
                        "bg-gray-300"
                      }`} />
                      <span className="text-sm">{stage.stage_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {stage.status || "pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Project Stages</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stages.map((stage) => (
                  <div key={stage.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{stage.stage_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Order: {stage.stage_order}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={stage.status || "pending"} 
                          onValueChange={(v) => updateStageStatus(stage.id, v)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {stage.start_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Started: {format(new Date(stage.start_date), "dd MMM yyyy")}
                        {stage.completion_date && ` • Completed: ${format(new Date(stage.completion_date), "dd MMM yyyy")}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Project Tasks</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-3 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === "urgent" ? "bg-red-500" :
                          task.priority === "high" ? "bg-orange-500" :
                          task.priority === "medium" ? "bg-blue-500" :
                          "bg-gray-400"
                        }`} />
                        <div>
                          <p className="font-medium">{task.task_name}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {task.priority || "medium"}
                        </Badge>
                        <Select 
                          value={task.status || "not_started"} 
                          onValueChange={(v) => updateTaskStatus(task.id, v)}
                        >
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Due: {format(new Date(task.due_date), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No tasks yet. Add your first task!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Project ID</dt>
                  <dd className="font-medium">{project.project_id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Client Name</dt>
                  <dd className="font-medium">{project.client_name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Brand Name</dt>
                  <dd className="font-medium">{project.brand_name || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Project Type</dt>
                  <dd className="font-medium">{project.project_type || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Start Date</dt>
                  <dd className="font-medium">
                    {project.start_date ? format(new Date(project.start_date), "dd MMM yyyy") : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Expected Launch</dt>
                  <dd className="font-medium">
                    {project.expected_launch_date ? format(new Date(project.expected_launch_date), "dd MMM yyyy") : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created At</dt>
                  <dd className="font-medium">
                    {format(new Date(project.created_at), "dd MMM yyyy")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Last Updated</dt>
                  <dd className="font-medium">
                    {format(new Date(project.updated_at), "dd MMM yyyy")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Main Projects Component ──────────────────────────────────────────────
export default function Projects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [viewMode, setViewMode] = useState<"dashboard" | "detail">("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });

  // Fetch stats
  const stats = {
    total: projects.length,
    active: projects.filter((p: Project) => p.status === "active").length,
    delayed: projects.filter((p: Project) => p.status === "on_hold").length,
    completed: projects.filter((p: Project) => p.status === "completed").length,
    totalValue: projects.reduce((sum: number, p: Project) => sum + (p.project_value || 0), 0),
  };

  // Filter projects
  const filteredProjects = projects.filter((project: Project) => {
    const matchSearch = 
      project.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (project.brand_name || "").toLowerCase().includes(search.toLowerCase()) ||
      project.project_id.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === "all" || project.status === filterStatus;
    const matchStage = filterStage === "all" || project.current_stage === filterStage;
    
    return matchSearch && matchStatus && matchStage;
  });

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setViewMode("detail");
  };

  const handleBack = () => {
    setViewMode("dashboard");
    setSelectedProject(null);
  };

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  // Create new project
  const [newProject, setNewProject] = useState({
    client_name: "",
    brand_name: "",
    project_type: "perfume",
    project_value: "",
    start_date: "",
    expected_launch_date: "",
  });

  const createProject = async () => {
    if (!newProject.client_name) {
      toast.error("Client name is required");
      return;
    }

    try {
      const projectId = `PRJ-${Date.now().toString().slice(-6)}`;
      
      const { data, error } = await supabase
        .from("projects")
        .insert({
          project_id: projectId,
          client_name: newProject.client_name,
          brand_name: newProject.brand_name || null,
          project_type: newProject.project_type || null,
          project_value: Number(newProject.project_value) || 0,
          start_date: newProject.start_date || null,
          expected_launch_date: newProject.expected_launch_date || null,
          current_stage: "discovery",
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      // Create default stages
      const stages = PROJECT_STAGES.map((stage, index) => ({
        project_id: data.id,
        stage_name: stage.label,
        stage_order: index + 1,
        status: index === 0 ? "in_progress" : "pending",
      }));

      await supabase.from("project_stages").insert(stages);

      toast.success("Project created successfully!");
      setDialogOpen(false);
      setNewProject({
        client_name: "",
        brand_name: "",
        project_type: "perfume",
        project_value: "",
        start_date: "",
        expected_launch_date: "",
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Detail View
  if (viewMode === "detail" && selectedProject) {
    return (
      <ProjectDetailView 
        project={selectedProject} 
        onBack={handleBack}
        onUpdate={handleUpdate}
      />
    );
  }

  // Dashboard View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Manage all client projects from one dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Client Name *</Label>
                  <Input 
                    value={newProject.client_name} 
                    onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Brand Name</Label>
                  <Input 
                    value={newProject.brand_name} 
                    onChange={(e) => setNewProject({ ...newProject, brand_name: e.target.value })}
                    placeholder="Enter brand name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Project Type</Label>
                  <Select 
                    value={newProject.project_type} 
                    onValueChange={(v) => setNewProject({ ...newProject, project_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Project Value (₹)</Label>
                  <Input 
                    type="number"
                    value={newProject.project_value} 
                    onChange={(e) => setNewProject({ ...newProject, project_value: e.target.value })}
                    placeholder="Enter project value"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date"
                    value={newProject.start_date} 
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Expected Launch Date</Label>
                  <Input 
                    type="date"
                    value={newProject.expected_launch_date} 
                    onChange={(e) => setNewProject({ ...newProject, expected_launch_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={createProject}>Create Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={FolderKanban}
          label="Total Projects"
          value={stats.total}
          color="blue"
        />
        <StatCard 
          icon={CheckCircle}
          label="Active"
          value={stats.active}
          color="green"
        />
        <StatCard 
          icon={AlertTriangle}
          label="On Hold"
          value={stats.delayed}
          color="red"
        />
        <StatCard 
          icon={DollarSign}
          label="Total Value"
          value={`₹${(stats.totalValue / 100000).toFixed(1)}L`}
          color="purple"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {PROJECT_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => {
              setSearch("");
              setFilterStatus("all");
              setFilterStage("all");
            }}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Projects List */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No projects found. Create your first project!
              </p>
            ) : (
              filteredProjects.map((project: Project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onClick={() => handleProjectClick(project)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
