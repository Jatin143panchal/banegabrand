import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { useCanAssignTasks, useAllProfiles } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadActivityLogger } from "@/hooks/useLeadActivity";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Search, Loader2, Upload, FileSpreadsheet, Trash2, Edit, Eye,
  Download, X, UserCheck, CheckSquare, Users, Phone, Mail,
  MessageCircle, Calendar, TrendingUp, Flag, XCircle,
  FileSignature, Flame, Snowflake, Sun, ChevronLeft, ChevronRight,
  Filter, LayoutGrid, List, User, Building2, DollarSign, Clock,
  Menu, ChevronDown, Star, StarOff, Award, Briefcase
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadCommentsPanel from "@/components/LeadCommentsPanel";
import { useBulkAssignLeads } from "@/hooks/useLeadComments";
import { isToday, subDays, format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Stages config ─────────────────────────────────────────────────────────────
const DEFAULT_LEAD_STAGE = "new";

const LEAD_STAGES = [
  { value: "new",       label: "New",       color: "#3b82f6", bg: "#eff6ff", icon: "✨" },
  { value: "ringing",   label: "Ringing",   color: "#f97316", bg: "#fff7ed", icon: "📞" },
  { value: "callback",  label: "Callback",  color: "#3b82f6", bg: "#eff6ff", icon: "🔔" },
  { value: "dp",        label: "DP",        color: "#8b5cf6", bg: "#f5f3ff", icon: "📋" },
  { value: "vms",       label: "VMS",       color: "#06b6d4", bg: "#ecfeff", icon: "🎙" },
  { value: "pg",        label: "PG",        color: "#ec4899", bg: "#fdf2f8", icon: "👥" },
  { value: "converted", label: "Converted", color: "#10b981", bg: "#ecfdf5", icon: "✅" },
  { value: "lost",      label: "Lost",      color: "#ef4444", bg: "#fef2f2", icon: "❌" },
];

const LEAD_TEMPERATURE = [
  { value: "hot",   label: "🔥 Hot",   color: "#ef4444", bg: "#fef2f2" },
  { value: "warm",  label: "☀️ Warm",  color: "#f97316", bg: "#fff7ed" },
  { value: "cold",  label: "❄️ Cold",  color: "#3b82f6", bg: "#eff6ff" },
];

const LEAD_STATUSES = [
  { value: "ringing",            label: "Ringing"           },
  { value: "callback",           label: "Callback"          },
  { value: "dp",                 label: "DP"                },
  { value: "vms",                label: "VMS"               },
  { value: "pg",                 label: "PG"                },
  { value: "converted",          label: "Converted"         },
  { value: "lost",               label: "Lost"              },
  { value: "meeting_booked",     label: "Meeting Booked"    },
  { value: "business_generated", label: "Business Generated"},
];

const SUB_STAGES: Record<string, { value: string; label: string }[]> = {
  ringing:  [
    { value: "ringing_1st", label: "1st Ring" },
    { value: "ringing_2nd", label: "2nd Ring" },
    { value: "ringing_3rd", label: "3rd Ring" },
  ],
  callback: [
    { value: "callback_scheduled", label: "Callback Scheduled" },
    { value: "callback_done",      label: "Callback Done"      },
  ],
  dp:       [
    { value: "dp_sent",     label: "DP Sent"     },
    { value: "dp_reviewed", label: "DP Reviewed" },
  ],
  vms:      [
    { value: "vms_left",    label: "VMS Left"    },
    { value: "vms_replied", label: "VMS Replied" },
  ],
  pg:       [
    { value: "pg_initiated", label: "PG Initiated" },
    { value: "pg_confirmed", label: "PG Confirmed" },
  ],
  converted:[
    { value: "meeting_booked",      label: "Meeting Booked"      },
    { value: "business_generated",  label: "Business Generated"  },
  ],
  lost: [
    { value: "not_interested",  label: "Not Interested" },
    { value: "no_response",     label: "No Response" },
    { value: "budget_issue",    label: "Budget Issue" },
    { value: "competitor",      label: "Competitor" },
    { value: "wrong_number",    label: "Wrong Number" },
  ],
};

function getSubStagesForStage(stage: string | null | undefined) {
  return SUB_STAGES[stage || ""] || [];
}

function formatStageLabel(value: string | null | undefined): string {
  if (!value) return "-";
  for (const s of LEAD_STAGES)  if (s.value === value) return s.label;
  for (const arr of Object.values(SUB_STAGES)) for (const s of arr) if (s.value === value) return s.label;
  for (const s of LEAD_STATUSES) if (s.value === value) return s.label;
  return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getStageConfig(stage: string | null | undefined) {
  return LEAD_STAGES.find(s => s.value === stage) || null;
}

function getTemperatureConfig(temp: string | null | undefined) {
  return LEAD_TEMPERATURE.find(t => t.value === temp) || null;
}

interface DbLead {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  source: string | null; status: string; value: number | null; business_status: string | null;
  assigned_to: string | null; created_at: string; next_call_date: string | null;
  lead_type: string | null; address: string | null; cx_comment: string | null;
  budget: string | null; stage: string | null; sub_stage: string | null; remark: string | null;
  assign_date?: string | null;
  lost_reason?: string | null;
  lost_date?: string | null;
  leegality_document_id?: string | null;
  leegality_status?: string | null;
  leegality_signed_at?: string | null;
  temperature?: string | null;
}

const LEAD_TYPES = ["Herbal & Ayurvedic", "Cosmetics", "Food & Beverage", "Pharma","Perfume", "Nutraceutical", "Other"];
const BUDGETS    = ["₹5l+", "₹50k - ₹1l", "₹1l - ₹3l", "₹3l - ₹5l", "Below ₹50k"];

const formatCurrency = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "#3b82f6","#8b5cf6","#ec4899","#f97316","#10b981","#06b6d4","#f59e0b","#ef4444",
];
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function getLeadScore(lead: DbLead): number {
  let score = 0;
  if (lead.name)    score += 10;
  if (lead.email)   score += 15;
  if (lead.phone)   score += 15;
  if (lead.company) score += 10;
  if (lead.source)  score += 10;
  if ((lead.value || 0) > 0) score += 15;
  if      (lead.status === "converted")  score += 30;
  else if (lead.status === "qualified")  score += 25;
  else if (lead.status === "answered")   score += 20;
  else if (lead.status === "contacted")  score += 15;
  else if (lead.status === "new")        score += 5;
  else if (lead.status === "lost")       score = 0;
  if (lead.sub_stage === "meeting_booked" || lead.sub_stage === "business_generated") score += 10;
  
  if (lead.temperature === "hot") score += 15;
  else if (lead.temperature === "warm") score += 8;
  
  return Math.min(score, 100);
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1">
            <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
              style={{ borderColor: color, color }}>
              {score}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Lead Score: {score}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TemperatureBadge({ temperature }: { temperature: string | null | undefined }) {
  const config = getTemperatureConfig(temperature);
  if (!config) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.color}30` }}>
      {config.label}
    </span>
  );
}

function StagePill({ stage, subStage }: { stage: string | null; subStage: string | null }) {
  const cfg = getStageConfig(stage);
  if (!cfg) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
        {cfg.icon} {cfg.label}
      </span>
      {subStage && (
        <span className="text-[10px] text-muted-foreground">{formatStageLabel(subStage)}</span>
      )}
    </div>
  );
}

// ── Mobile Lead Card ──
function MobileLeadCard({ lead, onView, onEdit, onLost, onDelete, getProfileName, typedProfiles, assignLead, selectedIds, toggleSelect, onSign, leegalityLoading }: any) {
  const score = getLeadScore(lead);
  const assignee = getProfileName(lead.assigned_to);
  const assigneeColor = lead.assigned_to ? avatarColor(assignee) : "#94a3b8";

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox 
              checked={selectedIds.has(lead.id)} 
              onCheckedChange={() => toggleSelect(lead.id)}
              className="mt-1"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{lead.name}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {format(new Date(lead.created_at), "dd MMM")}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {lead.company && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {lead.company}
                  </span>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            <TemperatureBadge temperature={lead.temperature} />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(lead)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(lead)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StagePill stage={lead.stage} subStage={lead.sub_stage} />
          <ScoreBadge score={score} />
          <div className="flex items-center gap-1 ml-auto">
            <Select 
              value={lead.assigned_to || "unassigned"} 
              onValueChange={(v) => assignLead.mutate({ id: lead.id, assigned_to: v })}
            >
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue placeholder="Assign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {typedProfiles.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.display_name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2 pt-2 border-t">
          {lead.phone && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <a href={`tel:${lead.phone}`}><Phone className="w-3 h-3 mr-1" />Call</a>
            </Button>
          )}
          {lead.phone && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-3 h-3 mr-1" />WhatsApp
              </a>
            </Button>
          )}
          {lead.stage !== "lost" && lead.stage !== "converted" && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600" onClick={() => onLost(lead)}>
              <Flag className="w-3 h-3 mr-1" />Lost
            </Button>
          )}
          {lead.stage === "converted" && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600" onClick={() => onSign(lead)} disabled={leegalityLoading === lead.id}>
              {leegalityLoading === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSignature className="w-3 h-3 mr-1" />}
              Sign
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive ml-auto" onClick={() => onDelete(lead.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Stats Cards ──
function StatsCards({ stats, onFilterByTemperature }: { stats: any; onFilterByTemperature: (temp: string) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onFilterByTemperature("all")}>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{stats.totalLeads}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onFilterByTemperature("hot")}>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50">
            <Flame className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{stats.hotCount}</p>
            <p className="text-[10px] text-muted-foreground">Hot</p>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onFilterByTemperature("warm")}>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50">
            <Sun className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-orange-600">{stats.warmCount}</p>
            <p className="text-[10px] text-muted-foreground">Warm</p>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onFilterByTemperature("cold")}>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Snowflake className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-blue-600">{stats.coldCount}</p>
            <p className="text-[10px] text-muted-foreground">Cold</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{stats.convertedCount}</p>
            <p className="text-[10px] text-muted-foreground">Converted</p>
            <p className="text-[9px] text-muted-foreground">{stats.totalLeads > 0 ? ((stats.convertedCount / stats.totalLeads) * 100).toFixed(0) : 0}%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50">
            <DollarSign className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{stats.totalValue > 0 ? formatCurrency(stats.totalValue) : "₹0"}</p>
            <p className="text-[10px] text-muted-foreground">Total Value</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ──
export default function Leads() {
  const { user } = useAuth();
  const canAssign = useCanAssignTasks();
  const { data: profiles = [] } = useAllProfiles();
  const logActivity = useLeadActivityLogger();
  
  // ── State ──
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // ── Fetch leads function ──
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setLeads(data as DbLead[]);
      return data;
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to fetch leads");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // ── Initial fetch ──
  useEffect(() => {
    if (isInitialFetch) {
      fetchLeads();
      setIsInitialFetch(false);
    }
  }, [fetchLeads, isInitialFetch]);
  
  // ── Real-time subscription ──
  useEffect(() => {
    let isMounted = true;
    
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          if (!isMounted) return;
          
          if (payload.eventType === 'INSERT') {
            setLeads(prev => [payload.new as DbLead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(lead => 
              lead.id === payload.new.id ? payload.new as DbLead : lead
            ));
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterStage, setFilterStage]       = useState("all");
  const [filterAssignment, setFilterAssignment] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterLeadType, setFilterLeadType] = useState("all");
  const [filterBudget, setFilterBudget]     = useState("all");
  const [filterTemperature, setFilterTemperature] = useState("all");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [uploadOpen, setUploadOpen]         = useState(false);
  const [detailLead, setDetailLead]         = useState<DbLead | null>(null);
  const [editLead, setEditLead]             = useState<DbLead | null>(null);
  const [filterPreset, setFilterPreset]     = useState("all");
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [bulkAssignTo, setBulkAssignTo]     = useState("");
  const [empModalOpen, setEmpModalOpen]     = useState(false);
  const [uploadPreview, setUploadPreview]   = useState<any[]>([]);
  const [uploading, setUploading]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [lostLeadDialog, setLostLeadDialog] = useState<DbLead | null>(null);
  const [leegalitySignDialog, setLeegalitySignDialog] = useState<DbLead | null>(null);
  const [leegalityLoading, setLeegalityLoading] = useState<string | null>(null);
  const [sendingAgreement, setSendingAgreement] = useState<string | null>(null);
  const [agreementData, setAgreementData] = useState<Record<string, any>>({});

  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");

  const emptyForm = {
    name: "", email: "", phone: "", company: "", source: "Website", value: "",
    lead_type: "Herbal & Ayurvedic", address: "", cx_comment: "",
    budget: "₹50k - ₹1l", stage: DEFAULT_LEAD_STAGE, sub_stage: "", remark: "",
    temperature: "warm",
  };
  const [form, setForm] = useState(emptyForm);

  // ── DIRECT DUPLICATE CHECK ──
  const checkForDuplicate = useCallback(async (leadData: any, excludeId?: string) => {
    try {
      const conditions = [];
      
      if (leadData.email && leadData.email.trim()) {
        conditions.push(`email.eq.${leadData.email.trim()}`);
      }
      if (leadData.phone && leadData.phone.trim()) {
        conditions.push(`phone.eq.${leadData.phone.trim()}`);
      }
      if (leadData.name && leadData.name.trim()) {
        conditions.push(`name.ilike.%${leadData.name.trim()}%`);
      }
      
      if (conditions.length === 0) {
        return { is_duplicate: false };
      }
      
      let query = supabase
        .from("leads")
        .select("id, name, email, phone")
        .or(conditions.join(','));
      
      if (excludeId) {
        query = query.neq("id", excludeId);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) {
        console.error("Duplicate check error:", error);
        return { is_duplicate: false };
      }
      
      if (data && data.length > 0) {
        return {
          is_duplicate: true,
          existing_lead_name: data[0].name,
          existing_lead_id: data[0].id
        };
      }
      
      return { is_duplicate: false };
    } catch (error) {
      console.error("Error checking duplicate:", error);
      return { is_duplicate: false };
    }
  }, []);

  const handleSendAgreement = useCallback(async (lead: DbLead) => {
    if (!lead.email) {
      toast.error("Client email is required to send agreement");
      return;
    }
    
    setSendingAgreement(lead.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-agreement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          client_name: lead.name,
          client_email: lead.email,
          client_phone: lead.phone,
          company_name: lead.company,
          package_name: "Premium Package",
          amount: lead.value || 0,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.sign_url) {
        setAgreementData(prev => ({ ...prev, [lead.id]: result.agreement }));
        toast.success(`Signing link generated for ${lead.email}`);
        logActivity(lead.id, "agreement_sent", `Signing link sent to ${lead.email}`);
      } else {
        toast.error(result.error || "Failed to send agreement");
      }
    } catch (error: any) {
      console.error("Send agreement error:", error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setSendingAgreement(null);
    }
  }, [logActivity]);

  const fetchAgreementStatus = useCallback(async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from("agreements")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setAgreementData(prev => ({ ...prev, [leadId]: data }));
      }
    } catch (error) {
      // No agreement found - ignore
    }
  }, []);

  const handleLeegalitySign = useCallback(async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
      toast.error("Lead not found");
      return;
    }
    
    if (!lead.email && !lead.phone) {
      toast.error("Lead must have email or phone number to sign agreement");
      return;
    }
    
    setLeegalityLoading(leadId);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error("You need to be logged in. Please refresh and try again.");
        setLeegalityLoading(null);
        return;
      }
      
      const samplePdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
      const redirectUrl = `${window.location.origin}/leads?agreement_signed=true&lead_id=${lead.id}`;
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        toast.error("Configuration error. Please contact support.");
        setLeegalityLoading(null);
        return;
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/leegality-prod`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          document_url: samplePdfUrl,
          signer_name: lead.name,
          signer_email: lead.email,
          signer_phone: lead.phone,
          redirect_url: redirectUrl,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.sign_url) {
        const updatedLead = { ...lead, leegality_status: "pending", leegality_document_id: result.document_id };
        setDetailLead(prev => prev?.id === lead.id ? updatedLead : prev);
        setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
        
        toast.success("eSign request created! Redirecting to Leegality...");
        logActivity(lead.id, "leegality_initiated", `Document ID: ${result.document_id}`);
        
        setTimeout(() => {
          window.location.href = result.sign_url;
        }, 1000);
      } else {
        toast.error(result.error || "Failed to create eSign request");
      }
    } catch (error: any) {
      console.error("Leegality error:", error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLeegalityLoading(null);
      setLeegalitySignDialog(null);
    }
  }, [leads, logActivity]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('agreement_signed') === 'true') {
      const leadId = urlParams.get('lead_id');
      toast.success("Agreement signed successfully!");
      fetchLeads();
      if (leadId) {
        fetchAgreementStatus(leadId);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchLeads, fetchAgreementStatus]);

  useEffect(() => {
    if (detailLead?.id) {
      fetchAgreementStatus(detailLead.id);
    }
  }, [detailLead?.id, fetchAgreementStatus]);

  // ── Mark Lead as Lost ──
  const markLeadAsLost = useCallback(async (leadId: string, reason: string) => {
    try {
      const lostDate = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({ 
          stage: "lost", 
          status: "lost",
          lost_reason: reason,
          lost_date: lostDate,
          business_status: "no-go"
        })
        .eq("id", leadId);
      
      if (error) throw error;
      
      await fetchLeads();
      
      if (detailLead && detailLead.id === leadId) {
        setDetailLead(null);
      }
      
      logActivity(leadId, "updated", `Marked as lost - Reason: ${reason}`);
      toast.success("Lead marked as lost");
      setLostLeadDialog(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark lead as lost");
    }
  }, [fetchLeads, detailLead, logActivity]);

  // ── Assign Lead ──
  const assignLead = useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const finalAssignedTo = assigned_to === "unassigned" ? null : assigned_to;
      const assign_date = finalAssignedTo ? new Date().toISOString() : null;
      
      const { error } = await supabase
        .from("leads")
        .update({ 
          assigned_to: finalAssignedTo, 
          assign_date: assign_date 
        })
        .eq("id", id);
        
      if (error) throw error;
      
      await fetchLeads();
      
      if (detailLead && detailLead.id === id) {
        const updatedLead = leads.find(l => l.id === id);
        if (updatedLead) setDetailLead(updatedLead);
      }
      
      return { id, assigned_to: finalAssignedTo };
    },
    onSuccess: () => {
      toast.success("Lead assigned successfully");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to assign lead");
    },
  });

  const getProfileName = useCallback((userId: string | null) => {
    if (!userId) return "Unassigned";
    const p = (profiles as { user_id: string; display_name: string | null }[]).find(p => p.user_id === userId);
    return p?.display_name || "Unknown";
  }, [profiles]);

  // ── UPDATE STAGE ──
  const handleUpdateStageFromDetail = useCallback(async (id: string, stage: string, subStage: string) => {
    try {
      const updateData: any = { 
        stage, 
        sub_stage: subStage,
      };
      
      if (stage === "converted") {
        updateData.status = "converted";
        updateData.business_status = "done";
      } else if (stage === "lost") {
        updateData.status = "lost";
        updateData.business_status = "no-go";
      } else {
        const lead = leads.find(l => l.id === id);
        if (lead) {
          updateData.status = lead.status || stage;
        }
      }
      
      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
      
      await fetchLeads();
      
      if (detailLead && detailLead.id === id) {
        const updatedLead = leads.find(l => l.id === id);
        if (updatedLead) {
          setDetailLead(updatedLead);
        } else {
          setDetailLead(null);
        }
      }
      
      toast.success(`Stage updated to ${formatStageLabel(stage)}`);
      logActivity(id, "updated", `Stage: ${stage}${subStage ? `, Sub-Stage: ${subStage}` : ''}`);
    } catch (error: any) {
      console.error("Stage update error:", error);
      toast.error(error.message || "Failed to update stage");
    }
  }, [fetchLeads, detailLead, leads, logActivity]);

  const openLeadDetail = useCallback((lead: DbLead) => {
    setDetailLead(lead);
    logActivity(lead.id, "viewed", `Opened ${lead.name}`);
  }, [logActivity]);

  // ── ADD LEAD ──
  const handleAddLead = useCallback(async () => {
    if (!form.name || !form.email) { 
      toast.error("Name and Email are required"); 
      return; 
    }
    
    try {
      const duplicate = await checkForDuplicate(form);
      if (duplicate && duplicate.is_duplicate) {
        toast.error(`Duplicate lead found: ${duplicate.existing_lead_name} already exists`);
        return;
      }
      
      const { error } = await supabase
        .from("leads")
        .insert({
          name: form.name, 
          email: form.email, 
          phone: form.phone, 
          company: form.company,
          source: form.source, 
          value: Number(form.value) || 0, 
          status: "new",
          lead_type: form.lead_type, 
          address: form.address, 
          cx_comment: form.cx_comment,
          budget: form.budget, 
          stage: form.stage, 
          sub_stage: form.sub_stage, 
          remark: form.remark,
          temperature: form.temperature,
        });
      
      if (error) throw error;
      
      setForm(emptyForm);
      setDialogOpen(false);
      toast.success("Lead added successfully");
      await fetchLeads();
    } catch (error: any) {
      console.error("Add lead error:", error);
      toast.error(error.message || "Failed to add lead");
    }
  }, [form, fetchLeads, checkForDuplicate, emptyForm]);

  // ── FILTERED LEADS ──
  const filtered = useMemo(() => {
    return leads.filter(l => {
      const matchSearch =
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.company || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.phone || "").includes(search) ||
        (l.email || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus     = filterStatus === "all"     || l.status === filterStatus;
      const matchStage      = filterStage === "all"      || l.stage === filterStage;
      const matchLeadType   = filterLeadType === "all"   || l.lead_type === filterLeadType;
      const matchBudget     = filterBudget === "all"     || l.budget === filterBudget;
      const matchTemperature = filterTemperature === "all" || l.temperature === filterTemperature;
      const matchTemperatureFilter = temperatureFilter === "all" || l.temperature === temperatureFilter;
      const matchAssignment =
        filterAssignment === "all" ||
        (filterAssignment === "mine"       && l.assigned_to === user?.id) ||
        (filterAssignment === "unassigned" && !l.assigned_to);
      const matchEmployee =
        employeeFilter === null ||
        (employeeFilter === "unassigned" && !l.assigned_to) ||
        l.assigned_to === employeeFilter;
      const matchEmployeeFilter2 =
        filterEmployee === "all" ||
        (filterEmployee === "unassigned" && !l.assigned_to) ||
        l.assigned_to === filterEmployee;
      const matchStatusFilter = statusFilter === null || l.status === statusFilter;
      const matchPreset =
        filterPreset === "all" ||
        (filterPreset === "today"    && isToday(new Date(l.created_at))) ||
        (filterPreset === "fresh"    && (l.status === "new" || l.stage === "ringing") && new Date(l.created_at) >= subDays(new Date(), 3)) ||
        (filterPreset === "followup" && l.next_call_date && new Date(l.next_call_date) <= new Date());
      const createdAt = new Date(l.created_at);
      const matchDateFrom = !dateFrom || createdAt >= new Date(dateFrom);
      const matchDateTo   = !dateTo   || createdAt <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchStatus && matchStage && matchLeadType && matchBudget &&
             matchAssignment && matchEmployee && matchEmployeeFilter2 && matchPreset && 
             matchDateFrom && matchDateTo && matchTemperature && matchStatusFilter &&
             matchTemperatureFilter;
    });
  }, [leads, search, filterStatus, filterStage, filterAssignment, filterEmployee, 
      filterLeadType, filterBudget, filterTemperature, dateFrom, dateTo, 
      filterPreset, employeeFilter, statusFilter, temperatureFilter, user]);

  // ── Pagination ──
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filtered.slice(start, end);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered.length]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Bulk Assign ──
  const handleBulkAssign = useCallback(async () => {
    if (selectedIds.size === 0 || !bulkAssignTo) return;
    try {
      const assign_date = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: bulkAssignTo, assign_date })
        .in("id", Array.from(selectedIds));
      
      if (error) throw error;
      
      toast.success(`${selectedIds.size} leads assigned successfully`);
      setSelectedIds(new Set());
      setBulkAssignTo("");
      await fetchLeads();
    } catch (e: unknown) { 
      toast.error(e instanceof Error ? e.message : "Assign failed"); 
    }
  }, [selectedIds, bulkAssignTo, fetchLeads]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);
        const mapped = jsonData.map((row: any) => ({
          name:       row.Name || row.name || row["Full Name"] || row["Lead Name"] || "",
          email:      row.Email || row.email || row["Email Address"] || "",
          phone:      String(row.Number || row.Phone || row.phone || row["Mobile"] || row["Phone Number"] || ""),
          company:    row.Company || row.company || row["Company Name"] || row["Organization"] || "",
          source:     row.Source || row.source || row["Lead Source"] || "Excel Import",
          value:      Number(row.Value || row.value || row["Deal Value"] || 0),
          lead_type:  row["Lead Type"] || row["Lead type"] || row.lead_type || "",
          address:    row.Address || row.address || "",
          cx_comment: row["CX Comment"] || row.cx_comment || row.Comment || "",
          budget:     row.Budget || row.budget || "",
          stage:      row.Stage || row.stage || "ringing",
          sub_stage:  row["Sub Stage"] || row.sub_stage || "",
          remark:     row.Remark || row.remark || row.Remarks || "",
          temperature: row.Temperature || row.temperature || row["Lead Temperature"] || "warm",
        })).filter((r: any) => r.name);
        setUploadPreview(mapped);
        if (mapped.length === 0)
          toast.error("No valid leads found");
      } catch (error) {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  // ── Bulk Import ──
  const handleBulkImport = useCallback(async () => {
    if (uploadPreview.length === 0) return;
    setUploading(true);
    let success = 0;
    let duplicates = 0;
    let duplicateList: any[] = [];
    
    for (const lead of uploadPreview) {
      try {
        const duplicate = await checkForDuplicate(lead);
        
        if (duplicate && duplicate.is_duplicate) {
          duplicates++;
          duplicateList.push({
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            existing_lead: duplicate.existing_lead_name
          });
          continue;
        }
        
        const { error } = await supabase
          .from("leads")
          .insert({
            name: lead.name, 
            email: lead.email, 
            phone: lead.phone, 
            company: lead.company,
            source: lead.source, 
            value: lead.value || 0, 
            status: "new",
            lead_type: lead.lead_type, 
            address: lead.address, 
            cx_comment: lead.cx_comment,
            budget: lead.budget, 
            stage: lead.stage || "ringing", 
            sub_stage: lead.sub_stage, 
            remark: lead.remark,
            temperature: lead.temperature || "warm",
          });
        
        if (error) {
          console.error("Insert error for lead:", lead.name, error);
          continue;
        }
        success++;
      } catch (error) {
        console.error("Error importing lead:", lead.name, error);
      }
    }
    
    setUploading(false);
    setUploadPreview([]);
    setUploadOpen(false);
    if (fileRef.current) fileRef.current.value = "";
    
    await fetchLeads();
    
    if (duplicates > 0) {
      if (success > 0) {
        toast.warning(
          `${success} leads imported successfully, ${duplicates} duplicate leads skipped.`,
          { duration: 5000 }
        );
      } else {
        toast.error(`All ${duplicates} leads were duplicates and were skipped.`);
      }
      console.log("Skipped duplicates:", duplicateList);
    } else {
      toast.success(`${success} leads imported successfully!`);
    }
  }, [uploadPreview, checkForDuplicate, fetchLeads]);

  // ── UPDATE LEAD ──
  const handleUpdate = useCallback(async () => {
    if (!editLead) return;
    
    try {
      const duplicate = await checkForDuplicate(editLead, editLead.id);
      if (duplicate && duplicate.is_duplicate) {
        toast.error(`Duplicate lead found: ${duplicate.existing_lead_name} already exists`);
        return;
      }
      
      const { error } = await supabase
        .from("leads")
        .update({
          name: editLead.name, 
          email: editLead.email, 
          phone: editLead.phone,
          company: editLead.company, 
          source: editLead.source, 
          value: editLead.value,
          status: editLead.status, 
          business_status: editLead.business_status,
          lead_type: editLead.lead_type, 
          address: editLead.address, 
          cx_comment: editLead.cx_comment,
          budget: editLead.budget, 
          stage: editLead.stage, 
          sub_stage: editLead.sub_stage,
          remark: editLead.remark, 
          temperature: editLead.temperature,
        })
        .eq("id", editLead.id);
      
      if (error) throw error;
      
      logActivity(editLead.id, "updated", `Status: ${editLead.status}`);
      setEditLead(null);
      toast.success("Lead updated");
      await fetchLeads();
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update lead");
    }
  }, [editLead, logActivity, fetchLeads, checkForDuplicate]);

  // ── DELETE LEAD ──
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setDetailLead(null);
      toast.success("Lead deleted");
      await fetchLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lead");
    }
  }, [fetchLeads]);

  const handleExport = useCallback(() => {
    const exportData = leads.map(l => ({
      Name: l.name, Email: l.email, Number: l.phone, Company: l.company,
      "Lead Type": l.lead_type, Address: l.address, "CX Comment": l.cx_comment,
      Budget: l.budget, Stage: l.stage, "Sub Stage": l.sub_stage, Remark: l.remark,
      Source: l.source, Status: l.status, Value: l.value,
      "Business Status": l.business_status,
      "Assigned To": getProfileName(l.assigned_to),
      "Assign Date": l.assign_date ? format(new Date(l.assign_date), "dd MMM yyyy") : "",
      "Created At": format(new Date(l.created_at), "dd MMM yyyy"),
      "Lost Reason": l.lost_reason || "",
      "Lost Date": l.lost_date ? format(new Date(l.lost_date), "dd MMM yyyy") : "",
      "eSign Status": l.leegality_status || "Not Started",
      "eSign Date": l.leegality_signed_at ? format(new Date(l.leegality_signed_at), "dd MMM yyyy") : "",
      "Temperature": l.temperature || "Warm",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads_export.xlsx");
    toast.success("Leads exported!");
  }, [leads, getProfileName]);

  const clearFilters = useCallback(() => {
    setSearch(""); setFilterStatus("all"); setFilterStage("all");
    setFilterAssignment("all"); setFilterEmployee("all");
    setFilterLeadType("all"); setFilterBudget("all");
    setFilterTemperature("all");
    setDateFrom(""); setDateTo(""); setFilterPreset("all");
    setEmployeeFilter(null);
    setStatusFilter(null);
    setTemperatureFilter("all");
    setCurrentPage(1);
  }, []);

  // ── Temperature update ──
  const handleTemperatureUpdate = useCallback(async (leadId: string, temperature: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ temperature })
        .eq("id", leadId);
      
      if (error) throw error;
      
      await fetchLeads();
      
      if (detailLead && detailLead.id === leadId) {
        const updatedLead = leads.find(l => l.id === leadId);
        if (updatedLead) setDetailLead(updatedLead);
      }
      
      logActivity(leadId, "updated", `Temperature changed to: ${temperature}`);
      toast.success(`Temperature updated to ${temperature.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update temperature");
    }
  }, [fetchLeads, detailLead, leads, logActivity]);

  // ── Stats ──
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
    const convertedCount = leads.filter(l => l.status === "converted" || l.stage === "converted").length;
    const lostCount = leads.filter(l => l.stage === "lost").length;
    const hotCount = leads.filter(l => l.temperature === "hot").length;
    const warmCount = leads.filter(l => l.temperature === "warm").length;
    const coldCount = leads.filter(l => l.temperature === "cold").length;
    return { totalLeads, totalValue, convertedCount, lostCount, hotCount, warmCount, coldCount };
  }, [leads]);

  const handleFilterByTemperature = useCallback((temp: string) => {
    setTemperatureFilter(temp);
    setCurrentPage(1);
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const typedProfiles = profiles as { user_id: string; display_name: string | null }[];

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-5 px-2 sm:px-4 md:px-0">
        <LostLeadDialog
          lead={lostLeadDialog}
          open={!!lostLeadDialog}
          onClose={() => setLostLeadDialog(null)}
          onConfirm={markLeadAsLost}
        />
        
        <LeegalitySignDialog
          lead={leegalitySignDialog}
          open={!!leegalitySignDialog}
          onClose={() => setLeegalitySignDialog(null)}
          onSignInitiated={handleLeegalitySign}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 md:w-6 md:h-6" />
              Leads
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">Manage and track all your leads in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs md:text-sm">
              <Download className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden xs:inline">Export</span>
            </Button>
            
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs md:text-sm">
                  <Upload className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden xs:inline">Import</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-base md:text-lg">
                      <FileSpreadsheet className="h-4 w-4 md:h-5 md:w-5" />
                      Import Leads
                    </span>
                    <Button variant="outline" size="sm" onClick={downloadExcelTemplate} className="text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      Template
                    </Button>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center">
                    <FileSpreadsheet className="h-8 w-8 md:h-10 md:w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Upload Excel (.xlsx, .xls) or CSV</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground mb-3">
                      Required: Name, Email, Phone, Company, Source, Value, Lead Type, Budget, Stage, Sub Stage
                    </p>
                    <p className="text-[10px] md:text-xs text-amber-600 mb-2">
                      ⚠️ Duplicate leads will be automatically skipped
                    </p>
                    <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="max-w-xs mx-auto text-xs" />
                  </div>
                  {uploadPreview.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs md:text-sm font-medium">{uploadPreview.length} leads found</p>
                        <Button variant="ghost" size="sm" onClick={() => { setUploadPreview([]); if (fileRef.current) fileRef.current.value = ""; }}>
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                      <ScrollArea className="max-h-60 rounded border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Name</TableHead>
                              <TableHead className="text-xs hidden sm:table-cell">Email</TableHead>
                              <TableHead className="text-xs hidden md:table-cell">Phone</TableHead>
                              <TableHead className="text-xs">Company</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uploadPreview.slice(0, 10).map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{r.name}</TableCell>
                                <TableCell className="text-xs hidden sm:table-cell">{r.email}</TableCell>
                                <TableCell className="text-xs hidden md:table-cell">{r.phone}</TableCell>
                                <TableCell className="text-xs">{r.company}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {uploadPreview.length > 10 && (
                          <p className="text-[10px] text-muted-foreground text-center py-2">
                            ...and {uploadPreview.length - 10} more
                          </p>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleBulkImport} disabled={uploading || uploadPreview.length === 0} className="w-full sm:w-auto">
                    {uploading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
                    ) : (
                      `Import ${uploadPreview.length} Leads`
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs md:text-sm">
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden xs:inline">Add Lead</span>
                  <span className="xs:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base md:text-lg">Add New Lead</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 grid-cols-1 sm:grid-cols-2">
                  {[
                    { label: "Name *",    key: "name"    },
                    { label: "Email *",   key: "email"   },
                    { label: "Number",    key: "phone"   },
                    { label: "Company",   key: "company" },
                    { label: "Address",   key: "address" },
                    { label: "Value (₹)", key: "value"   },
                  ].map(f => (
                    <div key={f.key} className="grid gap-1.5">
                      <Label className="text-xs md:text-sm">{f.label}</Label>
                      <Input 
                        value={(form as any)[f.key]} 
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })} 
                        className="text-sm h-9"
                      />
                    </div>
                  ))}
                  <div className="grid gap-1.5">
                    <Label className="text-xs md:text-sm">Lead Type</Label>
                    <Select value={form.lead_type} onValueChange={v => setForm({ ...form, lead_type: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs md:text-sm">Budget</Label>
                    <Select value={form.budget} onValueChange={v => setForm({ ...form, budget: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs md:text-sm">Temperature</Label>
                    <Select value={form.temperature} onValueChange={v => setForm({ ...form, temperature: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {LEAD_TEMPERATURE.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs md:text-sm">Stage</Label>
                    <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v, sub_stage: "" })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs md:text-sm">Sub Stage</Label>
                    <Select value={form.sub_stage || "none"} onValueChange={v => setForm({ ...form, sub_stage: v === "none" ? "" : v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {getSubStagesForStage(form.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs md:text-sm">Source</Label>
                    <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Website","Referral","LinkedIn","Cold Call","Trade Show","Excel Import","WhatsApp","Facebook Ads","Google Ads"].map(s =>
                          <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label className="text-xs md:text-sm">Remark</Label>
                    <Textarea 
                      value={form.remark} 
                      onChange={e => setForm({ ...form, remark: e.target.value })} 
                      placeholder="Add remarks or schedule calls..." 
                      className="text-sm"
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label className="text-xs md:text-sm">CX Comment</Label>
                    <Textarea 
                      value={form.cx_comment} 
                      onChange={e => setForm({ ...form, cx_comment: e.target.value })} 
                      placeholder="Customer interaction notes..." 
                      className="text-sm"
                    />
                  </div>
                  <Button onClick={handleAddLead} className="sm:col-span-2 w-full">Add Lead</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <StatsCards stats={stats} onFilterByTemperature={handleFilterByTemperature} />

        {/* Employee View Toggle (Mobile) */}
        {canAssign && typedProfiles.length > 0 && (
          <Card className="block lg:hidden">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setEmpModalOpen(true)}
                >
                  <Users className="w-3 h-3 mr-1" />
                  View Employee Leads
                </Button>
                <span className="text-xs text-muted-foreground">
                  {leads.filter(l => l.assigned_to === user?.id).length} assigned to you
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Filter Section (Desktop) */}
        {canAssign && typedProfiles.length > 0 && (
          <div className="hidden lg:block">
            <EmployeeFilterSection
              profiles={typedProfiles}
              leads={leads}
              onSelectEmployee={setEmployeeFilter}
              selectedEmployee={employeeFilter}
              onSelectStage={(stage) => setFilterStage(stage || "all")}
              selectedStage={filterStage === "all" ? null : filterStage}
              onSelectStatus={setStatusFilter}
              selectedStatus={statusFilter}
              temperatureFilter={temperatureFilter}
              onTemperatureFilterChange={setTemperatureFilter}
            />
          </div>
        )}

        {/* Mobile Filters Toggle */}
        <div className="block lg:hidden">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <Filter className="w-3 h-3 mr-1" />
            {mobileFiltersOpen ? "Hide Filters" : "Show Filters"}
            <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Mobile Filters */}
        {mobileFiltersOpen && (
          <Card className="block lg:hidden">
            <CardContent className="p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 text-sm h-8"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Select value={filterAssignment} onValueChange={setFilterAssignment}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Assigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="mine">Mine</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterTemperature} onValueChange={setFilterTemperature}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Temp" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {LEAD_TEMPERATURE.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={filterStage === "all" ? "all" : filterStage} onValueChange={v => setFilterStage(v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {LEAD_STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterLeadType} onValueChange={setFilterLeadType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs flex-1" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs flex-1" />
              </div>

              <Button variant="outline" size="sm" onClick={clearFilters} className="w-full text-xs">
                <X className="w-3 h-3 mr-1" /> Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stage Filter - Horizontal Scroll */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Flag className="w-3 h-3 md:w-4 md:h-4" />
              Stages
            </p>
            <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {LEAD_STAGES.map(s => {
                const count = leads.filter(l => l.stage === s.value).length;
                const active = filterStage === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setFilterStage(active ? "all" : s.value)}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg whitespace-nowrap transition-all text-xs md:text-sm"
                    style={{
                      border: `2px solid ${active ? s.color : "#e2e8f0"}`,
                      background: active ? s.bg : "white",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span className="text-sm md:text-base">{s.icon}</span>
                    <span className="hidden xs:inline" style={{ color: active ? s.color : "#374151" }}>{s.label}</span>
                    <span className="px-1.5 py-0 rounded-full text-[10px] md:text-xs font-bold text-white"
                      style={{ background: s.color }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-xs md:text-sm font-medium">
                  {filtered.length} <span className="text-muted-foreground font-normal">leads</span>
                  {filtered.length !== leads.length && (
                    <span className="text-muted-foreground text-[10px] md:text-xs ml-1">
                      (filtered from {leads.length})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="w-3 h-3" />
                    <span className="hidden xs:inline ml-1">Table</span>
                  </Button>
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setViewMode("cards")}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span className="hidden xs:inline ml-1">Cards</span>
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} className="hidden md:flex text-xs">
                  <Download className="mr-1 h-3 w-3" />Export
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Users className="w-8 h-8 md:w-12 md:h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm md:text-base text-muted-foreground">No leads found</p>
                <p className="text-xs text-muted-foreground">Add your first lead or import from Excel</p>
              </div>
            ) : (
              <>
                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 rounded-lg border bg-primary/5 mb-3">
                    <Badge variant="default" className="text-xs">
                      <CheckSquare className="w-3 h-3 mr-1" />
                      {selectedIds.size} selected
                    </Badge>
                    <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {typedProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.display_name || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleBulkAssign} className="text-xs h-8">
                      <UserCheck className="mr-1 h-3 w-3" />Assign
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-xs h-8">
                      Clear
                    </Button>
                  </div>
                )}

                {/* Table View */}
                {viewMode === "table" ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs md:text-sm">
                          <TableHead className="w-8 p-1 md:p-2">
                            <Checkbox 
                              checked={filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))} 
                              onCheckedChange={() => {
                                const all = filtered.every(l => selectedIds.has(l.id));
                                setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  filtered.forEach(l => all ? next.delete(l.id) : next.add(l.id));
                                  return next;
                                });
                              }}
                              className="data-[state=checked]:bg-primary"
                            />
                          </TableHead>
                          <TableHead className="p-1 md:p-2">Name</TableHead>
                          <TableHead className="p-1 md:p-2 hidden sm:table-cell">Company</TableHead>
                          <TableHead className="p-1 md:p-2 hidden md:table-cell">Phone</TableHead>
                          <TableHead className="p-1 md:p-2 hidden lg:table-cell">Stage</TableHead>
                          <TableHead className="p-1 md:p-2 hidden xl:table-cell">Temp</TableHead>
                          <TableHead className="p-1 md:p-2 hidden 2xl:table-cell">Assigned</TableHead>
                          <TableHead className="p-1 md:p-2 text-center">Score</TableHead>
                          <TableHead className="p-1 md:p-2 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentItems.map(lead => {
                          const score = getLeadScore(lead);
                          return (
                            <TableRow key={lead.id} className="text-xs md:text-sm">
                              <TableCell className="p-1 md:p-2">
                                <Checkbox 
                                  checked={selectedIds.has(lead.id)} 
                                  onCheckedChange={() => toggleSelect(lead.id)}
                                />
                              </TableCell>
                              <TableCell className="p-1 md:p-2">
                                <div className="flex items-center gap-1 md:gap-2">
                                  <span className="font-medium truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]">
                                    {lead.name}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 md:h-7 md:w-7" 
                                    onClick={() => openLeadDetail(lead)}
                                  >
                                    <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="p-1 md:p-2 hidden sm:table-cell truncate max-w-[100px]">
                                {lead.company || "-"}
                              </TableCell>
                              <TableCell className="p-1 md:p-2 hidden md:table-cell">
                                {lead.phone ? (
                                  <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                                    {lead.phone}
                                  </a>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="p-1 md:p-2 hidden lg:table-cell">
                                <StagePill stage={lead.stage} subStage={lead.sub_stage} />
                              </TableCell>
                              <TableCell className="p-1 md:p-2 hidden xl:table-cell">
                                <TemperatureBadge temperature={lead.temperature} />
                              </TableCell>
                              <TableCell className="p-1 md:p-2 hidden 2xl:table-cell">
                                <div className="flex items-center gap-1">
                                  {lead.assigned_to && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                                      style={{ background: avatarColor(getProfileName(lead.assigned_to)) }}>
                                      {getInitials(getProfileName(lead.assigned_to))}
                                    </div>
                                  )}
                                  <span className="text-[10px] truncate max-w-[60px]">
                                    {getProfileName(lead.assigned_to)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="p-1 md:p-2 text-center">
                                <ScoreBadge score={score} />
                              </TableCell>
                              <TableCell className="p-1 md:p-2 text-right">
                                <div className="flex items-center justify-end gap-0.5 md:gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7" onClick={() => setEditLead(lead)}>
                                    <Edit className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                  </Button>
                                  {lead.stage !== "lost" && lead.stage !== "converted" && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7 text-red-600" onClick={() => setLostLeadDialog(lead)}>
                                      <Flag className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7 text-destructive" onClick={() => handleDelete(lead.id)}>
                                    <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  /* Card View (Mobile) */
                  <div className="space-y-2 md:hidden">
                    {currentItems.map(lead => (
                      <MobileLeadCard
                        key={lead.id}
                        lead={lead}
                        onView={openLeadDetail}
                        onEdit={setEditLead}
                        onLost={setLostLeadDialog}
                        onDelete={handleDelete}
                        onSign={setLeegalitySignDialog}
                        getProfileName={getProfileName}
                        typedProfiles={typedProfiles}
                        assignLead={assignLead}
                        selectedIds={selectedIds}
                        toggleSelect={toggleSelect}
                        leegalityLoading={leegalityLoading}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                    <p className="text-[10px] md:text-xs text-muted-foreground text-center sm:text-left">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-2 md:px-3"
                      >
                        <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <span className="text-xs font-medium">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2 md:px-3"
                      >
                        <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <EmployeeLeadCountModal 
          leads={leads} 
          profiles={typedProfiles} 
          open={empModalOpen} 
          onClose={() => setEmpModalOpen(false)} 
          onFilterByEmployee={(userId) => { 
            setFilterEmployee(userId); 
            setFilterAssignment("all"); 
            setMobileFiltersOpen(false);
          }} 
        />

        {/* Lead Detail Dialog */}
        <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center justify-between gap-2 text-base md:text-lg">
                <span>Lead Details</span>
                <div className="flex items-center gap-2">
                  <TemperatureBadge temperature={detailLead?.temperature} />
                  <ScoreBadge score={detailLead ? getLeadScore(detailLead) : 0} />
                </div>
              </DialogTitle>
            </DialogHeader>
            {detailLead && (
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0"
                      style={{ background: avatarColor(detailLead.name) }}>
                      {getInitials(detailLead.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm md:text-base">{detailLead.name}</h3>
                      {detailLead.company && <p className="text-xs text-muted-foreground">{detailLead.company}</p>}
                    </div>
                  </div>
                </div>

                <Progress value={getLeadScore(detailLead)} className="h-1.5" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-[10px]">Email</p><p className="font-medium break-all text-xs sm:text-sm">{detailLead.email || "-"}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Phone</p><p className="font-medium text-xs sm:text-sm">{detailLead.phone || "-"}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Company</p><p className="font-medium text-xs sm:text-sm">{detailLead.company || "-"}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Address</p><p className="font-medium text-xs sm:text-sm">{detailLead.address || "-"}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Lead Type</p><p className="font-medium text-xs sm:text-sm">{detailLead.lead_type || "-"}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Budget</p><p className="font-medium text-xs sm:text-sm">{detailLead.budget || "-"}</p></div>
                  
                  <div className="grid gap-1">
                    <p className="text-muted-foreground text-[10px] flex items-center gap-1">Temperature</p>
                    <Select value={detailLead.temperature || "warm"} onValueChange={(v) => handleTemperatureUpdate(detailLead.id, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_TEMPERATURE.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-1">
                    <p className="text-muted-foreground text-[10px]">Stage</p>
                    <Select value={detailLead.stage || "ringing"} onValueChange={async (v) => { 
                      await handleUpdateStageFromDetail(detailLead.id, v, detailLead.sub_stage || ""); 
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-muted-foreground text-[10px]">Sub Stage</p>
                    <Select value={detailLead.sub_stage || "none"} onValueChange={async (v) => { 
                      const val = v === "none" ? "" : v; 
                      await handleUpdateStageFromDetail(detailLead.id, detailLead.stage || "ringing", val); 
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {getSubStagesForStage(detailLead.stage).map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><p className="text-muted-foreground text-[10px]">Source</p><p className="font-medium text-xs sm:text-sm">{detailLead.source || "-"}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Status</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: detailLead.stage === "lost" ? "#fef2f2" : "#f0fdf4",
                        color: detailLead.stage === "lost" ? "#dc2626" : "#16a34a",
                        border: `1px solid ${detailLead.stage === "lost" ? "#fecaca" : "#bbf7d0"}`,
                      }}>
                      {formatStageLabel(detailLead.status)}
                    </span>
                  </div>
                  <div><p className="text-muted-foreground text-[10px]">Value</p><p className="font-medium text-xs sm:text-sm">{formatCurrency(detailLead.value || 0)}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Business Status</p><p className="font-medium text-xs sm:text-sm">{detailLead.business_status || "Active"}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Assigned To</p><p className="font-medium text-xs sm:text-sm">{getProfileName(detailLead.assigned_to)}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Assign Date</p><p className="font-medium text-xs sm:text-sm">{detailLead.assign_date ? format(new Date(detailLead.assign_date), "dd MMM yyyy") : "-"}</p></div>
                  <div><p className="text-muted-foreground text-[10px]">Created At</p><p className="font-medium text-xs sm:text-sm">{format(new Date(detailLead.created_at), "dd MMM yyyy")}</p></div>
                  {detailLead.lost_reason && (
                    <div className="col-span-2"><p className="text-muted-foreground text-[10px]">Lost Reason</p><p className="font-medium text-red-600 text-xs sm:text-sm">{formatStageLabel(detailLead.lost_reason)}</p></div>
                  )}
                  {detailLead.leegality_status && (
                    <div className="col-span-2"><p className="text-muted-foreground text-[10px]">eSign Status</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: detailLead.leegality_status === "completed" ? "#ecfdf5" : "#fef3c7",
                          color: detailLead.leegality_status === "completed" ? "#16a34a" : "#d97706",
                          border: `1px solid ${detailLead.leegality_status === "completed" ? "#bbf7d0" : "#fde68a"}`,
                        }}>
                        {detailLead.leegality_status === "completed" ? "✓ Signed" : detailLead.leegality_status === "pending" ? "⏳ Pending" : "Not Started"}
                      </span>
                    </div>
                  )}
                  {agreementData[detailLead.id] && (
                    <div className="col-span-2 p-3 rounded-lg border bg-muted/20">
                      <p className="text-muted-foreground text-[10px] font-semibold mb-2">Agreement Status</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={
                          agreementData[detailLead.id].status === 'signed' ? 'bg-green-100 text-green-800' : 
                          agreementData[detailLead.id].status === 'sent' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }>
                          {agreementData[detailLead.id].status === 'signed' && '✓ Signed'}
                          {agreementData[detailLead.id].status === 'sent' && '📤 Sent'}
                          {agreementData[detailLead.id].status === 'not_sent' && 'Not Sent'}
                          {agreementData[detailLead.id].status === 'rejected' && '❌ Rejected'}
                        </Badge>
                        {agreementData[detailLead.id].signed_date && (
                          <span className="text-[10px] text-muted-foreground">
                            Signed: {format(new Date(agreementData[detailLead.id].signed_date), "dd MMM yyyy, hh:mm a")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="col-span-2"><p className="text-muted-foreground text-[10px]">CX Comment</p><p className="font-medium text-xs sm:text-sm whitespace-pre-wrap">{detailLead.cx_comment || "-"}</p></div>
                  <div className="col-span-2"><p className="text-muted-foreground text-[10px]">Remark</p><p className="font-medium text-xs sm:text-sm whitespace-pre-wrap">{detailLead.remark || "-"}</p></div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {detailLead.phone && (
                    <Button size="sm" variant="outline" asChild className="text-xs">
                      <a href={`tel:${detailLead.phone}`} onClick={() => logActivity(detailLead.id, "called", detailLead.phone || undefined)}>
                        <Phone className="mr-1 h-3 w-3" />Call
                      </a>
                    </Button>
                  )}
                  {detailLead.email && (
                    <Button size="sm" variant="outline" asChild className="text-xs">
                      <a href={`mailto:${detailLead.email}`} onClick={() => logActivity(detailLead.id, "emailed", detailLead.email || undefined)}>
                        <Mail className="mr-1 h-3 w-3" />Email
                      </a>
                    </Button>
                  )}
                  {detailLead.phone && (
                    <Button size="sm" variant="outline" asChild className="text-xs">
                      <a href={`https://wa.me/${detailLead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={() => logActivity(detailLead.id, "whatsapp", detailLead.phone || undefined)}>
                        <MessageCircle className="mr-1 h-3 w-3" />WhatsApp
                      </a>
                    </Button>
                  )}
                  {detailLead.stage !== "lost" && detailLead.stage !== "converted" && (
                    <Button size="sm" variant="destructive" onClick={() => setLostLeadDialog(detailLead)} className="text-xs">
                      <Flag className="mr-1 h-3 w-3" />Lost
                    </Button>
                  )}
                  {detailLead.stage === "converted" && (
                    <>
                      <Button size="sm" onClick={() => handleSendAgreement(detailLead)} disabled={sendingAgreement === detailLead.id} className="bg-blue-600 hover:bg-blue-700 text-xs">
                        {sendingAgreement === detailLead.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileSignature className="mr-1 h-3 w-3" />}
                        Send Agreement
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => setLeegalitySignDialog(detailLead)} disabled={leegalityLoading === detailLead.id}>
                        {leegalityLoading === detailLead.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileSignature className="mr-1 h-3 w-3" />}
                        eSign
                      </Button>
                    </>
                  )}
                </div>

                <LeadCommentsPanel leadId={detailLead.id} leadStage={detailLead.stage} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editLead} onOpenChange={() => setEditLead(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader><DialogTitle className="text-base md:text-lg">Edit Lead</DialogTitle></DialogHeader>
            {editLead && (
              <div className="grid gap-4 py-4 grid-cols-1 sm:grid-cols-2">
                {[{ label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Number", key: "phone" }, { label: "Company", key: "company" }, { label: "Address", key: "address" }].map(f => (
                  <div key={f.key} className="grid gap-1.5">
                    <Label className="text-xs md:text-sm">{f.label}</Label>
                    <Input 
                      value={(editLead as any)[f.key] || ""} 
                      onChange={e => setEditLead({ ...editLead, [f.key]: e.target.value } as DbLead)} 
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Value (₹)</Label>
                  <Input 
                    type="number" 
                    value={editLead.value || 0} 
                    onChange={e => setEditLead({ ...editLead, value: Number(e.target.value) })} 
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Lead Type</Label>
                  <Select value={editLead.lead_type || ""} onValueChange={v => setEditLead({ ...editLead, lead_type: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Budget</Label>
                  <Select value={editLead.budget || ""} onValueChange={v => setEditLead({ ...editLead, budget: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Temperature</Label>
                  <Select value={editLead.temperature || "warm"} onValueChange={v => setEditLead({ ...editLead, temperature: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_TEMPERATURE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Stage</Label>
                  <Select value={editLead.stage || DEFAULT_LEAD_STAGE} onValueChange={v => setEditLead({ ...editLead, stage: v, sub_stage: "" })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Sub Stage</Label>
                  <Select value={editLead.sub_stage || "none"} onValueChange={v => setEditLead({ ...editLead, sub_stage: v === "none" ? "" : v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- None --</SelectItem>
                      {getSubStagesForStage(editLead.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Status</Label>
                  <Select value={editLead.status} onValueChange={v => setEditLead({ ...editLead, status: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Business Status</Label>
                  <Select value={editLead.business_status || "active"} onValueChange={v => setEditLead({ ...editLead, business_status: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{["active", "no-go", "done"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs md:text-sm">Source</Label>
                  <Select value={editLead.source || "Website"} onValueChange={v => setEditLead({ ...editLead, source: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-xs md:text-sm">Remark</Label>
                  <Textarea value={editLead.remark || ""} onChange={e => setEditLead({ ...editLead, remark: e.target.value })} className="text-sm" />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label className="text-xs md:text-sm">CX Comment</Label>
                  <Textarea value={editLead.cx_comment || ""} onChange={e => setEditLead({ ...editLead, cx_comment: e.target.value })} className="text-sm" />
                </div>
                <Button onClick={handleUpdate} className="sm:col-span-2 w-full">Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
