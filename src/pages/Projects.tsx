import { useState, useEffect, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { format, isBefore, isToday, isThisWeek, startOfDay, differenceInDays, eachDayOfInterval, subDays, addDays, subMonths, addMonths, isSameDay, isSameMonth, startOfMonth, endOfMonth, getDay } from "date-fns";
import {
  Plus, Search, Loader2, Trash2, Edit, Eye, Download, X,
  Users, Phone, Mail, Calendar, TrendingUp, Flag, XCircle,
  FileSignature, Flame, Snowflake, Sun, FolderKanban, 
  CheckCircle, AlertTriangle, DollarSign, Clock, Rocket,
  Package, MessageSquare, Share2, MoreVertical, UserCheck,
  FileText, CreditCard, ClipboardList, Building2, Send,
  ChevronRight, ArrowLeft, Bell, File, Image, Video,
  Shield, Award, Coffee, Globe, Zap, Target, BarChart3,
  RefreshCw, Save, Copy, Upload, StickyNote, MapPin, PhoneCall,
  CircleDot, EyeOff, Filter, Users2, Briefcase, PieChart,
  Layers, Link2, ExternalLink, Archive, BookOpen, CheckSquare,
  ListChecks, CalendarDays, Timer, Hourglass, AlarmClock,
  UserPlus, UserMinus, Settings, SlidersHorizontal, FileSpreadsheet,
  Import, Table as TableIcon, FileDown, FileUp, Sparkles, Palette,
  LayoutGrid, List, ImagePlus, FolderPlus, Images, FilePlus,
  ChevronDown, Tag, History, UserCog, Clock as ClockIcon,
  Calendar as CalendarIcon, Check, AlertCircle, Info,
  Star, StarOff, ThumbsUp, ThumbsDown, MessageCircle,
  BriefcaseBusiness, Grid, ListTodo, CalendarRange, Users as UsersIcon,
  UserCog2, Target as TargetIcon, Timer as TimerIcon,
  ShoppingCart, Scale, Factory
} from "lucide-react";

// ============================================================
// CONSTANTS (Same as before)
// ============================================================
// Project Stages only (projects.current_stage) — order: Social Media → Development → Ecommerce
const PROJECT_STAGES = [
  // Social Media
  { value: "brand_identity", label: "Brand Identity", icon: "", color: "#8b5cf6" },
  { value: "brand_name", label: "Brand Name", icon: "", color: "#a855f7" },
  { value: "logo", label: "Logo", icon: "", color: "#ec4899" },
  { value: "domain_registration", label: "Domain Registration", icon: "", color: "#3b82f6" },
  { value: "trademark", label: "Trademark", icon: "", color: "#10b981" },
  { value: "mockups", label: "Mockups", icon: "", color: "#f59e0b" },
  { value: "product_name", label: "Product Name", icon: "", color: "#f97316" },
  { value: "social_media_activation", label: "Social Media Activation", icon: "", color: "#06b6d4" },
  { value: "pr", label: "PR", icon: "", color: "#db2777" },
  // Development
  { value: "ui_ux", label: "UI / UX", icon: "", color: "#6366f1" },
  { value: "shopify_theme", label: "Shopify Theme (Paid / Free)", icon: "", color: "#96bf48" },
  { value: "mobile_view", label: "Mobile View", icon: "", color: "#0ea5e9" },
  { value: "payment_gateway", label: "Payment Gateway", icon: "", color: "#ef4444" },
  { value: "logistics_integration", label: "Logistics Integration", icon: "", color: "#f97316" },
  { value: "account_creation", label: "Account Creation", icon: "", color: "#64748b" },
  { value: "qa_testing", label: "QA Testing", icon: "", color: "#22c55e" },
  { value: "live_website", label: "Live Website", icon: "", color: "#14b8a6" },
  // Ecommerce
  { value: "ecommerce_account", label: "Ecommerce Account Creation", icon: "", color: "#8b5cf6" },
  { value: "amazon_creation", label: "Amazon Account Creation", icon: "", color: "#ff9900" },
  { value: "flipkart_creation", label: "Flipkart Account Creation", icon: "", color: "#2874f0" },
  { value: "scale", label: "Scale", icon: "", color: "#ec4899" },
];

const PROJECT_STATUSES = [
  { value: "active", label: "Active", color: "#10b981" },
  { value: "on_hold", label: "On Hold", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#3b82f6" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
  { value: "refund", label: "Refund", color: "#a855f7" },
];

const PROJECT_TYPES = [
  { value: "perfume", label: "Perfume", icon: "" },
  { value: "ayurveda", label: "Ayurveda", icon: "" },
  { value: "cosmetics", label: "Cosmetics", icon: "" },
  { value: "food", label: "Food", icon: "" },
  { value: "supplements", label: "Supplements", icon: "" },
];

/** Product category options shown in Project Overview */
const PRODUCT_CATEGORIES = [
  { value: "perfume", label: "Perfume" },
  { value: "ayurveda", label: "Ayurveda" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "food", label: "Food & Beverage" },
  { value: "supplements", label: "Supplements / Nutraceutical" },
  { value: "herbal", label: "Herbal & Ayurvedic" },
  { value: "pharma", label: "Pharma" },
  { value: "other", label: "Other" },
];

/** How many products to launch (1–10) */
const PRODUCTS_TO_LAUNCH_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const PROJECT_PRIORITIES = [
  { value: "high", label: "High", color: "#ef4444", icon: "" },
  { value: "medium", label: "Medium", color: "#f59e0b", icon: "" },
  { value: "low", label: "Low", color: "#10b981", icon: "" },
];

const MANUFACTURING_STAGES = [
  "Advanced Payment",
  "Sample",
  "Documentation",
  "Production",
  "PKG Selection",
  "Quality Check",
  "Dispatch",
  "Delivery"
];

const DOCUMENT_FOLDERS = [
  "Brand Identity",
  "PAN Card",
  "Aadhaar Card",
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
  "Barcode",
  "Others"
];

const DEPARTMENT_TYPES = [
  { value: "discovery",    label: "Product Discovery",       icon: Rocket,         color: "indigo" },
  { value: "branding",     label: "Branding",                icon: Sparkles,       color: "pink" },
  { value: "packaging",    label: "Packaging",               icon: Package,        color: "amber" },
  { value: "website",      label: "Website Development",     icon: Globe,          color: "blue" },
  { value: "social",       label: "Social Media",            icon: MessageSquare,  color: "fuchsia" },
  { value: "marketplace",  label: "Marketplace Listing",     icon: ShoppingCart,   color: "orange" },
  { value: "marketing",    label: "Performance Marketing",   icon: Zap,            color: "red" },
  { value: "trademark",    label: "Trademark",               icon: Scale,          color: "emerald" },
  { value: "production",   label: "Production",              icon: Factory,        color: "slate" },
  { value: "others",       label: "Others",                  icon: Layers,         color: "gray" },
];

const DEPARTMENT_STATUSES = [
  { value: "active", label: "Active", color: "#10b981" },
  { value: "on_hold", label: "On Hold", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#3b82f6" },
  { value: "blocked", label: "Blocked", color: "#ef4444" },
];

const SUBTASK_TAGS = [
  "Design", "Content", "Approval", "Follow-up", "Review",
  "Blocked", "Urgent", "Research", "Client Input", "Other"
];

const SUBTASK_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
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
  priority: string;
  client_address: string | null;
  client_phone: string | null;
  client_email: string | null;
  image_url: string | null;
  product_category: string | null;
  products_to_launch: number | null;
  /** Free-text note e.g. fragrance of perfume, or custom text when category is Other */
  product_category_note: string | null;
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
  department_id: string | null;
  task_name: string;
  description: string | null;
  department: string | null;
  assigned_to: string | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  assigned_by: string | null;
  priority: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  completion_date: string | null;
  employee_remarks: string | null;
  created_at?: string | null;
  assigned_at?: string | null;
  updated_at?: string | null;
}

interface Department {
  id: string;
  project_id: string;
  department_id: string;
  name: string;
  department_type: string | null;
  manager_name: string | null;
  manager_email: string | null;
  status: string;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DepartmentLookup {
  id: string;
  name: string;
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

interface ProjectNote {
  id: string;
  project_id: string;
  note_type: string;
  title: string | null;
  content: string;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

interface ITTeamMember {
  id: string;
  name: string;
  email: string;
  role: string | null;
  active: boolean;
}

interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  tag: string | null;
  status: string;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  note: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface TaskRemark {
  id: string;
  task_id: string;
  remark: string;
  created_by_email: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface MyTaskRow extends ProjectTask {
  projects: {
    name: string;
    project_id: string;
    brand_name: string | null;
    client_phone: string | null;
    client_email: string | null;
    client_address: string | null;
    current_stage: string | null;
    status: string | null;
  } | null;
}

interface InternalMessage {
  id: string;
  sender_email: string;
  receiver_email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TEAM_GROUP_EMAIL = "__team_group__";
const TEAM_GROUP_MEMBER: ITTeamMember = {
  id: "__team_group__",
  name: "Team Group Chat",
  email: TEAM_GROUP_EMAIL,
  role: "Sab members — group chat",
  active: true,
};

// ============================================================
// HELPER FUNCTIONS (Same as before)
// ============================================================

const ADMIN_EMAIL = "banegabrand.admin@gmail.com";
const ADMIN_DISPLAY_NAME = "Mayank Sir";

function displayPersonName(name?: string | null, email?: string | null) {
  const em = (email || "").trim().toLowerCase();
  if (em === ADMIN_EMAIL) return ADMIN_DISPLAY_NAME;
  const n = (name || "").trim();
  if (/banega\s*brand\s*admin/i.test(n) || /^banegabrand\s*admin$/i.test(n)) return ADMIN_DISPLAY_NAME;
  return n || email || "";
}

function getStageLabel(value: string) {
  const stage = PROJECT_STAGES.find(s => s.value === value);
  return stage?.label || value;
}

function getStageIcon(value: string) {
  const stage = PROJECT_STAGES.find(s => s.value === value);
  return stage?.icon || "";
}

function getStageColor(value: string) {
  const stage = PROJECT_STAGES.find(s => s.value === value);
  return stage?.color || "#64748b";
}

/** Normalize DB status values: "On Hold", "on-hold", "ON_HOLD" → "on_hold" */
function normalizeProjectStatus(status: string | null | undefined): string {
  if (!status) return "";
  const raw = String(status).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (raw === "hold" || raw === "onhold") return "on_hold";
  if (raw === "cancel" || raw === "canceled") return "cancelled";
  if (raw === "complete" || raw === "done") return "completed";
  if (raw === "refunded" || raw === "refund_project") return "refund";
  return raw;
}

function getStatusColor(status: string) {
  const normalized = normalizeProjectStatus(status);
  const s = PROJECT_STATUSES.find(ps => ps.value === normalized);
  return s?.color || "#64748b";
}

function getStatusLabel(status: string) {
  const normalized = normalizeProjectStatus(status);
  const s = PROJECT_STATUSES.find(ps => ps.value === normalized);
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

function getProjectPriorityMeta(priority: string) {
  return PROJECT_PRIORITIES.find(p => p.value === priority) || PROJECT_PRIORITIES[1];
}

function getDepartmentTypeMeta(value: string | null) {
  return DEPARTMENT_TYPES.find(d => d.value === value) || DEPARTMENT_TYPES[DEPARTMENT_TYPES.length - 1];
}

function getDepartmentStatusMeta(status: string) {
  return DEPARTMENT_STATUSES.find(d => d.value === status) || DEPARTMENT_STATUSES[0];
}

function getDueBucket(dueDate: string | null) {
  if (!dueDate) return "no_date";
  const d = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return "overdue";
  if (isToday(d)) return "today";
  if (isThisWeek(d)) return "this_week";
  return "later";
}


function computeStageCompletionPercent(stages: { stage_name?: string | null; status?: string | null }[]): number {
  const total = PROJECT_STAGES.length;
  if (!total) return 0;
  const done = PROJECT_STAGES.filter((ps) => {
    const item = stages.find((st) => {
      const name = (st.stage_name || "").toLowerCase();
      return name === ps.label.toLowerCase() || name === ps.value.toLowerCase();
    });
    return item?.status === "completed";
  }).length;
  return Math.round((done / total) * 100);
}

function serializeBrandKit(fields: Record<string, string>, imageUrl: string | null) {
  return JSON.stringify({ __type: "brand_kit", image_url: imageUrl || null, fields });
}

function parseBrandKit(content: string): { fields: Record<string, string>; imageUrl: string | null } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.__type === "brand_kit") {
      return { fields: parsed.fields || {}, imageUrl: parsed.image_url || null };
    }
    return null;
  } catch {
    return null;
  }
}

function serializeClientTracker(fields: Record<string, string>, imageUrl: string | null) {
  return JSON.stringify({ __type: "client_tracker", image_url: imageUrl || null, fields });
}

function parseClientTracker(content: string): { fields: Record<string, string>; imageUrl: string | null } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.__type === "client_tracker") {
      return { fields: parsed.fields || {}, imageUrl: parsed.image_url || null };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// COMPONENTS
// ============================================================

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, subtitle, onClick, active }: any) {
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
    <Card
      className={`transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary" : ""} ${
        active ? "border-primary shadow-md ring-2 ring-primary/30" : ""
      }`}
      onClick={onClick}
    >
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
      {icon ? <span>{icon}</span> : null} {label}
    </span>
  );
}

// ── Project Priority Badge ──────────────────────────────────
function ProjectPriorityBadge({ priority }: { priority: string }) {
  const meta = getProjectPriorityMeta(priority);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: meta.color, background: `${meta.color}20`, border: `1px solid ${meta.color}30` }}
    >
      {meta.icon ? <span>{meta.icon}</span> : null} {meta.label}
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

// ── Subtask Tag Badge ─────────────────────────────────────────
function SubtaskTagBadge({ tag }: { tag: string | null }) {
  if (!tag) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 border border-violet-200">
      <Tag className="h-2.5 w-2.5" /> {tag}
    </span>
  );
}

