import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronRight, ArrowLeft, Bell, File, Image, Video,
  Shield, Award, Coffee, Globe, Zap, Target, BarChart3,
  RefreshCw, Save, Copy
} from "lucide-react";
import { format } from "date-fns";

// ============================================================
// CONSTANTS
// ============================================================
const PROJECT_STAGES = [
  { value: "discovery", label: "Product Discovery & Validation", icon: "🔍", color: "#3b82f6" },
  { value: "development", label: "Product Development & Sourcing", icon: "🏭", color: "#f97316" },
  { value: "branding", label: "Brand Creation", icon: "🎨", color: "#8b5cf6" },
  { value: "launch_prep", label: "Launch Preparation", icon: "🚀", color: "#06b6d4" },
  { value: "launch", label: "Product Launch", icon: "🎯", color: "#10b981" },
  { value: "growth", label: "Growth & Scale", icon: "📈", color: "#ec4899" },
];

const PROJECT_STATUSES = [
  { value: "active", label: "Active", color: "#10b981" },
  { value: "on_hold", label: "On Hold", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#3b82f6" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
];

const PROJECT_TYPES = [
  { value: "perfume", label: "Perfume", icon: "🌸" },
  { value: "ayurveda", label: "Ayurveda", icon: "🌿" },
  { value: "cosmetics", label: "Cosmetics", icon: "💄" },
  { value: "food", label: "Food", icon: "🍽️" },
  { value: "supplements", label: "Supplements", icon: "💊" },
];

const MANUFACTURING_STAGES = [
  "Sample Requested",
  "Sample Sent",
  "Sample Approved",
  "Packaging Approved",
  "Bottle Procurement",
  "Raw Material Procurement",
  "Production Started",
  "Filling",
  "Quality Check",
  "Packing",
  "Dispatch",
  "Delivered"
];

const BRANDING_CATEGORIES = [
  "Brand Name",
  "Logo",
  "Trademark",
  "Packaging",
  "Mockups",
  "Website",
  "Social Media",
  "Marketplace",
  "Photography",
  "Video"
];

const DOCUMENT_FOLDERS = [
  "Company Registration",
  "GST",
  "Trademark",
  "Agreements",
  "Invoices",
  "Packaging Files",
  "Mockups",
  "Photos",
  "Videos",
  "Manufacturing Documents",
  "Certificates",
  "Others"
];

// ============================================================
// INTERFACES
// ============================================================
interface Project {
  id: string;
  project_id: string;
  lead_id: string | null;
  name: string;
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

interface Agreement {
  id: string;
  project_id: string;
  agreement_type: string;
  title: string;
  status: string;
  file_url: string | null;
  signed_file_url: string | null;
  sent_date: string | null;
  signed_date: string | null;
}

interface Payment {
  id: string;
  project_id: string;
  payment_type: string;
  milestone: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  payment_mode: string | null;
  invoice_number: string | null;
  status: string;
}

interface Manufacturing {
  id: string;
  project_id: string;
  stage: string;
  status: string;
  start_date: string | null;
  completion_date: string | null;
  remarks: string | null;
  responsible_person: string | null;
  file_url: string | null;
}

interface BrandingItem {
  id: string;
  project_id: string;
  category: string;
  item_name: string;
  status: string;
  file_url: string | null;
  notes: string | null;
}

interface Document {
  id: string;
  project_id: string;
  folder: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  version: number;
  uploaded_by: string | null;
  created_at: string;
}

interface Communication {
  id: string;
  project_id: string;
  communication_type: string;
  subject: string | null;
  message: string | null;
  attachment_url: string | null;
  communication_date: string;
  user_id: string | null;
  next_followup_date: string | null;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getStageLabel(value: string) {
  const stage = PROJECT_STAGES.find(s => s.value === value);
  return stage?.label || value;
}

function getStageIcon(value: string) {
  const stage = PROJECT_STAGES.find(s => s.value === value);
  return stage?.icon || "📋";
}

function getStageColor(value: string) {
  const stage = PROJECT_STAGES.find(s => s.value === value);
  return stage?.color || "#64748b";
}

function getStatusColor(status: string) {
  const s = PROJECT_STATUSES.find(ps => ps.value === status);
  return s?.color || "#64748b";
}

function getStatusLabel(status: string) {
  const s = PROJECT_STATUSES.find(ps => ps.value === status);
  return s?.label || status;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    urgent: "text-red-600 bg-red-100 border-red-200",
    high: "text-orange-600 bg-orange-100 border-orange-200",
    medium: "text-blue-600 bg-blue-100 border-blue-200",
    low: "text-gray-600 bg-gray-100 border-gray-200"
  };
  return colors[priority] || colors.medium;
}

// ============================================================
// COMPONENTS
// ============================================================

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, subtitle, onClick }: any) {
  const colors: any = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    yellow: "bg-yellow-100 text-yellow-600",
    indigo: "bg-indigo-100 text-indigo-600",
    pink: "bg-pink-100 text-pink-600",
    teal: "bg-teal-100 text-teal-600",
  };

  return (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:border-primary' : ''}`} onClick={onClick}>
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

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        color: color,
        background: `${color}20`,
        border: `1px solid ${color}30`
      }}
    >
      {label}
    </span>
  );
}

