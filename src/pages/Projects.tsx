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
  FileText, CreditCard, ClipboardList, Building2, Send,
  ChevronRight, ArrowLeft
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedStage, setSelectedStage] = useState<ProjectStage | null>(null);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Fetch Projects ──────────────────────────────────────────────────────
  const { data: projects = [], isLoading, refetch } = useQuery({
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

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = {
    total: projects.length,
    active: projects.filter((p: Project) => p.status === "active").length,
    onHold: projects.filter((p: Project) => p.status === "on_hold").length,
    completed: projects.filter((p: Project) => p.status === "completed").length,
    totalValue: projects.reduce((sum: number, p: Project) => sum + (p.project_value || 0), 0),
  };

  // ── Filter Projects ────────────────────────────────────────────────────
  const filteredProjects = projects.filter((project: Project) => {
    const matchSearch = 
      project.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (project.brand_name || "").toLowerCase().includes(search.toLowerCase()) ||
      project.project_id.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === "all" || project.status === filterStatus;
    const matchStage = filterStage === "all" || project.current_stage === filterStage;
    
    return matchSearch && matchStatus && matchStage;
  });

  // ── Fetch Project Details ──────────────────────────────────────────────
  const fetchProjectDetails = async (projectId: string) => {
    setLoadingDetail(true);
    try {
      // Fetch stages
      const { data: stagesData } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", projectId)
        .order("stage_order");
      
      if (stagesData) setProjectStages(stagesData);

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date");
      
      if (tasksData) setProjectTasks(tasksData);
    } catch (error) {
      console.error("Error fetching project details:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Handle Project Click ──────────────────────────────────────────────
  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setViewMode("detail");
    fetchProjectDetails(project.id);
  };

  const handleBack = () => {
    setViewMode("dashboard");
    setSelectedProject(null);
    setProjectStages([]);
    setProjectTasks([]);
  };

  // ── Create Project ─────────────────────────────────────────────────────
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
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Update Project ─────────────────────────────────────────────────────
  const updateProject = async () => {
    if (!editingProject) return;

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          client_name: editingProject.client_name,
          brand_name: editingProject.brand_name,
          project_type: editingProject.project_type,
          project_value: editingProject.project_value,
          start_date: editingProject.start_date,
          expected_launch_date: editingProject.expected_launch_date,
          status: editingProject.status,
          current_stage: editingProject.current_stage,
        })
        .eq("id", editingProject.id);

      if (error) throw error;

      toast.success("Project updated successfully!");
      setEditDialogOpen(false);
      setEditingProject(null);
      refetch();
      if (selectedProject) {
        setSelectedProject({ ...selectedProject, ...editingProject });
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Update Stage Status ────────────────────────────────────────────────
  const updateStageStatus = async (stageId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("project_stages")
        .update({ status })
        .eq("id", stageId);
      
      if (error) throw error;
      
      toast.success("Stage updated successfully");
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Update Task Status ─────────────────────────────────────────────────
  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status })
        .eq("id", taskId);
      
      if (error) throw error;
      
      toast.success("Task updated successfully");
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Add Task ────────────────────────────────────────────────────────────
  const [newTask, setNewTask] = useState({
    task_name: "",
    description: "",
    department: "",
    priority: "medium",
    due_date: "",
  });

  const addTask = async () => {
    if (!newTask.task_name || !selectedProject) {
      toast.error("Task name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("project_tasks")
        .insert({
          project_id: selectedProject.id,
          task_name: newTask.task_name,
          description: newTask.description || null,
          department: newTask.department || null,
          priority: newTask.priority,
          status: "not_started",
          due_date: newTask.due_date || null,
          assigned_by: user?.id,
        });

      if (error) throw error;

      toast.success("Task added successfully!");
      setTaskDialogOpen(false);
      setNewTask({
        task_name: "",
        description: "",
        department: "",
        priority: "medium",
        due_date: "",
      });
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Add Stage ───────────────────────────────────────────────────────────
  const [newStage, setNewStage] = useState({
    stage_name: "",
    stage_order: 0,
  });

  const addStage = async () => {
    if (!newStage.stage_name || !selectedProject) {
      toast.error("Stage name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("project_stages")
        .insert({
          project_id: selectedProject.id,
          stage_name: newStage.stage_name,
          stage_order: projectStages.length + 1,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Stage added successfully!");
      setStageDialogOpen(false);
      setNewStage({ stage_name: "", stage_order: 0 });
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Delete Project ─────────────────────────────────────────────────────
  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Project deleted successfully!");
      refetch();
      if (selectedProject?.id === id) {
        handleBack();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Delete Task ─────────────────────────────────────────────────────────
  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;

    try {
      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task deleted successfully!");
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
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

  // ════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════════════════════════════════
  if (viewMode === "detail" && selectedProject) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedProject.client_name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedProject.project_id} • {selectedProject.brand_name || "No brand"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-sm">
              {selectedProject.project_type || "N/A"}
            </Badge>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setEditingProject(selectedProject);
                setEditDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => deleteProject(selectedProject.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Project Progress</span>
            <span className="font-semibold">{selectedProject.completion_percentage || 0}%</span>
          </div>
          <Progress value={selectedProject.completion_percentage || 0} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Started: {selectedProject.start_date ? format(new Date(selectedProject.start_date), "dd MMM yyyy") : "N/A"}</span>
            <span>Expected Launch: {selectedProject.expected_launch_date ? format(new Date(selectedProject.expected_launch_date), "dd MMM yyyy") : "N/A"}</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stages">Stages</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className="inline-flex px-2 py-1 rounded text-sm font-medium mt-1"
                    style={{
                      color: getStatusColor(selectedProject.status),
                      background: `${getStatusColor(selectedProject.status)}20`,
                      border: `1px solid ${getStatusColor(selectedProject.status)}30`
                    }}
                  >
                    {PROJECT_STATUSES.find(s => s.value === selectedProject.status)?.label || selectedProject.status}
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Stage</p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium mt-1 bg-gray-100 text-gray-700">
                    {getStageIcon(selectedProject.current_stage)} {getStageLabel(selectedProject.current_stage)}
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Project Value</p>
                  <p className="text-xl font-bold">
                    ₹{(selectedProject.project_value || 0).toLocaleString()}
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
                {loadingDetail ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectStages.map((stage) => (
                      <div key={stage.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            stage.status === "completed" ? "bg-green-500" :
                            stage.status === "in_progress" ? "bg-blue-500" :
                            stage.status === "blocked" ? "bg-red-500" :
                            "bg-gray-300"
                          }`} />
                          <span className="text-sm">{stage.stage_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {stage.status || "pending"}
                          </Badge>
                          <Select 
                            value={stage.status || "pending"} 
                            onValueChange={(v) => updateStageStatus(stage.id, v)}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs">
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
                    ))}
                    {projectStages.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No stages found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Stages Tab ── */}
          <TabsContent value="stages" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Project Stages</h3>
                  <Button size="sm" onClick={() => setStageDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetail ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectStages.map((stage) => (
                      <div key={stage.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{stage.stage_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Order: {stage.stage_order}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {stage.status || "pending"}
                            </Badge>
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
                    {projectStages.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No stages yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tasks Tab ── */}
          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Project Tasks</h3>
                  <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetail ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectTasks.map((task) => (
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
                              {task.department && (
                                <p className="text-xs text-muted-foreground">Dept: {task.department}</p>
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
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Due: {format(new Date(task.due_date), "dd MMM yyyy")}
                          </p>
                        )}
                      </div>
                    ))}
                    {projectTasks.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No tasks yet. Add your first task!
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Details Tab ── */}
          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Project ID</dt>
                    <dd className="font-medium">{selectedProject.project_id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Client Name</dt>
                    <dd className="font-medium">{selectedProject.client_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Brand Name</dt>
                    <dd className="font-medium">{selectedProject.brand_name || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Project Type</dt>
                    <dd className="font-medium">{selectedProject.project_type || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Start Date</dt>
                    <dd className="font-medium">
                      {selectedProject.start_date ? format(new Date(selectedProject.start_date), "dd MMM yyyy") : "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Expected Launch</dt>
                    <dd className="font-medium">
                      {selectedProject.expected_launch_date ? format(new Date(selectedProject.expected_launch_date), "dd MMM yyyy") : "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Status</dt>
                    <dd className="font-medium">{PROJECT_STATUSES.find(s => s.value === selectedProject.status)?.label || selectedProject.status}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Current Stage</dt>
                    <dd className="font-medium">{getStageLabel(selectedProject.current_stage)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Completion</dt>
                    <dd className="font-medium">{selectedProject.completion_percentage || 0}%</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Created At</dt>
                    <dd className="font-medium">
                      {format(new Date(selectedProject.created_at), "dd MMM yyyy")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Last Updated</dt>
                    <dd className="font-medium">
                      {format(new Date(selectedProject.updated_at), "dd MMM yyyy")}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Add Stage Dialog ── */}
        <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Stage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Stage Name</Label>
                <Input 
                  value={newStage.stage_name} 
                  onChange={(e) => setNewStage({ ...newStage, stage_name: e.target.value })}
                  placeholder="Enter stage name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
              <Button onClick={addStage}>Add Stage</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Add Task Dialog ── */}
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Task Name *</Label>
                <Input 
                  value={newTask.task_name} 
                  onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                  placeholder="Enter task name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea 
                  value={newTask.description} 
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Department</Label>
                  <Input 
                    value={newTask.department} 
                    onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                    placeholder="e.g., Design"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select 
                    value={newTask.priority} 
                    onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input 
                  type="date"
                  value={newTask.due_date} 
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button onClick={addTask}>Add Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // DASHBOARD VIEW
  // ════════════════════════════════════════════════════════════════════════
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
        <div className="flex gap-2 flex-wrap">
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Hold</p>
                <p className="text-2xl font-bold text-orange-600">{stats.onHold}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-purple-600">₹{(stats.totalValue / 100000).toFixed(1)}L</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
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
                <div 
                  key={project.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{project.client_name}</h4>
                        <Badge variant="outline" className="text-xs font-mono">
                          {project.project_id}
                        </Badge>
                      </div>
                      {project.brand_name && (
                        <p className="text-sm text-muted-foreground">{project.brand_name}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                          {getStageIcon(project.current_stage)} {getStageLabel(project.current_stage)}
                        </span>
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            color: getStatusColor(project.status),
                            background: `${getStatusColor(project.status)}20`,
                            border: `1px solid ${getStatusColor(project.status)}30`
                          }}
                        >
                          {PROJECT_STATUSES.find(s => s.value === project.status)?.label || project.status}
                        </span>
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
                          <Progress value={project.completion_percentage || 0} className="w-24 h-2" />
                          <span className="text-xs font-medium">{project.completion_percentage || 0}%</span>
                        </div>
                        {project.expected_launch_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Launch: {format(new Date(project.expected_launch_date), "dd MMM yyyy")}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Project Dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Client Name *</Label>
                <Input 
                  value={editingProject.client_name} 
                  onChange={(e) => setEditingProject({ ...editingProject, client_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Brand Name</Label>
                <Input 
                  value={editingProject.brand_name || ""} 
                  onChange={(e) => setEditingProject({ ...editingProject, brand_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Project Type</Label>
                <Select 
                  value={editingProject.project_type || "perfume"} 
                  onValueChange={(v) => setEditingProject({ ...editingProject, project_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                  value={editingProject.project_value || 0} 
                  onChange={(e) => setEditingProject({ ...editingProject, project_value: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select 
                  value={editingProject.status} 
                  onValueChange={(v) => setEditingProject({ ...editingProject, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Current Stage</Label>
                <Select 
                  value={editingProject.current_stage} 
                  onValueChange={(v) => setEditingProject({ ...editingProject, current_stage: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input 
                  type="date"
                  value={editingProject.start_date || ""} 
                  onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Expected Launch Date</Label>
                <Input 
                  type="date"
                  value={editingProject.expected_launch_date || ""} 
                  onChange={(e) => setEditingProject({ ...editingProject, expected_launch_date: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={updateProject}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