// ── Project Card ──────────────────────────────────────────────
function ProjectCard({ project, onClick, onImageUpload, uploading, lastNote, lastAssignee, stageProgress }: { 
  project: Project; 
  onClick: () => void;
  onImageUpload?: (projectId: string, file: File) => Promise<void>;
  uploading?: boolean;
  lastNote?: ProjectNote | null;
  lastAssignee?: { name: string | null; email: string | null; taskName?: string | null; assignedAt?: string | null; status?: string | null } | null;
  stageProgress?: number;
}) {
  const progress = typeof stageProgress === "number" ? stageProgress : (project.completion_percentage || 0);
  const typeIcon = PROJECT_TYPES.find(t => t.value === project.project_type)?.icon || "";
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastNotePreview = (() => {
    if (!lastNote) return null;
    if (lastNote.note_type === "brand_kit") {
      const kit = parseBrandKit(lastNote.content);
      return kit?.fields?.brand_name || kit?.fields?.tagline || lastNote.title || "Brand kit";
    }
    if (lastNote.note_type === "client_tracker") {
      const t = parseClientTracker(lastNote.content);
      return t?.fields?.client_full_name || lastNote.title || "Client tracker";
    }
    const text = (lastNote.content || "").replace(/\n\[image\].*$/s, "").trim();
    return text || lastNote.title || "Note";
  })();

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }
    if (onImageUpload) {
      await onImageUpload(project.id, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div 
      className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/50 relative group"
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div 
            className="relative h-14 w-14 rounded-md border shrink-0 overflow-hidden bg-muted flex items-center justify-center"
            onClick={handleImageClick}
          >
            {project.image_url ? (
              <img
                src={project.image_url}
                alt={project.name}
                className="h-full w-full object-cover"
              />
            ) : (
              typeIcon ? (
                <span className="text-2xl">{typeIcon}</span>
              ) : (
                <FolderKanban className="h-6 w-6 text-muted-foreground" />
              )
            )}
            
            {(isHovering || !project.image_url) && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <div className="flex flex-col items-center">
                    <ImagePlus className="h-5 w-5 text-white" />
                    <span className="text-[8px] text-white mt-0.5">Upload</span>
                  </div>
                )}
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-lg">{project.name}</h4>
              <Badge variant="outline" className="text-xs font-mono">
                {project.project_id}
              </Badge>
            </div>
            {project.brand_name && (
              <p className="text-sm text-muted-foreground">{project.brand_name}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StageBadge stage={project.current_stage} />
              <StatusBadge status={project.status} />
              <ProjectPriorityBadge priority={project.priority || "medium"} />
              {project.project_value && project.project_value > 0 && (
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(project.project_value)}
                </span>
              )}
            </div>
            {(lastNotePreview || lastAssignee) && (
              <div className="mt-2 space-y-1.5 max-w-xl">
                {lastNotePreview && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
                    <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words">{lastNotePreview}</p>
                      {lastNote?.updated_at || lastNote?.created_at ? (
                        <p className="text-[10px] mt-0.5 opacity-80">
                          {format(new Date(lastNote.updated_at || lastNote.created_at), "dd MMM yyyy")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
                {lastAssignee && lastAssignee.status !== "completed" && (lastAssignee.name || lastAssignee.email) && (
                  <div className={`flex items-start gap-1.5 text-xs rounded-md px-2 py-1.5 border ${
                    lastAssignee.status === "completed"
                      ? "text-green-700 bg-green-50 border-green-200"
                      : "text-indigo-700 bg-indigo-50 border-indigo-100"
                  }`}>
                    <UserCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium truncate">
                          Last task → {lastAssignee.name || lastAssignee.email}
                        </p>
                        {lastAssignee.status === "completed" && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="h-2.5 w-2.5" /> Completed
                          </span>
                        )}
                        {lastAssignee.status && lastAssignee.status !== "completed" && (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/70 border border-current/20 opacity-80">
                            {String(lastAssignee.status).replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      {lastAssignee.taskName && (
                        <p className="text-[10px] opacity-80 line-clamp-1">{lastAssignee.taskName}</p>
                      )}
                      {lastAssignee.assignedAt && (
                        <p className="text-[10px] mt-0.5 opacity-70">
                          {format(new Date(lastAssignee.assignedAt), "dd MMM yyyy, hh:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-20 sm:w-24 h-2" />
              <span className="text-xs font-medium">{progress}%</span>
            </div>
            {project.expected_launch_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Launch {format(new Date(project.expected_launch_date), "dd MMM yyyy")}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </div>
    </div>
  );
}

// ── Department Status Badge ────────────────────────────────────
function DepartmentStatusBadge({ status }: { status: string }) {
  const meta = getDepartmentStatusMeta(status);
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: meta.color, background: `${meta.color}20`, border: `1px solid ${meta.color}30` }}
    >
      {meta.label}
    </span>
  );
}

// ── Department Card ────────────────────────────────────────────
function DepartmentCard({ department, taskCounts, onClick, onEdit, onDelete }: {
  department: Department;
  taskCounts: { total: number; completed: number };
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeMeta = getDepartmentTypeMeta(department.department_type);
  const Icon = typeMeta.icon;
  const progress = taskCounts.total > 0
    ? Math.round((taskCounts.completed / taskCounts.total) * 100)
    : department.progress || 0;

  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{department.name}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <DepartmentStatusBadge status={department.status} />
              {department.manager_name && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <UserCheck className="h-3 w-3" /> {department.manager_name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{taskCounts.completed}/{taskCounts.total} tasks completed</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
      {department.due_date && (
        <p className="text-xs text-muted-foreground mt-2">
          Due: {format(new Date(department.due_date), "dd MMM yyyy")}
        </p>
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
              <span>Due: {format(new Date(payment.due_date), "dd MMM yyyy")}</span>
            )}
            {payment.paid_date && (
              <span>Paid: {format(new Date(payment.paid_date), "dd MMM yyyy")}</span>
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
                onChange={(e) => {
                  setPaidDate(e.target.value);
                  if (status === 'paid') {
                    onStatusChange(payment.id, status, e.target.value);
                  }
                }}
                className="h-8 text-sm"
                disabled={status !== 'paid'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ============================================================
// CONSTANTS - Add these before the BRAND_KIT_FIELDS section
// ============================================================

// ── Brand Identity Kit field definitions ──
const BRAND_KIT_FIELDS: { key: string; label: string; type: "input" | "textarea" }[] = [
  { key: "brand_name", label: "Brand Name", type: "input" },
  { key: "tagline", label: "Tagline", type: "input" },
  { key: "brand_introduction", label: "Brand Introduction", type: "textarea" },
  { key: "brand_story", label: "Brand Story", type: "textarea" },
  { key: "brand_meaning", label: "Brand Meaning", type: "textarea" },
  { key: "brand_mission", label: "Brand Mission", type: "textarea" },
  { key: "brand_vision", label: "Brand Vision", type: "textarea" },
  { key: "brand_values", label: "Brand Values", type: "textarea" },
  { key: "target_audience", label: "Target Audience", type: "textarea" },
  { key: "brand_positioning", label: "Brand Positioning", type: "textarea" },
  { key: "usp", label: "Unique Selling Proposition (USP)", type: "textarea" },
  { key: "brand_personality", label: "Brand Personality", type: "input" },
  { key: "tone_of_voice", label: "Tone of Voice", type: "input" },
  { key: "brand_keywords", label: "Brand Keywords", type: "input" },
  { key: "theme", label: "Theme", type: "input" },
  { key: "mood", label: "Mood", type: "input" },
  { key: "primary_colors", label: "Primary Colors", type: "input" },
  { key: "secondary_colors", label: "Secondary Colors", type: "input" },
  { key: "typography", label: "Typography", type: "input" },
  { key: "packaging_style", label: "Packaging Style", type: "textarea" },
  { key: "photography_style", label: "Photography Style", type: "textarea" },
  { key: "competitor_brands", label: "Competitor Brands", type: "input" },
  { key: "website", label: "Website", type: "input" },
  { key: "social_media_links", label: "Social Media Links", type: "input" },
  { key: "trademark_status", label: "Trademark Status", type: "input" },
  { key: "brand_notes", label: "Notes", type: "textarea" },
];

const EMPTY_BRAND_KIT: Record<string, string> = BRAND_KIT_FIELDS.reduce(
  (acc, f) => ({ ...acc, [f.key]: "" }),
  {} as Record<string, string>
);

// ── Client Progress Tracker field definitions ──
const CLIENT_TRACKER_SECTIONS: {
  key: string;
  title: string;
  emoji: string;
  fields: { key: string; label: string; type: "input" | "textarea" }[];
}[] = [
  {
    key: "client_details",
    title: "CLIENT DETAILS",
    emoji: "🟣",
    fields: [
      { key: "client_full_name", label: "Client Full Name", type: "input" },
      { key: "client_mobile_number", label: "Client Mobile Number", type: "input" },
      { key: "client_email_address", label: "Client Email Address", type: "input" },
      { key: "alternative_number", label: "Alternative Number", type: "input" },
      { key: "client_home_address", label: "Client Home Address", type: "textarea" },
      { key: "company_name", label: "Company Name if any", type: "input" },
      { key: "gst_number", label: "GST Number", type: "input" },
      { key: "pan_number", label: "PAN Number", type: "input" },
      { key: "aadhaar_number", label: "Aadhaar Number", type: "input" },
      { key: "city", label: "City", type: "input" },
      { key: "state", label: "State", type: "input" },
      { key: "pincode", label: "Pincode", type: "input" },
      { key: "relationship_manager", label: "Relationship Manager", type: "input" },
      { key: "sales_person", label: "Sales Person", type: "input" },
    ],
  },
  {
    key: "project_details",
    title: "PROJECT DETAILS",
    emoji: "🟠",
    fields: [
      { key: "category", label: "Category", type: "input" },
      { key: "package_details", label: "Package Details", type: "input" },
      { key: "project_value", label: "Project Value", type: "input" },
      { key: "advance_paid", label: "Advance Paid", type: "input" },
      { key: "pending_amount", label: "Pending Amount", type: "input" },
      { key: "payment_status", label: "Payment Status", type: "input" },
      { key: "expected_launch_date", label: "Expected Launch Date", type: "input" },
      { key: "current_stage", label: "Current Stage", type: "input" },
      { key: "priority", label: "Priority (High/Medium/Low)", type: "input" },
    ],
  },
  {
    key: "brand_development",
    title: "BRAND DEVELOPMENT",
    emoji: "🔵",
    fields: [
      { key: "brand_name_final", label: "Brand Name Final", type: "input" },
      { key: "domain_available", label: "Domain Available", type: "input" },
      { key: "domain_purchased", label: "Domain Purchased", type: "input" },
      { key: "instagram_username", label: "Instagram Username", type: "input" },
      { key: "facebook_page", label: "Facebook Page", type: "input" },
      { key: "logo_final", label: "Logo Final", type: "input" },
      { key: "tagline", label: "Tagline", type: "input" },
      { key: "brand_story", label: "Brand Story", type: "textarea" },
      { key: "target_audience", label: "Target Audience", type: "textarea" },
    ],
  },
  {
    key: "legal",
    title: "LEGAL",
    emoji: "🟢",
    fields: [
      { key: "agreement_done", label: "Agreement Done", type: "input" },
      { key: "nda_signed", label: "NDA Signed", type: "input" },
      { key: "trademark_done", label: "Trademark Done", type: "input" },
      { key: "gst_done", label: "GST Done", type: "input" },
      { key: "msme_done", label: "MSME Done", type: "input" },
      { key: "barcode_done", label: "Barcode Done", type: "input" },
      { key: "label_compliance", label: "Label Compliance", type: "input" },
      { key: "ifra_certificate", label: "IFRA Certificate", type: "input" },
      { key: "msds_available", label: "MSDS Available", type: "input" },
    ],
  },
  {
    key: "product_development",
    title: "PRODUCT DEVELOPMENT",
    emoji: "🟡",
    fields: [
      { key: "bottle_selected", label: "Bottle Selected", type: "input" },
      { key: "bottle_size", label: "Bottle Size", type: "input" },
      { key: "bottle_color", label: "Bottle Color", type: "input" },
      { key: "cap_selected", label: "Cap Selected", type: "input" },
      { key: "pump_selected", label: "Pump Selected", type: "input" },
      { key: "moq", label: "MOQ", type: "input" },
      { key: "number_of_total_units", label: "Number of Total Units", type: "input" },
      { key: "rate_per_unit", label: "Rate per Unit", type: "input" },
      { key: "fragrance_name", label: "Fragrance Name", type: "input" },
      { key: "variant_name", label: "Variant Name", type: "input" },
      { key: "packaging_final", label: "Packaging Final", type: "input" },
      { key: "label_final", label: "Label Final", type: "input" },
      { key: "box_final", label: "Box Final", type: "input" },
    ],
  },
  {
    key: "manufacturing",
    title: "MANUFACTURING",
    emoji: "🔴",
    fields: [
      { key: "manufacturer_name", label: "Manufacturer Name", type: "input" },
      { key: "sample_sent", label: "Sample Sent", type: "input" },
      { key: "sample_approved", label: "Sample Approved", type: "input" },
      { key: "production_started", label: "Production Started", type: "input" },
      { key: "qc_completed", label: "QC Completed", type: "input" },
      { key: "dispatch_date", label: "Dispatch Date", type: "input" },
      { key: "tracking_number", label: "Tracking Number", type: "input" },
      { key: "delivery_status", label: "Delivery Status", type: "input" },
    ],
  },
  {
    key: "marketing",
    title: "MARKETING",
    emoji: "🟢",
    fields: [
      { key: "product_shoot", label: "Product Shoot", type: "input" },
      { key: "lifestyle_shoot", label: "Lifestyle Shoot", type: "input" },
      { key: "website_ready", label: "Website Ready", type: "input" },
      { key: "landing_page", label: "Landing Page", type: "input" },
      { key: "social_media_kit", label: "Social Media Kit", type: "input" },
      { key: "amazon_listing", label: "Amazon Listing", type: "input" },
      { key: "flipkart_listing", label: "Flipkart Listing", type: "input" },
      { key: "meta_ads_ready", label: "Meta Ads Ready", type: "input" },
      { key: "launch_reel_ready", label: "Launch Reel Ready", type: "input" },
    ],
  },
  {
    key: "file_links",
    title: "FILE LINKS",
    emoji: "📂",
    fields: [
      { key: "client_folder", label: "Client Folder", type: "input" },
      { key: "agreement_file", label: "Agreement", type: "input" },
      { key: "trademark_certificate", label: "Trademark Certificate", type: "input" },
      { key: "logo_files", label: "Logo Files", type: "input" },
      { key: "packaging_files", label: "Packaging Files", type: "input" },
      { key: "product_images", label: "Product Images", type: "input" },
      { key: "final_deliverables", label: "Final Deliverables", type: "input" },
    ],
  },
  {
    key: "blocker",
    title: "BLOCKER",
    emoji: "🚧",
    fields: [
      { key: "blocker", label: "Blocker (What's stopping the project?)", type: "textarea" },
    ],
  },
];

const CLIENT_TRACKER_FIELDS = CLIENT_TRACKER_SECTIONS.flatMap((s) => s.fields);
const EMPTY_CLIENT_TRACKER: Record<string, string> = CLIENT_TRACKER_FIELDS.reduce(
  (acc, f) => ({ ...acc, [f.key]: "" }),
  {} as Record<string, string>
);


// ── Social Media 25-Day Content Calendar ──
interface ContentDay {
  day: number;
  title: string;
  caption: string;
  platform: string;
  status: "pending" | "completed";
  note: string;
  scheduled_date?: string;
}

const CONTENT_PLATFORMS = [
  "Instagram",
  "Facebook",
  "YouTube",
  "WhatsApp Status",
  "LinkedIn",
  "Twitter / X",
  "Reels",
  "Stories",
  "Other",
];

const EMPTY_CONTENT_DAY = (day: number): ContentDay => ({
  day,
  title: "",
  caption: "",
  platform: "Instagram",
  status: "pending",
  note: "",
  scheduled_date: "",
});

function createEmptyContentCalendar(startDate?: string): ContentDay[] {
  const days: ContentDay[] = [];
  const base = startDate ? startOfDay(new Date(startDate)) : null;
  for (let i = 1; i <= 25; i++) {
    const d = EMPTY_CONTENT_DAY(i);
    if (base) {
      d.scheduled_date = format(addDays(base, i - 1), "yyyy-MM-dd");
    }
    days.push(d);
  }
  return days;
}

function serializeContentCalendar(days: ContentDay[], startDate: string | null) {
  return JSON.stringify({
    __type: "content_calendar",
    start_date: startDate || null,
    days,
  });
}

function parseContentCalendar(content: string): { days: ContentDay[]; startDate: string | null } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.__type === "content_calendar") {
      const days = Array.isArray(parsed.days)
        ? parsed.days.map((d: any, idx: number) => ({
            day: d.day ?? idx + 1,
            title: d.title || "",
            caption: d.caption || "",
            platform: d.platform || "Instagram",
            status: d.status === "completed" ? "completed" : "pending",
            note: d.note || "",
            scheduled_date: d.scheduled_date || "",
          }))
        : createEmptyContentCalendar(parsed.start_date);
      while (days.length < 25) days.push(EMPTY_CONTENT_DAY(days.length + 1));
      return { days: days.slice(0, 25), startDate: parsed.start_date || null };
    }
    return null;
  } catch {
    return null;
  }
}

// Also need to add TaskCard component that's used in the detail view
// ── Task Card ──────────────────────────────────────────────────
function TaskCard({
  task,
  itTeam,
  subtasks,
  subtasksLoading,
  onStatusChange,
  onAssign,
  onDelete,
  onToggleExpand,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: {
  task: ProjectTask;
  itTeam: ITTeamMember[];
  subtasks: TaskSubtask[];
  subtasksLoading: boolean;
  onStatusChange: (id: string, status: string) => void;
  onAssign: (id: string, email: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (taskId: string) => void;
  onAddSubtask: (taskId: string, title: string, tag: string) => void;
  onToggleSubtask: (subtaskId: string, taskId: string, currentStatus: string) => void;
  onDeleteSubtask: (subtaskId: string, taskId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskTag, setSubtaskTag] = useState("");
  const subtasksCompleted = subtasks.filter((s) => s.status === "completed").length;

  const handleToggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) onToggleExpand(task.id);
  };

  const handleAddSubtask = () => {
    if (!subtaskTitle.trim()) return;
    onAddSubtask(task.id, subtaskTitle.trim(), subtaskTag);
    setSubtaskTitle("");
    setSubtaskTag("");
  };

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
            <button
              type="button"
              onClick={handleToggleExpand}
              className="flex items-center gap-2 text-left"
              title={expanded ? "Collapse" : "Expand task"}
            >
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
              <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                {task.task_name}
              </span>
            </button>
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {subtasks.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                Completed {subtasksCompleted}/{subtasks.length} subtasks
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 ml-9">{task.description}</p>
          )}
          <div className="flex items-center gap-4 mt-1 ml-9 text-xs text-muted-foreground flex-wrap">
            {task.department && <span>📁 {task.department}</span>}
            {task.due_date && (
              <span>Due: {format(new Date(task.due_date), "dd MMM yyyy")}</span>
            )}
            {task.assigned_to_name || task.assigned_to_email ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                👤 {task.assigned_to_name || task.assigned_to_email}
              </span>
            ) : (
              <span className="text-amber-600">👤 Unassigned</span>
            )}
            {(task.assigned_at || task.created_at) && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                🕒 {format(new Date(task.assigned_at || task.created_at!), "dd MMM yyyy, hh:mm a")}
              </span>
            )}
          </div>

          {task.employee_remarks && (
            <div className="mt-2 ml-9 bg-blue-50 border border-blue-100 rounded-md p-2 max-w-md">
              <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
                💬 {task.assigned_to_name || "Employee"}'s update:
              </p>
              <p className="text-xs text-blue-900 mt-0.5 whitespace-pre-wrap">{task.employee_remarks}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleExpand}>
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Status: </span>
              <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">Processing</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Done</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-muted-foreground">Assign To: </span>
              <Select
                value={task.assigned_to_email || "unassigned"}
                onValueChange={(v) => {
                  const member = itTeam.find((m) => m.email === v);
                  onAssign(task.id, v, member?.name || v);
                }}
              >
                <SelectTrigger className="h-7 text-xs w-44">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {itTeam.map((m) => (
                    <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Subtasks ── */}
          <div>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
              <ListChecks className="h-3.5 w-3.5 text-violet-600" /> Subtasks
            </p>
            {subtasksLoading ? (
              <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : (
              <div className="space-y-1.5">
                {subtasks.map((st) => (
                  <div key={st.id} className="border rounded-md px-2 py-1.5 bg-background space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={st.status === "completed"}
                        onChange={() => onToggleSubtask(st.id, task.id, st.status)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className={`text-sm flex-1 ${st.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {st.title}
                      </span>
                      <SubtaskTagBadge tag={st.tag} />
                      {(st.assigned_to_name || st.assigned_to_email) && (
                        <span className="text-[10px] text-indigo-600">👤 {st.assigned_to_name || st.assigned_to_email}</span>
                      )}
                      {st.created_at && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(st.created_at), "dd MMM, hh:mm a")}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onDeleteSubtask(st.id, task.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {st.note && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1 ml-6 whitespace-pre-wrap">
                        📝 {st.note}
                      </p>
                    )}
                  </div>
                ))}
                {subtasks.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">No subtasks yet — break this task down below.</p>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Input
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Add a subtask..."
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
              />
              <Select value={subtaskTag} onValueChange={setSubtaskTag}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
                <SelectContent>
                  {SUBTASK_TAGS.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={handleAddSubtask}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Task Dashboard ────────────────────────────────────────────
function TaskDashboard({ tasks, onStatusChange, onDelete }: {
  tasks: ProjectTask[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const columns: { key: string; label: string; color: string }[] = [
    { key: "not_started", label: "Not Started", color: "#94a3b8" },
    { key: "in_progress", label: "Processing", color: "#3b82f6" },
    { key: "review", label: "Review", color: "#f59e0b" },
    { key: "completed", label: "Done", color: "#10b981" },
    { key: "blocked", label: "Blocked", color: "#ef4444" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} className="bg-muted/30 rounded-lg p-3 min-h-[200px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                {col.label}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5">{colTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {colTasks.map(task => (
                <TaskKanbanCard key={task.id} task={task} onStatusChange={onStatusChange} onDelete={onDelete} />
              ))}
              {colTasks.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-6">No tasks</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Task Kanban Card ──────────────────────────────────────────
function TaskKanbanCard({ task, onStatusChange, onDelete }: {
  task: ProjectTask;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const bucket = getDueBucket(task.due_date);
  return (
    <div className="border rounded-lg p-3 bg-background hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.task_name}</p>
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-destructive" onClick={() => onDelete(task.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.due_date && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${bucket === "overdue" && task.status !== "completed" ? "bg-red-50 text-red-600 border-red-200" : "bg-muted text-muted-foreground"}`}>
            Due {format(new Date(task.due_date), "dd MMM")}
          </span>
        )}
      </div>
      {(task.assigned_to_name || task.assigned_to_email) && (
        <p className="text-[11px] text-indigo-600 mt-1.5">👤 {task.assigned_to_name || task.assigned_to_email}</p>
      )}
      <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
        <SelectTrigger className="h-6 text-[11px] mt-2 w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="not_started">Not Started</SelectItem>
          <SelectItem value="in_progress">Processing</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="completed">Done</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
// ── Note Card ──────────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete }: {
  note: ProjectNote;
  onEdit: (note: ProjectNote) => void;
  onDelete: (id: string) => void;
}) {
  const brandKit = note.note_type === "brand_kit" ? parseBrandKit(note.content) : null;
  const clientTracker = note.note_type === "client_tracker" ? parseClientTracker(note.content) : null;

  if (clientTracker) {
    const clientName = clientTracker.fields.client_full_name || note.title || "Client Progress Tracker";
    return (
      <div className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {clientTracker.imageUrl && (
              <img
                src={clientTracker.imageUrl}
                alt={clientName}
                className="h-16 w-16 rounded-md object-cover border shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ClipboardList className="h-4 w-4 text-fuchsia-500 shrink-0" />
                <p className="font-medium">{clientName}</p>
                <Badge variant="outline" className="text-xs">Client Tracker</Badge>
              </div>
              <div className="mt-2 space-y-2">
                {CLIENT_TRACKER_SECTIONS.map((section) => {
                  const filled = section.fields.filter((f) => clientTracker.fields[f.key]);
                  if (filled.length === 0) return null;
                  return (
                    <div key={section.key}>
                      <p className="text-xs font-semibold text-foreground">
                        {section.emoji} {section.title}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 mt-0.5">
                        {filled.map((f) => (
                          <p key={f.key} className="text-xs text-muted-foreground truncate">
                            <span className="font-medium text-foreground">{f.label}: </span>
                            {clientTracker.fields[f.key]}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span>🕒 {format(new Date(note.created_at), "dd MMM yyyy, hh:mm a")}</span>
                {note.created_by && <span>👤 {note.created_by}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(note)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(note.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (brandKit) {
    const filledFields = BRAND_KIT_FIELDS.filter(f => brandKit.fields[f.key]);
    return (
      <div className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {brandKit.imageUrl && (
              <img
                src={brandKit.imageUrl}
                alt={brandKit.fields.brand_name || "Brand image"}
                className="h-16 w-16 rounded-md object-cover border shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Palette className="h-4 w-4 text-purple-500 shrink-0" />
                <p className="font-medium">{brandKit.fields.brand_name || note.title || "Brand Identity Kit"}</p>
                <Badge variant="outline" className="text-xs">Brand Kit</Badge>
              </div>
              {brandKit.fields.tagline && (
                <p className="text-sm text-muted-foreground italic mt-0.5">"{brandKit.fields.tagline}"</p>
              )}
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {filledFields.filter(f => !["brand_name", "tagline"].includes(f.key)).slice(0, 6).map(f => (
                  <p key={f.key} className="text-xs text-muted-foreground truncate">
                    <span className="font-medium text-foreground">{f.label}: </span>
                    {brandKit.fields[f.key]}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span>🕒 {format(new Date(note.created_at), "dd MMM yyyy, hh:mm a")}</span>
                {note.created_by && <span>👤 {note.created_by}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(note)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(note.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {note.title && <p className="font-medium">{note.title}</p>}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{note.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span>🕒 {format(new Date(note.created_at), "dd MMM yyyy, hh:mm a")}</span>
            {note.updated_at && note.updated_at !== note.created_at && (
              <span>✏️ Edited: {format(new Date(note.updated_at), "dd MMM yyyy, hh:mm a")}</span>
            )}
            {note.created_by && <span>👤 {note.created_by}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(note)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(note.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TASK DETAIL DIALOG COMPONENT
// ============================================================
interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: MyTaskRow | null;
  itTeam: ITTeamMember[];
  subtasks: TaskSubtask[];
  remarks: TaskRemark[];
  projectNote: ProjectNote | null;
  currentUserEmail: string;
  onStatusChange: (taskId: string, status: string) => void;
  onAssign: (taskId: string, email: string, name: string) => void;
  onAddSubtask: (taskId: string, title: string, tag: string, assigneeEmail: string | null) => void;
  onToggleSubtask: (subtaskId: string, taskId: string, currentStatus: string) => void;
  onDeleteSubtask: (subtaskId: string, taskId: string) => void;
  onUpdateSubtaskNote?: (subtaskId: string, taskId: string, note: string) => void;
  onAddRemark: (taskId: string, remark: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSaveProjectNote: (projectId: string, content: string) => void;
  onFetchSubtasks: (taskId: string) => void;
  onFetchRemarks: (taskId: string) => void;
  subtasksLoading: boolean;
  remarksLoading: boolean;
  savingRemark: boolean;
  projectNoteLoading: boolean;
}

function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  itTeam,
  subtasks,
  remarks,
  projectNote,
  currentUserEmail,
  onStatusChange,
  onAssign,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtaskNote,
  onAddRemark,
  onDeleteTask,
  onSaveProjectNote,
  onFetchSubtasks,
  onFetchRemarks,
  subtasksLoading,
  remarksLoading,
  savingRemark,
  projectNoteLoading,
}: TaskDetailDialogProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskTag, setNewSubtaskTag] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState("");
  const [newRemark, setNewRemark] = useState("");
  const [editingProjectNote, setEditingProjectNote] = useState(false);
  const [projectNoteContent, setProjectNoteContent] = useState(projectNote?.content || "");
  const [showRemarksHistory, setShowRemarksHistory] = useState(true);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [editingSubtaskNoteId, setEditingSubtaskNoteId] = useState<string | null>(null);
  const [subtaskNoteDraft, setSubtaskNoteDraft] = useState("");

  useEffect(() => {
    if (task) {
      setProjectNoteContent(projectNote?.content || "");
      setEditingProjectNote(false);
      setNewRemark("");
      setNewSubtaskTitle("");
      setNewSubtaskTag("");
      setNewSubtaskAssignee("");
    }
  }, [task, projectNote]);

  if (!task) return null;

  const isOverdue = task.due_date && 
    isBefore(new Date(task.due_date), startOfDay(new Date())) && 
    task.status !== "completed";

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-gray-100 text-gray-700 border-gray-200"
  };

  const statusColors: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-700 border-gray-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    review: "bg-yellow-100 text-yellow-700 border-yellow-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    blocked: "bg-red-100 text-red-700 border-red-200"
  };

  const statusOptions = [
    { value: "not_started", label: "Not Started" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "completed", label: "Completed" },
    { value: "blocked", label: "Blocked" }
  ];

  const subtaskTags = [
    "Design", "Content", "Approval", "Follow-up", "Review",
    "Blocked", "Urgent", "Research", "Client Input", "Other"
  ];

  const completedSubtasks = subtasks.filter(s => s.status === "completed").length;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) {
      toast.error("Please enter subtask title");
      return;
    }
    onAddSubtask(
      task.id,
      newSubtaskTitle.trim(),
      newSubtaskTag,
      (newSubtaskAssignee && newSubtaskAssignee !== "unassigned") ? newSubtaskAssignee : null
    );
    setNewSubtaskTitle("");
    setNewSubtaskTag("");
    setNewSubtaskAssignee("");
  };

  const handleAddRemark = () => {
    if (!newRemark.trim()) {
      toast.error("Please enter your update");
      return;
    }
    onAddRemark(task.id, newRemark.trim());
    setNewRemark("");
  };

  const handleSaveProjectNote = () => {
    if (!projectNoteContent.trim()) {
      toast.error("Please enter project update");
      return;
    }
    onSaveProjectNote(task.project_id, projectNoteContent.trim());
    setEditingProjectNote(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 flex-wrap">
                {task.task_name}
                <Badge 
                  variant="outline" 
                  className={`${priorityColors[task.priority] || priorityColors.medium} text-xs`}
                >
                  {task.priority?.toUpperCase() || "MEDIUM"}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    ⚠️ OVERDUE
                  </Badge>
                )}
              </DialogTitle>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>{task.projects?.name}</span>
                {task.projects?.brand_name && <span>• {task.projects.brand_name}</span>}
                {(task.assigned_at || task.created_at) && (
                  <span className="inline-flex items-center gap-1">
                    • <ClockIcon className="h-3 w-3" />
                    Assigned: {format(new Date(task.assigned_at || task.created_at!), "dd MMM yyyy, hh:mm a")}
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Are you sure you want to delete this task?")) {
                  onDeleteTask(task.id);
                  onOpenChange(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="space-y-6">
            {/* Task Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select 
                  value={task.status} 
                  onValueChange={(v) => onStatusChange(task.id, v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[opt.value]}`}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserCog className="h-3 w-3" /> Assign To
                </Label>
                <Select 
                  value={task.assigned_to_email || "unassigned"} 
                  onValueChange={(v) => {
                    const member = itTeam.find(m => m.email === v);
                    if (member) {
                      onAssign(task.id, member.email, member.name);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {itTeam.map(member => (
                      <SelectItem key={member.id} value={member.email}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" /> Due Date
                </Label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isOverdue ? "text-red-600" : ""}`}>
                    {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "No due date"}
                  </span>
                  {task.due_date && task.status !== "completed" && (
                    <Badge variant="outline" className="text-xs">
                      {differenceInDays(new Date(task.due_date), new Date())} days left
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                </div>
              </div>
            )}

            {/* Client Details */}
            {task.projects && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Client Details
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Client</p>
                      <p className="text-sm font-medium">{task.projects.name}</p>
                    </div>
                  </div>
                  {task.projects.client_phone && (
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{task.projects.client_phone}</p>
                      </div>
                    </div>
                  )}
                  {task.projects.client_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{task.projects.client_email}</p>
                      </div>
                    </div>
                  )}
                  {task.projects.client_address && (
                    <div className="flex items-center gap-2 col-span-full">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">{task.projects.client_address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Project Note / Update Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Project Update (visible to whole team)
                </Label>
                {!editingProjectNote && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => setEditingProjectNote(true)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              
              {projectNoteLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : editingProjectNote ? (
                <div className="space-y-2">
                  <Textarea
                    value={projectNoteContent}
                    onChange={(e) => setProjectNoteContent(e.target.value)}
                    rows={3}
                    placeholder="What's happening in this project? Share updates with the team..."
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProjectNote}>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditingProjectNote(false);
                        setProjectNoteContent(projectNote?.content || "");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-sm whitespace-pre-wrap">
                    {projectNote?.content || "No project update yet. Click Edit to add one."}
                  </p>
                  {projectNote?.updated_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last updated: {format(new Date(projectNote.updated_at), "dd MMM yyyy, hh:mm a")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Subtasks Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="flex items-center gap-2 hover:opacity-70"
                  >
                    <Label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
                      <ListChecks className="h-4 w-4" />
                      Subtasks
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {completedSubtasks}/{subtasks.length}
                    </Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showSubtasks ? "rotate-180" : ""}`} />
                  </button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => onFetchSubtasks(task.id)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>

              {showSubtasks && (
                <>
                  {subtasksLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subtasks.map((subtask) => (
                        <div 
                          key={subtask.id} 
                          className="border rounded-lg p-2 hover:bg-muted/30 transition-colors space-y-2"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={subtask.status === "completed"}
                              onChange={() => onToggleSubtask(subtask.id, task.id, subtask.status)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                            />
                            <span className={`text-sm flex-1 ${subtask.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                              {subtask.title}
                            </span>
                            {subtask.tag && (
                              <Badge variant="outline" className="text-xs bg-violet-50 border-violet-200 text-violet-700">
                                {subtask.tag}
                              </Badge>
                            )}
                            {subtask.assigned_to_name && (
                              <span className="text-xs text-indigo-600 flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                {subtask.assigned_to_name}
                              </span>
                            )}
                            {subtask.created_at && (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {format(new Date(subtask.created_at), "dd MMM, hh:mm a")}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Add / edit note"
                              onClick={() => {
                                setEditingSubtaskNoteId(editingSubtaskNoteId === subtask.id ? null : subtask.id);
                                setSubtaskNoteDraft(subtask.note || "");
                              }}
                            >
                              <StickyNote className="h-3 w-3 text-amber-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => onDeleteSubtask(subtask.id, task.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {subtask.note && editingSubtaskNoteId !== subtask.id && (
                            <div className="ml-7 text-xs bg-amber-50 border border-amber-100 rounded-md p-2 text-amber-900 whitespace-pre-wrap">
                              <span className="font-medium">📝 Note: </span>{subtask.note}
                            </div>
                          )}
                          {editingSubtaskNoteId === subtask.id && (
                            <div className="ml-7 space-y-2">
                              <Textarea
                                value={subtaskNoteDraft}
                                onChange={(e) => setSubtaskNoteDraft(e.target.value)}
                                rows={3}
                                placeholder="Jo jo hua uski history / note yahan likhein..."
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    onUpdateSubtaskNote?.(subtask.id, task.id, subtaskNoteDraft.trim());
                                    setEditingSubtaskNoteId(null);
                                    setSubtaskNoteDraft("");
                                  }}
                                >
                                  <Save className="h-3 w-3 mr-1" /> Save Note
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setEditingSubtaskNoteId(null);
                                    setSubtaskNoteDraft("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {subtasks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No subtasks yet. Break down this task below.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add Subtask Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Subtask title..."
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddSubtask();
                      }}
                    />
                    <Select value={newSubtaskTag} onValueChange={setNewSubtaskTag}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {subtaskTags.map(tag => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Select value={newSubtaskAssignee || "unassigned"} onValueChange={setNewSubtaskAssignee}>
                        <SelectTrigger className="text-sm flex-1">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {itTeam.map(member => (
                            <SelectItem key={member.id} value={member.email}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleAddSubtask} className="shrink-0">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Remarks / History Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setShowRemarksHistory(!showRemarksHistory)}
                  className="flex items-center gap-2 hover:opacity-70"
                >
                  <Label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
                    <History className="h-4 w-4" />
                    Update History
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {remarks.length}
                  </Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showRemarksHistory ? "rotate-180" : ""}`} />
                </button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => onFetchRemarks(task.id)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>

              {showRemarksHistory && (
                <>
                  {remarksLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {remarks.map((remark) => (
                        <div 
                          key={remark.id} 
                          className="p-3 bg-muted/30 rounded-lg border border-muted"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm whitespace-pre-wrap flex-1">{remark.remark}</p>
                            {remark.created_by_email === currentUserEmail && (
                              <Badge variant="outline" className="text-xs shrink-0">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {remark.created_by_name || remark.created_by_email || "Unknown"}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              {format(new Date(remark.created_at), "dd MMM yyyy, hh:mm a")}
                            </span>
                          </div>
                        </div>
                      ))}
                      {remarks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No updates yet. Add your first update below.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add Remark Form */}
                  <div className="space-y-2 mt-3">
                    <Textarea
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      rows={2}
                      placeholder="Add your update/remark... (e.g., Sample sent, waiting for approval)"
                      className="text-sm"
                    />
                    <Button 
                      onClick={handleAddRemark} 
                      disabled={savingRemark || !newRemark.trim()}
                      className="w-full sm:w-auto"
                    >
                      {savingRemark ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Add Update
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// TASK ASSIGNMENT PAGE COMPONENT
// ============================================================
function TaskAssignmentPage({ 
  itTeam, 
  user,
  onTaskClick 
}: { 
  itTeam: ITTeamMember[]; 
  user: any;
  onTaskClick?: (task: MyTaskRow) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  // Fetch all tasks
  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ["all_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          *,
          projects (
            name,
            project_id,
            brand_name,
            client_phone,
            client_email,
            client_address,
            current_stage,
            status,
            image_url
          )
        `)
        .order("due_date", { ascending: true, nullsLast: true });

      if (error) throw error;
      return data as unknown as MyTaskRow[];
    },
  });

  // Get unique projects for filter
  const projects = Array.from(
    new Set(allTasks.map(t => t.projects?.name).filter(Boolean))
  ) as string[];

  // Filter tasks
  const filteredTasks = allTasks
    .filter(task => {
      if (selectedMember && task.assigned_to_email !== selectedMember) return false;
      // Employee-complete tasks hide from assignment list unless user explicitly filters Completed
      if (statusFilter === "all" && task.status === "completed") return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (projectFilter !== "all" && task.projects?.name !== projectFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTask = task.task_name.toLowerCase().includes(q);
        const matchProject = task.projects?.name.toLowerCase().includes(q);
        const matchBrand = task.projects?.brand_name?.toLowerCase().includes(q);
        return matchTask || matchProject || matchBrand;
      }
      return true;
    });

  // Get task counts per team member
  const memberTaskCounts = itTeam.map(member => ({
    ...member,
    total: allTasks.filter(t => t.assigned_to_email === member.email).length,
    completed: allTasks.filter(t => t.assigned_to_email === member.email && t.status === "completed").length,
    overdue: allTasks.filter(t => 
      t.assigned_to_email === member.email && 
      t.due_date && 
      isBefore(new Date(t.due_date), startOfDay(new Date())) && 
      t.status !== "completed"
    ).length,
  }));

  const selectedMemberData = itTeam.find(m => m.email === selectedMember);

  // Update assignment
  const assignTask = async (taskId: string, email: string, name: string) => {
    try {
      const payload: Record<string, any> = {
        assigned_to_email: email || null,
        assigned_to_name: name || null,
        assigned_at: email ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      let { data, error } = await supabase
        .from("project_tasks")
        .update(payload)
        .eq("id", taskId)
        .select();
      if (error && String(error.message || "").toLowerCase().includes("assigned_at")) {
        const retry = await supabase
          .from("project_tasks")
          .update({ assigned_to_email: email || null, assigned_to_name: name || null, updated_at: new Date().toISOString() })
          .eq("id", taskId)
          .select();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Update blocked (0 rows changed) — check RLS UPDATE policy on project_tasks.");
        return;
      }

      toast.success(email ? `Task assigned to ${name}` : "Task unassigned");
      queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
      queryClient.invalidateQueries({ queryKey: ["project_last_assignees"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign task");
    }
  };

  // Bulk assign tasks
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [bulkAssignMember, setBulkAssignMember] = useState("");
  const [bulkAssignTasks, setBulkAssignTasks] = useState<string[]>([]);

  const handleBulkAssign = async () => {
    if (!bulkAssignMember || bulkAssignTasks.length === 0) {
      toast.error("Select a team member and at least one task");
      return;
    }

    const member = itTeam.find(m => m.email === bulkAssignMember);
    if (!member) return;

    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .update({ assigned_to_email: member.email, assigned_to_name: member.name })
        .in("id", bulkAssignTasks)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Bulk assign blocked (0 rows changed) — check RLS UPDATE policy on project_tasks.");
        return;
      }

      toast.success(`${data.length} tasks assigned to ${member.name}`);
      setBulkAssignDialogOpen(false);
      setBulkAssignTasks([]);
      setBulkAssignMember("");
      queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my_tasks"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign tasks");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={ClipboardList} 
          label="Total Tasks" 
          value={allTasks.length} 
          color="blue" 
        />
        <StatCard 
          icon={UsersIcon} 
          label="Team Members" 
          value={itTeam.length} 
          color="purple" 
        />
        <StatCard 
          icon={CheckCircle} 
          label="Completed" 
          value={allTasks.filter(t => t.status === "completed").length} 
          color="green" 
        />
        <StatCard 
          icon={AlertTriangle} 
          label="Overdue" 
          value={allTasks.filter(t => 
            t.due_date && 
            isBefore(new Date(t.due_date), startOfDay(new Date())) && 
            t.status !== "completed"
          ).length} 
          color="red" 
        />
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {memberTaskCounts.map(member => (
          <Card 
            key={member.id}
            className={`cursor-pointer hover:shadow-md transition-all ${selectedMember === member.email ? "border-primary shadow-md" : ""}`}
            onClick={() => setSelectedMember(selectedMember === member.email ? null : member.email)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{member.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{member.completed}</p>
                  <p className="text-[10px] text-muted-foreground">Done</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{member.overdue}</p>
                  <p className="text-[10px] text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tasks..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedMember(null);
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setProjectFilter("all");
                }}
              >
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
              <Button 
                size="sm"
                onClick={() => setBulkAssignDialogOpen(true)}
                disabled={filteredTasks.length === 0}
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Bulk Assign
              </Button>
            </div>
          </div>
          {selectedMemberData && (
            <div className="mt-2 text-sm text-muted-foreground">
              Showing tasks for <strong>{selectedMemberData.name}</strong>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs ml-2"
                onClick={() => setSelectedMember(null)}
              >
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Task Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      checked={bulkAssignTasks.length === filteredTasks.length && filteredTasks.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkAssignTasks(filteredTasks.map(t => t.id));
                        } else {
                          setBulkAssignTasks([]);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map(task => {
                    const isOverdue = task.due_date && 
                      isBefore(new Date(task.due_date), startOfDay(new Date())) && 
                      task.status !== "completed";
                    return (
                      <TableRow key={task.id} className="hover:bg-muted/30">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={bulkAssignTasks.includes(task.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkAssignTasks([...bulkAssignTasks, task.id]);
                              } else {
                                setBulkAssignTasks(bulkAssignTasks.filter(id => id !== task.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </TableCell>
                        <TableCell 
                          className="font-medium cursor-pointer hover:text-primary"
                          onClick={() => onTaskClick?.(task)}
                        >
                          {task.task_name}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{task.projects?.name || "—"}</span>
                          {task.projects?.brand_name && (
                            <span className="text-xs text-muted-foreground block">{task.projects.brand_name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={task.assigned_to_email || "unassigned"}
                            onValueChange={(v) => {
                              if (v === "unassigned") {
                                assignTask(task.id, "", "");
                                setBulkAssignTasks(bulkAssignTasks.filter(id => id !== task.id));
                                return;
                              }
                              const member = itTeam.find(m => m.email === v);
                              if (member) {
                                assignTask(task.id, member.email, member.name);
                                setBulkAssignTasks(bulkAssignTasks.filter(id => id !== task.id));
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-48">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {itTeam.map(m => (
                                <SelectItem key={m.id} value={m.email}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                            {task.status?.replace("_", " ").toUpperCase() || "NOT STARTED"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority?.toUpperCase() || "MEDIUM"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                            {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "—"}
                          </span>
                          {isOverdue && (
                            <Badge variant="destructive" className="ml-2 text-[10px]">Overdue</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onTaskClick?.(task)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {bulkAssignTasks.length} tasks selected for assignment
            </p>
            <div className="grid gap-2">
              <Label>Assign to Team Member</Label>
              <Select value={bulkAssignMember} onValueChange={setBulkAssignMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {itTeam.map(m => (
                    <SelectItem key={m.id} value={m.email}>
                      {m.name} ({m.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAssign} disabled={!bulkAssignMember || bulkAssignTasks.length === 0}>
              <UsersIcon className="h-4 w-4 mr-2" />
              Assign {bulkAssignTasks.length} Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// TASK CALENDAR VIEW COMPONENT (Fixed + Add Task support)
// ============================================================
function TaskCalendarView({ 
  tasks, 
  onTaskClick,
  itTeam = [],
  projects = [],
  onAddTask,
  onUpdateDueDate,
}: { 
  tasks: MyTaskRow[]; 
  onTaskClick?: (task: MyTaskRow) => void;
  itTeam?: ITTeamMember[];
  projects?: Project[];
  onAddTask?: (data: {
    task_name: string;
    due_date: string;
    priority: string;
    assigned_to_email?: string | null;
    assigned_to_name?: string | null;
    project_id?: string;
    description?: string;
  }) => Promise<void> | void;
  onUpdateDueDate?: (taskId: string, dueDate: string) => Promise<void> | void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => startOfDay(new Date()));
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState("unassigned");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingDueDateId, setEditingDueDateId] = useState<string | null>(null);
  const [dueDateDraft, setDueDateDraft] = useState("");
  const [savingDueDate, setSavingDueDate] = useState(false);
  const dayClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-project calendar: selected project ke tasks hi dikhenge
  const filteredCalendarTasks = selectedClientId === "all"
    ? tasks
    : tasks.filter(t => t.project_id === selectedClientId);

  // Har project ke task counts (alag calendar cards ke liye)
  const projectCalendarList = (() => {
    const map = new Map<string, {
      id: string;
      name: string;
      brand: string | null;
      total: number;
      overdue: number;
      completed: number;
    }>();
    projects.forEach(p => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        brand: p.brand_name,
        total: 0,
        overdue: 0,
        completed: 0,
      });
    });
    tasks.forEach(t => {
      if (!t.project_id) return;
      if (!map.has(t.project_id)) {
        map.set(t.project_id, {
          id: t.project_id,
          name: t.projects?.name || "Unknown Project",
          brand: t.projects?.brand_name || null,
          total: 0,
          overdue: 0,
          completed: 0,
        });
      }
      const row = map.get(t.project_id)!;
      row.total += 1;
      if (t.status === "completed") row.completed += 1;
      if (
        t.due_date &&
        isBefore(new Date(t.due_date), startOfDay(new Date())) &&
        t.status !== "completed"
      ) {
        row.overdue += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const selectedProjectMeta = selectedClientId === "all"
    ? null
    : projectCalendarList.find(p => p.id === selectedClientId) || null;

  const clientOptions = projectCalendarList.map(p => ({
    id: p.id,
    name: p.name + (p.brand ? ` (${p.brand})` : ""),
  }));

  const handleDaySingleClick = (day: Date) => {
    if (dayClickTimerRef.current) {
      clearTimeout(dayClickTimerRef.current);
      dayClickTimerRef.current = null;
    }
    // Delay so double-click can cancel single-click action
    dayClickTimerRef.current = setTimeout(() => {
      dayClickTimerRef.current = null;
      setSelectedDate(startOfDay(day));
      setCurrentMonth(day);
      setNewTaskName("");
      setNewTaskPriority("medium");
      setNewTaskAssignee("unassigned");
      setNewTaskProjectId(selectedClientId !== "all" ? selectedClientId : (projects[0]?.id || ""));
      setNewTaskDescription("");
      setAddTaskOpen(true);
    }, 250);
  };

  const handleDayDoubleClick = (day: Date) => {
    if (dayClickTimerRef.current) {
      clearTimeout(dayClickTimerRef.current);
      dayClickTimerRef.current = null;
    }
    setSelectedDate(startOfDay(day));
    setCurrentMonth(day);
    setAddTaskOpen(false);
  };

  const startEditDueDate = (task: MyTaskRow, day?: Date) => {
    if (day) {
      setSelectedDate(startOfDay(day));
      setCurrentMonth(day);
    } else if (task.due_date) {
      const d = startOfDay(new Date(task.due_date));
      setSelectedDate(d);
      setCurrentMonth(d);
    }
    setEditingDueDateId(task.id);
    setDueDateDraft(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "");
  };

  const saveDueDate = async (taskId: string) => {
    if (!dueDateDraft || !onUpdateDueDate) {
      toast.error("Please select a due date");
      return;
    }
    setSavingDueDate(true);
    try {
      await onUpdateDueDate(taskId, dueDateDraft);
      setEditingDueDateId(null);
      setDueDateDraft("");
      const next = startOfDay(new Date(dueDateDraft));
      setSelectedDate(next);
      setCurrentMonth(next);
      toast.success(`Due date → ${format(next, "dd MMM yyyy")} ✓`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update due date");
    } finally {
      setSavingDueDate(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: startOfDay(monthStart), end: startOfDay(monthEnd) });
  const firstDayOfMonth = getDay(monthStart);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getTasksForDay = (date: Date) =>
    filteredCalendarTasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), date));

  const selectedDateTasks = selectedDate ? getTasksForDay(selectedDate) : [];

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const openAddTask = () => {
    if (!selectedDate) {
      toast.error("Please select a date first");
      return;
    }
    setNewTaskName("");
    setNewTaskPriority("medium");
    setNewTaskAssignee("unassigned");
    setNewTaskProjectId(selectedClientId !== "all" ? selectedClientId : (projects[0]?.id || ""));
    setNewTaskDescription("");
    setAddTaskOpen(true);
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      toast.error("Task name is required");
      return;
    }
    if (!selectedDate) return;
    if (!newTaskProjectId) {
      toast.error("Please select a project");
      return;
    }

    setAdding(true);
    try {
      const member = itTeam.find(m => m.email === newTaskAssignee);
      await onAddTask?.({
        task_name: newTaskName.trim(),
        due_date: format(selectedDate, "yyyy-MM-dd"),
        priority: newTaskPriority,
        assigned_to_email: (newTaskAssignee && newTaskAssignee !== "unassigned") ? newTaskAssignee : null,
        assigned_to_name: member?.name || null,
        project_id: newTaskProjectId,
        description: newTaskDescription.trim() || undefined,
      });
      setAddTaskOpen(false);
      toast.success("Task added from calendar");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add task");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Project filter — dropdown */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-[260px] flex-1">
          <FolderKanban className="h-4 w-4 text-primary shrink-0" />
          <Label className="text-sm whitespace-nowrap">Project</Label>
          <Select
            value={selectedClientId}
            onValueChange={(v) => {
              setSelectedClientId(v);
              if (v !== "all") setNewTaskProjectId(v);
            }}
          >
            <SelectTrigger className="w-full max-w-md h-9">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects ({tasks.length} tasks)</SelectItem>
              {projectCalendarList.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.brand ? ` (${p.brand})` : ""} — {p.total} tasks
                  {p.overdue > 0 ? ` · ${p.overdue} overdue` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProjectMeta && (
          <Badge variant="outline" className="text-xs">
            Showing: {selectedProjectMeta.name}
            {selectedProjectMeta.brand ? ` (${selectedProjectMeta.brand})` : ""} — {selectedProjectMeta.total} tasks
          </Badge>
        )}
      </div>

      {/* Month nav + legend */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>
          <h2 className="text-xl font-bold min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
        </div>

        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-500" /> Overdue</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-yellow-500" /> Today</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-500" /> This Week</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500" /> Later</span>
        </div>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
        Select a project to filter tasks. Single click a date = Add Task · Double click a date = Open day · Double click a task = Open details
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(d => (
              <div key={d} className="text-center text-sm font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-28 bg-muted/20 rounded-lg" />
            ))}
            {days.map(day => {
              const dayTasks = getTasksForDay(day);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasOverdue = dayTasks.some(t =>
                t.due_date && isBefore(new Date(t.due_date), startOfDay(new Date())) && t.status !== "completed"
              );

              let bg = "bg-background";
              if (hasOverdue) bg = "bg-red-50 border-red-200";
              else if (isCurrentDay && dayTasks.length) bg = "bg-yellow-50 border-yellow-200";
              else if (dayTasks.length) bg = "bg-green-50 border-green-200";

              return (
                <div
                  key={day.toISOString()}
                  className={`h-28 p-1 border rounded-lg cursor-pointer hover:shadow-md transition-all ${bg} ${
                    isSelected ? "ring-2 ring-primary" : ""
                  } ${isCurrentDay ? "ring-2 ring-primary/40" : ""}`}
                  onClick={() => handleDaySingleClick(day)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    handleDayDoubleClick(day);
                  }}
                  title="Single click: Add Task · Double click: Open day"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isCurrentDay ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {dayTasks.length > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5">{dayTasks.length}</Badge>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5 overflow-y-auto max-h-16">
                    {dayTasks.slice(0, 3).map(task => {
                      const overdue = task.due_date &&
                        isBefore(new Date(task.due_date), startOfDay(new Date())) &&
                        task.status !== "completed";
                      return (
                        <div
                          key={task.id}
                          className="text-[10px] truncate px-1 py-0.5 rounded cursor-pointer hover:ring-1 hover:ring-primary flex items-center gap-0.5"
                          style={{
                            backgroundColor: overdue ? "#fecaca" :
                              task.priority === "urgent" ? "#fca5a5" :
                              task.priority === "high" ? "#fdba74" :
                              task.priority === "medium" ? "#93c5fd" : "#d1d5db"
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            // Single click task → edit due date
                            startEditDueDate(task, day);
                          }}
                          onDoubleClick={e => {
                            e.stopPropagation();
                            e.preventDefault();
                            // Double click task → open task detail
                            setSelectedDate(startOfDay(day));
                            onTaskClick?.(task);
                          }}
                          title="Single click: Edit due date · Double click: Open task"
                        >
                          <Edit className="h-2.5 w-2.5 shrink-0 opacity-70" />
                          <span className="truncate">{task.task_name}</span>
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Panel */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Tasks for {format(selectedDate, "dd MMM yyyy")}
                <Badge variant="outline">{selectedDateTasks.length}</Badge>
              </CardTitle>
              <Button size="sm" onClick={openAddTask}>
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedDateTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tasks on this date. Click “Add Task”.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDateTasks.map(task => {
                  const isOverdue = task.due_date &&
                    isBefore(new Date(task.due_date), startOfDay(new Date())) &&
                    task.status !== "completed";
                  const isEditingDue = editingDueDateId === task.id;
                  return (
                    <div
                      key={task.id}
                      className="border rounded-lg hover:bg-muted/30 overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => onTaskClick?.(task)}
                        >
                          <p className="font-medium">{task.task_name}</p>
                          <p className="text-sm text-muted-foreground">{task.projects?.name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          {task.assigned_to_name && (
                            <span className="text-xs text-indigo-600 flex items-center gap-1">
                              <UserCheck className="h-3 w-3" /> {task.assigned_to_name}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority?.toUpperCase() || "MEDIUM"}
                          </Badge>
                          {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                          <Button
                            size="sm"
                            variant={isEditingDue ? "default" : "outline"}
                            className="h-8 text-xs border-primary text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEditingDue) {
                                setEditingDueDateId(null);
                                setDueDateDraft("");
                              } else {
                                startEditDueDate(task);
                              }
                            }}
                            title="Edit due date"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit Due Date
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskClick?.(task);
                            }}
                            title="Task detail"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {isEditingDue && (
                        <div
                          className="px-3 pb-3 pt-0 border-t bg-primary/5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap items-end gap-2 pt-3">
                            <div className="grid gap-1">
                              <Label className="text-xs font-medium">New Due Date *</Label>
                              <Input
                                type="date"
                                value={dueDateDraft}
                                onChange={(e) => setDueDateDraft(e.target.value)}
                                className="h-9 w-44 text-sm"
                                autoFocus
                              />
                            </div>
                            <Button
                              size="sm"
                              className="h-9"
                              disabled={savingDueDate || !dueDateDraft}
                              onClick={() => saveDueDate(task.id)}
                            >
                              {savingDueDate ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5 mr-1" />
                              )}
                              Save Due Date
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9"
                              onClick={() => {
                                setEditingDueDateId(null);
                                setDueDateDraft("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Nayi date choose karke <strong>Save Due Date</strong> dabao. Task us date pe shift ho jayega.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Task — {selectedDate && format(selectedDate, "dd MMM yyyy")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Task Name *</Label>
              <Input
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                placeholder="Task ka naam..."
                onKeyDown={e => e.key === "Enter" && handleAddTask()}
              />
            </div>
            <div className="grid gap-2">
              <Label>Project *</Label>
              <Select value={newTaskProjectId} onValueChange={setNewTaskProjectId}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.brand_name ? `(${p.brand_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {itTeam.map(m => (
                      <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                value={newTaskDescription}
                onChange={e => setNewTaskDescription(e.target.value)}
                placeholder="Extra details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={adding || !newTaskName.trim() || !newTaskProjectId}>
              {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT - Updated with new tabs
// ============================================================
export default function Projects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const noteImageInputRef = useRef<HTMLInputElement>(null);
  const projectImageInputRef = useRef<HTMLInputElement>(null);
  const editProjectImageInputRef = useRef<HTMLInputElement>(null);

  // ── Top-level page switcher ──
  const [mainView, setMainView] = useState<"projects" | "my_tasks" | "chat" | "task_calendar" | "task_assignment">("projects");
  
  // ── States ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy, setSortBy] = useState<"date_asc" | "date_desc" | "priority">("priority");
  const [viewMode, setViewMode] = useState<"dashboard" | "detail">("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState("all");
  const [taskViewMode, setTaskViewMode] = useState<"list" | "dashboard">("list");
  
  // Import/Export states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [manufacturingDialogOpen, setManufacturingDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [communicationDialogOpen, setCommunicationDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [docNoteEditing, setDocNoteEditing] = useState(false);
  const [folderViewOpen, setFolderViewOpen] = useState(false);
  const [activeFolderView, setActiveFolderView] = useState<string | null>(null);
  
  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [manufacturing, setManufacturing] = useState<Manufacturing[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [docNoteContent, setDocNoteContent] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);


  // ── 25-Day Social Content Calendar ──
  const [contentCalendarDays, setContentCalendarDays] = useState<ContentDay[]>(createEmptyContentCalendar());
  const [contentCalendarStartDate, setContentCalendarStartDate] = useState<string>("");
  const [contentCalendarNoteId, setContentCalendarNoteId] = useState<string | null>(null);
  const [contentCalendarSaving, setContentCalendarSaving] = useState(false);
  const [contentCalendarFilter, setContentCalendarFilter] = useState<"all" | "pending" | "completed">("all");

  // ── Image upload state ──
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // ── IT Team ──
  const { data: itTeam = [], error, isLoading: itLoading } = useQuery({
    queryKey: ["it_team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("it_team_members")
        .select("*")
        .eq("active", true)
        .order("name");
      
      if (error) throw error;
      return ((data || []) as ITTeamMember[]).map((m) => ({
        ...m,
        name: displayPersonName(m.name, m.email) || m.name,
      }));
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // ── Current user's role ──
  const currentTeamMember = itTeam.find(m => m.email === user?.email);
  const isAdmin =
    (user as any)?.role === "admin" ||
    (user as any)?.is_admin === true ||
    currentTeamMember?.role === "Admin" ||
    currentTeamMember?.role === "Super Admin" ||
    currentTeamMember?.role?.toLowerCase() === "admin" ||
    currentTeamMember?.role?.toLowerCase() === "owner" ||
    currentTeamMember?.role?.toLowerCase() === "super admin";

  const BRAND_ADMIN_NAME = "Mayank Sir";
  const displayUserName = isAdmin
    ? (currentTeamMember?.name && currentTeamMember.name.toLowerCase() !== "admin"
        ? currentTeamMember.name
        : BRAND_ADMIN_NAME)
    : ((user as any)?.name || currentTeamMember?.name || user?.email || "");

  // ── Departments Lookup ──
  const { data: departmentOptions = [] } = useQuery({
    queryKey: ["departments_lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as DepartmentLookup[];
    },
  });

  // ── MY TASKS ──
  const [myTaskPriorityFilter, setMyTaskPriorityFilter] = useState("all");
  const [myTaskStatusFilter, setMyTaskStatusFilter] = useState("all");
  const [myTaskDueFilter, setMyTaskDueFilter] = useState("all");
  const [myTaskClientFilter, setMyTaskClientFilter] = useState("all");

  // ── My Tasks: inline expand + subtasks + project note ──
  const [expandedMyTaskId, setExpandedMyTaskId] = useState<string | null>(null);
  const [myTaskSubtasks, setMyTaskSubtasks] = useState<Record<string, TaskSubtask[]>>({});
  const [myTaskRemarksHistory, setMyTaskRemarksHistory] = useState<Record<string, TaskRemark[]>>({});
  const [remarksHistoryLoadingFor, setRemarksHistoryLoadingFor] = useState<string | null>(null);
  const [newRemarkDraft, setNewRemarkDraft] = useState<Record<string, string>>({});
  const [remarkSavingFor, setRemarkSavingFor] = useState<string | null>(null);
  const [subtaskLoadingFor, setSubtaskLoadingFor] = useState<string | null>(null);
  const [newSubtaskDraft, setNewSubtaskDraft] = useState<Record<string, { title: string; tag: string }>>({});
  const [projectNoteByProject, setProjectNoteByProject] = useState<Record<string, ProjectNote | null>>({});
  const [projectNoteDraft, setProjectNoteDraft] = useState<Record<string, string>>({});
  const [projectNoteEditing, setProjectNoteEditing] = useState<Record<string, boolean>>({});
  const [projectNoteLoadingFor, setProjectNoteLoadingFor] = useState<string | null>(null);
  const [projectNoteSaving, setProjectNoteSaving] = useState<string | null>(null);

  // ── Task Detail Dialog States ──
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetailDialogOpen, setTaskDetailDialogOpen] = useState(false);
  const [dialogSubtasks, setDialogSubtasks] = useState<Record<string, TaskSubtask[]>>({});
  const [dialogRemarks, setDialogRemarks] = useState<Record<string, TaskRemark[]>>({});
  const [dialogSubtasksLoading, setDialogSubtasksLoading] = useState<Record<string, boolean>>({});
  const [dialogRemarksLoading, setDialogRemarksLoading] = useState<Record<string, boolean>>({});
  const [dialogSavingRemark, setDialogSavingRemark] = useState<string | null>(null);
  const [dialogProjectNotes, setDialogProjectNotes] = useState<Record<string, ProjectNote | null>>({});
  const [dialogProjectNotesLoading, setDialogProjectNotesLoading] = useState<Record<string, boolean>>({});

  const { data: myTasks = [], isLoading: myTasksLoading } = useQuery({
    queryKey: ["my_tasks", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          id, project_id, stage_id, task_name, description, department,
          assigned_to, assigned_to_email, assigned_to_name, assigned_by,
          priority, status, start_date, due_date, completion_date, employee_remarks,
          created_at, updated_at,
          projects ( name, project_id, brand_name, client_phone, client_email, client_address, current_stage, status )
        `)
        .eq("assigned_to_email", user?.email)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as unknown as MyTaskRow[];
    },
  });

  // ── All Tasks for Calendar and Assignment ──
  const { data: allTasks = [] } = useQuery({
    queryKey: ["all_tasks_for_views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          *,
          projects (
            name,
            project_id,
            brand_name,
            client_phone,
            client_email,
            client_address,
            current_stage,
            status,
            image_url
          )
        `)
        .order("due_date", { ascending: true, nullsLast: true });

      if (error) throw error;
      return data as unknown as MyTaskRow[];
    },
  });

  const assignedProjectIds = new Set(myTasks.map(t => t.project_id));
  const MY_TASK_PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  const myTaskClients = Array.from(
    new Map(
      myTasks.filter(t => t.projects).map(t => [t.projects!.name, t.projects!.name])
    ).values()
  );

  const filteredMyTasks = myTasks
    .filter(t => myTaskPriorityFilter === "all" || t.priority === myTaskPriorityFilter)
    .filter(t => myTaskStatusFilter === "all" || t.status === myTaskStatusFilter)
    .filter(t => myTaskDueFilter === "all" || getDueBucket(t.due_date) === myTaskDueFilter)
    .filter(t => myTaskClientFilter === "all" || t.projects?.name === myTaskClientFilter)
    .sort((a, b) => {
      const pa = MY_TASK_PRIORITY_ORDER[a.priority] ?? 2;
      const pb = MY_TASK_PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const myTaskStats = {
    total: myTasks.length,
    active: myTasks.filter(t => t.status === "in_progress").length,
    pending: myTasks.filter(t => t.status === "not_started" || t.status === "pending").length,
    overdue: myTasks.filter(t => getDueBucket(t.due_date) === "overdue" && t.status !== "completed").length,
    completed: myTasks.filter(t => t.status === "completed").length,
    today: myTasks.filter(t => getDueBucket(t.due_date) === "today" && t.status !== "completed").length,
  };

  const applyMyTaskStatFilter = (key: "all" | "active" | "pending" | "overdue" | "completed" | "today") => {
    setMyTaskPriorityFilter("all");
    setMyTaskClientFilter("all");
    if (key === "all") {
      setMyTaskStatusFilter("all");
      setMyTaskDueFilter("all");
    } else if (key === "active") {
      setMyTaskStatusFilter("in_progress");
      setMyTaskDueFilter("all");
    } else if (key === "pending") {
      setMyTaskStatusFilter("not_started");
      setMyTaskDueFilter("all");
    } else if (key === "overdue") {
      setMyTaskStatusFilter("all");
      setMyTaskDueFilter("overdue");
    } else if (key === "completed") {
      setMyTaskStatusFilter("completed");
      setMyTaskDueFilter("all");
    } else if (key === "today") {
      setMyTaskStatusFilter("all");
      setMyTaskDueFilter("today");
    }
  };

  const updateMyTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase.from("project_tasks").update({ status }).eq("id", taskId);
      if (error) throw error;
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchRemarksHistory = async (taskId: string) => {
    setRemarksHistoryLoadingFor(taskId);
    try {
      const { data, error } = await supabase
        .from("task_remarks")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyTaskRemarksHistory((prev) => ({ ...prev, [taskId]: (data || []) as TaskRemark[] }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load update history");
    } finally {
      setRemarksHistoryLoadingFor(null);
    }
  };

  const addRemarkToHistory = async (taskId: string) => {
    const text = (newRemarkDraft[taskId] || "").trim();
    if (!text) return;
    setRemarkSavingFor(taskId);
    try {
      const { error: insertError } = await supabase.from("task_remarks").insert({
        task_id: taskId,
        remark: text,
        created_by_email: user?.email || null,
        created_by_name: displayPersonName((user as any)?.name || currentTeamMember?.name, user?.email) || null,
      });
      if (insertError) throw insertError;

      await supabase.from("project_tasks").update({ employee_remarks: text }).eq("id", taskId);

      setNewRemarkDraft((prev) => ({ ...prev, [taskId]: "" }));
      toast.success("Update added");
      fetchRemarksHistory(taskId);
      queryClient.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to add update");
    } finally {
      setRemarkSavingFor(null);
    }
  };

  // ── Subtasks (per task, stored in task_subtasks table) ──
  const fetchSubtasksForTask = async (taskId: string) => {
    setSubtaskLoadingFor(taskId);
    try {
      const { data, error } = await supabase
        .from("task_subtasks")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMyTaskSubtasks(prev => ({ ...prev, [taskId]: (data || []) as TaskSubtask[] }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load subtasks");
    } finally {
      setSubtaskLoadingFor(null);
    }
  };

  const addSubtask = async (taskId: string) => {
    const draft = newSubtaskDraft[taskId];
    if (!draft || !draft.title?.trim()) {
      toast.error("Subtask title is required");
      return;
    }
    try {
      const { error } = await supabase.from("task_subtasks").insert({
        task_id: taskId,
        title: draft.title.trim(),
        tag: draft.tag || null,
        status: "not_started",
        assigned_to_email: user?.email || null,
        assigned_to_name: (user as any)?.name || user?.email || null,
      });
      if (error) throw error;
      setNewSubtaskDraft(prev => ({ ...prev, [taskId]: { title: "", tag: "" } }));
      toast.success("Subtask added");
      fetchSubtasksForTask(taskId);
    } catch (error: any) {
      toast.error(error.message || "Failed to add subtask");
    }
  };

  const toggleSubtaskStatus = async (subtaskId: string, taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "not_started" : "completed";
    try {
      const { error } = await supabase
        .from("task_subtasks")
        .update({ status: nextStatus })
        .eq("id", subtaskId);
      if (error) throw error;
      fetchSubtasksForTask(taskId);
    } catch (error: any) {
      toast.error(error.message || "Failed to update subtask");
    }
  };

  const deleteSubtask = async (subtaskId: string, taskId: string) => {
    try {
      const { error } = await supabase.from("task_subtasks").delete().eq("id", subtaskId);
      if (error) throw error;
      fetchSubtasksForTask(taskId);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subtask");
    }
  };

  // ── Subtasks for project-detail Tasks / Departments views ──
  const [projectTaskSubtasks, setProjectTaskSubtasks] = useState<Record<string, TaskSubtask[]>>({});
  const [projectSubtaskLoadingFor, setProjectSubtaskLoadingFor] = useState<string | null>(null);

  const fetchProjectTaskSubtasks = async (taskId: string) => {
    setProjectSubtaskLoadingFor(taskId);
    try {
      const { data, error } = await supabase
        .from("task_subtasks")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setProjectTaskSubtasks((prev) => ({ ...prev, [taskId]: (data || []) as TaskSubtask[] }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load subtasks");
    } finally {
      setProjectSubtaskLoadingFor(null);
    }
  };

  const handleExpandProjectTask = (taskId: string) => {
    if (!projectTaskSubtasks[taskId]) {
      fetchProjectTaskSubtasks(taskId);
    }
  };

  const addProjectTaskSubtask = async (taskId: string, title: string, tag: string) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: TaskSubtask = {
      id: tempId,
      task_id: taskId,
      title,
      tag: tag || null,
      status: "not_started",
      assigned_to_email: user?.email || null,
      assigned_to_name: (user as any)?.name || user?.email || null,
      note: null,
      created_at: new Date().toISOString(),
    };
    setProjectTaskSubtasks((prev) => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), optimistic],
    }));
    try {
      const { data, error } = await supabase.from("task_subtasks").insert({
        task_id: taskId,
        title,
        tag: tag || null,
        status: "not_started",
        assigned_to_email: user?.email || null,
        assigned_to_name: (user as any)?.name || user?.email || null,
      }).select().single();
      if (error) throw error;
      setProjectTaskSubtasks((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).map((s) => (s.id === tempId ? (data as TaskSubtask) : s)),
      }));
      toast.success("Subtask added");
    } catch (error: any) {
      setProjectTaskSubtasks((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter((s) => s.id !== tempId),
      }));
      toast.error(error.message || "Failed to add subtask");
    }
  };

  const toggleProjectTaskSubtask = async (subtaskId: string, taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "not_started" : "completed";
    setProjectTaskSubtasks((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] || []).map((s) =>
        s.id === subtaskId ? { ...s, status: nextStatus } : s
      ),
    }));
    try {
      const { error } = await supabase.from("task_subtasks").update({ status: nextStatus }).eq("id", subtaskId);
      if (error) throw error;
    } catch (error: any) {
      setProjectTaskSubtasks((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).map((s) =>
          s.id === subtaskId ? { ...s, status: currentStatus } : s
        ),
      }));
      toast.error(error.message || "Failed to update subtask");
    }
  };

  const deleteProjectTaskSubtask = async (subtaskId: string, taskId: string) => {
    const prevList = projectTaskSubtasks[taskId] || [];
    setProjectTaskSubtasks((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] || []).filter((s) => s.id !== subtaskId),
    }));
    try {
      const { error } = await supabase.from("task_subtasks").delete().eq("id", subtaskId);
      if (error) throw error;
    } catch (error: any) {
      setProjectTaskSubtasks((prev) => ({ ...prev, [taskId]: prevList }));
      toast.error(error.message || "Failed to delete subtask");
    }
  };

  // ── Project-wide "what's happening" note ──
  const fetchProjectTeamNote = async (projectId: string) => {
    setProjectNoteLoadingFor(projectId);
    try {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", projectId)
        .eq("note_type", "team_update")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setProjectNoteByProject(prev => ({ ...prev, [projectId]: (data as ProjectNote) || null }));
      setProjectNoteDraft(prev => ({ ...prev, [projectId]: data?.content || "" }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load project note");
    } finally {
      setProjectNoteLoadingFor(null);
    }
  };

  const saveProjectTeamNote = async (projectId: string) => {
    const content = projectNoteDraft[projectId] || "";
    setProjectNoteSaving(projectId);
    try {
      const existing = projectNoteByProject[projectId];
      if (existing) {
        const { error } = await supabase
          .from("project_notes")
          .update({ content })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_notes").insert({
          project_id: projectId,
          note_type: "team_update",
          title: "What's happening in this project",
          content,
          created_by: user?.email || null,
          created_by_email: user?.email || null,
        });
        if (error) throw error;
      }
      toast.success("Project update saved");
      setProjectNoteEditing(prev => ({ ...prev, [projectId]: false }));
      fetchProjectTeamNote(projectId);
    } catch (error: any) {
      toast.error(error.message || "Failed to save project update");
    } finally {
      setProjectNoteSaving(null);
    }
  };

  const toggleExpandMyTask = (taskId: string, projectId: string) => {
    if (expandedMyTaskId === taskId) {
      setExpandedMyTaskId(null);
      return;
    }
    setExpandedMyTaskId(taskId);
    if (!myTaskSubtasks[taskId]) {
      fetchSubtasksForTask(taskId);
    }
    if (!myTaskRemarksHistory[taskId]) {
      fetchRemarksHistory(taskId);
    }
    if (!(projectId in projectNoteByProject)) {
      fetchProjectTeamNote(projectId);
    }
  };

  // ── TASK DETAIL DIALOG FUNCTIONS ──
  const fetchDialogSubtasks = async (taskId: string) => {
    if (dialogSubtasks[taskId]) return;
    setDialogSubtasksLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      const { data, error } = await supabase
        .from("task_subtasks")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setDialogSubtasks(prev => ({ ...prev, [taskId]: data || [] }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load subtasks");
    } finally {
      setDialogSubtasksLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const fetchDialogRemarks = async (taskId: string) => {
    if (dialogRemarks[taskId]) return;
    setDialogRemarksLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      const { data, error } = await supabase
        .from("task_remarks")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDialogRemarks(prev => ({ ...prev, [taskId]: data || [] }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load remarks");
    } finally {
      setDialogRemarksLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const fetchDialogProjectNote = async (projectId: string) => {
    if (dialogProjectNotes[projectId] !== undefined) return;
    setDialogProjectNotesLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", projectId)
        .eq("note_type", "team_update")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setDialogProjectNotes(prev => ({ ...prev, [projectId]: data || null }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load project note");
    } finally {
      setDialogProjectNotesLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const handleTaskClick = async (task: MyTaskRow) => {
    setSelectedTaskId(task.id);
    setTaskDetailDialogOpen(true);
    await Promise.all([
      fetchDialogSubtasks(task.id),
      fetchDialogRemarks(task.id),
      fetchDialogProjectNote(task.project_id)
    ]);
  };

  const handleDialogAddSubtask = async (taskId: string, title: string, tag: string, assigneeEmail: string | null) => {
    try {
      const assignee = itTeam.find(m => m.email === assigneeEmail);
      const { error } = await supabase.from("task_subtasks").insert({
        task_id: taskId,
        title,
        tag: tag || null,
        status: "not_started",
        assigned_to_email: assigneeEmail || null,
        assigned_to_name: assignee?.name || null,
      });
      if (error) throw error;
      toast.success("Subtask added");
      fetchDialogSubtasks(taskId);
    } catch (error: any) {
      toast.error(error.message || "Failed to add subtask");
    }
  };

  const handleDialogToggleSubtask = async (subtaskId: string, taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "not_started" : "completed";
    try {
      const existing = (dialogSubtasks[taskId] || []).find(s => s.id === subtaskId);
      const stamp = format(new Date(), "dd MMM yyyy, hh:mm a");
      const historyLine = `[${stamp}] Status → ${nextStatus === "completed" ? "Completed" : "Not Started"}`;
      const nextNote = existing?.note
        ? `${existing.note}\n${historyLine}`
        : historyLine;
      const { error } = await supabase
        .from("task_subtasks")
        .update({ status: nextStatus, note: nextNote, updated_at: new Date().toISOString() })
        .eq("id", subtaskId);
      if (error) {
        // Fallback without note if column missing
        const { error: err2 } = await supabase
          .from("task_subtasks")
          .update({ status: nextStatus })
          .eq("id", subtaskId);
        if (err2) throw err2;
      }
      fetchDialogSubtasks(taskId);
    } catch (error: any) {
      toast.error(error.message || "Failed to update subtask");
    }
  };

  const handleDialogDeleteSubtask = async (subtaskId: string, taskId: string) => {
    try {
      const { error } = await supabase.from("task_subtasks").delete().eq("id", subtaskId);
      if (error) throw error;
      toast.success("Subtask deleted");
      fetchDialogSubtasks(taskId);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subtask");
    }
  };

  const handleDialogUpdateSubtaskNote = async (subtaskId: string, taskId: string, note: string) => {
    try {
      const { error } = await supabase
        .from("task_subtasks")
        .update({ note: note || null, updated_at: new Date().toISOString() })
        .eq("id", subtaskId);
      if (error) throw error;
      toast.success("Subtask note saved");
      fetchDialogSubtasks(taskId);
    } catch (error: any) {
      toast.error(error.message || "Failed to save subtask note. Ensure 'note' column exists on task_subtasks.");
    }
  };

  const handleDialogAddRemark = async (taskId: string, remark: string) => {
    setDialogSavingRemark(taskId);
    try {
      const { error: insertError } = await supabase.from("task_remarks").insert({
        task_id: taskId,
        remark,
        created_by_email: user?.email || null,
        created_by_name: displayPersonName((user as any)?.name || currentTeamMember?.name, user?.email) || null,
      });
      if (insertError) throw insertError;
      
      await supabase.from("project_tasks").update({ employee_remarks: remark }).eq("id", taskId);
      
      toast.success("Update added");
      fetchDialogRemarks(taskId);
      queryClient.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to add remark");
    } finally {
      setDialogSavingRemark(null);
    }
  };

  const handleDialogDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;
      toast.success("Task deleted");
      setTaskDetailDialogOpen(false);
      setSelectedTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete task");
    }
  };

  const handleDialogSaveProjectNote = async (projectId: string, content: string) => {
    try {
      const existing = dialogProjectNotes[projectId];
      if (existing) {
        const { error } = await supabase
          .from("project_notes")
          .update({ content })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_notes").insert({
          project_id: projectId,
          note_type: "team_update",
          title: "Team Update",
          content,
          created_by: user?.email || null,
          created_by_email: user?.email || null,
        });
        if (error) throw error;
      }
      toast.success("Project update saved");
      fetchDialogProjectNote(projectId);
    } catch (error: any) {
      toast.error(error.message || "Failed to save project note");
    }
  };

  const handleDialogAssign = async (taskId: string, email: string, name: string) => {
    try {
      const payload: Record<string, any> = {
        assigned_to_email: email,
        assigned_to_name: name,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      let { data, error } = await supabase
        .from("project_tasks")
        .update(payload)
        .eq("id", taskId)
        .select();
      // Fallback if assigned_at column does not exist yet
      if (error && String(error.message || "").toLowerCase().includes("assigned_at")) {
        const retry = await supabase
          .from("project_tasks")
          .update({ assigned_to_email: email, assigned_to_name: name, updated_at: new Date().toISOString() })
          .eq("id", taskId)
          .select();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Update blocked (0 rows changed) — check RLS UPDATE policy on project_tasks.");
        return;
      }
      toast.success(`Assigned to ${name}`);
      queryClient.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project_last_assignees"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign task");
    }
  };

  const handleDialogStatusChange = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase.from("project_tasks").update({ status }).eq("id", taskId);
      if (error) throw error;
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  // ── INTERNAL CHAT ──
  const myEmail = user?.email || "";
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [activeChatMember, setActiveChatMember] = useState<ITTeamMember | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<InternalMessage[]>([]);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);

  const chatTeamList = itTeam.filter(m => m.email !== myEmail);

  const { data: chatUnread = [] } = useQuery({
    queryKey: ["internal_unread", myEmail],
    enabled: !!myEmail && mainView === "chat",
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_messages")
        .select("sender_email")
        .eq("receiver_email", myEmail)
        .eq("is_read", false);
      if (error) throw error;
      return data.map((d: any) => d.sender_email) as string[];
    },
  });

  const loadChatConversation = async (otherEmail: string) => {
    setChatMessagesLoading(true);
    try {
      const isGroup = otherEmail === TEAM_GROUP_EMAIL;
      const query = supabase.from("internal_messages").select("*");
      const { data, error } = isGroup
        ? await query.eq("receiver_email", TEAM_GROUP_EMAIL).order("created_at", { ascending: true })
        : await query
            .or(
              `and(sender_email.eq.${myEmail},receiver_email.eq.${otherEmail}),and(sender_email.eq.${otherEmail},receiver_email.eq.${myEmail})`
            )
            .order("created_at", { ascending: true });
      if (error) throw error;
      setChatMessages(data as InternalMessage[]);

      if (!isGroup) {
        await supabase
          .from("internal_messages")
          .update({ is_read: true })
          .eq("sender_email", otherEmail)
          .eq("receiver_email", myEmail)
          .eq("is_read", false);
      }

      queryClient.invalidateQueries({ queryKey: ["internal_unread", myEmail] });
    } catch (error: any) {
      toast.error(error.message || "Failed to load messages");
    } finally {
      setChatMessagesLoading(false);
    }
  };

  const selectChatMember = (member: ITTeamMember) => {
    setActiveChatMember(member);
    loadChatConversation(member.email);
  };

  useEffect(() => {
    if (!myEmail || mainView !== "chat") return;
    const channel = supabase
      .channel("internal_messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "internal_messages" },
        (payload) => {
          const msg = payload.new as InternalMessage;
          const isGroupMsg = msg.receiver_email === TEAM_GROUP_EMAIL;
          const involvesMe = msg.sender_email === myEmail || msg.receiver_email === myEmail || isGroupMsg;
          if (!involvesMe) return;

          if (
            activeChatMember &&
            (
              (activeChatMember.email === TEAM_GROUP_EMAIL && isGroupMsg) ||
              (activeChatMember.email !== TEAM_GROUP_EMAIL &&
                (msg.sender_email === activeChatMember.email || msg.receiver_email === activeChatMember.email) &&
                !isGroupMsg)
            )
          ) {
            setChatMessages((prev) => [...prev, msg]);
            if (msg.receiver_email === myEmail) {
              supabase.from("internal_messages").update({ is_read: true }).eq("id", msg.id).then();
            }
          } else {
            queryClient.invalidateQueries({ queryKey: ["internal_unread", myEmail] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myEmail, activeChatMember, mainView]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  const sendChatMessage = async () => {
    if (!chatDraft.trim() || !activeChatMember || !myEmail) return;
    const text = chatDraft.trim();
    setChatDraft("");
    try {
      const { error } = await supabase.from("internal_messages").insert({
        sender_email: myEmail,
        receiver_email: activeChatMember.email,
        message: text,
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
      setChatDraft(text);
    }
  };

  // ── Form States ──
  const [newStage, setNewStage] = useState({
    stage_name: "",
    status: "pending"
  });

  const [newDepartment, setNewDepartment] = useState({
    name: "",
    department_id: "",
    department_type: "custom",
    manager_email: "",
    status: "active",
    start_date: "",
    due_date: "",
    notes: "",
  });

  const [newTask, setNewTask] = useState({
    task_name: "",
    description: "",
    department: "",
    department_id: "",
    priority: "medium",
    due_date: "",
    stage_id: "",
    assigned_to_email: "",
  });

  const [newManufacturing, setNewManufacturing] = useState({
    stage: "",
    status: "pending",
    remarks: "",
    responsible_person: "",
    start_date: "",
  });

  const [newDocument, setNewDocument] = useState({
    folder: "",
    file_name: "",
    file: null as File | null,
  });
  
  const [multipleFiles, setMultipleFiles] = useState<File[]>([]);
  const [uploadingMultiple, setUploadingMultiple] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadType, setUploadType] = useState<"single" | "multiple">("single");

  const [newCommunication, setNewCommunication] = useState({
    type: "comment",
    subject: "",
    message: "",
    next_followup: "",
  });

  const [noteMode, setNoteMode] = useState<"quick" | "brand_kit" | "client_tracker">("quick");
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
  });
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
  const [brandKitFields, setBrandKitFields] = useState<Record<string, string>>(EMPTY_BRAND_KIT);
  const [clientTrackerFields, setClientTrackerFields] = useState<Record<string, string>>(EMPTY_CLIENT_TRACKER);
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);
  const [noteImagePreview, setNoteImagePreview] = useState<string | null>(null);
  const [existingNoteImageUrl, setExistingNoteImageUrl] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  const [newProjectImageFile, setNewProjectImageFile] = useState<File | null>(null);
  const [newProjectImagePreview, setNewProjectImagePreview] = useState<string | null>(null);
  const [editProjectImageFile, setEditProjectImageFile] = useState<File | null>(null);
  const [editProjectImagePreview, setEditProjectImagePreview] = useState<string | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);

  const handleDashboardImageUpload = async (projectId: string, file: File) => {
    setUploadingImage(projectId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login first');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${Date.now()}.${fileExt}`;
      const filePath = `projects/${projectId}/cover/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        toast.error('Upload failed: ' + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('project_files')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('projects')
        .update({ image_url: urlData.publicUrl })
        .eq('id', projectId);

      if (updateError) {
        console.error('Update Error:', updateError);
        toast.error('Update failed: ' + updateError.message);
        return;
      }

      toast.success('Image updated successfully!');
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const { data: allProjects = [], isLoading, refetch } = useQuery({
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

  // Latest note per project (for project list cards)
  const { data: lastNotesByProject = {} } = useQuery({
    queryKey: ["project_last_notes", allProjects.map((p) => p.id).join(",")],
    enabled: allProjects.length > 0,
    queryFn: async () => {
      const projectIds = allProjects.map((p) => p.id);
      if (projectIds.length === 0) return {};

      // Fetch notes per project chunks so Supabase row limit doesn't drop older projects
      let allNotes: ProjectNote[] = [];
      for (let i = 0; i < projectIds.length; i += 50) {
        const chunk = projectIds.slice(i, i + 50);
        const { data, error } = await supabase
          .from("project_notes")
          .select("*")
          .in("project_id", chunk);
        if (error) throw error;
        allNotes = allNotes.concat((data || []) as ProjectNote[]);
      }

      const result: Record<string, ProjectNote> = {};

      for (const note of allNotes) {
        // System calendar note — don't show on project cards
        if (note.note_type === "content_calendar") continue;

        const existing = result[note.project_id];
        if (!existing) {
          result[note.project_id] = note;
          continue;
        }

        // True last note by updated_at, fallback created_at
        const tExisting = new Date(existing.updated_at || existing.created_at).getTime();
        const tNote = new Date(note.updated_at || note.created_at).getTime();
        if (tNote > tExisting) {
          result[note.project_id] = note;
        }
      }

      return result;
    },
  });

  const { data: lastAssigneeByProject = {} } = useQuery({
    queryKey: ["project_last_assignees"],
    queryFn: async () => {
      // Latest activity per project (updated_at / assigned_at / created_at).
      // In-progress tasks surface over older completed ones when touched more recently.
      const { data, error } = await supabase
        .from("project_tasks")
        .select("id, project_id, task_name, assigned_to_name, assigned_to_email, assigned_at, created_at, updated_at, status")
        .not("assigned_to_email", "is", null);
      if (error) throw error;

      const activityTs = (t: {
        updated_at?: string | null;
        assigned_at?: string | null;
        created_at?: string | null;
      }) => {
        const candidates = [t.updated_at, t.assigned_at, t.created_at]
          .filter(Boolean)
          .map((d) => new Date(d as string).getTime())
          .filter((n) => !Number.isNaN(n));
        return candidates.length ? Math.max(...candidates) : 0;
      };

      const map: Record<
        string,
        {
          name: string | null;
          email: string | null;
          taskName: string | null;
          assignedAt: string | null;
          status: string | null;
          _ts: number;
        }
      > = {};

      for (const t of data || []) {
        if (!t.project_id) continue;
        const ts = activityTs(t);
        const existing = map[t.project_id];
        const isCompleted = (t.status || "") === "completed";
        // Prefer higher activity time; on tie prefer non-completed (in progress)
        if (
          !existing ||
          ts > existing._ts ||
          (ts === existing._ts && existing.status === "completed" && !isCompleted)
        ) {
          map[t.project_id] = {
            name: t.assigned_to_name || null,
            email: t.assigned_to_email || null,
            taskName: t.task_name || null,
            assignedAt: t.assigned_at || t.updated_at || t.created_at || null,
            status: t.status || null,
            _ts: ts,
          };
        }
      }

      const result: Record<
        string,
        {
          name: string | null;
          email: string | null;
          taskName: string | null;
          assignedAt: string | null;
          status: string | null;
        }
      > = {};
      for (const [pid, row] of Object.entries(map)) {
        const { _ts, ...rest } = row;
        result[pid] = rest;
      }
      return result;
    },
  });

  const { data: stageProgressByProject = {} } = useQuery({
    queryKey: ["project_stage_progress", allProjects.map((p) => p.id).join(",")],
    enabled: allProjects.length > 0,
    queryFn: async () => {
      const projectIds = allProjects.map((p) => p.id);
      let allStages: { project_id: string; stage_name: string | null; status: string | null }[] = [];
      for (let i = 0; i < projectIds.length; i += 50) {
        const chunk = projectIds.slice(i, i + 50);
        const { data, error } = await supabase
          .from("project_stages")
          .select("project_id, stage_name, status")
          .in("project_id", chunk);
        if (error) throw error;
        allStages = allStages.concat(data || []);
      }
      const byProject: Record<string, { stage_name: string | null; status: string | null }[]> = {};
      for (const row of allStages) {
        if (!row.project_id) continue;
        (byProject[row.project_id] ||= []).push(row);
      }
      const result: Record<string, number> = {};
      for (const project of allProjects) {
        result[project.id] = computeStageCompletionPercent(byProject[project.id] || []);
      }
      return result;
    },
  });

  const projects = isAdmin
    ? allProjects
    : allProjects.filter((p: Project) => assignedProjectIds.has(p.id));

  const stats = {
    total: projects.length,
    active: projects.filter((p: Project) => normalizeProjectStatus(p.status) === "active").length,
    onHold: projects.filter((p: Project) => normalizeProjectStatus(p.status) === "on_hold").length,
    cancelled: projects.filter((p: Project) => normalizeProjectStatus(p.status) === "cancelled").length,
    completed: projects.filter((p: Project) => normalizeProjectStatus(p.status) === "completed").length,
    refund: projects.filter((p: Project) => normalizeProjectStatus(p.status) === "refund").length,
    totalValue: projects.reduce((sum: number, p: Project) => sum + (p.project_value || 0), 0),
  };

  const PROJECT_PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const filteredProjects = projects
    .filter((project: Project) => {
      const matchSearch = 
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        (project.brand_name || "").toLowerCase().includes(search.toLowerCase()) ||
        project.project_id.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus =
        filterStatus === "all" || normalizeProjectStatus(project.status) === filterStatus;
      const matchStage = filterStage === "all" || project.current_stage === filterStage;
      const matchPriority = filterPriority === "all" || project.priority === filterPriority;
      
      return matchSearch && matchStatus && matchStage && matchPriority;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        return (PROJECT_PRIORITY_RANK[a.priority] ?? 1) - (PROJECT_PRIORITY_RANK[b.priority] ?? 1);
      }
      const da = a.expected_launch_date ? new Date(a.expected_launch_date).getTime() : Infinity;
      const db = b.expected_launch_date ? new Date(b.expected_launch_date).getTime() : Infinity;
      return sortBy === "date_asc" ? da - db : db - da;
    });

  const filteredTasks = projectTasks.filter(task => {
    if (taskAssigneeFilter === "all") return true;
    if (taskAssigneeFilter === "mine") return task.assigned_to_email === user?.email;
    return task.assigned_to_email === taskAssigneeFilter;
  });

  const documentationNote = notes.find(n => n.note_type === "documentation") || null;
  // Last Note & Notes tab: only real project notes (never content_calendar / documentation)
  const generalNotes = notes
    .filter(n =>
      n.note_type === "general" ||
      n.note_type === "brand_kit" ||
      n.note_type === "client_tracker" ||
      n.note_type === "team_update" ||
      !n.note_type
    )
    .sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at).getTime();
      const tb = new Date(b.updated_at || b.created_at).getTime();
      return tb - ta;
    });
  const lastNote = generalNotes[0] || null;

  const fetchProjectDetails = async (projectId: string) => {
    setLoadingDetail(true);
    try {
      const { data: departmentsData, error: departmentsError } = await supabase
        .from("project_departments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      if (departmentsError) {
        console.error("Error fetching departments:", departmentsError);
        setDepartments([]);
      } else {
        setDepartments(departmentsData || []);
      }

      const { data: stagesData } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", projectId)
        .order("stage_order");
      if (stagesData) setProjectStages(stagesData);

      const { data: tasksData } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date");
      if (tasksData) setProjectTasks(tasksData);

      const { data: agreementsData } = await supabase
        .from("agreements")
        .select("*")
        .eq("project_id", projectId);
      if (agreementsData) setAgreements(agreementsData);

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date");
      if (paymentsData) setPayments(paymentsData);

      const { data: manufacturingData } = await supabase
        .from("manufacturing_tracker")
        .select("*")
        .eq("project_id", projectId)
        .order("stage");
      if (manufacturingData) setManufacturing(manufacturingData);

      const { data: documentsData } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (documentsData) setDocuments(documentsData);

      const { data: communicationsData } = await supabase
        .from("client_communications")
        .select("*")
        .eq("project_id", projectId)
        .order("communication_date", { ascending: false });
      if (communicationsData) setCommunications(communicationsData);

      const { data: notesData, error: notesError } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false, nullsFirst: false });
      if (notesError) {
        // Fallback if updated_at sort fails
        const { data: notesFallback } = await supabase
          .from("project_notes")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        setNotes(notesFallback || []);
        const docNote = (notesFallback || []).find((n: ProjectNote) => n.note_type === "documentation");
        setDocNoteContent(docNote?.content || "");
        const calNote = (notesFallback || []).find((n: ProjectNote) => n.note_type === "content_calendar");
        if (calNote) {
          const parsed = parseContentCalendar(calNote.content);
          if (parsed) {
            setContentCalendarDays(parsed.days);
            setContentCalendarStartDate(parsed.startDate || "");
            setContentCalendarNoteId(calNote.id);
          } else {
            setContentCalendarDays(createEmptyContentCalendar());
            setContentCalendarStartDate("");
            setContentCalendarNoteId(calNote.id);
          }
        } else {
          setContentCalendarDays(createEmptyContentCalendar());
          setContentCalendarStartDate("");
          setContentCalendarNoteId(null);
        }
      } else if (notesData) {
        // Client-side sort: prefer updated_at, else created_at
        const sorted = [...notesData].sort((a, b) => {
          const ta = new Date(a.updated_at || a.created_at).getTime();
          const tb = new Date(b.updated_at || b.created_at).getTime();
          return tb - ta;
        });
        setNotes(sorted);
        const docNote = sorted.find((n: ProjectNote) => n.note_type === "documentation");
        setDocNoteContent(docNote?.content || "");
        // Load 25-day content calendar
        const calNote = sorted.find((n: ProjectNote) => n.note_type === "content_calendar");
        if (calNote) {
          const parsed = parseContentCalendar(calNote.content);
          if (parsed) {
            setContentCalendarDays(parsed.days);
            setContentCalendarStartDate(parsed.startDate || "");
            setContentCalendarNoteId(calNote.id);
          } else {
            setContentCalendarDays(createEmptyContentCalendar());
            setContentCalendarStartDate("");
            setContentCalendarNoteId(calNote.id);
          }
        } else {
          setContentCalendarDays(createEmptyContentCalendar());
          setContentCalendarStartDate("");
          setContentCalendarNoteId(null);
        }
      } else {
        setNotes([]);
        setDocNoteContent("");
        setContentCalendarDays(createEmptyContentCalendar());
        setContentCalendarStartDate("");
        setContentCalendarNoteId(null);
      }

    } catch (error) {
      console.error("Error fetching project details:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setViewMode("detail");
    setActiveTab("overview");
    setTaskAssigneeFilter("all");
    setSelectedDepartment(null);
    fetchProjectDetails(project.id);
  };

  const handleBack = () => {
    setViewMode("dashboard");
    setSelectedProject(null);
    setDepartments([]);
    setSelectedDepartment(null);
    setProjectStages([]);
    setProjectTasks([]);
    setAgreements([]);
    setPayments([]);
    setManufacturing([]);
    setDocuments([]);
    setCommunications([]);
    setNotes([]);
    setDocNoteContent("");
  };

  const [newProject, setNewProject] = useState({
    name: "",
    brand_name: "",
    project_type: "perfume",
    project_value: "",
    priority: "medium",
    start_date: "",
    expected_launch_date: "",
    client_address: "",
    client_phone: "",
    client_email: "",
    product_category: "perfume",
    products_to_launch: "1",
    product_category_note: "",
  });

  const handleNewProjectImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setNewProjectImageFile(file);
    setNewProjectImagePreview(URL.createObjectURL(file));
  };

  const clearNewProjectImage = () => {
    setNewProjectImageFile(null);
    setNewProjectImagePreview(null);
    if (projectImageInputRef.current) projectImageInputRef.current.value = "";
  };

  const uploadProjectImage = async (projectId: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${Date.now()}.${fileExt}`;
      const filePath = `projects/${projectId}/cover/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project_files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('project_files')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
      return null;
    }
  };

  const createProject = async () => {
    if (!newProject.name) {
      toast.error("Client name is required");
      return;
    }

    setProjectSaving(true);
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
          priority: newProject.priority || "medium",
          start_date: newProject.start_date || null,
          expected_launch_date: newProject.expected_launch_date || null,
          client_address: newProject.client_address || null,
          client_phone: newProject.client_phone || null,
          client_email: newProject.client_email || null,
          product_category: newProject.product_category || null,
          products_to_launch: Number(newProject.products_to_launch) || 1,
          product_category_note: newProject.product_category_note || null,
          current_stage: "brand_identity",
          status: "active",
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;

      if (newProjectImageFile) {
        const imageUrl = await uploadProjectImage(data.id, newProjectImageFile);
        if (imageUrl) {
          await supabase.from("projects").update({ image_url: imageUrl }).eq("id", data.id);
        }
      }

      const stages = PROJECT_STAGES.map((stage, index) => ({
        project_id: data.id,
        stage_name: stage.label,
        stage_order: index + 1,
        status: index === 0 ? "in_progress" : "pending",
      }));

      await supabase.from("project_stages").insert(stages);

      await supabase.from("project_notes").insert({
        project_id: data.id,
        note_type: "documentation",
        title: "Project Documentation",
        content: "test",
        created_by: user?.email || null,
        created_by_email: user?.email || null,
      });

      toast.success("Project created successfully!");
      setDialogOpen(false);
      setNewProject({
        name: "",
        brand_name: "",
        project_type: "perfume",
        project_value: "",
        priority: "medium",
        start_date: "",
        expected_launch_date: "",
        client_address: "",
        client_phone: "",
        client_email: "",
      });
      clearNewProjectImage();
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProjectSaving(false);
    }
  };

  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleEditProjectImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setEditProjectImageFile(file);
    setEditProjectImagePreview(URL.createObjectURL(file));
  };

  const clearEditProjectImage = () => {
    setEditProjectImageFile(null);
    setEditProjectImagePreview(null);
    if (editingProject) setEditingProject({ ...editingProject, image_url: null });
    if (editProjectImageInputRef.current) editProjectImageInputRef.current.value = "";
  };

  const updateProject = async () => {
    if (!editingProject) return;

    setProjectSaving(true);
    try {
      let imageUrl = editingProject.image_url || null;
      if (editProjectImageFile) {
        const uploadedUrl = await uploadProjectImage(editingProject.id, editProjectImageFile);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const normalizedStatus = normalizeProjectStatus(editingProject.status) || editingProject.status;

      // Note: .select() after update often returns [] under RLS even when UPDATE succeeds.
      // So we update without relying on returned rows, then optimistically update UI + refetch.
      const { error } = await supabase
        .from("projects")
        .update({
          name: editingProject.name,
          brand_name: editingProject.brand_name,
          project_type: editingProject.project_type,
          project_value: editingProject.project_value,
          priority: editingProject.priority,
          start_date: editingProject.start_date || null,
          expected_launch_date: editingProject.expected_launch_date || null,
          status: normalizedStatus,
          current_stage: editingProject.current_stage,
          client_address: editingProject.client_address,
          client_phone: editingProject.client_phone,
          client_email: editingProject.client_email,
          product_category: editingProject.product_category || null,
          products_to_launch: editingProject.products_to_launch ?? null,
          product_category_note: editingProject.product_category_note || null,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProject.id);

      if (error) throw error;

      const saved: Project = {
        ...editingProject,
        status: normalizedStatus,
        image_url: imageUrl,
      };

      toast.success(
        normalizedStatus === "on_hold"
          ? "Project moved to On Hold"
          : normalizedStatus === "active"
          ? "Project set to Active"
          : normalizedStatus === "cancelled"
          ? "Project Cancelled"
          : "Project updated successfully"
      );
      setEditDialogOpen(false);
      setEditingProject(null);
      setEditProjectImageFile(null);
      setEditProjectImagePreview(null);
      if (selectedProject?.id === saved.id) {
        setSelectedProject({ ...selectedProject, ...saved });
      }
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update project");
    } finally {
      setProjectSaving(false);
    }
  };

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

  const updateStageStatus = async (stageId: string, status: string) => {
    try {
      const payload: Record<string, any> = { status };
      if (status === "completed") payload.completion_date = new Date().toISOString();
      if (status === "in_progress") payload.start_date = new Date().toISOString();
      const { error } = await supabase
        .from("project_stages")
        .update(payload)
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

  // Set status on fixed Project Stages pipeline (create row if missing)
  const upsertProjectStageStatus = async (
    stageLabel: string,
    stageOrder: number,
    status: string,
    stageValue?: string
  ) => {
    if (!selectedProject) return;
    try {
      const existing =
        projectStages.find(
          (s) =>
            s.stage_name === stageLabel ||
            s.stage_name?.toLowerCase() === stageLabel.toLowerCase() ||
            (stageValue && s.stage_name?.toLowerCase() === stageValue.toLowerCase())
        ) ||
        projectStages.find((s) => s.stage_order === stageOrder);

      if (existing) {
        const payload: Record<string, any> = {
          status,
          stage_name: stageLabel,
          stage_order: stageOrder,
        };
        if (status === "completed") payload.completion_date = new Date().toISOString();
        if (status === "in_progress" && !existing.start_date) {
          payload.start_date = new Date().toISOString();
        }
        const { error } = await supabase
          .from("project_stages")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
        // Optimistic local update
        setProjectStages((prev) =>
          prev.map((s) => (s.id === existing.id ? { ...s, ...payload } : s))
        );
      } else {
        const { error } = await supabase.from("project_stages").insert({
          project_id: selectedProject.id,
          stage_name: stageLabel,
          stage_order: stageOrder,
          status,
          ...(status === "in_progress" ? { start_date: new Date().toISOString() } : {}),
          ...(status === "completed" ? { completion_date: new Date().toISOString() } : {}),
        });
        if (error) throw error;
      }

      // Keep projects.current_stage in sync when a stage is started or completed
      if (status === "in_progress" || status === "completed") {
        const stageMeta = PROJECT_STAGES.find((s) => s.label === stageLabel);
        if (stageMeta) {
          await supabase
            .from("projects")
            .update({ current_stage: stageMeta.value, updated_at: new Date().toISOString() })
            .eq("id", selectedProject.id);
          setSelectedProject((prev) =>
            prev ? { ...prev, current_stage: stageMeta.value } : prev
          );
        }
      }

      const mergedStages = existing
        ? projectStages.map((st) => (st.id === existing.id ? { ...st, status, stage_name: stageLabel } : st))
        : [
            ...projectStages,
            {
              id: "temp",
              project_id: selectedProject.id,
              stage_name: stageLabel,
              stage_order: stageOrder,
              status,
              start_date: null,
              completion_date: null,
            },
          ];
      const stagePercent = computeStageCompletionPercent(mergedStages);
      await supabase
        .from("projects")
        .update({ completion_percentage: stagePercent, updated_at: new Date().toISOString() })
        .eq("id", selectedProject.id);
      setSelectedProject((prev) => prev ? { ...prev, completion_percentage: stagePercent } : prev);

      toast.success("Stage updated successfully");
      queryClient.invalidateQueries({ queryKey: ["project_stage_progress"] });
      fetchProjectDetails(selectedProject.id);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update stage");
    }
  };

  // Sync default Project Stages list onto older projects
  const syncDefaultProjectStages = async () => {
    if (!selectedProject) return;
    try {
      const existingNames = new Set(projectStages.map((s) => (s.stage_name || "").toLowerCase()));
      const toInsert = PROJECT_STAGES
        .map((stage, index) => ({
          project_id: selectedProject.id,
          stage_name: stage.label,
          stage_order: index + 1,
          status: "pending" as const,
        }))
        .filter((s) => !existingNames.has(s.stage_name.toLowerCase()));

      if (toInsert.length === 0) {
        toast.info("All project stages are already loaded");
        return;
      }
      const { error } = await supabase.from("project_stages").insert(toInsert);
      if (error) throw error;
      toast.success(`${toInsert.length} stages add ho gayi`);
      fetchProjectDetails(selectedProject.id);
    } catch (error: any) {
      toast.error(error.message || "Sync fail");
    }
  };

  const addDepartment = async () => {
    if (!newDepartment.name || !newDepartment.department_id || !selectedProject) {
      toast.error("Department name and department are required");
      return;
    }

    try {
      const manager = itTeam.find(m => m.email === newDepartment.manager_email);

      const { error } = await supabase
        .from("project_departments")
        .insert({
          project_id: selectedProject.id,
          department_id: newDepartment.department_id,
          name: newDepartment.name,
          department_type: newDepartment.department_type || null,
          manager_email: newDepartment.manager_email || null,
          manager_name: manager?.name || null,
          status: newDepartment.status || "active",
          start_date: newDepartment.start_date || null,
          due_date: newDepartment.due_date || null,
          notes: newDepartment.notes || null,
          progress: 0,
        });

      if (error) throw error;

      toast.success("Department added successfully!");
      setDepartmentDialogOpen(false);
      setNewDepartment({ name: "", department_id: "", department_type: "custom", manager_email: "", status: "active", start_date: "", due_date: "", notes: "" });
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add department");
    }
  };

  const updateDepartment = async () => {
    if (!editingDepartment) return;
    if (!editingDepartment.department_id) {
      toast.error("Department is required");
      return;
    }

    try {
      const manager = itTeam.find(m => m.email === editingDepartment.manager_email);

      const { error } = await supabase
        .from("project_departments")
        .update({
          name: editingDepartment.name,
          department_id: editingDepartment.department_id,
          department_type: editingDepartment.department_type,
          manager_email: editingDepartment.manager_email || null,
          manager_name: editingDepartment.manager_email ? (manager?.name || editingDepartment.manager_name) : null,
          status: editingDepartment.status,
          start_date: editingDepartment.start_date || null,
          due_date: editingDepartment.due_date || null,
          notes: editingDepartment.notes || null,
        })
        .eq("id", editingDepartment.id);

      if (error) throw error;

      toast.success("Department updated successfully!");
      setDepartmentDialogOpen(false);
      setEditingDepartment(null);
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update department");
    }
  };

  const deleteDepartment = async (departmentId: string) => {
    if (!confirm("Delete this department? Its tasks will remain but become unassigned from any department.")) return;

    try {
      const { error } = await supabase
        .from("project_departments")
        .delete()
        .eq("id", departmentId);

      if (error) throw error;

      toast.success("Department deleted successfully!");
      if (selectedDepartment?.id === departmentId) {
        setSelectedDepartment(null);
      }
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete department");
    }
  };

  const recomputeDepartmentProgress = async (departmentId: string) => {
    try {
      const { data: deptTasks, error: deptTasksError } = await supabase
        .from("project_tasks")
        .select("status")
        .eq("department_id", departmentId);

      if (deptTasksError || !deptTasks || deptTasks.length === 0) return;

      const completedCount = deptTasks.filter((t: any) => t.status === "completed").length;
      const newProgress = Math.round((completedCount / deptTasks.length) * 100);

      await supabase
        .from("project_departments")
        .update({ progress: newProgress })
        .eq("id", departmentId);
    } catch (error) {
      console.error("Error recomputing department progress:", error);
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

      const changedTask = projectTasks.find(t => t.id === taskId);
      if (changedTask?.department_id) {
        await recomputeDepartmentProgress(changedTask.department_id);
      }

      if (selectedProject) {
        const { data: tasksData, error: tasksError } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", selectedProject.id);

        // Project progress bar stages se chalti hai, tasks se nahi.

        await fetchProjectDetails(selectedProject.id);
        refetch();
      }
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const assignTask = async (taskId: string, email: string, name: string) => {
    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .update({ assigned_to_email: email, assigned_to_name: name })
        .eq("id", taskId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Update blocked (0 rows changed) — check RLS UPDATE policy on project_tasks.");
        return;
      }

      toast.success(`Task assigned to ${name}`);
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project_last_assignees"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const addTask = async () => {
    if (!newTask.task_name || !selectedProject) {
      toast.error("Task name is required");
      return;
    }

    try {
      const assignee = itTeam.find(m => m.email === newTask.assigned_to_email);
      const stageIdToSave = newTask.stage_id && newTask.stage_id !== "none" ? newTask.stage_id : null;
      const departmentIdToSave = newTask.department_id && newTask.department_id !== "none" ? newTask.department_id : null;
      const linkedDepartment = departmentIdToSave ? departments.find(d => d.id === departmentIdToSave) : null;

      const { error } = await supabase
        .from("project_tasks")
        .insert({
          project_id: selectedProject.id,
          stage_id: stageIdToSave,
          department_id: departmentIdToSave,
          task_name: newTask.task_name,
          description: newTask.description || null,
          department: linkedDepartment?.name || newTask.department || null,
          priority: newTask.priority,
          status: "not_started",
          due_date: newTask.due_date || null,
          assigned_by: user?.id,
          assigned_to_email: newTask.assigned_to_email || null,
          assigned_to_name: assignee?.name || null,
        });

      if (error) throw error;

      toast.success("Task added successfully!");
      setTaskDialogOpen(false);
      setNewTask({
        task_name: "",
        description: "",
        department: "",
        department_id: "",
        priority: "medium",
        due_date: "",
        stage_id: "",
        assigned_to_email: "",
      });
      if (departmentIdToSave) {
        recomputeDepartmentProgress(departmentIdToSave);
      }
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
      queryClient.invalidateQueries({ queryKey: ["my_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;

    try {
      const taskBeingDeleted = projectTasks.find(t => t.id === taskId);

      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task deleted successfully!");
      if (taskBeingDeleted?.department_id) {
        recomputeDepartmentProgress(taskBeingDeleted.department_id);
      }
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
      queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
      queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: string, paidDate?: string) => {
    try {
      const updates: any = { status };
      
      if (status === 'paid') {
        updates.paid_date = paidDate || new Date().toISOString().split('T')[0];
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

  const addManufacturing = async () => {
    if (!newManufacturing.stage || !selectedProject) {
      toast.error("Stage is required");
      return;
    }

    try {
      const { data: existing } = await supabase
        .from("manufacturing_tracker")
        .select("id")
        .eq("project_id", selectedProject.id)
        .eq("stage", newManufacturing.stage)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("manufacturing_tracker")
          .update({
            status: newManufacturing.status,
            remarks: newManufacturing.remarks || null,
            responsible_person: newManufacturing.responsible_person || null,
            start_date: newManufacturing.start_date || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) throw error;
        toast.success("Manufacturing stage updated successfully!");
      } else {
        const { error } = await supabase
          .from("manufacturing_tracker")
          .insert({
            project_id: selectedProject.id,
            stage: newManufacturing.stage,
            status: newManufacturing.status,
            remarks: newManufacturing.remarks || null,
            responsible_person: newManufacturing.responsible_person || null,
            start_date: newManufacturing.start_date || new Date().toISOString(),
          });

        if (error) throw error;
        toast.success("Manufacturing stage added successfully!");
      }

      setManufacturingDialogOpen(false);
      setNewManufacturing({
        stage: "",
        status: "pending",
        remarks: "",
        responsible_person: "",
        start_date: "",
      });
      
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to update manufacturing");
    }
  };

  const uploadDocument = async () => {
    if (!newDocument.folder || !newDocument.file || !selectedProject) {
      toast.error("Folder and file are required");
      return;
    }

    try {
      const file = newDocument.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `projects/${selectedProject.id}/documents/${newDocument.folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project_files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('project_files')
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from("project_documents")
        .insert({
          project_id: selectedProject.id,
          folder: newDocument.folder,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
          version: 1,
        });

      if (error) throw error;

      toast.success("Document uploaded successfully!");
      setDocumentDialogOpen(false);
      setNewDocument({
        folder: "",
        file_name: "",
        file: null,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
    }
  };

  const uploadMultipleFiles = async () => {
    if (!multipleFiles.length || !selectedProject) {
      toast.error("Please select files to upload");
      return;
    }

    setUploadingMultiple(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of multipleFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `projects/${selectedProject.id}/documents/${newDocument.folder || 'Others'}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project_files')
          .upload(filePath, file);

        if (uploadError) {
          failCount++;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('project_files')
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from("project_documents")
          .insert({
            project_id: selectedProject.id,
            folder: newDocument.folder || 'Others',
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user?.id,
            version: 1,
          });

        if (insertError) {
          failCount++;
        } else {
          successCount++;
        }
      }

      toast.success(`${successCount} files uploaded successfully! ${failCount > 0 ? `${failCount} failed.` : ''}`);
      setDocumentDialogOpen(false);
      setMultipleFiles([]);
      setNewDocument({ folder: "", file_name: "", file: null });
      setUploadType("single");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to upload files");
    } finally {
      setUploadingMultiple(false);
    }
  };

  const deleteDocument = async (doc: Document) => {
    if (!confirm(`Delete file "${doc.file_name}"?`)) return;
    try {
      const { error } = await supabase.from("project_documents").delete().eq("id", doc.id);
      if (error) throw error;
      // Best-effort storage cleanup if path can be derived
      try {
        const marker = "/project-documents/";
        const idx = doc.file_url?.indexOf(marker);
        if (idx != null && idx >= 0) {
          const path = doc.file_url.substring(idx + marker.length);
          if (path) await supabase.storage.from("project-documents").remove([path]);
        }
      } catch {
        /* storage cleanup optional */
      }
      toast.success("Document deleted");
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedProject) fetchProjectDetails(selectedProject.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    }
  };

  const handleMultipleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    setMultipleFiles(fileArray);
    toast.success(`${fileArray.length} files selected`);
  };

  const removeFileFromMultiple = (index: number) => {
    setMultipleFiles(prev => prev.filter((_, i) => i !== index));
  };

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
          communication_date: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Communication added successfully!");
      setCommunicationDialogOpen(false);
      setNewCommunication({ 
        type: "comment", 
        subject: "", 
        message: "", 
        next_followup: "" 
      });
      
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to add communication");
    }
  };

  const resetNoteForm = () => {
    setNoteMode("quick");
    setNewNote({ title: "", content: "" });
    setBrandKitFields(EMPTY_BRAND_KIT);
    setClientTrackerFields(EMPTY_CLIENT_TRACKER);
    setNoteImageFile(null);
    setNoteImagePreview(null);
    setExistingNoteImageUrl(null);
    setEditingNote(null);
  };

  const openAddNoteDialog = (mode: "quick" | "brand_kit" | "client_tracker" = "quick") => {
    resetNoteForm();
    setNoteMode(mode);
    setNoteDialogOpen(true);
  };

  const openEditNoteDialog = (note: ProjectNote) => {
    setEditingNote(note);
    if (note.note_type === "client_tracker") {
      const parsed = parseClientTracker(note.content);
      setNoteMode("client_tracker");
      setClientTrackerFields({ ...EMPTY_CLIENT_TRACKER, ...(parsed?.fields || {}) });
      setBrandKitFields(EMPTY_BRAND_KIT);
      setExistingNoteImageUrl(parsed?.imageUrl || null);
      setNoteImageFile(null);
      setNoteImagePreview(null);
      setNewNote({ title: note.title || "", content: "" });
    } else if (note.note_type === "brand_kit") {
      const parsed = parseBrandKit(note.content);
      setNoteMode("brand_kit");
      setBrandKitFields({ ...EMPTY_BRAND_KIT, ...(parsed?.fields || {}) });
      setClientTrackerFields(EMPTY_CLIENT_TRACKER);
      setExistingNoteImageUrl(parsed?.imageUrl || null);
      setNoteImageFile(null);
      setNoteImagePreview(null);
      setNewNote({ title: note.title || "", content: "" });
    } else {
      setNoteMode("quick");
      setNewNote({ title: note.title || "", content: note.content });
      setBrandKitFields(EMPTY_BRAND_KIT);
      setClientTrackerFields(EMPTY_CLIENT_TRACKER);
      setExistingNoteImageUrl(null);
      setNoteImageFile(null);
      setNoteImagePreview(null);
    }
    setNoteDialogOpen(true);
  };

  const handleNoteImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setNoteImageFile(file);
    setNoteImagePreview(URL.createObjectURL(file));
  };

  const clearNoteImage = () => {
    setNoteImageFile(null);
    setNoteImagePreview(null);
    setExistingNoteImageUrl(null);
    if (noteImageInputRef.current) noteImageInputRef.current.value = "";
  };

  const uploadNoteImageIfNeeded = async (): Promise<string | null> => {
    if (!noteImageFile || !selectedProject) return existingNoteImageUrl;
    const fileExt = noteImageFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `projects/${selectedProject.id}/notes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(filePath, noteImageFile);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('project_files')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const addNote = async () => {
    if (!selectedProject) return;

    if (noteMode === "quick" && !newNote.content) {
      toast.error("Note content is required");
      return;
    }
    if (noteMode === "brand_kit" && !brandKitFields.brand_name && !Object.values(brandKitFields).some(Boolean)) {
      toast.error("Please fill at least the brand name or another field");
      return;
    }
    if (noteMode === "client_tracker" && !Object.values(clientTrackerFields).some(Boolean)) {
      toast.error("Please fill at least one field");
      return;
    }

    setNoteSaving(true);
    try {
      const imageUrl = await uploadNoteImageIfNeeded();

      let insertPayload: any = {
        project_id: selectedProject.id,
        created_by: user?.email || user?.id || null,
        created_by_email: user?.email || null,
      };

      if (noteMode === "client_tracker") {
        insertPayload.note_type = "client_tracker";
        insertPayload.title = clientTrackerFields.client_full_name || "Client Progress Tracker";
        insertPayload.content = serializeClientTracker(clientTrackerFields, imageUrl);
      } else if (noteMode === "brand_kit") {
        insertPayload.note_type = "brand_kit";
        insertPayload.title = brandKitFields.brand_name || "Brand Identity Kit";
        insertPayload.content = serializeBrandKit(brandKitFields, imageUrl);
      } else {
        insertPayload.note_type = "general";
        insertPayload.title = newNote.title || null;
        insertPayload.content = imageUrl ? `${newNote.content}\n\n[image] ${imageUrl}` : newNote.content;
      }

      const { error } = await supabase.from("project_notes").insert(insertPayload);
      if (error) throw error;

      toast.success(
        noteMode === "client_tracker"
          ? "Client progress tracker saved!"
          : noteMode === "brand_kit"
          ? "Brand identity kit saved!"
          : "Note saved successfully!"
      );
      setNoteDialogOpen(false);
      resetNoteForm();
      fetchProjectDetails(selectedProject.id);
      queryClient.invalidateQueries({ queryKey: ["project_last_notes"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to save note");
    } finally {
      setNoteSaving(false);
    }
  };

  const updateNote = async () => {
    if (!editingNote || !selectedProject) return;

    setNoteSaving(true);
    try {
      const imageUrl = await uploadNoteImageIfNeeded();

      let updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (noteMode === "client_tracker") {
        updatePayload.title = clientTrackerFields.client_full_name || "Client Progress Tracker";
        updatePayload.content = serializeClientTracker(clientTrackerFields, imageUrl);
      } else if (noteMode === "brand_kit") {
        updatePayload.title = brandKitFields.brand_name || "Brand Identity Kit";
        updatePayload.content = serializeBrandKit(brandKitFields, imageUrl);
      } else {
        updatePayload.title = newNote.title || null;
        updatePayload.content = imageUrl ? `${newNote.content}\n\n[image] ${imageUrl}` : newNote.content;
      }

      const { error } = await supabase
        .from("project_notes")
        .update(updatePayload)
        .eq("id", editingNote.id);

      if (error) throw error;

      toast.success("Note updated successfully!");
      setNoteDialogOpen(false);
      resetNoteForm();
      fetchProjectDetails(selectedProject.id);
      queryClient.invalidateQueries({ queryKey: ["project_last_notes"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update note");
    } finally {
      setNoteSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    try {
      const { error } = await supabase
        .from("project_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast.success("Note deleted successfully!");
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
      queryClient.invalidateQueries({ queryKey: ["project_last_notes"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const saveDocumentationNote = async () => {
    if (!selectedProject) return;

    try {
      if (documentationNote) {
        const { error } = await supabase
          .from("project_notes")
          .update({ content: docNoteContent, updated_at: new Date().toISOString() })
          .eq("id", documentationNote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_notes")
          .insert({
            project_id: selectedProject.id,
            note_type: "documentation",
            title: "Project Documentation",
            content: docNoteContent || "",
            updated_at: new Date().toISOString(),
            created_by: user?.email || null,
            created_by_email: user?.email || null,
          });
        if (error) throw error;
      }

      toast.success("Documentation saved!");
      setDocNoteEditing(false);
      fetchProjectDetails(selectedProject.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to save documentation");
    }
  };

  // ── Save 25-Day Content Calendar ──
  const saveContentCalendar = async () => {
    if (!selectedProject) return;
    setContentCalendarSaving(true);
    try {
      const payload = serializeContentCalendar(contentCalendarDays, contentCalendarStartDate || null);
      if (contentCalendarNoteId) {
        const { error } = await supabase
          .from("project_notes")
          .update({
            content: payload,
            title: "25-Day Social Media Content Calendar",
            updated_at: new Date().toISOString(),
          })
          .eq("id", contentCalendarNoteId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("project_notes")
          .insert({
            project_id: selectedProject.id,
            note_type: "content_calendar",
            title: "25-Day Social Media Content Calendar",
            content: payload,
            updated_at: new Date().toISOString(),
            created_by: user?.email || null,
            created_by_email: user?.email || null,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) setContentCalendarNoteId(data.id);
      }
      toast.success("Content calendar saved!");
      fetchProjectDetails(selectedProject.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to save content calendar");
    } finally {
      setContentCalendarSaving(false);
    }
  };

  const updateContentDay = (dayIndex: number, patch: Partial<ContentDay>) => {
    setContentCalendarDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d))
    );
  };

  const toggleContentDayStatus = (dayIndex: number) => {
    setContentCalendarDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, status: d.status === "completed" ? "pending" : "completed" }
          : d
      )
    );
  };

  const applyStartDateToCalendar = (start: string) => {
    setContentCalendarStartDate(start);
    if (!start) return;
    const base = startOfDay(new Date(start));
    setContentCalendarDays((prev) =>
      prev.map((d, i) => ({
        ...d,
        scheduled_date: format(addDays(base, i), "yyyy-MM-dd"),
      }))
    );
  };

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

  const exportToExcel = () => {
    try {
      const exportData = projects.map((project: Project) => ({
        'Project ID': project.project_id,
        'Client Name': project.name,
        'Brand Name': project.brand_name || '',
        'Project Type': project.project_type || '',
        'Priority': project.priority || 'medium',
        'Project Value (₹)': project.project_value || 0,
        'Status': project.status,
        'Current Stage': project.current_stage,
        'Completion %': project.completion_percentage || 0,
        'Start Date': project.start_date ? format(new Date(project.start_date), 'dd-MM-yyyy') : '',
        'Expected Launch': project.expected_launch_date ? format(new Date(project.expected_launch_date), 'dd-MM-yyyy') : '',
        'Client Phone': project.client_phone || '',
        'Client Email': project.client_email || '',
        'Client Address': project.client_address || '',
        'Created At': project.created_at ? format(new Date(project.created_at), 'dd-MM-yyyy') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Projects');
      
      const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `Projects_Export_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
      toast.success('Projects exported successfully!');
    } catch (error: any) {
      toast.error('Failed to export: ' + error.message);
    }
  };

  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setImportFile(file);
    previewExcelFile(file);
  };

  const previewExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        setImportPreview(jsonData.slice(0, 10));
        toast.success(`Found ${jsonData.length} rows in the file`);
      } catch (error: any) {
        toast.error('Failed to read file: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const importFromExcel = async () => {
    if (!importFile) {
      toast.error('Please select a file first');
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      const fileData = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(importFile);
      });

      const workbook = XLSX.read(fileData as ArrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (!jsonData || jsonData.length === 0) {
        toast.error('No data found in the file');
        setImporting(false);
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const row of jsonData) {
        const clientName = (row as any)['Client Name'] || (row as any)['client_name'] || (row as any)['name'];
        
        if (!clientName) {
          skippedCount++;
          continue;
        }

        const projectId = `PRJ-${Date.now().toString().slice(-6)}${importedCount}`;
        
        const projectData = {
          project_id: projectId,
          name: clientName,
          brand_name: (row as any)['Brand Name'] || (row as any)['brand_name'] || null,
          project_type: (row as any)['Project Type'] || (row as any)['project_type'] || 'perfume',
          priority: (row as any)['Priority'] || (row as any)['priority'] || 'medium',
          project_value: Number((row as any)['Project Value'] || (row as any)['project_value'] || 0) || 0,
          status: (row as any)['Status'] || (row as any)['status'] || 'active',
          current_stage: (row as any)['Current Stage'] || (row as any)['current_stage'] || 'brand_identity',
          completion_percentage: Number((row as any)['Completion %'] || (row as any)['completion'] || 0) || 0,
          start_date: (row as any)['Start Date'] || (row as any)['start_date'] || null,
          expected_launch_date: (row as any)['Expected Launch'] || (row as any)['expected_launch'] || null,
          client_phone: (row as any)['Client Phone'] || (row as any)['client_phone'] || null,
          client_email: (row as any)['Client Email'] || (row as any)['client_email'] || null,
          client_address: (row as any)['Client Address'] || (row as any)['client_address'] || null,
        };

        if (projectData.start_date && typeof projectData.start_date === 'string') {
          try {
            const parts = projectData.start_date.split('-');
            if (parts.length === 3) {
              projectData.start_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          } catch (e) {}
        }

        if (projectData.expected_launch_date && typeof projectData.expected_launch_date === 'string') {
          try {
            const parts = projectData.expected_launch_date.split('-');
            if (parts.length === 3) {
              projectData.expected_launch_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          } catch (e) {}
        }

        try {
          const { data, error } = await supabase
            .from('projects')
            .insert(projectData)
            .select()
            .single();

          if (error) {
            console.error('Error importing project:', error);
            skippedCount++;
            continue;
          }

          const stages = PROJECT_STAGES.map((stage, index) => ({
            project_id: data.id,
            stage_name: stage.label,
            stage_order: index + 1,
            status: index === 0 ? 'in_progress' : 'pending',
          }));

          await supabase.from('project_stages').insert(stages);

          await supabase.from('project_notes').insert({
            project_id: data.id,
            note_type: 'documentation',
            title: 'Project Documentation',
            content: 'test',
            created_by: user?.email || null,
            created_by_email: user?.email || null,
          });

          importedCount++;
        } catch (err) {
          skippedCount++;
          console.error('Error importing row:', err);
        }
      }

      toast.success(`Imported ${importedCount} projects successfully! ${skippedCount} rows skipped.`);
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
      refetch();
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // ── Top Navigation ──
  const TopNav = (
    <div className="flex items-center gap-2 flex-wrap border-b pb-3">
      <Button
        variant={mainView === "projects" ? "default" : "outline"}
        size="sm"
        onClick={() => setMainView("projects")}
      >
        <FolderKanban className="h-4 w-4 mr-2" />
        Projects
      </Button>
      <Button
        variant={mainView === "my_tasks" ? "default" : "outline"}
        size="sm"
        onClick={() => setMainView("my_tasks")}
      >
        <ClipboardList className="h-4 w-4 mr-2" />
        My Tasks
        {myTaskStats.overdue > 0 && (
          <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">{myTaskStats.overdue}</Badge>
        )}
      </Button>
      <Button
        variant={mainView === "task_calendar" ? "default" : "outline"}
        size="sm"
        onClick={() => setMainView("task_calendar")}
      >
        <CalendarRange className="h-4 w-4 mr-2" />
        Calendar
      </Button>
      {isAdmin && (
        <Button
          variant={mainView === "task_assignment" ? "default" : "outline"}
          size="sm"
          onClick={() => setMainView("task_assignment")}
        >
          <UsersIcon className="h-4 w-4 mr-2" />
          Assignment
        </Button>
      )}
      <Button
        variant={mainView === "chat" ? "default" : "outline"}
        size="sm"
        onClick={() => setMainView("chat")}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Team Chat
        {chatUnread.length > 0 && (
          <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">{chatUnread.length}</Badge>
        )}
      </Button>
      {isAdmin && (
        <Badge variant="outline" className="ml-auto text-[10px]">👑 {ADMIN_DISPLAY_NAME} — Admin View</Badge>
      )}
    </div>
  );

  // ── TASK CALENDAR VIEW ──
  if (mainView === "task_calendar") {
    const calendarTasks = isAdmin ? allTasks : myTasks;
    return (
      <div className="space-y-6">
        {TopNav}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Task Calendar</h1>
            <p className="text-muted-foreground text-sm">
              {isAdmin
                ? "Filter by project from the dropdown · Single click date = Add Task · Double click = Open day"
                : "Your assigned tasks · Filter by project · Single click date = Add Task · Double click = Open day"}
            </p>
          </div>
        </div>
        <TaskCalendarView 
          tasks={calendarTasks} 
          onTaskClick={handleTaskClick}
          itTeam={itTeam}
          projects={projects}
          onAddTask={async (data) => {
            const { error } = await supabase.from("project_tasks").insert({
              project_id: data.project_id,
              task_name: data.task_name,
              description: data.description || null,
              priority: data.priority || "medium",
              status: "not_started",
              due_date: data.due_date,
              assigned_to_email: data.assigned_to_email || null,
              assigned_to_name: data.assigned_to_name || null,
              assigned_by: user?.id,
            });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
            queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
            queryClient.invalidateQueries({ queryKey: ["my_tasks"] });
          }}
          onUpdateDueDate={async (taskId, dueDate) => {
            const { error } = await supabase
              .from("project_tasks")
              .update({ due_date: dueDate, updated_at: new Date().toISOString() })
              .eq("id", taskId);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ["all_tasks"] });
            queryClient.invalidateQueries({ queryKey: ["all_tasks_for_views"] });
            queryClient.invalidateQueries({ queryKey: ["my_tasks"] });
          }}
        />

        {/* Task Detail Dialog */}
        <TaskDetailDialog
          open={taskDetailDialogOpen}
          onOpenChange={(open) => {
            setTaskDetailDialogOpen(open);
            if (!open) setSelectedTaskId(null);
          }}
          task={allTasks.find(t => t.id === selectedTaskId) || null}
          itTeam={itTeam}
          subtasks={selectedTaskId ? dialogSubtasks[selectedTaskId] || [] : []}
          remarks={selectedTaskId ? dialogRemarks[selectedTaskId] || [] : []}
          projectNote={selectedTaskId ? dialogProjectNotes[allTasks.find(t => t.id === selectedTaskId)?.project_id || ""] || null : null}
          currentUserEmail={user?.email || ""}
          onStatusChange={handleDialogStatusChange}
          onAssign={handleDialogAssign}
          onAddSubtask={handleDialogAddSubtask}
          onToggleSubtask={handleDialogToggleSubtask}
          onDeleteSubtask={handleDialogDeleteSubtask}
          onUpdateSubtaskNote={handleDialogUpdateSubtaskNote}
          onAddRemark={handleDialogAddRemark}
          onDeleteTask={handleDialogDeleteTask}
          onSaveProjectNote={handleDialogSaveProjectNote}
          onFetchSubtasks={fetchDialogSubtasks}
          onFetchRemarks={fetchDialogRemarks}
          subtasksLoading={selectedTaskId ? dialogSubtasksLoading[selectedTaskId] || false : false}
          remarksLoading={selectedTaskId ? dialogRemarksLoading[selectedTaskId] || false : false}
          savingRemark={selectedTaskId ? dialogSavingRemark === selectedTaskId : false}
          projectNoteLoading={selectedTaskId ? dialogProjectNotesLoading[allTasks.find(t => t.id === selectedTaskId)?.project_id || ""] || false : false}
        />
      </div>
    );
  }

  // ── TASK ASSIGNMENT VIEW (Admin only) ──
  if (mainView === "task_assignment") {
    if (!isAdmin) {
      return (
        <div className="space-y-6">
          {TopNav}
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Access restricted</p>
              <p className="text-sm text-muted-foreground mt-1">Task Assignment dashboard sirf Admin ke liye hai. Aap My Tasks se apne tasks dekh sakte ho.</p>
              <Button className="mt-4" size="sm" onClick={() => setMainView("my_tasks")}>
                <ClipboardList className="h-4 w-4 mr-2" /> Go to My Tasks
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {TopNav}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Assignment</h1>
          <p className="text-muted-foreground text-sm">Assign and manage tasks across the team</p>
        </div>
        <TaskAssignmentPage 
          itTeam={itTeam} 
          user={user} 
          onTaskClick={handleTaskClick}
        />

        {/* Task Detail Dialog */}
        <TaskDetailDialog
          open={taskDetailDialogOpen}
          onOpenChange={(open) => {
            setTaskDetailDialogOpen(open);
            if (!open) setSelectedTaskId(null);
          }}
          task={allTasks.find(t => t.id === selectedTaskId) || null}
          itTeam={itTeam}
          subtasks={selectedTaskId ? dialogSubtasks[selectedTaskId] || [] : []}
          remarks={selectedTaskId ? dialogRemarks[selectedTaskId] || [] : []}
          projectNote={selectedTaskId ? dialogProjectNotes[allTasks.find(t => t.id === selectedTaskId)?.project_id || ""] || null : null}
          currentUserEmail={user?.email || ""}
          onStatusChange={handleDialogStatusChange}
          onAssign={handleDialogAssign}
          onAddSubtask={handleDialogAddSubtask}
          onToggleSubtask={handleDialogToggleSubtask}
          onDeleteSubtask={handleDialogDeleteSubtask}
          onUpdateSubtaskNote={handleDialogUpdateSubtaskNote}
          onAddRemark={handleDialogAddRemark}
          onDeleteTask={handleDialogDeleteTask}
          onSaveProjectNote={handleDialogSaveProjectNote}
          onFetchSubtasks={fetchDialogSubtasks}
          onFetchRemarks={fetchDialogRemarks}
          subtasksLoading={selectedTaskId ? dialogSubtasksLoading[selectedTaskId] || false : false}
          remarksLoading={selectedTaskId ? dialogRemarksLoading[selectedTaskId] || false : false}
          savingRemark={selectedTaskId ? dialogSavingRemark === selectedTaskId : false}
          projectNoteLoading={selectedTaskId ? dialogProjectNotesLoading[allTasks.find(t => t.id === selectedTaskId)?.project_id || ""] || false : false}
        />
      </div>
    );
  }

  // ── MY TASKS VIEW ──
  if (mainView === "my_tasks") {
    const selectedTask = myTasks.find(t => t.id === selectedTaskId) || null;
    
    return (
      <div className="space-y-6">
        {TopNav}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground text-sm">Your assigned tasks are displayed here</p>
        </div>

        {myTasksLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                icon={ClipboardList}
                label="Total Tasks"
                value={myTaskStats.total}
                color="blue"
                active={myTaskStatusFilter === "all" && myTaskDueFilter === "all"}
                onClick={() => applyMyTaskStatFilter("all")}
              />
              <StatCard
                icon={Zap}
                label="Active"
                value={myTaskStats.active}
                color="indigo"
                active={myTaskStatusFilter === "in_progress"}
                onClick={() => applyMyTaskStatFilter("active")}
              />
              <StatCard
                icon={Clock}
                label="Pending"
                value={myTaskStats.pending}
                color="yellow"
                active={myTaskStatusFilter === "not_started"}
                onClick={() => applyMyTaskStatFilter("pending")}
              />
              <StatCard
                icon={AlertTriangle}
                label="Overdue"
                value={myTaskStats.overdue}
                color="red"
                active={myTaskDueFilter === "overdue"}
                onClick={() => applyMyTaskStatFilter("overdue")}
              />
              <StatCard
                icon={CheckCircle}
                label="Completed"
                value={myTaskStats.completed}
                color="green"
                active={myTaskStatusFilter === "completed"}
                onClick={() => applyMyTaskStatFilter("completed")}
              />
              <StatCard
                icon={CalendarDays}
                label="Today's Tasks"
                value={myTaskStats.today}
                color="orange"
                active={myTaskDueFilter === "today"}
                onClick={() => applyMyTaskStatFilter("today")}
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap gap-2">
                  <Select value={myTaskDueFilter} onValueChange={setMyTaskDueFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Due date" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="today">Due Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="later">Later</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={myTaskPriorityFilter} onValueChange={setMyTaskPriorityFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={myTaskStatusFilter} onValueChange={setMyTaskStatusFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">Processing</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="completed">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={myTaskClientFilter} onValueChange={setMyTaskClientFilter}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {myTaskClients.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMyTaskDueFilter("all");
                      setMyTaskPriorityFilter("all");
                      setMyTaskStatusFilter("all");
                      setMyTaskClientFilter("all");
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {(() => {
              const activeMyTasks = filteredMyTasks.filter(t => t.status !== "completed");
              const completedMyTasks = filteredMyTasks.filter(t => t.status === "completed");
              const tasksToRender =
                myTaskStatusFilter === "completed"
                  ? completedMyTasks
                  : myTaskStatusFilter === "all"
                    ? [...activeMyTasks, ...completedMyTasks]
                    : activeMyTasks;
              return (
            <div className="space-y-3">
              {tasksToRender.length === 0 && (
                <Card><CardContent className="p-8 text-center text-muted-foreground">
                  Task
                </CardContent></Card>
              )}
              {myTaskStatusFilter !== "completed" && activeMyTasks.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Active Tasks</h3>
                  <Badge variant="outline" className="text-xs">{activeMyTasks.length}</Badge>
                </div>
              )}
              {(myTaskStatusFilter === "completed" ? [] : activeMyTasks).map((task) => {
                const bucket = getDueBucket(task.due_date);
                const isExpanded = expandedMyTaskId === task.id;
                const subtasks = myTaskSubtasks[task.id] || [];
                const subtasksCompleted = subtasks.filter(s => s.status === "completed").length;
                const draft = newSubtaskDraft[task.id] || { title: "", tag: "" };
                const projectNote = task.project_id in projectNoteByProject ? projectNoteByProject[task.project_id] : undefined;
                const noteDraftVal = projectNoteDraft[task.project_id] ?? "";
                const isNoteEditing = !!projectNoteEditing[task.project_id];
                return (
                  <Card 
                    key={task.id} 
                    className={`${bucket === "overdue" && task.status !== "completed" ? "border-red-300" : ""} hover:shadow-md transition-shadow cursor-pointer`}
                    onClick={() => handleTaskClick(task)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandMyTask(task.id, task.project_id);
                              }}
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              title={isExpanded ? "Collapse" : "Expand: client details, project update, subtasks"}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                            <span className="font-medium">{task.task_name}</span>
                            <PriorityBadge priority={task.priority} />
                            <StatusBadge status={task.status} />
                            {subtasks.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                Completed {subtasksCompleted}/{subtasks.length} subtasks
                              </span>
                            )}
                            {bucket === "overdue" && task.status !== "completed" && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                          {task.projects && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {task.projects.name}
                              {task.projects.brand_name ? ` • ${task.projects.brand_name}` : ""}
                            </p>
                          )}
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {format(new Date(task.due_date), "dd MMM yyyy")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.employee_remarks && (
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200 max-w-xs truncate">
                              💬 {task.employee_remarks}
                            </div>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                            <p className="text-xs font-semibold flex items-center gap-1.5 text-amber-800 mb-2">
                              <Clock className="h-3.5 w-3.5" /> Update / Remark History
                            </p>
                            {remarksHistoryLoadingFor === task.id ? (
                              <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(myTaskRemarksHistory[task.id] || []).map((r) => (
                                  <div key={r.id} className="bg-white border rounded-md p-2">
                                    <p className="text-sm whitespace-pre-wrap">{r.remark}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      {r.created_by_name || r.created_by_email || "You"} • {format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")}
                                    </p>
                                  </div>
                                ))}
                                {(myTaskRemarksHistory[task.id] || []).length === 0 && (
                                  <p className="text-xs text-muted-foreground py-1">No updates yet — add one below.</p>
                                )}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Textarea
                                rows={2}
                                value={newRemarkDraft[task.id] || ""}
                                onChange={(e) => setNewRemarkDraft((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                placeholder="e.g. Sample sent, waiting on client reply..."
                                className="text-sm bg-white"
                              />
                              <Button
                                size="sm"
                                disabled={remarkSavingFor === task.id || !(newRemarkDraft[task.id] || "").trim()}
                                onClick={() => addRemarkToHistory(task.id)}
                              >
                                {remarkSavingFor === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                              </Button>
                            </div>
                          </div>

                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                              <Building2 className="h-3.5 w-3.5 text-blue-600" /> Client Dashboard
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <p><span className="text-muted-foreground">Client: </span><span className="font-medium">{task.projects?.name || "—"}</span></p>
                              <p><span className="text-muted-foreground">Brand: </span><span className="font-medium">{task.projects?.brand_name || "—"}</span></p>
                              {task.projects?.client_phone && (
                                <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {task.projects.client_phone}</p>
                              )}
                              {task.projects?.client_email && (
                                <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {task.projects.client_email}</p>
                              )}
                              {task.projects?.client_address && (
                                <p className="flex items-center gap-1 sm:col-span-2"><MapPin className="h-3 w-3 text-muted-foreground" /> {task.projects.client_address}</p>
                              )}
                              {task.projects?.current_stage && (
                                <p className="sm:col-span-2"><StageBadge stage={task.projects.current_stage} /></p>
                              )}
                            </div>
                          </div>

                          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold flex items-center gap-1.5 text-blue-800">
                                <StickyNote className="h-3.5 w-3.5" /> What's happening in this project (visible to whole team)
                              </p>
                              {!isNoteEditing ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs px-2"
                                  onClick={() => setProjectNoteEditing(prev => ({ ...prev, [task.project_id]: true }))}
                                >
                                  <Edit className="h-3 w-3 mr-1" />Edit
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  disabled={projectNoteSaving === task.project_id}
                                  onClick={() => saveProjectTeamNote(task.project_id)}
                                >
                                  {projectNoteSaving === task.project_id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                  Save
                                </Button>
                              )}
                            </div>
                            {projectNoteLoadingFor === task.project_id ? (
                              <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                            ) : isNoteEditing ? (
                              <Textarea
                                rows={3}
                                value={noteDraftVal}
                                onChange={(e) => setProjectNoteDraft(prev => ({ ...prev, [task.project_id]: e.target.value }))}
                                placeholder="e.g. Client sample approved, waiting on packaging vendor..."
                                className="text-sm bg-white"
                              />
                            ) : (
                              <p className="text-sm text-blue-900 whitespace-pre-wrap">
                                {projectNote?.content || "No update yet — click Edit to add one."}
                              </p>
                            )}
                            {projectNote?.updated_at && !isNoteEditing && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Last updated: {format(new Date(projectNote.updated_at), "dd MMM yyyy, hh:mm a")}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                              <ListChecks className="h-3.5 w-3.5 text-violet-600" /> Subtasks
                            </p>
                            {subtaskLoadingFor === task.id ? (
                              <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                            ) : (
                              <div className="space-y-1.5">
                                {subtasks.map((st) => (
                                  <div key={st.id} className="flex items-center gap-2 border rounded-md px-2 py-1.5 bg-background">
                                    <input
                                      type="checkbox"
                                      checked={st.status === "completed"}
                                      onChange={() => toggleSubtaskStatus(st.id, task.id, st.status)}
                                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                    <span className={`text-sm flex-1 ${st.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                      {st.title}
                                    </span>
                                    <SubtaskTagBadge tag={st.tag} />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-destructive"
                                      onClick={() => deleteSubtask(st.id, task.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                {subtasks.length === 0 && (
                                  <p className="text-xs text-muted-foreground py-1">No subtasks yet — break this task down below.</p>
                                )}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Input
                                value={draft.title}
                                onChange={(e) => setNewSubtaskDraft(prev => ({ ...prev, [task.id]: { title: e.target.value, tag: prev[task.id]?.tag || "" } }))}
                                placeholder="Add a subtask..."
                                className="h-8 text-sm flex-1"
                                onKeyDown={(e) => { if (e.key === "Enter") addSubtask(task.id); }}
                              />
                              <Select
                                value={draft.tag}
                                onValueChange={(v) => setNewSubtaskDraft(prev => ({ ...prev, [task.id]: { title: prev[task.id]?.title || "", tag: v } }))}
                              >
                                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
                                <SelectContent>
                                  {SUBTASK_TAGS.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="h-8" onClick={() => addSubtask(task.id)}>
                                <Plus className="h-3.5 w-3.5 mr-1" />Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {(myTaskStatusFilter === "all" || myTaskStatusFilter === "completed") && completedMyTasks.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-4">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <h3 className="text-sm font-semibold">Completed Tasks</h3>
                    <Badge variant="outline" className="text-xs">{completedMyTasks.length}</Badge>
                  </div>
                  {completedMyTasks.map((task) => {
                    const bucket = getDueBucket(task.due_date);
                    const isExpanded = expandedMyTaskId === task.id;
                    const subtasks = myTaskSubtasks[task.id] || [];
                    const subtasksCompleted = subtasks.filter(s => s.status === "completed").length;
                    const draft = newSubtaskDraft[task.id] || { title: "", tag: "" };
                    const projectNote = task.project_id in projectNoteByProject ? projectNoteByProject[task.project_id] : undefined;
                    const noteDraftVal = projectNoteDraft[task.project_id] ?? "";
                    const isNoteEditing = !!projectNoteEditing[task.project_id];
                    return (
                      <Card
                        key={task.id}
                        className="bg-muted/20 hover:shadow-md transition-shadow cursor-pointer opacity-90"
                        onClick={() => handleTaskClick(task)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandMyTask(task.id, task.project_id);
                                  }}
                                  className="shrink-0 text-muted-foreground hover:text-foreground"
                                  title={isExpanded ? "Collapse" : "Expand"}
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                                <span className="font-medium line-through text-muted-foreground">{task.task_name}</span>
                                <PriorityBadge priority={task.priority} />
                                <StatusBadge status={task.status} />
                                {subtasks.length > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                    Completed {subtasksCompleted}/{subtasks.length} subtasks
                                  </span>
                                )}
                              </div>
                              {task.projects && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Building2 className="h-3 w-3" /> {task.projects.name}
                                  {task.projects.brand_name ? ` • ${task.projects.brand_name}` : ""}
                                </p>
                              )}
                              {task.due_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Due: {format(new Date(task.due_date), "dd MMM yyyy")}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
                              <p className="text-xs text-muted-foreground">
                                Task is complete. Click the card to view details.
                              </p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              )}
                              {subtasks.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold flex items-center gap-1">
                                    <ListChecks className="h-3.5 w-3.5" /> Subtasks
                                  </p>
                                  {subtasks.map((st) => (
                                    <div key={st.id} className="text-sm flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span className={st.status === "completed" ? "line-through text-muted-foreground" : ""}>
                                        {st.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
              );
            })()}
          </>
        )}

        <TaskDetailDialog
          open={taskDetailDialogOpen}
          onOpenChange={(open) => {
            setTaskDetailDialogOpen(open);
            if (!open) setSelectedTaskId(null);
          }}
          task={selectedTask}
          itTeam={itTeam}
          subtasks={selectedTaskId ? dialogSubtasks[selectedTaskId] || [] : []}
          remarks={selectedTaskId ? dialogRemarks[selectedTaskId] || [] : []}
          projectNote={selectedTask ? dialogProjectNotes[selectedTask.project_id] || null : null}
          currentUserEmail={user?.email || ""}
          onStatusChange={handleDialogStatusChange}
          onAssign={handleDialogAssign}
          onAddSubtask={handleDialogAddSubtask}
          onToggleSubtask={handleDialogToggleSubtask}
          onDeleteSubtask={handleDialogDeleteSubtask}
          onUpdateSubtaskNote={handleDialogUpdateSubtaskNote}
          onAddRemark={handleDialogAddRemark}
          onDeleteTask={handleDialogDeleteTask}
          onSaveProjectNote={handleDialogSaveProjectNote}
          onFetchSubtasks={fetchDialogSubtasks}
          onFetchRemarks={fetchDialogRemarks}
          subtasksLoading={selectedTaskId ? dialogSubtasksLoading[selectedTaskId] || false : false}
          remarksLoading={selectedTaskId ? dialogRemarksLoading[selectedTaskId] || false : false}
          savingRemark={selectedTaskId ? dialogSavingRemark === selectedTaskId : false}
          projectNoteLoading={selectedTask ? dialogProjectNotesLoading[selectedTask.project_id] || false : false}
        />
      </div>
    );
  }

  // ── TEAM CHAT VIEW ──
  if (mainView === "chat") {
    return (
      <div className="space-y-4">
        {TopNav}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Chat</h1>
          <p className="text-muted-foreground text-sm">IT Team Chat — 1-to-1 + Group</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 h-[550px]">
              <div className="border-r overflow-y-auto">
                {itLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  [TEAM_GROUP_MEMBER, ...chatTeamList].map((member) => (
                    <button
                      key={member.id}
                      onClick={() => selectChatMember(member)}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-muted/40 transition-colors flex items-center justify-between ${
                        activeChatMember?.id === member.id ? "bg-muted/60" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          {member.email === TEAM_GROUP_EMAIL ? <Users2 className="h-3.5 w-3.5 text-fuchsia-600" /> : null}
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.role || member.email}</p>
                      </div>
                      {chatUnread.includes(member.email) && (
                        <CircleDot className="h-3 w-3 text-blue-500" />
                      )}
                    </button>
                  ))
                )}
                {!itLoading && chatTeamList.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4">No other IT team members found</p>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col">
                {!activeChatMember ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Group chat ya member select karein
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b">
                      <p className="font-medium text-sm">{activeChatMember.name}</p>
                      {activeChatMember.email === TEAM_GROUP_EMAIL && (
                        <p className="text-xs text-muted-foreground">Poori team yahan chat kar sakti hai. Messages save rehte hain.</p>
                      )}
                    </div>
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                      {chatMessagesLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                      ) : (
                        chatMessages.map((m) => {
                          const mine = m.sender_email === myEmail;
                          const senderLabel = displayPersonName(itTeam.find((t) => t.email === m.sender_email)?.name, m.sender_email);
                          return (
                            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                              >
                                {!mine && activeChatMember?.email === TEAM_GROUP_EMAIL && (
                                  <p className="text-[10px] font-semibold mb-0.5 opacity-80">{senderLabel}</p>
                                )}
                                <p className="whitespace-pre-wrap">{m.message}</p>
                                <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {format(new Date(m.created_at), "hh:mm a")}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {!chatMessagesLoading && chatMessages.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-8">
                          Pehla message bhejein — ye save ho jayega
                        </p>
                      )}
                    </div>
                    <div className="p-3 border-t flex gap-2">
                      <Input
                        value={chatDraft}
                        onChange={(e) => setChatDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendChatMessage();
                          }
                        }}
                        placeholder="Message likhein..."
                      />
                      <Button size="icon" onClick={sendChatMessage} disabled={!chatDraft.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── DETAIL VIEW ──
  if (viewMode === "detail" && selectedProject) {
    const paymentSummary = getPaymentSummary();
    
    return (
      <div className="space-y-6">
        {TopNav}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {selectedProject.image_url ? (
              <img
                src={selectedProject.image_url}
                alt={selectedProject.name}
                className="h-14 w-14 rounded-md object-cover border shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-md border bg-muted flex items-center justify-center text-2xl shrink-0">
                {PROJECT_TYPES.find(t => t.value === selectedProject.project_type)?.icon || "📋"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{selectedProject.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedProject.project_id} • {selectedProject.brand_name || "No brand"}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                {selectedProject.client_phone && (
                  <span className="inline-flex items-center gap-1"><PhoneCall className="h-3 w-3" /> {selectedProject.client_phone}</span>
                )}
                {selectedProject.client_email && (
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedProject.client_email}</span>
                )}
                {selectedProject.client_address && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedProject.client_address}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-sm">
              {PROJECT_TYPES.find(t => t.value === selectedProject.project_type)?.icon || "📋"} 
              {selectedProject.project_type || "N/A"}
            </Badge>
            <ProjectPriorityBadge priority={selectedProject.priority || "medium"} />
            
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
                <Button size="sm" variant="outline" onClick={() => setManufacturingDialogOpen(true)}>
                  <Package className="h-4 w-4 mr-2" />
                  Manufacturing
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => setDocumentDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCommunicationDialogOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Communicate
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAddNoteDialog("quick")}>
              <StickyNote className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            
            {isAdmin && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setEditingProject(selectedProject);
                    setEditProjectImageFile(null);
                    setEditProjectImagePreview(null);
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
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Project Progress</span>
            <span className="font-semibold">{computeStageCompletionPercent(projectStages) || selectedProject.completion_percentage || 0}%</span>
          </div>
          <Progress value={computeStageCompletionPercent(projectStages) || selectedProject.completion_percentage || 0} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Started: {selectedProject.start_date ? format(new Date(selectedProject.start_date), "dd MMM yyyy") : "N/A"}</span>
            <span>Launch: {selectedProject.expected_launch_date ? format(new Date(selectedProject.expected_launch_date), "dd MMM yyyy") : "N/A"}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="stages">Stages</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="content_calendar">Content Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Status / Stage / Value / Tasks */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Select
                      value={normalizeProjectStatus(selectedProject.status) || selectedProject.status || "active"}
                      onValueChange={async (v) => {
                        try {
                          const { error } = await supabase
                            .from("projects")
                            .update({ status: v, updated_at: new Date().toISOString() })
                            .eq("id", selectedProject.id);
                          if (error) throw error;
                          setSelectedProject({ ...selectedProject, status: v });
                          toast.success(`Status → ${getStatusLabel(v)}`);
                          refetch();
                        } catch (e: any) {
                          toast.error(e.message || "Failed to update status");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Current Stage</p>
                    <Select
                      value={selectedProject.current_stage || "brand_identity"}
                      onValueChange={async (v) => {
                        try {
                          const { error } = await supabase
                            .from("projects")
                            .update({ current_stage: v, updated_at: new Date().toISOString() })
                            .eq("id", selectedProject.id);
                          if (error) throw error;
                          setSelectedProject({ ...selectedProject, current_stage: v });
                          const meta = PROJECT_STAGES.find((s) => s.value === v);
                          if (meta) {
                            const order = PROJECT_STAGES.findIndex((s) => s.value === v) + 1;
                            await upsertProjectStageStatus(meta.label, order, "in_progress", meta.value);
                          }
                          toast.success(`Stage → ${getStageLabel(v)}`);
                          refetch();
                        } catch (e: any) {
                          toast.error(e.message || "Failed to update stage");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <p className="text-xl font-bold">{projectTasks.filter(t => t.status === 'completed').length}/{projectTasks.length}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Product Options */}
              <Card className="border-primary/20 bg-primary/5 h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Product Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Product Category</p>
                    <Select
                      value={selectedProject.product_category || ""}
                      onValueChange={async (v) => {
                        try {
                          const { error } = await supabase
                            .from("projects")
                            .update({ product_category: v, updated_at: new Date().toISOString() })
                            .eq("id", selectedProject.id);
                          if (error) throw error;
                          setSelectedProject({ ...selectedProject, product_category: v });
                          toast.success(`Product category → ${PRODUCT_CATEGORIES.find(c => c.value === v)?.label || v}`);
                          refetch();
                        } catch (e: any) {
                          toast.error(e.message || "Failed to update product category");
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Select product category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">How Many Products to Launch</p>
                    <Select
                      value={selectedProject.products_to_launch != null ? String(selectedProject.products_to_launch) : ""}
                      onValueChange={async (v) => {
                        try {
                          const num = Number(v);
                          const { error } = await supabase
                            .from("projects")
                            .update({ products_to_launch: num, updated_at: new Date().toISOString() })
                            .eq("id", selectedProject.id);
                          if (error) throw error;
                          setSelectedProject({ ...selectedProject, products_to_launch: num });
                          toast.success(`Products to launch → ${num}`);
                          refetch();
                        } catch (e: any) {
                          toast.error(e.message || "Failed to update products to launch");
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Select 1 to 10" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTS_TO_LAUNCH_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">
                      Product note
                      <span className="block text-[10px] opacity-80 mt-0.5">
                        (e.g. fragrance of perfume, or your own note when category is Other)
                      </span>
                    </p>
                    <Textarea
                      value={selectedProject.product_category_note || ""}
                      placeholder={
                        selectedProject.product_category === "other"
                          ? "Write your own note for Other category..."
                          : selectedProject.product_category === "perfume"
                          ? "e.g. Fragrance: woody, floral, citrus..."
                          : "Add product details or notes..."
                      }
                      className="min-h-[70px] text-sm"
                      onChange={(e) =>
                        setSelectedProject({
                          ...selectedProject,
                          product_category_note: e.target.value,
                        })
                      }
                      onBlur={async (e) => {
                        const note = e.target.value || null;
                        try {
                          const { error } = await supabase
                            .from("projects")
                            .update({
                              product_category_note: note,
                              updated_at: new Date().toISOString(),
                            })
                            .eq("id", selectedProject.id);
                          if (error) throw error;
                          setSelectedProject((prev) =>
                            prev ? { ...prev, product_category_note: note } : prev
                          );
                          toast.success("Product note saved");
                          refetch();
                        } catch (err: any) {
                          toast.error(err.message || "Failed to save product note");
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Last note */}
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <StickyNote className="h-5 w-5 text-amber-600" />
                    Last Note
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("notes")}>
                    View all notes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {lastNote ? (
                  <div className="space-y-1">
                    {lastNote.title && <p className="font-medium text-sm">{lastNote.title}</p>}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {(() => {
                        const kit = lastNote.note_type === "brand_kit" ? parseBrandKit(lastNote.content) : null;
                        const tracker = lastNote.note_type === "client_tracker" ? parseClientTracker(lastNote.content) : null;
                        if (kit) return kit.fields.brand_name || kit.fields.tagline || "Brand Identity Kit";
                        if (tracker) return tracker.fields.client_full_name || "Client Progress Tracker";
                        return lastNote.content;
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(lastNote.updated_at || lastNote.created_at), "dd MMM yyyy, hh:mm a")}
                      {lastNote.created_by_email || lastNote.created_by
                        ? ` · ${lastNote.created_by_email || lastNote.created_by}`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes yet. Add one from the Notes tab.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Client Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                      <p className="text-sm font-medium">{selectedProject.client_phone || "Not added"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email Address</p>
                      <p className="text-sm font-medium">{selectedProject.client_email || "Not added"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-medium">{selectedProject.client_address || "Not added"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Payment Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-sm text-muted-foreground">Total Client</p><p className="text-lg font-semibold">{formatCurrency(paymentSummary.totalClient)}</p></div>
                  <div><p className="text-sm text-muted-foreground">Received</p><p className="text-lg font-semibold text-green-600">{formatCurrency(paymentSummary.received)}</p></div>
                  <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-lg font-semibold text-red-600">{formatCurrency(paymentSummary.pending)}</p></div>
                  <div><p className="text-sm text-muted-foreground">Gross Profit</p><p className="text-lg font-semibold text-blue-600">{formatCurrency(paymentSummary.grossProfit)}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Tasks</CardTitle>
                  <Button size="sm" onClick={() => setTaskDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Task</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetail ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-2">
                    {projectTasks.filter(t => t.status !== 'completed').slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className={`w-2 h-2 rounded-full ${task.status === 'in_progress' ? 'bg-blue-500' : task.status === 'blocked' ? 'bg-red-500' : task.status === 'review' ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                        <span className="flex-1">{task.task_name}</span>
                        {task.assigned_to_name && <span className="text-xs text-indigo-600">👤 {task.assigned_to_name}</span>}
                        <span className="text-xs text-muted-foreground">{task.due_date ? format(new Date(task.due_date), "dd MMM") : "No due"}</span>
                        <Badge variant="outline" className="text-xs">{task.status}</Badge>
                      </div>
                    ))}
                    {projectTasks.filter(t => t.status !== 'completed').length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        {projectTasks.length === 0 ? "No tasks yet" : "No open tasks — completed tasks yahan se hat chuke hain"}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="mt-4 space-y-4">
            {selectedDepartment ? (
              (() => {
                const deptTasks = projectTasks.filter(t => t.department_id === selectedDepartment.id);
                const deptCompleted = deptTasks.filter(t => t.status === "completed").length;
                const typeMeta = getDepartmentTypeMeta(selectedDepartment.department_type);
                const DeptIcon = typeMeta.icon;
                return (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDepartment(null)}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          All Departments
                        </Button>
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-md bg-primary/10 text-primary">
                            <DeptIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{selectedDepartment.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <DepartmentStatusBadge status={selectedDepartment.status} />
                              {selectedDepartment.manager_name && (
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" /> {selectedDepartment.manager_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingDepartment(selectedDepartment);
                          setNewDepartment({
                            name: selectedDepartment.name,
                            department_id: selectedDepartment.department_id || "",
                            department_type: selectedDepartment.department_type || "custom",
                            manager_email: selectedDepartment.manager_email || "",
                            status: selectedDepartment.status,
                            start_date: selectedDepartment.start_date || "",
                            due_date: selectedDepartment.due_date || "",
                            notes: selectedDepartment.notes || "",
                          });
                          setDepartmentDialogOpen(true);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />Edit Department
                        </Button>
                        <Button size="sm" onClick={() => {
                          setNewTask({ ...newTask, department_id: selectedDepartment.id });
                          setTaskDialogOpen(true);
                        }}>
                          <Plus className="h-4 w-4 mr-2" />Add Task
                        </Button>
                      </div>
                    </div>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Department Progress</span>
                          <span className="font-semibold">{deptCompleted}/{deptTasks.length} tasks completed</span>
                        </div>
                        <Progress value={deptTasks.length > 0 ? (deptCompleted / deptTasks.length) * 100 : 0} className="h-2" />
                        {selectedDepartment.notes && (
                          <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{selectedDepartment.notes}</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle className="text-lg">Department Tasks</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {deptTasks.map(task => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              itTeam={itTeam}
                              subtasks={projectTaskSubtasks[task.id] || []}
                              subtasksLoading={projectSubtaskLoadingFor === task.id}
                              onStatusChange={updateTaskStatus}
                              onAssign={assignTask}
                              onDelete={deleteTask}
                              onToggleExpand={handleExpandProjectTask}
                              onAddSubtask={addProjectTaskSubtask}
                              onToggleSubtask={toggleProjectTaskSubtask}
                              onDeleteSubtask={deleteProjectTaskSubtask}
                            />
                          ))}
                          {deptTasks.length === 0 && <p className="text-center text-muted-foreground py-8">No tasks in this department yet</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Departments</CardTitle>
                    <Button size="sm" onClick={() => {
                      setEditingDepartment(null);
                      setNewDepartment({ name: "", department_id: "", department_type: "custom", manager_email: "", status: "active", start_date: "", due_date: "", notes: "" });
                      setDepartmentDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />Add Department
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingDetail ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {departments.map(dept => {
                        const deptTasks = projectTasks.filter(t => t.department_id === dept.id);
                        return (
                          <DepartmentCard
                            key={dept.id}
                            department={dept}
                            taskCounts={{ total: deptTasks.length, completed: deptTasks.filter(t => t.status === 'completed').length }}
                            onClick={() => setSelectedDepartment(dept)}
                            onEdit={() => {
                              setEditingDepartment(dept);
                              setNewDepartment({
                                name: dept.name,
                                department_id: dept.department_id || "",
                                department_type: dept.department_type || "custom",
                                manager_email: dept.manager_email || "",
                                status: dept.status,
                                start_date: dept.start_date || "",
                                due_date: dept.due_date || "",
                                notes: dept.notes || "",
                              });
                              setDepartmentDialogOpen(true);
                            }}
                            onDelete={() => deleteDepartment(dept.id)}
                          />
                        );
                      })}
                      {departments.length === 0 && (
                        <div className="col-span-full text-center py-8">
                          <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No departments yet for this client</p>
                          <p className="text-xs text-muted-foreground mt-1">e.g. Branding, Website Development, Social Media, Production...</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stages" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Project Stages</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={syncDefaultProjectStages}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Load / Sync Stages
                    </Button>
                    <Button size="sm" onClick={() => setStageDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />Add Custom Stage
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetail ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Stages Progress</span>
                        <span className="font-semibold">
                          {PROJECT_STAGES.filter((ps) => {
                            const item = projectStages.find(
                              (s) => s.stage_name === ps.label || s.stage_name?.toLowerCase() === ps.label.toLowerCase()
                            );
                            return item?.status === "completed";
                          }).length}
                          /{PROJECT_STAGES.length}
                        </span>
                      </div>
                      <Progress
                        value={
                          (PROJECT_STAGES.filter((ps) => {
                            const item = projectStages.find(
                              (s) => s.stage_name === ps.label || s.stage_name?.toLowerCase() === ps.label.toLowerCase()
                            );
                            return item?.status === "completed";
                          }).length /
                            PROJECT_STAGES.length) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    {/* Social Media */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                        Social Media
                      </p>
                      {PROJECT_STAGES.slice(0, 9).map((ps, index) => {
                        const item = projectStages.find(
                          (s) => s.stage_name === ps.label || s.stage_name?.toLowerCase() === ps.label.toLowerCase()
                        );
                        return (
                          <div key={ps.value} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-3 h-3 rounded-full shrink-0 ${
                                    item?.status === "completed"
                                      ? "bg-green-500"
                                      : item?.status === "in_progress"
                                      ? "bg-blue-500"
                                      : item?.status === "blocked"
                                      ? "bg-red-500"
                                      : "bg-gray-300"
                                  }`}
                                />
                                <span className="font-medium">
                                  {ps.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {item?.status || "pending"}
                                </Badge>
                                <Select
                                  value={item?.status || "pending"}
                                  onValueChange={(v) => upsertProjectStageStatus(ps.label, index + 1, v, ps.value)}
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs">
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
                            {item?.start_date && (
                              <p className="text-xs text-muted-foreground mt-2 ml-6">
                                Started: {format(new Date(item.start_date), "dd MMM yyyy")}
                                {item.completion_date &&
                                  ` • Completed: ${format(new Date(item.completion_date), "dd MMM yyyy")}`}
                              </p>
                            )}
                            {!item && (
                              <p className="text-xs text-muted-foreground mt-2 ml-6">Not started yet</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Development */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                        Development
                      </p>
                      {PROJECT_STAGES.slice(9, 17).map((ps, index) => {
                        const item = projectStages.find(
                          (s) => s.stage_name === ps.label || s.stage_name?.toLowerCase() === ps.label.toLowerCase()
                        );
                        return (
                          <div key={ps.value} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-3 h-3 rounded-full shrink-0 ${
                                    item?.status === "completed"
                                      ? "bg-green-500"
                                      : item?.status === "in_progress"
                                      ? "bg-blue-500"
                                      : item?.status === "blocked"
                                      ? "bg-red-500"
                                      : "bg-gray-300"
                                  }`}
                                />
                                <span className="font-medium">
                                  {ps.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {item?.status || "pending"}
                                </Badge>
                                <Select
                                  value={item?.status || "pending"}
                                  onValueChange={(v) => upsertProjectStageStatus(ps.label, index + 10, v, ps.value)}
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs">
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
                            {item?.start_date && (
                              <p className="text-xs text-muted-foreground mt-2 ml-6">
                                Started: {format(new Date(item.start_date), "dd MMM yyyy")}
                                {item.completion_date &&
                                  ` • Completed: ${format(new Date(item.completion_date), "dd MMM yyyy")}`}
                              </p>
                            )}
                            {!item && (
                              <p className="text-xs text-muted-foreground mt-2 ml-6">Not started yet</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Ecommerce */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                        Ecommerce
                      </p>
                      {PROJECT_STAGES.slice(17).map((ps, index) => {
                        const item = projectStages.find(
                          (s) => s.stage_name === ps.label || s.stage_name?.toLowerCase() === ps.label.toLowerCase()
                        );
                        return (
                          <div key={ps.value} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-3 h-3 rounded-full shrink-0 ${
                                    item?.status === "completed"
                                      ? "bg-green-500"
                                      : item?.status === "in_progress"
                                      ? "bg-blue-500"
                                      : item?.status === "blocked"
                                      ? "bg-red-500"
                                      : "bg-gray-300"
                                  }`}
                                />
                                <span className="font-medium">
                                  {ps.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {item?.status || "pending"}
                                </Badge>
                                <Select
                                  value={item?.status || "pending"}
                                  onValueChange={(v) => upsertProjectStageStatus(ps.label, index + 18, v, ps.value)}
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs">
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
                            {item?.start_date && (
                              <p className="text-xs text-muted-foreground mt-2 ml-6">
                                Started: {format(new Date(item.start_date), "dd MMM yyyy")}
                                {item.completion_date &&
                                  ` • Completed: ${format(new Date(item.completion_date), "dd MMM yyyy")}`}
                              </p>
                            )}
                            {!item && (
                              <p className="text-xs text-muted-foreground mt-2 ml-6">Not started yet</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Project Tasks</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center border rounded-md overflow-hidden">
                      <Button
                        variant={taskViewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 rounded-none"
                        onClick={() => setTaskViewMode("list")}
                      >
                        <List className="h-3.5 w-3.5 mr-1.5" />List
                      </Button>
                      <Button
                        variant={taskViewMode === "dashboard" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 rounded-none"
                        onClick={() => setTaskViewMode("dashboard")}
                      >
                        <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />Dashboard
                      </Button>
                    </div>
                    <Select value={taskAssigneeFilter} onValueChange={setTaskAssigneeFilter}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Filter by assignee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tasks</SelectItem>
                        <SelectItem value="mine">My Tasks</SelectItem>
                        {itTeam.map(m => <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setTaskDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Task</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDetail ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : taskViewMode === "dashboard" ? (
                  <TaskDashboard tasks={filteredTasks} onStatusChange={updateTaskStatus} onDelete={deleteTask} />
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        itTeam={itTeam}
                        subtasks={projectTaskSubtasks[task.id] || []}
                        subtasksLoading={projectSubtaskLoadingFor === task.id}
                        onStatusChange={updateTaskStatus}
                        onAssign={assignTask}
                        onDelete={deleteTask}
                        onToggleExpand={handleExpandProjectTask}
                        onAddSubtask={addProjectTaskSubtask}
                        onToggleSubtask={toggleProjectTaskSubtask}
                        onDeleteSubtask={deleteProjectTaskSubtask}
                      />
                    ))}
                    {filteredTasks.length === 0 && <p className="text-center text-muted-foreground py-8">No tasks found</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Client</p><p className="text-lg font-semibold">{formatCurrency(paymentSummary.totalClient)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Received</p><p className="text-lg font-semibold text-green-600">{formatCurrency(paymentSummary.received)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-lg font-semibold text-red-600">{formatCurrency(paymentSummary.pending)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Manufacturer Pending</p><p className="text-lg font-semibold text-orange-600">{formatCurrency(paymentSummary.manufacturerPending)}</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">Client Payments</CardTitle><Button size="sm" onClick={() => setPaymentDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Payment</Button></div></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payments.filter(p => p.payment_type === 'client').map(payment => <PaymentCard key={payment.id} payment={payment} onStatusChange={updatePaymentStatus} onDelete={deletePayment} />)}
                    {payments.filter(p => p.payment_type === 'client').length === 0 && <p className="text-center text-muted-foreground py-4">No client payments</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Manufacturer Payments</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payments.filter(p => p.payment_type === 'manufacturer').map(payment => <PaymentCard key={payment.id} payment={payment} onStatusChange={updatePaymentStatus} onDelete={deletePayment} />)}
                    {payments.filter(p => p.payment_type === 'manufacturer').length === 0 && <p className="text-center text-muted-foreground py-4">No manufacturer payments</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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

                  <div className="space-y-3">
                    {MANUFACTURING_STAGES.map((stage) => {
                      const item = manufacturing.find(m => m.stage === stage);
                      return (
                        <div key={stage} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                item?.status === 'completed' ? 'bg-green-500' :
                                item?.status === 'in_progress' ? 'bg-blue-500' :
                                item?.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300'
                              }`} />
                              <span className="font-medium">{stage}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {item?.status || 'pending'}
                              </Badge>
                              {item && (
                                <Select 
                                  value={item.status} 
                                  onValueChange={async (v) => {
                                    try {
                                      const { error } = await supabase
                                        .from("manufacturing_tracker")
                                        .update({ 
                                          status: v,
                                          ...(v === 'completed' ? { completion_date: new Date().toISOString() } : {})
                                        })
                                        .eq("id", item.id);
                                      if (error) throw error;
                                      toast.success("Status updated");
                                      if (selectedProject) fetchProjectDetails(selectedProject.id);
                                    } catch (error: any) {
                                      toast.error(error.message);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-32 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {item?.file_url && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => window.open(item.file_url, "_blank")}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {item?.remarks && (
                            <p className="text-sm text-muted-foreground mt-2">{item.remarks}</p>
                          )}
                          {item?.responsible_person && (
                            <p className="text-xs text-muted-foreground mt-1">
                              👤 {item.responsible_person}
                            </p>
                          )}
                          {item?.start_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due {item.completion_date ? 
                                `Completed: ${format(new Date(item.completion_date), "dd MMM yyyy")}` :
                                `Started: ${format(new Date(item.start_date), "dd MMM yyyy")}`
                              }
                            </p>
                          )}
                          {!item && (
                            <p className="text-xs text-muted-foreground mt-2">Not started yet</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <Button size="sm" onClick={() => setDocumentDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload
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
                              <div key={file.id} className="flex items-center gap-2 text-xs group">
                                {file.file_type?.startsWith('image/') ? (
                                  <Image className="h-3 w-3 text-blue-500 shrink-0" />
                                ) : (
                                  <File className="h-3 w-3 text-muted-foreground shrink-0" />
                                )}
                                <span className="truncate flex-1">{file.file_name}</span>
                                <button
                                  type="button"
                                  title="View"
                                  onClick={() => window.open(file.file_url, "_blank", "noopener,noreferrer")}
                                  className="opacity-70 hover:opacity-100 shrink-0"
                                >
                                  <Eye className="h-3 w-3 text-blue-500" />
                                </button>
                                <a
                                  href={file.file_url}
                                  download={file.file_name}
                                  title="Download"
                                  className="opacity-70 hover:opacity-100 shrink-0"
                                >
                                  <Download className="h-3 w-3 text-muted-foreground" />
                                </a>
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDocument(file);
                                  }}
                                  className="opacity-70 hover:opacity-100 shrink-0"
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </button>
                              </div>
                            ))}
                            {files.length > 3 && (
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={() => { setActiveFolderView(folder); setFolderViewOpen(true); }}
                              >
                                +{files.length - 3} more — View all
                              </button>
                            )}
                            {files.length <= 3 && files.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={() => { setActiveFolderView(folder); setFolderViewOpen(true); }}
                              >
                                View all
                              </button>
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

          <TabsContent value="communication" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Communication Center</CardTitle>
                  <Button size="sm" onClick={() => setCommunicationDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Communication</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {communications.map(comm => (
                    <div key={comm.id} className="border-l-4 pl-4 py-2" style={{
                      borderColor: comm.communication_type === 'call' ? '#3b82f6' : comm.communication_type === 'email' ? '#8b5cf6' : comm.communication_type === 'whatsapp' ? '#25D366' : comm.communication_type === 'meeting' ? '#f59e0b' : comm.communication_type === 'followup' ? '#ef4444' : '#94a3b8'
                    }}>
                      <div className="flex items-center gap-2">
                        {comm.communication_type === 'call' && <Phone className="h-4 w-4 text-blue-500" />}
                        {comm.communication_type === 'email' && <Mail className="h-4 w-4 text-purple-500" />}
                        {comm.communication_type === 'whatsapp' && <MessageSquare className="h-4 w-4 text-green-500" />}
                        {comm.communication_type === 'meeting' && <Calendar className="h-4 w-4 text-orange-500" />}
                        {comm.communication_type === 'followup' && <Bell className="h-4 w-4 text-red-500" />}
                        {comm.communication_type === 'comment' && <MessageSquare className="h-4 w-4 text-gray-500" />}
                        <span className="text-xs font-medium uppercase text-muted-foreground">{comm.communication_type}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(comm.communication_date), "dd MMM yyyy, hh:mm a")}</span>
                      </div>
                      {comm.subject && <p className="font-medium mt-1">{comm.subject}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{comm.message}</p>
                      {comm.next_followup_date && <p className="text-xs text-red-500 mt-1">🔔 Follow-up: {format(new Date(comm.next_followup_date), "dd MMM yyyy")}</p>}
                    </div>
                  ))}
                  {communications.length === 0 && <p className="text-center text-muted-foreground py-8">No communications yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-4">
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Project Documentation
                  </CardTitle>
                  {!docNoteEditing ? (
                    <Button size="sm" variant="outline" onClick={() => setDocNoteEditing(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setDocNoteEditing(false); setDocNoteContent(documentationNote?.content || ""); }}>Cancel</Button>
                      <Button size="sm" onClick={saveDocumentationNote}><Save className="h-4 w-4 mr-2" />Save</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {docNoteEditing ? (
                  <Textarea value={docNoteContent} onChange={(e) => setDocNoteContent(e.target.value)} rows={8} placeholder="Project scope, requirements, links, credentials, notes for the team..." />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{documentationNote?.content || "test"}</p>
                )}
                {documentationNote?.updated_at && <p className="text-xs text-muted-foreground mt-3">Last updated: {format(new Date(documentationNote.updated_at), "dd MMM yyyy, hh:mm a")}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Notes</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openAddNoteDialog("client_tracker")}>
                      <ClipboardList className="h-4 w-4 mr-2" />Add Client Tracker
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAddNoteDialog("brand_kit")}>
                      <Palette className="h-4 w-4 mr-2" />Add Brand Identity Kit
                    </Button>
                    <Button size="sm" onClick={() => openAddNoteDialog("quick")}>
                      <Plus className="h-4 w-4 mr-2" />Add Note
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generalNotes.map(note => <NoteCard key={note.id} note={note} onEdit={openEditNoteDialog} onDelete={deleteNote} />)}
                  {generalNotes.length === 0 && <p className="text-center text-muted-foreground py-8">No notes yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── 25-Day Social Media Content Calendar ── */}
          <TabsContent value="content_calendar" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-fuchsia-500" />
                      25-Day Social Media Content Calendar
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Plan daily posts, mark completed, and add notes for each day
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={saveContentCalendar}
                      disabled={contentCalendarSaving}
                    >
                      {contentCalendarSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Calendar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Start Date (Day 1)</Label>
                    <Input
                      type="date"
                      value={contentCalendarStartDate}
                      onChange={(e) => applyStartDateToCalendar(e.target.value)}
                      className="w-44 h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Filter</Label>
                    <Select
                      value={contentCalendarFilter}
                      onValueChange={(v: "all" | "pending" | "completed") => setContentCalendarFilter(v)}
                    >
                      <SelectTrigger className="w-36 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Days</SelectItem>
                        <SelectItem value="pending">Pending only</SelectItem>
                        <SelectItem value="completed">Completed only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-4 ml-auto text-sm">
                    <span className="text-muted-foreground">
                      Completed:{" "}
                      <strong className="text-green-600">
                        {contentCalendarDays.filter((d) => d.status === "completed").length}/25
                      </strong>
                    </span>
                    <Progress
                      value={
                        (contentCalendarDays.filter((d) => d.status === "completed").length / 25) * 100
                      }
                      className="w-24 h-2"
                    />
                  </div>
                </div>

                {/* Days list */}
                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                  {contentCalendarDays
                    .filter((d) => {
                      if (contentCalendarFilter === "pending") return d.status === "pending";
                      if (contentCalendarFilter === "completed") return d.status === "completed";
                      return true;
                    })
                    .map((day) => {
                      const realIndex = contentCalendarDays.findIndex((x) => x.day === day.day);
                      return (
                        <div
                          key={day.day}
                          className={`border rounded-lg p-3 transition-colors ${
                            day.status === "completed"
                              ? "bg-green-50/50 border-green-200"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                              <input
                                type="checkbox"
                                checked={day.status === "completed"}
                                onChange={() => toggleContentDayStatus(realIndex)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                title="Mark as completed"
                              />
                              <span className="text-[10px] font-bold text-muted-foreground">
                                D{day.day}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm">Day {day.day}</span>
                                {day.scheduled_date && (
                                  <Badge variant="outline" className="text-xs">
                                    {format(new Date(day.scheduled_date), "dd MMM yyyy")}
                                  </Badge>
                                )}
                                {day.status === "completed" && (
                                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Completed
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                <div className="grid gap-1">
                                  <Label className="text-[10px] text-muted-foreground">Post Title</Label>
                                  <Input
                                    value={day.title}
                                    onChange={(e) =>
                                      updateContentDay(realIndex, { title: e.target.value })
                                    }
                                    placeholder="e.g. Product Reveal"
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label className="text-[10px] text-muted-foreground">Platform</Label>
                                  <Select
                                    value={day.platform}
                                    onValueChange={(v) =>
                                      updateContentDay(realIndex, { platform: v })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CONTENT_PLATFORMS.map((p) => (
                                        <SelectItem key={p} value={p}>
                                          {p}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-1 sm:col-span-2">
                                  <Label className="text-[10px] text-muted-foreground">
                                    Caption / Content
                                  </Label>
                                  <Input
                                    value={day.caption}
                                    onChange={(e) =>
                                      updateContentDay(realIndex, { caption: e.target.value })
                                    }
                                    placeholder="Write caption or post idea..."
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>

                              <div className="grid gap-1">
                                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <StickyNote className="h-3 w-3" /> Note / Checklist remark
                                </Label>
                                <Textarea
                                  value={day.note}
                                  onChange={(e) =>
                                    updateContentDay(realIndex, { note: e.target.value })
                                  }
                                  placeholder="Add note, checklist, or status update for this day..."
                                  rows={2}
                                  className="text-sm resize-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {contentCalendarDays.filter((d) => {
                  if (contentCalendarFilter === "pending") return d.status === "pending";
                  if (contentCalendarFilter === "completed") return d.status === "completed";
                  return true;
                }).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No days match the current filter
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Folder "View All" documents dialog ── */}
        <Dialog open={folderViewOpen} onOpenChange={setFolderViewOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                {activeFolderView}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {documents.filter(d => d.folder === activeFolderView).map(file => (
                <div key={file.id} className="flex items-center gap-3 border rounded-lg p-2">
                  {file.file_type?.startsWith('image/') ? (
                    <img src={file.file_url} alt={file.file_name} className="h-10 w-10 rounded object-cover shrink-0" />
                  ) : (
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.created_at ? format(new Date(file.created_at), "dd MMM yyyy") : ""}
                      {file.file_size ? ` • ${(file.file_size / 1024).toFixed(1)} KB` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="View"
                    onClick={() => window.open(file.file_url, "_blank", "noopener,noreferrer")}
                  >
                    <Eye className="h-4 w-4 text-blue-500" />
                  </Button>
                  <a href={file.file_url} download={file.file_name}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Delete"
                    onClick={() => deleteDocument(file)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {documents.filter(d => d.folder === activeFolderView).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">No files in this folder</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── All Dialogs ── */}
        <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add New Stage</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2"><Label>Stage Name *</Label><Input value={newStage.stage_name} onChange={(e) => setNewStage({ ...newStage, stage_name: e.target.value })} placeholder="Enter stage name" /></div>
              <div className="grid gap-2"><Label>Status</Label><Select value={newStage.status} onValueChange={(v) => setNewStage({ ...newStage, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button><Button onClick={addStage}>Add Stage</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={departmentDialogOpen} onOpenChange={(open) => { setDepartmentDialogOpen(open); if (!open) setEditingDepartment(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />{editingDepartment ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Department Name *</Label>
                <Input
                  value={editingDepartment ? editingDepartment.name : newDepartment.name}
                  onChange={(e) => editingDepartment
                    ? setEditingDepartment({ ...editingDepartment, name: e.target.value })
                    : setNewDepartment({ ...newDepartment, name: e.target.value })}
                  placeholder="e.g. Website Development"
                />
              </div>
              <div className="grid gap-2">
                <Label>Department *</Label>
                <Select
                  value={editingDepartment ? (editingDepartment.department_id || "") : newDepartment.department_id}
                  onValueChange={(v) => editingDepartment
                    ? setEditingDepartment({ ...editingDepartment, department_id: v })
                    : setNewDepartment({ ...newDepartment, department_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Department Type (label/icon only)</Label>
                <Select
                  value={editingDepartment ? (editingDepartment.department_type || "custom") : newDepartment.department_type}
                  onValueChange={(v) => editingDepartment
                    ? setEditingDepartment({ ...editingDepartment, department_type: v })
                    : setNewDepartment({ ...newDepartment, department_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Manager (IT Team)</Label>
                <Select
                  value={editingDepartment ? (editingDepartment.manager_email || "") : newDepartment.manager_email}
                  onValueChange={(v) => editingDepartment
                    ? setEditingDepartment({ ...editingDepartment, manager_email: v })
                    : setNewDepartment({ ...newDepartment, manager_email: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    {itTeam.map(m => <SelectItem key={m.id} value={m.email}>{m.name} ({m.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={editingDepartment ? editingDepartment.status : newDepartment.status}
                    onValueChange={(v) => editingDepartment
                      ? setEditingDepartment({ ...editingDepartment, status: v })
                      : setNewDepartment({ ...newDepartment, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={editingDepartment ? (editingDepartment.due_date || "") : newDepartment.due_date}
                    onChange={(e) => editingDepartment
                      ? setEditingDepartment({ ...editingDepartment, due_date: e.target.value })
                      : setNewDepartment({ ...newDepartment, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editingDepartment ? (editingDepartment.start_date || "") : newDepartment.start_date}
                  onChange={(e) => editingDepartment
                    ? setEditingDepartment({ ...editingDepartment, start_date: e.target.value })
                    : setNewDepartment({ ...newDepartment, start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={editingDepartment ? (editingDepartment.notes || "") : newDepartment.notes}
                  onChange={(e) => editingDepartment
                    ? setEditingDepartment({ ...editingDepartment, notes: e.target.value })
                    : setNewDepartment({ ...newDepartment, notes: e.target.value })}
                  placeholder="Scope, requirements, links..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepartmentDialogOpen(false)}>Cancel</Button>
              <Button onClick={editingDepartment ? updateDepartment : addDepartment}>
                <Save className="h-4 w-4 mr-2" />{editingDepartment ? "Save Changes" : "Add Department"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-blue-500" />Add New Task</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2"><Label>Task Name *</Label><Input value={newTask.task_name} onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })} placeholder="Enter task name" /></div>
              <div className="grid gap-2"><Label>Description</Label><Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Enter description" rows={3} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Department</Label><Select value={newTask.department} onValueChange={(v) => setNewTask({ ...newTask, department: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Design">🎨 Design</SelectItem><SelectItem value="Development">💻 Development</SelectItem><SelectItem value="Manufacturing">🏭 Manufacturing</SelectItem><SelectItem value="Marketing">📢 Marketing</SelectItem><SelectItem value="Sales">💼 Sales</SelectItem><SelectItem value="Legal">⚖️ Legal</SelectItem><SelectItem value="Finance">💰 Finance</SelectItem><SelectItem value="IT">🖥️ IT</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label>Priority</Label><Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">🟢 Low</SelectItem><SelectItem value="medium">🟡 Medium</SelectItem><SelectItem value="high">🟠 High</SelectItem><SelectItem value="urgent">🔴 Urgent</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid gap-2"><Label>Assign To (IT Team)</Label><Select value={newTask.assigned_to_email} onValueChange={(v) => setNewTask({ ...newTask, assigned_to_email: v })}><SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger><SelectContent>{itTeam.map(m => <SelectItem key={m.id} value={m.email}>{m.name} ({m.email})</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Department (Optional)</Label><Select value={newTask.department_id} onValueChange={(v) => setNewTask({ ...newTask, department_id: v })}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Stage (Optional)</Label><Select value={newTask.stage_id} onValueChange={(v) => setNewTask({ ...newTask, stage_id: v })}><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{projectStages.map(s => <SelectItem key={s.id} value={s.id}>{s.stage_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Due Date</Label><Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button><Button onClick={addTask} disabled={!newTask.task_name}><Plus className="h-4 w-4 mr-2" />Add Task</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2"><Label>Payment Type</Label><Select value={newPayment.payment_type} onValueChange={(v) => setNewPayment({ ...newPayment, payment_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="client">Client Payment</SelectItem><SelectItem value="manufacturer">Manufacturer Payment</SelectItem></SelectContent></Select></div>
              <div className="grid gap-2"><Label>Milestone *</Label><Input value={newPayment.milestone} onChange={(e) => setNewPayment({ ...newPayment, milestone: e.target.value })} placeholder="e.g., Booking Amount" /></div>
              <div className="grid gap-2"><Label>Amount (₹) *</Label><Input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} placeholder="Enter amount" /></div>
              <div className="grid gap-2"><Label>Due Date</Label><Input type="date" value={newPayment.due_date} onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button><Button onClick={addPayment}>Add Payment</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={manufacturingDialogOpen} onOpenChange={setManufacturingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-orange-500" />Update Manufacturing</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2"><Label>Stage *</Label><Select value={newManufacturing.stage} onValueChange={(v) => setNewManufacturing({ ...newManufacturing, stage: v })}><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent>{MANUFACTURING_STAGES.map(s => <SelectItem key={s} value={s}>{manufacturing.find(m => m.stage === s)?.status === 'completed' ? 'Completed ' : ''}{manufacturing.find(m => m.stage === s)?.status === 'in_progress' ? '⏳ ' : ''}{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Status</Label><Select value={newManufacturing.status} onValueChange={(v) => setNewManufacturing({ ...newManufacturing, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="blocked">Blocked</SelectItem></SelectContent></Select></div>
              <div className="grid gap-2"><Label>Remarks</Label><Textarea value={newManufacturing.remarks} onChange={(e) => setNewManufacturing({ ...newManufacturing, remarks: e.target.value })} placeholder="Enter remarks" rows={2} /></div>
              <div className="grid gap-2"><Label>Responsible Person</Label><Input value={newManufacturing.responsible_person} onChange={(e) => setNewManufacturing({ ...newManufacturing, responsible_person: e.target.value })} placeholder="Enter name" /></div>
              <div className="grid gap-2"><Label>Start Date</Label><Input type="date" value={newManufacturing.start_date} onChange={(e) => setNewManufacturing({ ...newManufacturing, start_date: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setManufacturingDialogOpen(false)}>Cancel</Button><Button onClick={addManufacturing} disabled={!newManufacturing.stage}><Save className="h-4 w-4 mr-2" />{manufacturing.find(m => m.stage === newManufacturing.stage) ? "Update" : "Add"} Manufacturing</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Upload Files
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Upload Type</Label>
                <Select 
                  value={uploadType} 
                  onValueChange={(v: "single" | "multiple") => {
                    setUploadType(v);
                    setMultipleFiles([]);
                    setNewDocument({ ...newDocument, file: null });
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select upload type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4" />
                        Single File
                      </div>
                    </SelectItem>
                    <SelectItem value="multiple">
                      <div className="flex items-center gap-2">
                        <Images className="h-4 w-4" />
                        Multiple Files
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Folder *</Label>
                <Select 
                  value={newDocument.folder} 
                  onValueChange={(v) => setNewDocument({ ...newDocument, folder: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select folder" /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {uploadType === "single" && (
                <div className="grid gap-2">
                  <Label>File *</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                      onChange={(e) => { 
                        const file = e.target.files?.[0]; 
                        if (file) { 
                          setNewDocument({ ...newDocument, file: file, file_name: file.name }); 
                        } 
                      }} 
                      className="hidden" 
                      id="file-upload" 
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      {newDocument.file ? (
                        <div className="flex items-center justify-center gap-2">
                          {newDocument.file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(newDocument.file)} alt="Preview" className="h-16 w-16 rounded-md object-cover border" />
                          ) : (
                            <File className="h-8 w-8 text-green-500" />
                          )}
                          <span className="text-sm">{newDocument.file.name}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              setNewDocument({ ...newDocument, file: null, file_name: "" }); 
                              if (fileInputRef.current) fileInputRef.current.value = ""; 
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <FilePlus className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Click to upload a file</p>
                          <p className="text-xs text-muted-foreground">Images, PDFs, Documents (Max 10MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <Button 
                    onClick={uploadDocument} 
                    disabled={!newDocument.folder || !newDocument.file}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              )}

              {uploadType === "multiple" && (
                <div className="grid gap-2">
                  <Label>Select Files *</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                    <input 
                      type="file" 
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                      onChange={handleMultipleFileSelect} 
                      className="hidden" 
                      id="multiple-file-upload" 
                    />
                    <label htmlFor="multiple-file-upload" className="cursor-pointer block">
                      {multipleFiles.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <Images className="h-8 w-8 text-blue-500" />
                            <span className="text-sm font-medium">{multipleFiles.length} files selected</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto text-left">
                            {multipleFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                                <span className="truncate flex-1">{file.name}</span>
                                <span className="text-muted-foreground ml-2">{(file.size / 1024).toFixed(1)} KB</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removeFileFromMultiple(idx);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              setMultipleFiles([]);
                              const input = document.getElementById('multiple-file-upload') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                          >
                            Clear All
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Images className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Click to select multiple files</p>
                          <p className="text-xs text-muted-foreground">Images, PDFs, Documents (Max 10MB each)</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <Button 
                    onClick={uploadMultipleFiles} 
                    disabled={!newDocument.folder || multipleFiles.length === 0 || uploadingMultiple}
                    className="w-full"
                  >
                    {uploadingMultiple ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {multipleFiles.length} Files
                      </>
                    )}
                  </Button>
                  {uploadingMultiple && (
                    <div className="mt-2">
                      <Progress value={50} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center mt-1">Uploading files...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDocumentDialogOpen(false);
                setMultipleFiles([]);
                setNewDocument({ folder: "", file_name: "", file: null });
                setUploadType("single");
              }}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={communicationDialogOpen} onOpenChange={setCommunicationDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-500" />Add Communication</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2"><Label>Type</Label><Select value={newCommunication.type} onValueChange={(v) => setNewCommunication({ ...newCommunication, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="call">📞 Call</SelectItem><SelectItem value="email">✉️ Email</SelectItem><SelectItem value="whatsapp">💬 WhatsApp</SelectItem><SelectItem value="meeting">Due Meeting</SelectItem><SelectItem value="comment">💭 Comment</SelectItem><SelectItem value="followup">🔔 Follow-up</SelectItem></SelectContent></Select></div>
              <div className="grid gap-2"><Label>Subject</Label><Input value={newCommunication.subject} onChange={(e) => setNewCommunication({ ...newCommunication, subject: e.target.value })} placeholder="Enter subject" /></div>
              <div className="grid gap-2"><Label>Message *</Label><Textarea value={newCommunication.message} onChange={(e) => setNewCommunication({ ...newCommunication, message: e.target.value })} placeholder="Enter message" rows={3} /></div>
              <div className="grid gap-2"><Label>Next Follow-up</Label><Input type="datetime-local" value={newCommunication.next_followup} onChange={(e) => setNewCommunication({ ...newCommunication, next_followup: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCommunicationDialogOpen(false)}>Cancel</Button><Button onClick={addCommunication} disabled={!newCommunication.message}><Send className="h-4 w-4 mr-2" />Add Communication</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={noteDialogOpen} onOpenChange={(open) => { setNoteDialogOpen(open); if (!open) resetNoteForm(); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {noteMode === "client_tracker" ? <ClipboardList className="h-5 w-5 text-fuchsia-500" /> : noteMode === "brand_kit" ? <Palette className="h-5 w-5 text-purple-500" /> : <StickyNote className="h-5 w-5 text-yellow-500" />}
                {editingNote
                  ? (noteMode === "client_tracker" ? "Edit Client Progress Tracker" : noteMode === "brand_kit" ? "Edit Brand Identity Kit" : "Edit Note")
                  : (noteMode === "client_tracker" ? "Add Client Progress Tracker" : noteMode === "brand_kit" ? "Add Brand Identity Kit" : "Add Note")}
              </DialogTitle>
            </DialogHeader>

            {!editingNote && (
              <div className="flex gap-2 border-b pb-3 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant={noteMode === "quick" ? "default" : "outline"}
                  onClick={() => setNoteMode("quick")}
                >
                  <StickyNote className="h-4 w-4 mr-2" />Quick Note
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={noteMode === "brand_kit" ? "default" : "outline"}
                  onClick={() => setNoteMode("brand_kit")}
                >
                  <Sparkles className="h-4 w-4 mr-2" />Brand Identity Kit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={noteMode === "client_tracker" ? "default" : "outline"}
                  onClick={() => setNoteMode("client_tracker")}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />Client Progress Tracker
                </Button>
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label>Image (optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-3 hover:border-primary transition-colors">
                  <input
                    ref={noteImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleNoteImageSelect}
                    className="hidden"
                    id="note-image-upload"
                  />
                  {(noteImagePreview || existingNoteImageUrl) ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={noteImagePreview || existingNoteImageUrl || ""}
                        alt="Preview"
                        className="h-16 w-16 rounded-md object-cover border"
                      />
                      <div className="flex-1 text-sm text-muted-foreground">
                        {noteImageFile ? noteImageFile.name : "Existing image"}
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearNoteImage}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="note-image-upload" className="cursor-pointer flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      Click to upload an image (logo, moodboard, reference...)
                    </label>
                  )}
                </div>
              </div>

              {noteMode === "quick" && (
                <>
                  <div className="grid gap-2"><Label>Title (Optional)</Label><Input value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} placeholder="Enter title" /></div>
                  <div className="grid gap-2"><Label>Note *</Label><Textarea value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} placeholder="Enter note" rows={5} /></div>
                </>
              )}

              {noteMode === "brand_kit" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {BRAND_KIT_FIELDS.map((f) => (
                    <div key={f.key} className={`grid gap-2 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                      <Label>{f.label}</Label>
                      {f.type === "textarea" ? (
                        <Textarea
                          rows={2}
                          value={brandKitFields[f.key] || ""}
                          onChange={(e) => setBrandKitFields({ ...brandKitFields, [f.key]: e.target.value })}
                          placeholder={f.label}
                        />
                      ) : (
                        <Input
                          value={brandKitFields[f.key] || ""}
                          onChange={(e) => setBrandKitFields({ ...brandKitFields, [f.key]: e.target.value })}
                          placeholder={f.label}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {noteMode === "client_tracker" && (
                <div className="space-y-5">
                  {CLIENT_TRACKER_SECTIONS.map((section) => (
                    <div key={section.key} className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <span>{section.emoji}</span>
                        <span>{section.title}</span>
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 border-l-2 pl-3" style={{ borderColor: "var(--border)" }}>
                        {section.fields.map((f) => (
                          <div key={f.key} className={`grid gap-1.5 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                            <Label className="text-xs text-muted-foreground">{f.label}</Label>
                            {f.type === "textarea" ? (
                              <Textarea
                                rows={2}
                                value={clientTrackerFields[f.key] || ""}
                                onChange={(e) => setClientTrackerFields({ ...clientTrackerFields, [f.key]: e.target.value })}
                                placeholder={f.label}
                              />
                            ) : (
                              <Input
                                value={clientTrackerFields[f.key] || ""}
                                onChange={(e) => setClientTrackerFields({ ...clientTrackerFields, [f.key]: e.target.value })}
                                placeholder={f.label}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={editingNote ? updateNote : addNote}
                disabled={noteSaving || (noteMode === "quick" && !newNote.content)}
              >
                {noteSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingNote ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
            {editingProject && (
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Project Image</Label>
                  <div className="border-2 border-dashed rounded-lg p-3 hover:border-primary transition-colors">
                    <input
                      ref={editProjectImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEditProjectImageSelect}
                      className="hidden"
                      id="edit-project-image-upload"
                    />
                    {(editProjectImagePreview || editingProject.image_url) ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={editProjectImagePreview || editingProject.image_url || ""}
                          alt="Preview"
                          className="h-16 w-16 rounded-md object-cover border"
                        />
                        <div className="flex-1 text-sm text-muted-foreground">
                          {editProjectImageFile ? editProjectImageFile.name : "Current image"}
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearEditProjectImage}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="edit-project-image-upload" className="cursor-pointer flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                        <ImagePlus className="h-4 w-4" />
                        Click to upload a cover image
                      </label>
                    )}
                  </div>
                </div>
                <div className="grid gap-2"><Label>Client Name *</Label><Input value={editingProject.name} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Brand Name</Label><Input value={editingProject.brand_name || ""} onChange={(e) => setEditingProject({ ...editingProject, brand_name: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Client Phone Number</Label><Input value={editingProject.client_phone || ""} onChange={(e) => setEditingProject({ ...editingProject, client_phone: e.target.value })} placeholder="Enter phone number" /></div>
                <div className="grid gap-2"><Label>Client Email</Label><Input value={editingProject.client_email || ""} onChange={(e) => setEditingProject({ ...editingProject, client_email: e.target.value })} placeholder="Enter email address" /></div>
                <div className="grid gap-2"><Label>Client Address</Label><Input value={editingProject.client_address || ""} onChange={(e) => setEditingProject({ ...editingProject, client_address: e.target.value })} placeholder="Enter address" /></div>
                <div className="grid gap-2"><Label>Project Type</Label><Select value={editingProject.project_type || "perfume"} onValueChange={(v) => setEditingProject({ ...editingProject, project_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Product Category</Label><Select value={editingProject.product_category || ""} onValueChange={(v) => setEditingProject({ ...editingProject, product_category: v })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>How Many Products to Launch</Label><Select value={editingProject.products_to_launch != null ? String(editingProject.products_to_launch) : ""} onValueChange={(v) => setEditingProject({ ...editingProject, products_to_launch: Number(v) })}><SelectTrigger><SelectValue placeholder="1 to 10" /></SelectTrigger><SelectContent>{PRODUCTS_TO_LAUNCH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Product note</Label>
                  <Textarea
                    value={editingProject.product_category_note || ""}
                    onChange={(e) => setEditingProject({ ...editingProject, product_category_note: e.target.value })}
                    placeholder={
                      editingProject.product_category === "other"
                        ? "Write your own note for Other category..."
                        : editingProject.product_category === "perfume"
                        ? "e.g. Fragrance: woody, floral, citrus..."
                        : "Add product details or notes..."
                    }
                    className="min-h-[80px]"
                  />
                </div>
                <div className="grid gap-2"><Label>Priority</Label><Select value={editingProject.priority || "medium"} onValueChange={(v) => setEditingProject({ ...editingProject, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Project Value (₹)</Label><Input type="number" value={editingProject.project_value || 0} onChange={(e) => setEditingProject({ ...editingProject, project_value: Number(e.target.value) })} /></div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={normalizeProjectStatus(editingProject.status) || editingProject.status || "active"}
                    onValueChange={(v) => setEditingProject({ ...editingProject, status: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Current Stage</Label><Select value={editingProject.current_stage} onValueChange={(v) => setEditingProject({ ...editingProject, current_stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Start Date</Label><Input type="date" value={editingProject.start_date || ""} onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Expected Launch Date</Label><Input type="date" value={editingProject.expected_launch_date || ""} onChange={(e) => setEditingProject({ ...editingProject, expected_launch_date: e.target.value })} /></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={updateProject} disabled={projectSaving}>
                {projectSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── DASHBOARD VIEW ──
  return (
    <div className="space-y-6">
      {TopNav}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "Manage all client projects from one dashboard" : "Aapko jin projects mein task assign hue hain, wahi yahan dikhte hain"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <FileUp className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) clearNewProjectImage(); }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label>Project Image (optional)</Label>
                      <div className="border-2 border-dashed rounded-lg p-3 hover:border-primary transition-colors">
                        <input
                          ref={projectImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleNewProjectImageSelect}
                          className="hidden"
                          id="new-project-image-upload"
                        />
                        {newProjectImagePreview ? (
                          <div className="flex items-center gap-3">
                            <img src={newProjectImagePreview} alt="Preview" className="h-16 w-16 rounded-md object-cover border" />
                            <div className="flex-1 text-sm text-muted-foreground">{newProjectImageFile?.name}</div>
                            <Button variant="ghost" size="sm" onClick={clearNewProjectImage}><X className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <label htmlFor="new-project-image-upload" className="cursor-pointer flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                            <ImagePlus className="h-4 w-4" />
                            Click to upload a cover image
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2"><Label>Client Name *</Label><Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="Enter client name" /></div>
                    <div className="grid gap-2"><Label>Brand Name</Label><Input value={newProject.brand_name} onChange={(e) => setNewProject({ ...newProject, brand_name: e.target.value })} placeholder="Enter brand name" /></div>
                    <div className="grid gap-2"><Label>Client Phone Number</Label><Input value={newProject.client_phone} onChange={(e) => setNewProject({ ...newProject, client_phone: e.target.value })} placeholder="Enter phone number" /></div>
                    <div className="grid gap-2"><Label>Client Email</Label><Input value={newProject.client_email} onChange={(e) => setNewProject({ ...newProject, client_email: e.target.value })} placeholder="Enter email address" /></div>
                    <div className="grid gap-2"><Label>Client Address</Label><Input value={newProject.client_address} onChange={(e) => setNewProject({ ...newProject, client_address: e.target.value })} placeholder="Enter address" /></div>
                    <div className="grid gap-2"><Label>Project Type</Label><Select value={newProject.project_type} onValueChange={(v) => setNewProject({ ...newProject, project_type: v })}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label>Product Category</Label><Select value={newProject.product_category} onValueChange={(v) => setNewProject({ ...newProject, product_category: v })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label>How Many Products to Launch</Label><Select value={newProject.products_to_launch} onValueChange={(v) => setNewProject({ ...newProject, products_to_launch: v })}><SelectTrigger><SelectValue placeholder="1 to 10" /></SelectTrigger><SelectContent>{PRODUCTS_TO_LAUNCH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label>Product note</Label>
                      <Textarea
                        value={newProject.product_category_note}
                        onChange={(e) => setNewProject({ ...newProject, product_category_note: e.target.value })}
                        placeholder={
                          newProject.product_category === "other"
                            ? "Write your own note for Other category..."
                            : newProject.product_category === "perfume"
                            ? "e.g. Fragrance: woody, floral, citrus..."
                            : "Add product details or notes..."
                        }
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="grid gap-2"><Label>Priority</Label><Select value={newProject.priority} onValueChange={(v) => setNewProject({ ...newProject, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label>Project Value (₹)</Label><Input type="number" value={newProject.project_value} onChange={(e) => setNewProject({ ...newProject, project_value: e.target.value })} placeholder="Enter project value" /></div>
                    <div className="grid gap-2"><Label>Start Date</Label><Input type="date" value={newProject.start_date} onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })} /></div>
                    <div className="grid gap-2"><Label>Expected Launch Date</Label><Input type="date" value={newProject.expected_launch_date} onChange={(e) => setNewProject({ ...newProject, expected_launch_date: e.target.value })} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={createProject} disabled={projectSaving}>
                      {projectSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Create Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={stats.total}
          color="blue"
          active={filterStatus === "all"}
          onClick={() => setFilterStatus("all")}
        />
        <StatCard
          icon={CheckCircle}
          label="Active"
          value={stats.active}
          color="green"
          active={filterStatus === "active"}
          onClick={() => setFilterStatus("active")}
        />
        <StatCard
          icon={AlertTriangle}
          label="On Hold"
          value={stats.onHold}
          color="orange"
          active={filterStatus === "on_hold"}
          onClick={() => setFilterStatus("on_hold")}
        />
        <StatCard
          icon={XCircle}
          label="Cancelled"
          value={stats.cancelled}
          color="red"
          active={filterStatus === "cancelled"}
          onClick={() => setFilterStatus("cancelled")}
        />
        <StatCard
          icon={RefreshCw}
          label="Refund"
          value={stats.refund}
          color="purple"
          active={filterStatus === "refund"}
          onClick={() => setFilterStatus("refund")}
        />
        <StatCard
          icon={Award}
          label="Completed"
          value={stats.completed}
          color="teal"
          active={filterStatus === "completed"}
          onClick={() => setFilterStatus("completed")}
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={formatCurrency(stats.totalValue)}
          color="indigo"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem>{PROJECT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Stages</SelectItem>{PROJECT_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Priority</SelectItem>{PROJECT_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent><SelectItem value="date_asc">Launch Launch Date (Nearest)</SelectItem><SelectItem value="date_desc">Launch Launch Date (Farthest)</SelectItem><SelectItem value="priority">⚡ Priority (High → Low)</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterStage("all"); setFilterPriority("all"); setSortBy("priority"); }}>
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isAdmin ? "No projects found" : "You have no tasks assigned on any project yet"}
                </p>
                {isAdmin && (
                  <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Create Your First Project
                  </Button>
                )}
              </div>
            ) : (
              filteredProjects.map((project: Project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onClick={() => handleProjectClick(project)}
                  onImageUpload={handleDashboardImageUpload}
                  uploading={uploadingImage === project.id}
                  lastNote={lastNotesByProject[project.id] || null}
                  lastAssignee={lastAssigneeByProject[project.id] || null}
                  stageProgress={stageProgressByProject[project.id]}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Import Projects from Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer block">
                {importFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="h-10 w-10 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">{importFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB • {importPreview.length} rows found
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setImportFile(null);
                        setImportPreview([]);
                        if (excelInputRef.current) excelInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Click to upload Excel file (.xlsx or .xls)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      File should have columns: Client Name, Brand Name, Project Type, Priority, etc.
                    </p>
                  </div>
                )}
              </label>
            </div>

            {importPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Preview (first {importPreview.length} rows):</p>
                <div className="border rounded-lg overflow-auto max-h-60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {Object.keys(importPreview[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium border-b">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30">
                          {Object.values(row).map((val: any, colIdx) => (
                            <td key={colIdx} className="px-3 py-1.5 max-w-[150px] truncate">{String(val || '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <p className="font-medium">⚠️ Important Notes:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                <li>Required column: <strong>Client Name</strong></li>
                <li>Optional columns: Brand Name, Project Type, Priority, Project Value, Status, etc.</li>
                <li>Priority values: high, medium, low</li>
                <li>Status values: active, on_hold, completed, cancelled</li>
                <li>Project Type values: perfume, ayurveda, cosmetics, food, supplements</li>
                <li>Duplicates will be skipped automatically</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={importFromExcel} disabled={!importFile || importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Import className="h-4 w-4 mr-2" />
                  Import Projects
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