// ── Stage Badge ──────────────────────────────────────────────
function StageBadge({ stage }: { stage: string }) {
  const label = getStageLabel(stage);
  const icon = getStageIcon(stage);
  const color = getStageColor(stage);
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        color: color,
        background: `${color}20`,
        border: `1px solid ${color}30`
      }}
    >
      {icon} {label}
    </span>
  );
}

// ── Priority Badge ────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-gray-100 text-gray-700 border-gray-200"
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[priority] || colors.medium}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

// ── Project Card ──────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const progress = project.completion_percentage || 0;
  const typeIcon = PROJECT_TYPES.find(t => t.value === project.project_type)?.icon || "📋";
  
  return (
    <div 
      className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-lg">{project.name}</h4>
            <Badge variant="outline" className="text-xs font-mono">
              {project.project_id}
            </Badge>
            <span className="text-sm">{typeIcon}</span>
          </div>
          {project.brand_name && (
            <p className="text-sm text-muted-foreground">{project.brand_name}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StageBadge stage={project.current_stage} />
            <StatusBadge status={project.status} />
            {project.project_value && project.project_value > 0 && (
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(project.project_value)}
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
                🚀 {format(new Date(project.expected_launch_date), "dd MMM yyyy")}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────
function TaskCard({ task, onStatusChange, onDelete }: { 
  task: ProjectTask; 
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className={`border rounded-lg p-3 hover:bg-muted/30 transition-colors ${task.status === 'completed' ? 'bg-muted/20' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <input 
              type="checkbox" 
              checked={task.status === 'completed'}
              onChange={() => onStatusChange(task.id, task.status === 'completed' ? 'not_started' : 'completed')}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
              {task.task_name}
            </span>
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 ml-9">{task.description}</p>
          )}
          <div className="flex items-center gap-4 mt-1 ml-9 text-xs text-muted-foreground flex-wrap">
            {task.department && <span>📁 {task.department}</span>}
            {task.due_date && (
              <span>📅 Due: {format(new Date(task.due_date), "dd MMM yyyy")}</span>
            )}
            {task.assigned_to && <span>👤 Assigned</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Status: </span>
              <Select 
                value={task.status} 
                onValueChange={(v) => onStatusChange(task.id, v)}
              >
                <SelectTrigger className="h-7 text-xs w-32">
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
            <div>
              <span className="text-muted-foreground">Priority: </span>
              <Select 
                value={task.priority} 
                onValueChange={async (v) => {
                  // Update priority
                }}
              >
                <SelectTrigger className="h-7 text-xs w-32">
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
        </div>
      )}
    </div>
  );
}

// ── Payment Card ──────────────────────────────────────────────
function PaymentCard({ payment, onStatusChange, onDelete }: {
  payment: Payment;
  onStatusChange: (id: string, status: string, paidDate?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(payment.status);
  const [paidDate, setPaidDate] = useState(payment.paid_date || "");
  
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    paid: "bg-green-100 text-green-700 border-green-200",
    overdue: "bg-red-100 text-red-700 border-red-200",
    partial: "bg-orange-100 text-orange-700 border-orange-200",
  };
  
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === 'paid' && !paidDate) {
      setPaidDate(new Date().toISOString().split('T')[0]);
    }
    onStatusChange(payment.id, newStatus, newStatus === 'paid' ? paidDate : undefined);
  };
  
  return (
    <div className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium">{payment.milestone}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[payment.status] || statusColors.pending}`}>
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </span>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(payment.amount)}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>💳 {payment.payment_type === 'client' ? 'Client Payment' : 'Manufacturer Payment'}</span>
            {payment.due_date && (
              <span>📅 Due: {format(new Date(payment.due_date), "dd MMM yyyy")}</span>
            )}
            {payment.paid_date && (
              <span>✅ Paid: {format(new Date(payment.paid_date), "dd MMM yyyy")}</span>
            )}
            {payment.invoice_number && (
              <span>🧾 {payment.invoice_number}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(payment.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paid Date</Label>
              <Input 
                type="date" 
                value={paidDate} 
                onChange={(e) => setPaidDate(e.target.value)}
                className="h-8 text-sm"
                disabled={status !== 'paid'}
              />
            </div>
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Select value={payment.payment_mode || ""} onValueChange={async (v) => {
                // Update payment mode
              }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Invoice Number</Label>
              <Input 
                placeholder="INV-001" 
                defaultValue={payment.invoice_number || ""}
                className="h-8 text-sm"
                onBlur={async (e) => {
                  // Update invoice number
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Projects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // ── States ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [viewMode, setViewMode] = useState<"dashboard" | "detail">("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [manufacturingDialogOpen, setManufacturingDialogOpen] = useState(false);
  const [brandingDialogOpen, setBrandingDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [communicationDialogOpen, setCommunicationDialogOpen] = useState(false);
  
  // Data states
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [manufacturing, setManufacturing] = useState<Manufacturing[]>([]);
  const [brandingItems, setBrandingItems] = useState<BrandingItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // ── New Stage State ──
  const [newStage, setNewStage] = useState({
    stage_name: "",
    status: "pending"
  });

  // ── Fetch Projects ─────────────────────────────────────────
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

  // ── Stats ──────────────────────────────────────────────────
  const stats = {
    total: projects.length,
    active: projects.filter((p: Project) => p.status === "active").length,
    onHold: projects.filter((p: Project) => p.status === "on_hold").length,
    completed: projects.filter((p: Project) => p.status === "completed").length,
    totalValue: projects.reduce((sum: number, p: Project) => sum + (p.project_value || 0), 0),
  };

  // ── Filter Projects ────────────────────────────────────────
  const filteredProjects = projects.filter((project: Project) => {
    const matchSearch = 
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      (project.brand_name || "").toLowerCase().includes(search.toLowerCase()) ||
      project.project_id.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === "all" || project.status === filterStatus;
    const matchStage = filterStage === "all" || project.current_stage === filterStage;
    
    return matchSearch && matchStatus && matchStage;
  });

  // ── Fetch Project Details ──────────────────────────────────
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

      // Fetch agreements
      const { data: agreementsData } = await supabase
        .from("agreements")
        .select("*")
        .eq("project_id", projectId);
      if (agreementsData) setAgreements(agreementsData);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date");
      if (paymentsData) setPayments(paymentsData);

      // Fetch manufacturing
      const { data: manufacturingData } = await supabase
        .from("manufacturing_tracker")
        .select("*")
        .eq("project_id", projectId)
        .order("stage");
      if (manufacturingData) setManufacturing(manufacturingData);

      // Fetch branding
      const { data: brandingData } = await supabase
        .from("branding_tracker")
        .select("*")
        .eq("project_id", projectId);
      if (brandingData) setBrandingItems(brandingData);

      // Fetch documents
      const { data: documentsData } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (documentsData) setDocuments(documentsData);

      // Fetch communications
      const { data: communicationsData } = await supabase
        .from("client_communications")
        .select("*")
        .eq("project_id", projectId)
        .order("communication_date", { ascending: false });
      if (communicationsData) setCommunications(communicationsData);

    } catch (error) {
      console.error("Error fetching project details:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Handle Project Click ──────────────────────────────────
  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setViewMode("detail");
    setActiveTab("overview");
    fetchProjectDetails(project.id);
  };

  const handleBack = () => {
    setViewMode("dashboard");
    setSelectedProject(null);
    setProjectStages([]);
    setProjectTasks([]);
    setAgreements([]);
    setPayments([]);
    setManufacturing([]);
    setBrandingItems([]);
    setDocuments([]);
    setCommunications([]);
  };

  // ── Create Project ──────────────────────────────────────────
  const [newProject, setNewProject] = useState({
    name: "",
    brand_name: "",
    project_type: "perfume",
    project_value: "",
    start_date: "",
    expected_launch_date: "",
  });

  const createProject = async () => {
    if (!newProject.name) {
      toast.error("Client name is required");
      return;
    }

    try {
      const projectId = `PRJ-${Date.now().toString().slice(-6)}`;
      
      const { data, error } = await supabase
        .from("projects")
        .insert({
          project_id: projectId,
          name: newProject.name,
          brand_name: newProject.brand_name || null,
          project_type: newProject.project_type || null,
          project_value: Number(newProject.project_value) || 0,
          start_date: newProject.start_date || null,
          expected_launch_date: newProject.expected_launch_date || null,
          current_stage: "discovery",
          status: "active",
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Create 6 stages
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
        name: "",
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

  // ── Update Project ──────────────────────────────────────────
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const updateProject = async () => {
    if (!editingProject) return;

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: editingProject.name,
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

  // ── Add Stage ──────────────────────────────────────────────
  const addStage = async () => {
    if (!newStage.stage_name || !selectedProject) {
      toast.error("Stage name is required");
      return;
    }

    try {
      const maxOrder = projectStages.reduce((max, s) => Math.max(max, s.stage_order), 0);
      
      const { error } = await supabase
        .from("project_stages")
        .insert({
          project_id: selectedProject.id,
          stage_name: newStage.stage_name,
          stage_order: maxOrder + 1,
          status: newStage.status || "pending",
        });

      if (error) throw error;

      toast.success("Stage added successfully!");
      setStageDialogOpen(false);
      setNewStage({ stage_name: "", status: "pending" });
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Update Stage Status ────────────────────────────────────
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

  // ── Update Task Status ──────────────────────────────────────
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

  // ── Add Task ─────────────────────────────────────────────────
  const [newTask, setNewTask] = useState({
    task_name: "",
    description: "",
    department: "",
    priority: "medium",
    due_date: "",
    stage_id: "",
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
          stage_id: newTask.stage_id || null,
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
        stage_id: "",
      });
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Delete Task ─────────────────────────────────────────────
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

  // ── Update Payment Status ──────────────────────────────────
  const updatePaymentStatus = async (paymentId: string, status: string, paidDate?: string) => {
    try {
      const updates: any = { status };
      if (status === 'paid' && paidDate) {
        updates.paid_date = paidDate;
      } else if (status === 'paid') {
        updates.paid_date = new Date().toISOString();
      } else if (status !== 'paid') {
        updates.paid_date = null;
      }
      
      const { error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", paymentId);
      
      if (error) throw error;
      
      toast.success("Payment status updated successfully!");
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Delete Payment ──────────────────────────────────────────
  const deletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment record?")) return;

    try {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      toast.success("Payment deleted successfully!");
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Add Agreement ────────────────────────────────────────────
  const [newAgreement, setNewAgreement] = useState({
    title: "",
    agreement_type: "banega_brand",
    status: "not_sent",
  });

  const addAgreement = async () => {
    if (!newAgreement.title || !selectedProject) {
      toast.error("Title is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("agreements")
        .insert({
          project_id: selectedProject.id,
          title: newAgreement.title,
          agreement_type: newAgreement.agreement_type,
          status: newAgreement.status,
        });

      if (error) throw error;

      toast.success("Agreement added successfully!");
      setAgreementDialogOpen(false);
      setNewAgreement({ title: "", agreement_type: "banega_brand", status: "not_sent" });
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Add Payment ──────────────────────────────────────────────
  const [newPayment, setNewPayment] = useState({
    payment_type: "client",
    milestone: "",
    amount: "",
    due_date: "",
    status: "pending",
  });

  const addPayment = async () => {
    if (!newPayment.milestone || !newPayment.amount || !selectedProject) {
      toast.error("Milestone and amount are required");
      return;
    }

    try {
      const { error } = await supabase
        .from("payments")
        .insert({
          project_id: selectedProject.id,
          payment_type: newPayment.payment_type,
          milestone: newPayment.milestone,
          amount: Number(newPayment.amount),
          due_date: newPayment.due_date || null,
          status: newPayment.status,
        });

      if (error) throw error;

      toast.success("Payment added successfully!");
      setPaymentDialogOpen(false);
      setNewPayment({ payment_type: "client", milestone: "", amount: "", due_date: "", status: "pending" });
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Add Communication ──────────────────────────────────────
  const [newCommunication, setNewCommunication] = useState({
    type: "comment",
    subject: "",
    message: "",
    next_followup: "",
  });

  const addCommunication = async () => {
    if (!newCommunication.message || !selectedProject) {
      toast.error("Message is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("client_communications")
        .insert({
          project_id: selectedProject.id,
          communication_type: newCommunication.type,
          subject: newCommunication.subject || null,
          message: newCommunication.message,
          next_followup_date: newCommunication.next_followup || null,
          user_id: user?.id,
        });

      if (error) throw error;

      toast.success("Communication added successfully!");
      setCommunicationDialogOpen(false);
      setNewCommunication({ type: "comment", subject: "", message: "", next_followup: "" });
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Delete Project ──────────────────────────────────────────
  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project? All data will be lost.")) return;

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

  // ── Calculate Payment Summary ──────────────────────────────
  const getPaymentSummary = () => {
    const clientPayments = payments.filter(p => p.payment_type === 'client');
    const manufacturerPayments = payments.filter(p => p.payment_type === 'manufacturer');
    
    const totalClient = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const received = clientPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const pending = clientPayments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
    
    const totalManufacturer = manufacturerPayments.reduce((sum, p) => sum + p.amount, 0);
    const manufacturerPaid = manufacturerPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const manufacturerPending = manufacturerPayments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
    
    return {
      totalClient,
      received,
      pending,
      totalManufacturer,
      manufacturerPaid,
      manufacturerPending,
      grossProfit: received - manufacturerPaid,
    };
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════════════════════
  if (viewMode === "detail" && selectedProject) {
    const paymentSummary = getPaymentSummary();
    
    return (
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedProject.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedProject.project_id} • {selectedProject.brand_name || "No brand"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-sm">
              {PROJECT_TYPES.find(t => t.value === selectedProject.project_type)?.icon || "📋"} 
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

        {/* ── Progress ── */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Project Progress</span>
            <span className="font-semibold">{selectedProject.completion_percentage || 0}%</span>
          </div>
          <Progress value={selectedProject.completion_percentage || 0} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>📅 Started: {selectedProject.start_date ? format(new Date(selectedProject.start_date), "dd MMM yyyy") : "N/A"}</span>
            <span>🚀 Launch: {selectedProject.expected_launch_date ? format(new Date(selectedProject.expected_launch_date), "dd MMM yyyy") : "N/A"}</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stages">Stages</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedProject.status} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Stage</p>
                  <StageBadge stage={selectedProject.current_stage} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Project Value</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedProject.project_value || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Tasks</p>
                  <p className="text-xl font-bold">
                    {projectTasks.filter(t => t.status === 'completed').length}/{projectTasks.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Client</p>
                    <p className="text-lg font-semibold">{formatCurrency(paymentSummary.totalClient)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(paymentSummary.received)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(paymentSummary.pending)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(paymentSummary.grossProfit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Tasks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Tasks</CardTitle>
                  <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetail ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-2">
                    {projectTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className={`w-2 h-2 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'blocked' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`} />
                        <span className={`flex-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.task_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {task.due_date ? format(new Date(task.due_date), "dd MMM") : "No due"}
                        </span>
                        <Badge variant="outline" className="text-xs">{task.status}</Badge>
                      </div>
                    ))}
                    {projectTasks.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No tasks yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── STAGES TAB ── */}
          <TabsContent value="stages" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Project Stages</CardTitle>
                  <Button size="sm" onClick={() => setStageDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetail ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <div className="space-y-4">
                    {projectStages.map((stage) => (
                      <div key={stage.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{stage.stage_name}</h4>
                            <p className="text-sm text-muted-foreground">Order: {stage.stage_order}</p>
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

          {/* ── TASKS TAB ── */}
          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Project Tasks</CardTitle>
                  <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetail ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <div className="space-y-3">
                    {projectTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onStatusChange={updateTaskStatus}
                        onDelete={deleteTask}
                      />
                    ))}
                    {projectTasks.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No tasks yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PAYMENTS TAB ── */}
          <TabsContent value="payments" className="mt-4">
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Client</p>
                    <p className="text-lg font-semibold">{formatCurrency(paymentSummary.totalClient)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(paymentSummary.received)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(paymentSummary.pending)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Manufacturer Pending</p>
                    <p className="text-lg font-semibold text-orange-600">{formatCurrency(paymentSummary.manufacturerPending)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Client Payments */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Client Payments</CardTitle>
                    <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payments.filter(p => p.payment_type === 'client').map(payment => (
                      <PaymentCard 
                        key={payment.id} 
                        payment={payment} 
                        onStatusChange={updatePaymentStatus}
                        onDelete={deletePayment}
                      />
                    ))}
                    {payments.filter(p => p.payment_type === 'client').length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No client payments</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Manufacturer Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Manufacturer Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payments.filter(p => p.payment_type === 'manufacturer').map(payment => (
                      <PaymentCard 
                        key={payment.id} 
                        payment={payment} 
                        onStatusChange={updatePaymentStatus}
                        onDelete={deletePayment}
                      />
                    ))}
                    {payments.filter(p => p.payment_type === 'manufacturer').length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No manufacturer payments</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── MANUFACTURING TAB ── */}
          <TabsContent value="manufacturing" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Manufacturing Tracker</CardTitle>
                  <Button size="sm" onClick={() => setManufacturingDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Update Manufacturing
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Manufacturing Progress</span>
                      <span className="font-semibold">
                        {manufacturing.filter(m => m.status === 'completed').length}/{MANUFACTURING_STAGES.length}
                      </span>
                    </div>
                    <Progress 
                      value={(manufacturing.filter(m => m.status === 'completed').length / MANUFACTURING_STAGES.length) * 100} 
                      className="h-2" 
                    />
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    {MANUFACTURING_STAGES.map((stage, index) => {
                      const item = manufacturing.find(m => m.stage === stage);
                      const isCompleted = item?.status === 'completed';
                      const isInProgress = item?.status === 'in_progress';
                      
                      return (
                        <div key={index} className="flex items-start gap-4 mb-4">
                          <div className="flex flex-col items-center">
                            <div className={`
                              w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium
                              ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                                isInProgress ? 'bg-blue-500 border-blue-500 text-white' : 
                                'border-gray-300 text-gray-400'}
                            `}>
                              {isCompleted ? '✓' : isInProgress ? '●' : index + 1}
                            </div>
                            {index < MANUFACTURING_STAGES.length - 1 && (
                              <div className={`w-0.5 h-8 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{stage}</p>
                                {item?.remarks && (
                                  <p className="text-sm text-muted-foreground">{item.remarks}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {item?.status || 'pending'}
                                </Badge>
                                {item?.file_url && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {item?.start_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {isCompleted ? '✅ Completed: ' : '📅 Started: '}
                                {format(new Date(item.start_date), "dd MMM yyyy")}
                                {item?.completion_date && ` • ${format(new Date(item.completion_date), "dd MMM yyyy")}`}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── BRANDING TAB ── */}
          <TabsContent value="branding" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Branding & Digital Tracker</CardTitle>
                  <Button size="sm" onClick={() => setBrandingDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BRANDING_CATEGORIES.map(category => {
                    const items = brandingItems.filter(b => b.category === category);
                    const completed = items.filter(b => b.status === 'completed').length;
                    const total = items.length;
                    
                    return (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{category}</h4>
                          <Badge variant="outline" className="text-xs">
                            {completed}/{total}
                          </Badge>
                        </div>
                        <Progress value={total > 0 ? (completed / total) * 100 : 0} className="h-1" />
                        <div className="mt-2 space-y-1">
                          {items.map(item => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <span className={`w-2 h-2 rounded-full ${
                                item.status === 'completed' ? 'bg-green-500' :
                                item.status === 'approved' ? 'bg-blue-500' :
                                item.status === 'review' ? 'bg-orange-500' :
                                item.status === 'in_progress' ? 'bg-yellow-500' :
                                'bg-gray-300'
                              }`} />
                              <span>{item.item_name}</span>
                              <Badge variant="outline" className="text-xs ml-auto">{item.status}</Badge>
                            </div>
                          ))}
                          {items.length === 0 && (
                            <p className="text-xs text-muted-foreground">No items in this category</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DOCUMENTS TAB ── */}
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <Button size="sm" onClick={() => setDocumentDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {DOCUMENT_FOLDERS.map(folder => {
                    const files = documents.filter(d => d.folder === folder);
                    return (
                      <div key={folder} className="border rounded-lg p-3 hover:bg-muted/30">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{folder}</span>
                          <Badge variant="outline" className="ml-auto text-xs">{files.length}</Badge>
                        </div>
                        {files.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {files.slice(0, 3).map(file => (
                              <div key={file.id} className="flex items-center gap-2 text-xs">
                                <File className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate">{file.file_name}</span>
                              </div>
                            ))}
                            {files.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{files.length - 3} more</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── COMMUNICATION TAB ── */}
          <TabsContent value="communication" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Communication Center</CardTitle>
                  <Button size="sm" onClick={() => setCommunicationDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Communication
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {communications.map(comm => (
                    <div key={comm.id} className="border-l-4 pl-4 py-2" style={{
                      borderColor: 
                        comm.communication_type === 'call' ? '#3b82f6' :
                        comm.communication_type === 'email' ? '#8b5cf6' :
                        comm.communication_type === 'whatsapp' ? '#25D366' :
                        comm.communication_type === 'meeting' ? '#f59e0b' :
                        comm.communication_type === 'followup' ? '#ef4444' :
                        '#94a3b8'
                    }}>
                      <div className="flex items-center gap-2">
                        {comm.communication_type === 'call' && <Phone className="h-4 w-4 text-blue-500" />}
                        {comm.communication_type === 'email' && <Mail className="h-4 w-4 text-purple-500" />}
                        {comm.communication_type === 'whatsapp' && <MessageSquare className="h-4 w-4 text-green-500" />}
                        {comm.communication_type === 'meeting' && <Calendar className="h-4 w-4 text-orange-500" />}
                        {comm.communication_type === 'followup' && <Bell className="h-4 w-4 text-red-500" />}
                        {comm.communication_type === 'comment' && <MessageSquare className="h-4 w-4 text-gray-500" />}
                        <span className="text-xs font-medium uppercase text-muted-foreground">{comm.communication_type}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comm.communication_date), "dd MMM yyyy, hh:mm a")}
                        </span>
                      </div>
                      {comm.subject && <p className="font-medium mt-1">{comm.subject}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{comm.message}</p>
                      {comm.next_followup_date && (
                        <p className="text-xs text-red-500 mt-1">
                          🔔 Follow-up: {format(new Date(comm.next_followup_date), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                  ))}
                  {communications.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No communications yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── DIALOGS ── */}
        
        {/* Add Stage Dialog */}
        <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Stage</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Stage Name *</Label>
                <Input 
                  value={newStage.stage_name} 
                  onChange={(e) => setNewStage({ ...newStage, stage_name: e.target.value })}
                  placeholder="Enter stage name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select 
                  value={newStage.status} 
                  onValueChange={(v) => setNewStage({ ...newStage, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
              <Button onClick={addStage}>Add Stage</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Task Dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader>
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
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Stage (Optional)</Label>
                <Select value={newTask.stage_id} onValueChange={(v) => setNewTask({ ...newTask, stage_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {projectStages.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.stage_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button onClick={addTask}>Add Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Payment Type</Label>
                <Select value={newPayment.payment_type} onValueChange={(v) => setNewPayment({ ...newPayment, payment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client Payment</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Milestone *</Label>
                <Input 
                  value={newPayment.milestone} 
                  onChange={(e) => setNewPayment({ ...newPayment, milestone: e.target.value })}
                  placeholder="e.g., Booking Amount"
                />
              </div>
              <div className="grid gap-2">
                <Label>Amount (₹) *</Label>
                <Input 
                  type="number"
                  value={newPayment.amount} 
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input type="date" value={newPayment.due_date} onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={newPayment.status} onValueChange={(v) => setNewPayment({ ...newPayment, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={addPayment}>Add Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Communication Dialog */}
        <Dialog open={communicationDialogOpen} onOpenChange={setCommunicationDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Communication</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={newCommunication.type} onValueChange={(v) => setNewCommunication({ ...newCommunication, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Subject</Label>
                <Input 
                  value={newCommunication.subject} 
                  onChange={(e) => setNewCommunication({ ...newCommunication, subject: e.target.value })}
                  placeholder="Enter subject"
                />
              </div>
              <div className="grid gap-2">
                <Label>Message *</Label>
                <Textarea 
                  value={newCommunication.message} 
                  onChange={(e) => setNewCommunication({ ...newCommunication, message: e.target.value })}
                  placeholder="Enter message"
                />
              </div>
              <div className="grid gap-2">
                <Label>Next Follow-up</Label>
                <Input type="datetime-local" value={newCommunication.next_followup} onChange={(e) => setNewCommunication({ ...newCommunication, next_followup: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCommunicationDialogOpen(false)}>Cancel</Button>
              <Button onClick={addCommunication}>Add Communication</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
            {editingProject && (
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Client Name *</Label>
                  <Input value={editingProject.name} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Brand Name</Label>
                  <Input value={editingProject.brand_name || ""} onChange={(e) => setEditingProject({ ...editingProject, brand_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Project Type</Label>
                  <Select value={editingProject.project_type || "perfume"} onValueChange={(v) => setEditingProject({ ...editingProject, project_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Project Value (₹)</Label>
                  <Input type="number" value={editingProject.project_value || 0} onChange={(e) => setEditingProject({ ...editingProject, project_value: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={editingProject.status} onValueChange={(v) => setEditingProject({ ...editingProject, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Current Stage</Label>
                  <Select value={editingProject.current_stage} onValueChange={(v) => setEditingProject({ ...editingProject, current_stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={editingProject.start_date || ""} onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Expected Launch Date</Label>
                  <Input type="date" value={editingProject.expected_launch_date || ""} onChange={(e) => setEditingProject({ ...editingProject, expected_launch_date: e.target.value })} />
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

  // ════════════════════════════════════════════════════════════
  // DASHBOARD VIEW
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Manage all client projects from one dashboard
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm">
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
              <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Client Name *</Label>
                  <Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="Enter client name" />
                </div>
                <div className="grid gap-2">
                  <Label>Brand Name</Label>
                  <Input value={newProject.brand_name} onChange={(e) => setNewProject({ ...newProject, brand_name: e.target.value })} placeholder="Enter brand name" />
                </div>
                <div className="grid gap-2">
                  <Label>Project Type</Label>
                  <Select value={newProject.project_type} onValueChange={(v) => setNewProject({ ...newProject, project_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Project Value (₹)</Label>
                  <Input type="number" value={newProject.project_value} onChange={(e) => setNewProject({ ...newProject, project_value: e.target.value })} placeholder="Enter project value" />
                </div>
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={newProject.start_date} onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Expected Launch Date</Label>
                  <Input type="date" value={newProject.expected_launch_date} onChange={(e) => setNewProject({ ...newProject, expected_launch_date: e.target.value })} />
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

      {/* ── Stats Cards ── */}
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
          value={stats.onHold}
          color="red"
        />
        <StatCard 
          icon={DollarSign}
          label="Total Value"
          value={formatCurrency(stats.totalValue)}
          color="purple"
        />
      </div>

      {/* ── Filters ── */}
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
                {PROJECT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {PROJECT_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterStage("all"); }}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ── Projects List ── */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No projects found</p>
                <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </div>
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
