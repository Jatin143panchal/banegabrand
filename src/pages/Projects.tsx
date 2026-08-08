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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
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
  LayoutGrid, List, ImagePlus, FolderPlus, Images, FilePlus
} from "lucide-react";
import { format, isBefore, isToday, isThisWeek, startOfDay } from "date-fns";

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

const PROJECT_PRIORITIES = [
  { value: "high", label: "High", color: "#ef4444", icon: "🔴" },
  { value: "medium", label: "Medium", color: "#f59e0b", icon: "🟡" },
  { value: "low", label: "Low", color: "#10b981", icon: "🟢" },
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

// Branding Categories - Commented out as per request
// const BRANDING_CATEGORIES = [
//   "Brand Name",
//   "Logo",
//   "Trademark",
//   "Packaging",
//   "Mockups",
//   "Website",
//   "Social Media",
//   "Marketplace",
//   "Photography",
//   "Video"
// ];

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

const DEPARTMENT_TYPES = [
  { value: "product_launch", label: "Product Launch", icon: Rocket },
  { value: "branding", label: "Branding", icon: Award },
  { value: "packaging", label: "Packaging", icon: Package },
  { value: "website_development", label: "Website Development", icon: Globe },
  { value: "social_media", label: "Social Media", icon: Share2 },
  { value: "marketplace", label: "Marketplace", icon: Building2 },
  { value: "performance_marketing", label: "Performance Marketing", icon: Zap },
  { value: "trademark", label: "Trademark", icon: Shield },
  { value: "production", label: "Production", icon: Settings },
  { value: "photography", label: "Photography", icon: Image },
  { value: "video_editing", label: "Video Editing", icon: Video },
  { value: "seo", label: "SEO", icon: TrendingUp },
  { value: "legal", label: "Legal", icon: FileSignature },
  { value: "accounts", label: "Accounts", icon: CreditCard },
  { value: "custom", label: "Custom Department", icon: Layers },
];

const DEPARTMENT_STATUSES = [
  { value: "active", label: "Active", color: "#10b981" },
  { value: "on_hold", label: "On Hold", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#3b82f6" },
  { value: "blocked", label: "Blocked", color: "#ef4444" },
];

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

// Branding interface - commented out
// interface BrandingItem {
//   id: string;
//   project_id: string;
//   category: string;
//   item_name: string;
//   status: string;
//   file_url: string | null;
//   notes: string | null;
// }

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

interface MyTaskRow extends ProjectTask {
  projects: {
    name: string;
    project_id: string;
    brand_name: string | null;
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

// ── Project Priority Badge ──────────────────────────────────
function ProjectPriorityBadge({ priority }: { priority: string }) {
  const meta = getProjectPriorityMeta(priority);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: meta.color, background: `${meta.color}20`, border: `1px solid ${meta.color}30` }}
    >
      {meta.icon} {meta.label}
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
function ProjectCard({ project, onClick, onImageUpload, uploading }: { 
  project: Project; 
  onClick: () => void;
  onImageUpload?: (projectId: string, file: File) => Promise<void>;
  uploading?: boolean;
}) {
  const progress = project.completion_percentage || 0;
  const typeIcon = PROJECT_TYPES.find(t => t.value === project.project_type)?.icon || "📋";
  const [isHovering, setIsHovering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/50 relative group"
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
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
              <span className="text-2xl">{typeIcon}</span>
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
          📅 Due: {format(new Date(department.due_date), "dd MMM yyyy")}
        </p>
      )}
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────
function TaskCard({ task, itTeam, onStatusChange, onAssign, onDelete }: { 
  task: ProjectTask; 
  itTeam: ITTeamMember[];
  onStatusChange: (id: string, status: string) => void;
  onAssign: (id: string, email: string, name: string) => void;
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
            {task.assigned_to_name || task.assigned_to_email ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                👤 {task.assigned_to_name || task.assigned_to_email}
              </span>
            ) : (
              <span className="text-amber-600">👤 Unassigned</span>
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
                value={task.assigned_to_email || ""} 
                onValueChange={(v) => {
                  const member = itTeam.find(m => m.email === v);
                  onAssign(task.id, v, member?.name || v);
                }}
              >
                <SelectTrigger className="h-7 text-xs w-44">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {itTeam.map(m => (
                    <SelectItem key={m.id} value={m.email}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
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
            📅 {format(new Date(task.due_date), "dd MMM")}
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
// MAIN COMPONENT
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
  const [mainView, setMainView] = useState<"projects" | "my_tasks" | "chat">("projects");
  
  // ── States ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy, setSortBy] = useState<"date_asc" | "date_desc" | "priority">("date_asc");
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
  // Branding dialog - commented out
  // const [brandingDialogOpen, setBrandingDialogOpen] = useState(false);
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
  // Branding items - commented out
  // const [brandingItems, setBrandingItems] = useState<BrandingItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [docNoteContent, setDocNoteContent] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

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
      return data as ITTeamMember[];
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
  const [myTaskRemarksDraft, setMyTaskRemarksDraft] = useState<Record<string, string>>({});

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
          projects ( name, project_id, brand_name )
        `)
        .eq("assigned_to_email", user?.email)
        .order("due_date", { ascending: true });

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
    pending: myTasks.filter(t => t.status !== "completed").length,
    overdue: myTasks.filter(t => getDueBucket(t.due_date) === "overdue" && t.status !== "completed").length,
    completed: myTasks.filter(t => t.status === "completed").length,
  };

  const updateMyTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error } = await supabase.from("project_tasks").update({ status }).eq("id", taskId);
      if (error) throw error;
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const saveMyTaskRemarks = async (taskId: string) => {
    const remarks = myTaskRemarksDraft[taskId];
    if (remarks === undefined) return;
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ employee_remarks: remarks })
        .eq("id", taskId);
      if (error) throw error;
      toast.success("Update saved");
      queryClient.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
    } catch (error: any) {
      toast.error(error.message);
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
      const { data, error } = await supabase
        .from("internal_messages")
        .select("*")
        .or(
          `and(sender_email.eq.${myEmail},receiver_email.eq.${otherEmail}),and(sender_email.eq.${otherEmail},receiver_email.eq.${myEmail})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      setChatMessages(data as InternalMessage[]);

      await supabase
        .from("internal_messages")
        .update({ is_read: true })
        .eq("sender_email", otherEmail)
        .eq("receiver_email", myEmail)
        .eq("is_read", false);

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
          const involvesMe = msg.sender_email === myEmail || msg.receiver_email === myEmail;
          if (!involvesMe) return;

          if (
            activeChatMember &&
            (msg.sender_email === activeChatMember.email || msg.receiver_email === activeChatMember.email)
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

  // ── Document upload with multiple options ──
  const [newDocument, setNewDocument] = useState({
    folder: "",
    file_name: "",
    file: null as File | null,
  });
  
  // ── Multiple upload states ──
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

  // ── Notes states ──
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

  // ── Project image states ──
  const [newProjectImageFile, setNewProjectImageFile] = useState<File | null>(null);
  const [newProjectImagePreview, setNewProjectImagePreview] = useState<string | null>(null);
  const [editProjectImageFile, setEditProjectImageFile] = useState<File | null>(null);
  const [editProjectImagePreview, setEditProjectImagePreview] = useState<string | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);

  // ── Dashboard Image Upload Handler ──
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

  // ── Fetch Projects ──
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

  const projects = isAdmin
    ? allProjects
    : allProjects.filter((p: Project) => assignedProjectIds.has(p.id));

  const stats = {
    total: projects.length,
    active: projects.filter((p: Project) => p.status === "active").length,
    onHold: projects.filter((p: Project) => p.status === "on_hold").length,
    completed: projects.filter((p: Project) => p.status === "completed").length,
    totalValue: projects.reduce((sum: number, p: Project) => sum + (p.project_value || 0), 0),
  };

  const PROJECT_PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const filteredProjects = projects
    .filter((project: Project) => {
      const matchSearch = 
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        (project.brand_name || "").toLowerCase().includes(search.toLowerCase()) ||
        project.project_id.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = filterStatus === "all" || project.status === filterStatus;
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
  const generalNotes = notes.filter(n => n.note_type === "general" || n.note_type === "brand_kit" || n.note_type === "client_tracker");

  // ── Fetch Project Details ──
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

      const { data: notesData } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (notesData) {
        setNotes(notesData);
        const docNote = notesData.find((n: ProjectNote) => n.note_type === "documentation");
        setDocNoteContent(docNote?.content || "");
      } else {
        setNotes([]);
        setDocNoteContent("");
      }

    } catch (error) {
      console.error("Error fetching project details:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Handle Project Click ──
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

  // ── Create Project ──
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
          current_stage: "discovery",
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

  // ── Update Project ──
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

      const { error } = await supabase
        .from("projects")
        .update({
          name: editingProject.name,
          brand_name: editingProject.brand_name,
          project_type: editingProject.project_type,
          project_value: editingProject.project_value,
          priority: editingProject.priority,
          start_date: editingProject.start_date,
          expected_launch_date: editingProject.expected_launch_date,
          status: editingProject.status,
          current_stage: editingProject.current_stage,
          client_address: editingProject.client_address,
          client_phone: editingProject.client_phone,
          client_email: editingProject.client_email,
          image_url: imageUrl,
        })
        .eq("id", editingProject.id);

      if (error) throw error;

      toast.success("Project updated successfully!");
      setEditDialogOpen(false);
      setEditingProject(null);
      setEditProjectImageFile(null);
      setEditProjectImagePreview(null);
      refetch();
      if (selectedProject) {
        setSelectedProject({ ...selectedProject, ...editingProject, image_url: imageUrl });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProjectSaving(false);
    }
  };

  // ── Add Stage ──
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

  // ── Update Stage Status ──
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

  // ── Add Department ──
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

  // ── Update Department ──
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

  // ── Delete Department ──
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

  // ── Recompute Department Progress ──
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

  // ── Update Task Status ──
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

        if (!tasksError && tasksData && tasksData.length > 0) {
          const completedCount = tasksData.filter((t: any) => t.status === "completed").length;
          const newPercentage = Math.round((completedCount / tasksData.length) * 100);

          const { error: projectUpdateError } = await supabase
            .from("projects")
            .update({ completion_percentage: newPercentage })
            .eq("id", selectedProject.id);

          if (!projectUpdateError) {
            setSelectedProject((prev) => prev ? { ...prev, completion_percentage: newPercentage } : prev);
          }
        }

        await fetchProjectDetails(selectedProject.id);
        refetch();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Assign Task ──
  const assignTask = async (taskId: string, email: string, name: string) => {
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ assigned_to_email: email, assigned_to_name: name })
        .eq("id", taskId);

      if (error) throw error;

      toast.success(`Task assigned to ${name}`);
      if (selectedProject) {
        fetchProjectDetails(selectedProject.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Add Task ──
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
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Delete Task ──
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
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Update Payment Status ──
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

  // ── Delete Payment ──
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

  // ── Add Agreement ──
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

  // ── Add Payment ──
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

  // ── Add Manufacturing ──
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

  // ── Upload Single Document ──
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

  // ── Upload Multiple Files ──
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

  // ── Handle Multiple File Selection ──
  const handleMultipleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    setMultipleFiles(fileArray);
    toast.success(`${fileArray.length} files selected`);
  };

  // ── Remove file from multiple upload list ──
  const removeFileFromMultiple = (index: number) => {
    setMultipleFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ── Add Communication ──
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

  // ── Note dialog helpers ──
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

  // ── Add Note ──
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
    } catch (error: any) {
      toast.error(error.message || "Failed to save note");
    } finally {
      setNoteSaving(false);
    }
  };

  // ── Update Note ──
  const updateNote = async () => {
    if (!editingNote || !selectedProject) return;

    setNoteSaving(true);
    try {
      const imageUrl = await uploadNoteImageIfNeeded();

      let updatePayload: any = {};

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
    } catch (error: any) {
      toast.error(error.message || "Failed to update note");
    } finally {
      setNoteSaving(false);
    }
  };

  // ── Delete Note ──
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
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Save Documentation Note ──
  const saveDocumentationNote = async () => {
    if (!selectedProject) return;

    try {
      if (documentationNote) {
        const { error } = await supabase
          .from("project_notes")
          .update({ content: docNoteContent })
          .eq("id", documentationNote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_notes")
          .insert({
            project_id: selectedProject.id,
            note_type: "documentation",
            title: "Project Documentation",
            content: docNoteContent || "test",
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

  // ── Delete Project ──
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

  // ── Calculate Payment Summary ──
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
  // EXCEL IMPORT / EXPORT FUNCTIONS
  // ════════════════════════════════════════════════════════════

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
          current_stage: (row as any)['Current Stage'] || (row as any)['current_stage'] || 'discovery',
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
        <Badge variant="outline" className="ml-auto text-[10px]">👑 Admin View — all projects</Badge>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // MY TASKS VIEW
  // ════════════════════════════════════════════════════════════
  if (mainView === "my_tasks") {
    return (
      <div className="space-y-6">
        {TopNav}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground text-sm">Sirf aapko assign kiye gaye tasks yahan dikhte hain</p>
        </div>

        {myTasksLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{myTaskStats.total}</p></div>
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{myTaskStats.pending}</p></div>
                <Clock className="h-5 w-5 text-yellow-600" />
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Overdue</p><p className="text-2xl font-bold text-red-600">{myTaskStats.overdue}</p></div>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-600">{myTaskStats.completed}</p></div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </CardContent></Card>
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

            <div className="space-y-3">
              {filteredMyTasks.length === 0 && (
                <Card><CardContent className="p-8 text-center text-muted-foreground">
                  Koi task nahi mila is filter ke saath
                </CardContent></Card>
              )}
              {filteredMyTasks.map((task) => {
                const bucket = getDueBucket(task.due_date);
                return (
                  <Card key={task.id} className={bucket === "overdue" && task.status !== "completed" ? "border-red-300" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{task.task_name}</span>
                            <PriorityBadge priority={task.priority} />
                            <StatusBadge status={task.status} />
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
                              📅 Due: {format(new Date(task.due_date), "dd MMM yyyy")}
                            </p>
                          )}
                        </div>
                        <Select value={task.status} onValueChange={(v) => updateMyTaskStatus(task.id, v)}>
                          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">Processing</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="completed">Done</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">update / progress note:</p>
                        <div className="flex gap-2">
                          <Textarea
                            rows={2}
                            defaultValue={task.employee_remarks || ""}
                            onChange={(e) => setMyTaskRemarksDraft((prev) => ({ ...prev, [task.id]: e.target.value }))}
                            placeholder="e.g. Sample send client reply..."
                            className="text-sm"
                          />
                          <Button size="sm" onClick={() => saveMyTaskRemarks(task.id)}>Save</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // TEAM CHAT VIEW
  // ════════════════════════════════════════════════════════════
  if (mainView === "chat") {
    return (
      <div className="space-y-4">
        {TopNav}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Chat</h1>
          <p className="text-muted-foreground text-sm">IT team ke saath internal messaging</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 h-[550px]">
              <div className="border-r overflow-y-auto">
                {itLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  chatTeamList.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => selectChatMember(member)}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-muted/40 transition-colors flex items-center justify-between ${
                        activeChatMember?.id === member.id ? "bg-muted/60" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role || member.email}</p>
                      </div>
                      {chatUnread.includes(member.email) && (
                        <CircleDot className="h-3 w-3 text-blue-500" />
                      )}
                    </button>
                  ))
                )}
                {!itLoading && chatTeamList.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4">Koi aur IT team member nahi mila</p>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col">
                {!activeChatMember ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm gap-2">
                    <MessageSquare className="h-5 w-5" /> Chat karne ke liye kisi team member ko select karein
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b">
                      <p className="font-medium text-sm">{activeChatMember.name}</p>
                    </div>
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                      {chatMessagesLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                      ) : (
                        chatMessages.map((m) => {
                          const mine = m.sender_email === myEmail;
                          return (
                            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                              >
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
                          write here
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

  // ════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════════════════════
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
            <span className="font-semibold">{selectedProject.completion_percentage || 0}%</span>
          </div>
          <Progress value={selectedProject.completion_percentage || 0} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>📅 Started: {selectedProject.start_date ? format(new Date(selectedProject.start_date), "dd MMM yyyy") : "N/A"}</span>
            <span>🚀 Launch: {selectedProject.expected_launch_date ? format(new Date(selectedProject.expected_launch_date), "dd MMM yyyy") : "N/A"}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="stages">Stages</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Status</p><StatusBadge status={selectedProject.status} /></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Stage</p><StageBadge stage={selectedProject.current_stage} /></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Project Value</p><p className="text-xl font-bold">{formatCurrency(selectedProject.project_value || 0)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Tasks</p><p className="text-xl font-bold">{projectTasks.filter(t => t.status === 'completed').length}/{projectTasks.length}</p></CardContent></Card>
            </div>

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
                    {projectTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : task.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300'}`} />
                        <span className={`flex-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.task_name}</span>
                        {task.assigned_to_name && <span className="text-xs text-indigo-600">👤 {task.assigned_to_name}</span>}
                        <span className="text-xs text-muted-foreground">{task.due_date ? format(new Date(task.due_date), "dd MMM") : "No due"}</span>
                        <Badge variant="outline" className="text-xs">{task.status}</Badge>
                      </div>
                    ))}
                    {projectTasks.length === 0 && <p className="text-center text-muted-foreground py-4">No tasks yet</p>}
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
                            <TaskCard key={task.id} task={task} itTeam={itTeam} onStatusChange={updateTaskStatus} onAssign={assignTask} onDelete={deleteTask} />
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Project Stages</CardTitle>
                  <Button size="sm" onClick={() => setStageDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Stage</Button>
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
                            <Badge variant="outline" className="text-xs">{stage.status || "pending"}</Badge>
                            <Select value={stage.status || "pending"} onValueChange={(v) => updateStageStatus(stage.id, v)}>
                              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
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
                    {projectStages.length === 0 && <p className="text-center text-muted-foreground py-8">No stages yet</p>}
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
                      <TaskCard key={task.id} task={task} itTeam={itTeam} onStatusChange={updateTaskStatus} onAssign={assignTask} onDelete={deleteTask} />
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
                                    <SelectItem value="pending">⏸️ Pending</SelectItem>
                                    <SelectItem value="in_progress">⏳ In Progress</SelectItem>
                                    <SelectItem value="completed">✅ Completed</SelectItem>
                                    <SelectItem value="blocked">🚫 Blocked</SelectItem>
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
                              📅 {item.completion_date ? 
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

        {/* Payment Dialog with Status and Due Date removed */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2"><Label>Payment Type</Label><Select value={newPayment.payment_type} onValueChange={(v) => setNewPayment({ ...newPayment, payment_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="client">Client Payment</SelectItem><SelectItem value="manufacturer">Manufacturer Payment</SelectItem></SelectContent></Select></div>
              <div className="grid gap-2"><Label>Milestone *</Label><Input value={newPayment.milestone} onChange={(e) => setNewPayment({ ...newPayment, milestone: e.target.value })} placeholder="e.g., Booking Amount" /></div>
              <div className="grid gap-2"><Label>Amount (₹) *</Label><Input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} placeholder="Enter amount" /></div>
              <div className="grid gap-2"><Label>Due Date</Label><Input type="date" value={newPayment.due_date} onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })} /></div>
              {/* Status field removed as requested */}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button><Button onClick={addPayment}>Add Payment</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={manufacturingDialogOpen} onOpenChange={setManufacturingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-orange-500" />Update Manufacturing</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2"><Label>Stage *</Label><Select value={newManufacturing.stage} onValueChange={(v) => setNewManufacturing({ ...newManufacturing, stage: v })}><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent>{MANUFACTURING_STAGES.map(s => <SelectItem key={s} value={s}>{manufacturing.find(m => m.stage === s)?.status === 'completed' ? '✅ ' : ''}{manufacturing.find(m => m.stage === s)?.status === 'in_progress' ? '⏳ ' : ''}{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Status</Label><Select value={newManufacturing.status} onValueChange={(v) => setNewManufacturing({ ...newManufacturing, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">⏸️ Pending</SelectItem><SelectItem value="in_progress">⏳ In Progress</SelectItem><SelectItem value="completed">✅ Completed</SelectItem><SelectItem value="blocked">🚫 Blocked</SelectItem></SelectContent></Select></div>
              <div className="grid gap-2"><Label>Remarks</Label><Textarea value={newManufacturing.remarks} onChange={(e) => setNewManufacturing({ ...newManufacturing, remarks: e.target.value })} placeholder="Enter remarks" rows={2} /></div>
              <div className="grid gap-2"><Label>Responsible Person</Label><Input value={newManufacturing.responsible_person} onChange={(e) => setNewManufacturing({ ...newManufacturing, responsible_person: e.target.value })} placeholder="Enter name" /></div>
              <div className="grid gap-2"><Label>Start Date</Label><Input type="date" value={newManufacturing.start_date} onChange={(e) => setNewManufacturing({ ...newManufacturing, start_date: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setManufacturingDialogOpen(false)}>Cancel</Button><Button onClick={addManufacturing} disabled={!newManufacturing.stage}><Save className="h-4 w-4 mr-2" />{manufacturing.find(m => m.stage === newManufacturing.stage) ? "Update" : "Add"} Manufacturing</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* UPDATED: Document Upload Dialog with Multiple Upload Options */}
        <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Upload Files
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Upload Type Selection */}
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

              {/* Single File Upload */}
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

              {/* Multiple File Upload */}
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
              <div className="grid gap-2"><Label>Type</Label><Select value={newCommunication.type} onValueChange={(v) => setNewCommunication({ ...newCommunication, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="call">📞 Call</SelectItem><SelectItem value="email">✉️ Email</SelectItem><SelectItem value="whatsapp">💬 WhatsApp</SelectItem><SelectItem value="meeting">📅 Meeting</SelectItem><SelectItem value="comment">💭 Comment</SelectItem><SelectItem value="followup">🔔 Follow-up</SelectItem></SelectContent></Select></div>
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
                <div className="grid gap-2"><Label>Priority</Label><Select value={editingProject.priority || "medium"} onValueChange={(v) => setEditingProject({ ...editingProject, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Project Value (₹)</Label><Input type="number" value={editingProject.project_value || 0} onChange={(e) => setEditingProject({ ...editingProject, project_value: Number(e.target.value) })} /></div>
                <div className="grid gap-2"><Label>Status</Label><Select value={editingProject.status} onValueChange={(v) => setEditingProject({ ...editingProject, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Current Stage</Label><Select value={editingProject.current_stage} onValueChange={(v) => setEditingProject({ ...editingProject, current_stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROJECT_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}</SelectContent></Select></div>
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

  // ════════════════════════════════════════════════════════════
  // DASHBOARD VIEW
  // ════════════════════════════════════════════════════════════
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Total Projects" value={stats.total} color="blue" />
        <StatCard icon={CheckCircle} label="Active" value={stats.active} color="green" />
        <StatCard icon={AlertTriangle} label="On Hold" value={stats.onHold} color="red" />
        <StatCard icon={DollarSign} label="Total Value" value={formatCurrency(stats.totalValue)} color="purple" />
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
              <SelectContent><SelectItem value="all">All Stages</SelectItem>{PROJECT_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Priority</SelectItem>{PROJECT_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent><SelectItem value="date_asc">🚀 Launch Date (Nearest)</SelectItem><SelectItem value="date_desc">🚀 Launch Date (Farthest)</SelectItem><SelectItem value="priority">⚡ Priority (High → Low)</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterStage("all"); setFilterPriority("all"); setSortBy("date_asc"); }}>
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
                  {isAdmin ? "No projects found" : "Aapko abhi tak kisi project mein task assign nahi hua hai"}
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
