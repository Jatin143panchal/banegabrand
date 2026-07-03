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
  AlertTriangle, RefreshCw, CheckCircle2, ArrowRight, Radio, BarChart3,
  PieChart, PieChartIcon, ChartColumn
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadCommentsPanel from "@/components/LeadCommentsPanel";
import { useBulkAssignLeads } from "@/hooks/useLeadComments";
import { isToday, subDays, format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

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
    <div className="flex items-center gap-1">
      <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold" style={{ borderColor: color, color }}>
        {score}
      </div>
    </div>
  );
}

function TemperatureBadge({ temperature }: { temperature: string | null | undefined }) {
  const config = getTemperatureConfig(temperature);
  if (!config) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ color: config.color, background: config.bg, borderColor: `${config.color}30` }}>
      {config.label}
    </span>
  );
}

function StagePill({ stage, subStage }: { stage: string | null; subStage: string | null }) {
  const cfg = getStageConfig(stage);
  if (!cfg) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
        {cfg.label}
      </span>
      {subStage && (
        <span className="text-[10px] text-muted-foreground">{formatStageLabel(subStage)}</span>
      )}
    </div>
  );
}

// ── Chart Components ──
function LeadCharts({ leads }: { leads: DbLead[] }) {
  const stageData = useMemo(() => {
    const counts = LEAD_STAGES.map(s => ({
      name: s.label,
      value: leads.filter(l => l.stage === s.value).length,
      color: s.color
    }));
    return counts;
  }, [leads]);

  const temperatureData = useMemo(() => {
    const counts = LEAD_TEMPERATURE.map(t => ({
      name: t.label.replace(/[🔥☀️❄️]/g, '').trim(),
      value: leads.filter(l => l.temperature === t.value).length,
      color: t.color
    }));
    return counts;
  }, [leads]);

  const conversionData = useMemo(() => {
    const converted = leads.filter(l => l.stage === "converted").length;
    const lost = leads.filter(l => l.stage === "lost").length;
    const active = leads.filter(l => l.stage !== "converted" && l.stage !== "lost").length;
    return [
      { name: "Active", value: active, color: "#3b82f6" },
      { name: "Converted", value: converted, color: "#10b981" },
      { name: "Lost", value: lost, color: "#ef4444" }
    ];
  }, [leads]);

  const dailyTrend = useMemo(() => {
    const now = new Date();
    const days = 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const count = leads.filter(l => {
        const created = new Date(l.created_at);
        return created.toDateString() === d.toDateString();
      }).length;
      data.push({
        date: format(d, "dd MMM"),
        leads: count
      });
    }
    return data;
  }, [leads]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#f59e0b', '#ef4444'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Stage Distribution</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value">
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Temperature</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={temperatureData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {temperatureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Conversion</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={conversionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {conversionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1 lg:col-span-4">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ChartColumn className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Weekly Trend</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Leads() {
  const { user } = useAuth();
  const canAssign = useCanAssignTasks();
  const { data: profiles = [] } = useAllProfiles();
  const logActivity = useLeadActivityLogger();
  
  // ── State ──
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  
  // ── FIXED: Fetch leads function with role-based filtering ──
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Fetching leads for user:", user?.id);
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user?.id)
        .single();
      
      if (profileError) {
        console.error("❌ Profile fetch error:", profileError);
      }
      
      const isAdmin = profile?.role === "admin";
      console.log("👑 Is Admin:", isAdmin);
      
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!isAdmin && user?.id) {
        console.log("🔍 Filtering by assigned_to:", user.id);
        query = query.eq("assigned_to", user.id);
      } else {
        console.log("👑 Admin - fetching all leads");
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }
      
      console.log("✅ Fetched leads:", data?.length || 0);
      setLeads(data as DbLead[] || []);
      return data;
    } catch (error) {
      console.error("❌ Error fetching leads:", error);
      toast.error("Failed to fetch leads");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);
  
  // ── Initial fetch ──
  useEffect(() => {
    if (isInitialFetch) {
      fetchLeads();
      setIsInitialFetch(false);
    }
  }, [fetchLeads, isInitialFetch]);
  
  // ── FIXED: Real-time subscription with role-based filtering ──
  useEffect(() => {
    let isMounted = true;
    let isAdmin = false;
    
    const checkRole = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        isAdmin = data?.role === "admin";
        console.log("👑 Real-time - Is Admin:", isAdmin);
      } catch (error) {
        console.error("Error checking role:", error);
      }
    };
    
    checkRole();
    
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
          
          if (!isAdmin && user?.id) {
            const lead = payload.new as DbLead;
            if (lead && lead.assigned_to !== user.id) {
              console.log("⏭️ Ignoring update for other employee's lead");
              return;
            }
          }
          
          if (payload.eventType === 'INSERT') {
            console.log("📥 New lead added:", payload.new);
            setLeads(prev => [payload.new as DbLead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            console.log("🔄 Lead updated:", payload.new);
            setLeads(prev => prev.map(lead => 
              lead.id === payload.new.id ? payload.new as DbLead : lead
            ));
          } else if (payload.eventType === 'DELETE') {
            console.log("🗑️ Lead deleted:", payload.old);
            setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterStage, setFilterStage]       = useState("all");
  const [filterAssignment, setFilterAssignment] = useState("all");
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

  // ── Import duplicate-resolution queue ──
  const [duplicateQueue, setDuplicateQueue] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<{ imported: number; duplicates: number } | null>(null);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);

  // ── Live total-count ──
  const [liveTotalCount, setLiveTotalCount] = useState<number | null>(null);
  const [liveCountPulsing, setLiveCountPulsing] = useState(false);

  const fetchLiveTotalCount = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user?.id)
        .single();
      const isAdmin = profile?.role === "admin";

      let query = supabase.from("leads").select("*", { count: "exact", head: true });
      if (!isAdmin && user?.id) {
        query = query.eq("assigned_to", user.id);
      }
      const { count, error } = await query;
      if (error) throw error;
      setLiveTotalCount(count ?? 0);
      setLiveCountPulsing(true);
      setTimeout(() => setLiveCountPulsing(false), 700);
    } catch (error) {
      console.error("Live count fetch error:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLiveTotalCount();
    const interval = setInterval(fetchLiveTotalCount, 20000);
    return () => clearInterval(interval);
  }, [fetchLiveTotalCount]);

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
      const matchAssignment =
        filterAssignment === "all" ||
        (filterAssignment === "mine"       && l.assigned_to === user?.id) ||
        (filterAssignment === "unassigned" && !l.assigned_to);
      const matchEmployee =
        employeeFilter === null ||
        (employeeFilter === "unassigned" && !l.assigned_to) ||
        l.assigned_to === employeeFilter;
      const matchPreset =
        filterPreset === "all" ||
        (filterPreset === "today"    && isToday(new Date(l.created_at))) ||
        (filterPreset === "fresh"    && (l.status === "new" || l.stage === "ringing") && new Date(l.created_at) >= subDays(new Date(), 3)) ||
        (filterPreset === "followup" && l.next_call_date && new Date(l.next_call_date) <= new Date());
      const createdAt = new Date(l.created_at);
      const matchDateFrom = !dateFrom || createdAt >= new Date(dateFrom);
      const matchDateTo   = !dateTo   || createdAt <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchStatus && matchStage && matchLeadType && matchBudget &&
             matchAssignment && matchEmployee && matchPreset && 
             matchDateFrom && matchDateTo && matchTemperature;
    });
  }, [leads, search, filterStatus, filterStage, filterAssignment, 
      filterLeadType, filterBudget, filterTemperature, dateFrom, dateTo, 
      filterPreset, employeeFilter, user]);

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
    setDuplicateQueue([]);
    setImportSummary(null);
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
    const newDuplicateQueue: any[] = [];

    for (let i = 0; i < uploadPreview.length; i++) {
      const lead = uploadPreview[i];
      try {
        const duplicate = await checkForDuplicate(lead);

        if (duplicate && duplicate.is_duplicate) {
          newDuplicateQueue.push({
            key: `${lead.email || lead.phone || lead.name}-${i}`,
            importData: lead,
            existing_lead_id: duplicate.existing_lead_id,
            existing_lead_name: duplicate.existing_lead_name,
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
    if (fileRef.current) fileRef.current.value = "";

    await fetchLeads();
    await fetchLiveTotalCount();

    setImportSummary({ imported: success, duplicates: newDuplicateQueue.length });
    setDuplicateQueue(newDuplicateQueue);

    if (newDuplicateQueue.length > 0) {
      if (success > 0) {
        toast.warning(
          `${success} leads imported. ${newDuplicateQueue.length} duplicate leads found — review them below.`,
          { duration: 5000 }
        );
      } else {
        toast.error(`All ${newDuplicateQueue.length} leads were duplicates. Review them below.`);
      }
    } else {
      toast.success(`${success} leads imported successfully!`);
      setUploadOpen(false);
    }
  }, [uploadPreview, checkForDuplicate, fetchLeads, fetchLiveTotalCount]);

  // ── Resolve duplicate ──
  const handleResolveDuplicateUpdate = useCallback(async (item: any) => {
    setResolvingKey(item.key);
    try {
      const d = item.importData;
      const { error } = await supabase
        .from("leads")
        .update({
          name: d.name || undefined,
          email: d.email || undefined,
          phone: d.phone || undefined,
          company: d.company || undefined,
          source: d.source || undefined,
          value: d.value || undefined,
          lead_type: d.lead_type || undefined,
          address: d.address || undefined,
          cx_comment: d.cx_comment || undefined,
          budget: d.budget || undefined,
          stage: d.stage || undefined,
          sub_stage: d.sub_stage || undefined,
          remark: d.remark || undefined,
          temperature: d.temperature || undefined,
        })
        .eq("id", item.existing_lead_id);

      if (error) throw error;

      logActivity(item.existing_lead_id, "updated", `Merged from Excel import (duplicate resolved)`);
      toast.success(`${item.existing_lead_name} updated with imported data`);
      setDuplicateQueue(prev => prev.filter(q => q.key !== item.key));
      await fetchLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to update existing lead");
    } finally {
      setResolvingKey(null);
    }
  }, [fetchLeads, logActivity]);

  const handleDiscardDuplicate = useCallback((item: any) => {
    setDuplicateQueue(prev => prev.filter(q => q.key !== item.key));
    toast.info(`Skipped duplicate for ${item.existing_lead_name}`);
  }, []);

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
      await fetchLiveTotalCount();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lead");
    }
  }, [fetchLeads, fetchLiveTotalCount]);

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
    setFilterAssignment("all");
    setFilterLeadType("all"); setFilterBudget("all");
    setFilterTemperature("all");
    setDateFrom(""); setDateTo(""); setFilterPreset("all");
    setEmployeeFilter(null);
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

  // ── Debug ──
  useEffect(() => {
    console.log("📊 Leads in state:", leads.length);
    console.log("📊 Filtered leads:", filtered.length);
  }, [leads, filtered]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const typedProfiles = profiles as { user_id: string; display_name: string | null }[];

  return (
    <div className="space-y-5 p-4 md:p-6">
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

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm">Manage and track all your leads in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />Export Excel
          </Button>
          <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) { setUploadPreview([]); setDuplicateQueue([]); setImportSummary(null); if (fileRef.current) fileRef.current.value = ""; } }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none"><Upload className="mr-2 h-4 w-4" />Import Excel</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Import Leads from Excel/CSV
                  </span>
                  <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
                    <Download className="mr-2 h-3 w-3" />
                    Download Template
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Upload Excel (.xlsx, .xls) or CSV file</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Required columns: Name, Email, Phone, Company, Source, Value, Lead Type, Budget, Stage, Sub Stage, Remark, Temperature
                  </p>
                  <p className="text-xs text-amber-600 mb-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Duplicate leads will be tagged for review instead of being lost
                  </p>
                  <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="max-w-xs mx-auto" />
                </div>

                {uploadPreview.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        {uploadPreview.length} leads found in file
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => { setUploadPreview([]); if (fileRef.current) fileRef.current.value = ""; }}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="max-h-60 overflow-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Company</TableHead><TableHead>Temperature</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadPreview.slice(0, 10).map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{r.name}</TableCell>
                              <TableCell className="text-sm">{r.email}</TableCell>
                              <TableCell className="text-sm">{r.phone}</TableCell>
                              <TableCell className="text-sm">{r.company}</TableCell>
                              <TableCell className="text-sm">{r.temperature || "Warm"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {uploadPreview.length > 10 && <p className="text-xs text-muted-foreground text-center py-2">...and {uploadPreview.length - 10} more</p>}
                    </div>
                  </div>
                )}

                {importSummary && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                      <CheckCircle2 className="h-4 w-4" /> {importSummary.imported} imported
                    </span>
                    {importSummary.duplicates > 0 && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                        <AlertTriangle className="h-4 w-4" /> {importSummary.duplicates} duplicates need review
                      </span>
                    )}
                  </div>
                )}

                {duplicateQueue.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60">
                    <div className="flex items-center justify-between p-3 border-b border-amber-200 flex-wrap gap-2">
                      <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Duplicate Leads ({duplicateQueue.length})
                      </p>
                      <p className="text-xs text-amber-700">Update the existing lead with the new data, or skip it</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-amber-100">
                      {duplicateQueue.map(item => (
                        <div key={item.key} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase tracking-wide">
                                Duplicate
                              </Badge>
                              <span className="text-sm font-semibold truncate">{item.importData.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {item.importData.email || item.importData.phone || "No contact info"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <ArrowRight className="h-3 w-3" /> matches existing lead:
                              <span className="font-medium text-foreground">{item.existing_lead_name}</span>
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700"
                              disabled={resolvingKey === item.key}
                              onClick={() => handleResolveDuplicateUpdate(item)}
                            >
                              {resolvingKey === item.key ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Update Existing
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDiscardDuplicate(item)}>
                              <X className="mr-1 h-3.5 w-3.5" />Skip
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                {uploadPreview.length > 0 && (
                  <Button onClick={handleBulkImport} disabled={uploading || uploadPreview.length === 0}>
                    {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : `Import ${uploadPreview.length} Leads`}
                  </Button>
                )}
                {uploadPreview.length === 0 && (importSummary || duplicateQueue.length > 0) && (
                  <Button variant="outline" onClick={() => { setUploadOpen(false); }}>Done</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-none"><Plus className="mr-2 h-4 w-4" />+ Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                {[
                  { label: "Name *",    key: "name"    },
                  { label: "Email *",   key: "email"   },
                  { label: "Number",    key: "phone"   },
                  { label: "Company",   key: "company" },
                  { label: "Address",   key: "address" },
                  { label: "Value (₹)", key: "value"   },
                ].map(f => (
                  <div key={f.key} className="grid gap-2">
                    <Label>{f.label}</Label>
                    <Input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div className="grid gap-2">
                  <Label>Lead Type</Label>
                  <Select value={form.lead_type} onValueChange={v => setForm({ ...form, lead_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Budget</Label>
                  <Select value={form.budget} onValueChange={v => setForm({ ...form, budget: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Lead Temperature</Label>
                  <Select value={form.temperature} onValueChange={v => setForm({ ...form, temperature: v })}>
                    <SelectTrigger><SelectValue placeholder="Select temperature" /></SelectTrigger>
                    <SelectContent>
                      {LEAD_TEMPERATURE.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Brand Stage</Label>
                  <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v, sub_stage: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Sub Stage</Label>
                  <Select value={form.sub_stage || "none"} onValueChange={v => setForm({ ...form, sub_stage: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select sub stage" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- None --</SelectItem>
                      {getSubStagesForStage(form.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Website","Referral","LinkedIn","Cold Call","Trade Show","Excel Import","WhatsApp","Facebook Ads","Google Ads"].map(s =>
                        <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Remark (for call scheduling, e.g., "call at 2:30 PM")</Label>
                  <Textarea 
                    value={form.remark} 
                    onChange={e => setForm({ ...form, remark: e.target.value })} 
                    placeholder="Add remarks or schedule calls (e.g., call at 2:30 PM)..." 
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>CX Comment</Label>
                  <Textarea value={form.cx_comment} onChange={e => setForm({ ...form, cx_comment: e.target.value })} placeholder="Customer interaction notes..." />
                </div>
                <Button onClick={handleAddLead} className="mt-2 sm:col-span-2">Add Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="col-span-2 sm:col-span-1 lg:col-span-1 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Users style={{ color: "#3b82f6", width: 24, height: 24 }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-2xl font-bold leading-none">{liveTotalCount ?? stats.totalLeads}</p>
                  <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${liveCountPulsing ? "animate-ping" : "animate-pulse"}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Radio className="h-3 w-3" /> Total Leads (Live)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Flame style={{ color: "#ef4444", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: "#ef4444" }}>{stats.hotCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Hot Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Sun style={{ color: "#f97316", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: "#f97316" }}>{stats.warmCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Warm Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Snowflake style={{ color: "#3b82f6", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: "#3b82f6" }}>{stats.coldCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Cold Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp style={{ color: "#10b981", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{stats.convertedCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Converted</p>
                <p className="text-[11px] text-muted-foreground/70">
                  {stats.totalLeads > 0 ? ((stats.convertedCount / stats.totalLeads) * 100).toFixed(1) : 0}% rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Section ── */}
      <LeadCharts leads={leads} />

      {/* ── Employee Filter Section ── */}
      {canAssign && typedProfiles.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Leads
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Filter leads by employee</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  Total: {leads.length}
                </Badge>
                {employeeFilter && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEmployeeFilter(null)}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear Filter
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div 
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  employeeFilter === "unassigned" 
                    ? "border-primary bg-primary/5" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setEmployeeFilter(employeeFilter === "unassigned" ? null : "unassigned")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                      ?
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Unassigned</p>
                      <p className="text-xs text-muted-foreground">{leads.filter(l => !l.assigned_to).length} leads</p>
                    </div>
                  </div>
                  <Badge variant={employeeFilter === "unassigned" ? "default" : "outline"}>
                    {leads.filter(l => !l.assigned_to).length}
                  </Badge>
                </div>
              </div>
              
              {typedProfiles.map(emp => {
                const color = avatarColor(emp.display_name || "?");
                const empLeads = leads.filter(l => l.assigned_to === emp.user_id);
                const isActive = employeeFilter === emp.user_id;
                return (
                  <div 
                    key={emp.user_id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isActive 
                        ? "border-primary bg-primary/5" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setEmployeeFilter(isActive ? null : emp.user_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: color }}
                        >
                          {getInitials(emp.display_name || "?")}
                        </div>
                        <div>
                          <p className="font-semibold text-sm truncate max-w-[80px]">{emp.display_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {empLeads.filter(l => l.stage === "converted").length} converted
                          </p>
                        </div>
                      </div>
                      <Badge variant={isActive ? "default" : "outline"}>
                        {empLeads.length}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-1 mt-2">
                      {empLeads.filter(l => l.temperature === "hot").length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                          🔥 {empLeads.filter(l => l.temperature === "hot").length}
                        </span>
                      )}
                      {empLeads.filter(l => l.temperature === "warm").length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                          ☀️ {empLeads.filter(l => l.temperature === "warm").length}
                        </span>
                      )}
                      {empLeads.filter(l => l.temperature === "cold").length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          ❄️ {empLeads.filter(l => l.temperature === "cold").length}
                        </span>
                      )}
                    </div>
                    
                    {empLeads.length > 0 && (
                      <div className="mt-2">
                        <Progress 
                          value={(empLeads.filter(l => l.stage === "converted").length / empLeads.length) * 100} 
                          className="h-1" 
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stage Filter ── */}
      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-sm mb-3 text-foreground">Stages</p>
          <div className="flex flex-wrap gap-2">
            {LEAD_STAGES.map(s => {
              const count = leads.filter(l => l.stage === s.value).length;
              const active = filterStage === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setFilterStage(active ? "all" : s.value)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all text-sm"
                  style={{
                    borderColor: active ? s.color : "#e2e8f0",
                    background: active ? s.bg : "white",
                  }}
                >
                  <span>{s.icon}</span>
                  <span style={{ color: active ? s.color : "#374151" }}>{s.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: s.color }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Table ── */}
      <Card className="sticky top-0 z-20 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAssignment} onValueChange={setFilterAssignment}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Assigned To" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="mine">Assigned to Me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTemperature} onValueChange={setFilterTemperature}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Temperature" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Temperatures</SelectItem>
                {LEAD_TEMPERATURE.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLeadType} onValueChange={setFilterLeadType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Lead Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBudget} onValueChange={setFilterBudget}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Budget" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Budgets</SelectItem>
                {BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-sm" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-sm" />
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
            <Select value={filterPreset} onValueChange={setFilterPreset}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Quick Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today's Leads</SelectItem>
                <SelectItem value="fresh">Fresh Leads</SelectItem>
                <SelectItem value="followup">Follow-up Due</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-3 p-3 rounded-lg border bg-primary/5">
              <Badge variant="default"><CheckSquare className="h-3 w-3 mr-1" />{selectedIds.size} selected</Badge>
              <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
                <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>
                  {typedProfiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || "Unknown"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkAssign}>
                <UserCheck className="mr-1 h-4 w-4" />Bulk Assign
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
            <p className="text-sm font-semibold text-foreground">
              Total Leads: <span className="text-primary">{filtered.length}</span>
              {filtered.length !== leads.length && <span className="text-muted-foreground font-normal"> (filtered from {leads.length})</span>}
            </p>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-3 w-3" />Export Excel
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No leads found.</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or add a new lead.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))} onCheckedChange={() => { const all = filtered.every(l => selectedIds.has(l.id)); setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(l => all ? next.delete(l.id) : next.add(l.id)); return next; }); }} /></TableHead>
                      <TableHead>Lead Name</TableHead><TableHead>Company</TableHead><TableHead>Phone</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead><TableHead>Stage / Sub Stage</TableHead>
                      <TableHead>Temperature</TableHead><TableHead>Assigned To</TableHead>
                      <TableHead className="hidden lg:table-cell">Lead Type</TableHead>
                      <TableHead className="hidden lg:table-cell">Budget</TableHead><TableHead>Lead Score</TableHead>
                      <TableHead>Created At</TableHead><TableHead className="hidden xl:table-cell">Assign Date</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map(lead => {
                      const score = getLeadScore(lead);
                      const assignee = getProfileName(lead.assigned_to);
                      const assigneeColor = lead.assigned_to ? avatarColor(assignee) : "#94a3b8";
                      return (
                        <TableRow key={lead.id}>
                          <TableCell><Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                          <TableCell><div className="flex items-center gap-2"><p className="font-semibold text-sm">{lead.name}</p><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openLeadDetail(lead)} title="View Details"><Eye className="h-3 w-3" /></Button></div></TableCell>
                          <TableCell className="text-sm text-foreground">{lead.company || "-"}</TableCell>
                          <TableCell>{lead.phone ? <a href={`tel:${lead.phone}`} className="text-sm text-primary hover:underline">{lead.phone}</a> : <span className="text-sm text-muted-foreground">-</span>}</TableCell>
                          <TableCell className="hidden lg:table-cell">{lead.email ? <a href={`mailto:${lead.email}`} className="text-xs text-muted-foreground hover:underline">{lead.email}</a> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                          <TableCell><StagePill stage={lead.stage} subStage={lead.sub_stage} /></TableCell>
                          <TableCell><TemperatureBadge temperature={lead.temperature} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[140px]">
                              {lead.assigned_to && (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: assigneeColor }}>
                                  {getInitials(assignee)}
                                </div>
                              )}
                              <Select 
                                value={lead.assigned_to || "unassigned"} 
                                onValueChange={(v) => {
                                  assignLead.mutate({ id: lead.id, assigned_to: v });
                                }}
                              >
                                <SelectTrigger className="w-[120px] h-7 text-xs">
                                  <SelectValue placeholder={lead.assigned_to ? "Change" : "Assign..."}>
                                    {lead.assigned_to ? getProfileName(lead.assigned_to) : "Assign..."}
                                  </SelectValue>
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
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{lead.lead_type ? (<span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">{lead.lead_type}</span>) : "-"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-foreground">{lead.budget || "-"}</TableCell>
                          <TableCell><ScoreBadge score={score} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(lead.created_at), "dd MMM yyyy")}</TableCell>
                          <TableCell className="hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">{lead.assign_date ? format(new Date(lead.assign_date), "dd MMM yyyy") : "-"}</TableCell>
                          <TableCell><div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLeadDetail(lead)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditLead(lead)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                            {lead.stage !== "lost" && lead.stage !== "converted" && (<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setLostLeadDialog(lead)} title="Mark as Lost"><Flag className="h-3.5 w-3.5" /></Button>)}
                            {lead.stage === "converted" && (<Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => setLeegalitySignDialog(lead)} title="eSign via Leegality" disabled={leegalityLoading === lead.id}>{leegalityLoading === lead.id ? (<Loader2 className="h-3.5 w-3.5 animate-spin" />) : (<FileSignature className="h-3.5 w-3.5" />)}</Button>)}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(lead.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between mt-4 gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} leads
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <EmployeeLeadCountModal leads={leads} profiles={typedProfiles} open={empModalOpen} onClose={() => setEmpModalOpen(false)} onFilterByEmployee={(userId) => { setFilterAssignment("all"); }} />

      {/* ── Lead Detail Dialog ── */}
      <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>Lead Details</span>
              <div className="flex items-center gap-2">
                <TemperatureBadge temperature={detailLead?.temperature} />
                <ScoreBadge score={detailLead ? getLeadScore(detailLead) : 0} />
              </div>
            </DialogTitle>
          </DialogHeader>
          {detailLead && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base" style={{ background: avatarColor(detailLead.name) }}>{getInitials(detailLead.name)}</div>
                  <div><h3 className="font-bold text-base">{detailLead.name}</h3>{detailLead.company && <p className="text-sm text-muted-foreground">{detailLead.company}</p>}</div>
                </div>
              </div>
              <Progress value={getLeadScore(detailLead)} className="h-2" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium break-all">{detailLead.email || "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{detailLead.phone || "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Company</p><p className="font-medium">{detailLead.company || "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Address</p><p className="font-medium">{detailLead.address || "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Lead Type</p><p className="font-medium">{detailLead.lead_type || "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Budget</p><p className="font-medium">{detailLead.budget || "-"}</p></div>
                
                <div className="grid gap-1">
                  <p className="text-muted-foreground text-xs flex items-center gap-1">
                    <span>Temperature</span>
                    <span className="text-[10px] text-muted-foreground">(click to change)</span>
                  </p>
                  <Select 
                    value={detailLead.temperature || "warm"} 
                    onValueChange={(v) => handleTemperatureUpdate(detailLead.id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select temperature" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_TEMPERATURE.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-2">
                            <span>{t.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              ({t.value === "hot" ? "High Priority" : t.value === "warm" ? "Medium Priority" : "Low Priority"})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-1"><p className="text-muted-foreground text-xs">Brand Stage</p><Select value={detailLead.stage || "ringing"} onValueChange={async (v) => { await handleUpdateStageFromDetail(detailLead.id, v, detailLead.sub_stage || ""); }}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-1"><p className="text-muted-foreground text-xs">Sub Stage</p><Select value={detailLead.sub_stage || "none"} onValueChange={async (v) => { const val = v === "none" ? "" : v; await handleUpdateStageFromDetail(detailLead.id, detailLead.stage || "ringing", val); }}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">-- None --</SelectItem>{getSubStagesForStage(detailLead.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div><p className="text-muted-foreground text-xs">Source</p><p className="font-medium">{detailLead.source || "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><span className="text-xs font-semibold px-2 py-0.5 rounded border" style={{ background: detailLead.stage === "lost" ? "#fef2f2" : "#f0fdf4", color: detailLead.stage === "lost" ? "#dc2626" : "#16a34a", borderColor: detailLead.stage === "lost" ? "#fecaca" : "#bbf7d0" }}>{formatStageLabel(detailLead.status)}</span></div>
                <div><p className="text-muted-foreground text-xs">Value</p><p className="font-medium">{formatCurrency(detailLead.value || 0)}</p></div>
                <div><p className="text-muted-foreground text-xs">Business Status</p><p className="font-medium">{detailLead.business_status || "Active"}</p></div>
                <div><p className="text-muted-foreground text-xs">Assigned To</p><p className="font-medium">{getProfileName(detailLead.assigned_to)}</p></div>
                <div><p className="text-muted-foreground text-xs">Assign Date</p><p className="font-medium">{detailLead.assign_date ? format(new Date(detailLead.assign_date), "dd MMM yyyy") : "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Created At</p><p className="font-medium">{format(new Date(detailLead.created_at), "dd MMM yyyy")}</p></div>
                {detailLead.lost_reason && (<div className="col-span-2"><p className="text-muted-foreground text-xs">Lost Reason</p><p className="font-medium text-red-600">{formatStageLabel(detailLead.lost_reason)}</p></div>)}
                {detailLead.leegality_status && (<div className="col-span-2"><p className="text-muted-foreground text-xs">eSign Status</p><span className="text-xs font-semibold px-2 py-0.5 rounded border" style={{ background: detailLead.leegality_status === "completed" ? "#ecfdf5" : "#fef3c7", color: detailLead.leegality_status === "completed" ? "#16a34a" : "#d97706", borderColor: detailLead.leegality_status === "completed" ? "#bbf7d0" : "#fde68a" }}>{detailLead.leegality_status === "completed" ? "✓ Signed" : detailLead.leegality_status === "pending" ? "⏳ Pending" : "Not Started"}</span></div>)}
                {agreementData[detailLead.id] && (<div className="col-span-2 mt-2 p-3 rounded-lg border bg-muted/20"><p className="text-muted-foreground text-xs font-semibold mb-2">Agreement Status</p><div className="flex flex-wrap items-center gap-2"><Badge className={agreementData[detailLead.id].status === 'signed' ? 'bg-green-100 text-green-800' : agreementData[detailLead.id].status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>{agreementData[detailLead.id].status === 'signed' && '✓ Signed'}{agreementData[detailLead.id].status === 'sent' && '📤 Sent'}{agreementData[detailLead.id].status === 'not_sent' && 'Not Sent'}{agreementData[detailLead.id].status === 'rejected' && '❌ Rejected'}</Badge>{agreementData[detailLead.id].signed_date && (<span className="text-xs text-muted-foreground">Signed: {format(new Date(agreementData[detailLead.id].signed_date), "dd MMM yyyy, hh:mm a")}</span>)}{agreementData[detailLead.id].leegality_sign_url && agreementData[detailLead.id].status !== 'signed' && (<Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild><a href={agreementData[detailLead.id].leegality_sign_url} target="_blank" rel="noopener noreferrer">View Signing Link</a></Button>)}{agreementData[detailLead.id].signed_pdf_url && (<Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild><a href={agreementData[detailLead.id].signed_pdf_url} target="_blank" rel="noopener noreferrer">📄 Download Signed PDF</a></Button>)}</div></div>)}
                <div className="col-span-2"><p className="text-muted-foreground text-xs">CX Comment</p><p className="font-medium whitespace-pre-wrap">{detailLead.cx_comment || "-"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Remark</p><p className="font-medium whitespace-pre-wrap">{detailLead.remark || "-"}</p></div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {detailLead.phone && (<Button size="sm" variant="outline" asChild><a href={`tel:${detailLead.phone}`} onClick={() => logActivity(detailLead.id, "called", detailLead.phone || undefined)}><Phone className="mr-1 h-3 w-3" />Call</a></Button>)}
                {detailLead.email && (<Button size="sm" variant="outline" asChild><a href={`mailto:${detailLead.email}`} onClick={() => logActivity(detailLead.id, "emailed", detailLead.email || undefined)}><Mail className="mr-1 h-3 w-3" />Email</a></Button>)}
                {detailLead.phone && (<Button size="sm" variant="outline" asChild><a href={`https://wa.me/${detailLead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={() => logActivity(detailLead.id, "whatsapp", detailLead.phone || undefined)}><MessageCircle className="mr-1 h-3 w-3" />WhatsApp</a></Button>)}
                {detailLead.stage !== "lost" && detailLead.stage !== "converted" && (<Button size="sm" variant="destructive" onClick={() => setLostLeadDialog(detailLead)}><Flag className="mr-1 h-3 w-3" />Mark as Lost</Button>)}
                {detailLead.stage === "converted" && (<><Button size="sm" variant="default" onClick={() => handleSendAgreement(detailLead)} disabled={sendingAgreement === detailLead.id} className="bg-blue-600 hover:bg-blue-700">{sendingAgreement === detailLead.id ? (<Loader2 className="mr-1 h-3 w-3 animate-spin" />) : (<FileSignature className="mr-1 h-3 w-3" />)}Send Agreement</Button><Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setLeegalitySignDialog(detailLead)} disabled={leegalityLoading === detailLead.id}>{leegalityLoading === detailLead.id ? (<Loader2 className="mr-1 h-3 w-3 animate-spin" />) : (<FileSignature className="mr-1 h-3 w-3" />)}eSign</Button></>)}
              </div>
              <LeadCommentsPanel leadId={detailLead.id} leadStage={detailLead.stage} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editLead} onOpenChange={() => setEditLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          {editLead && (
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              {[{ label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Number", key: "phone" }, { label: "Company", key: "company" }, { label: "Address", key: "address" }].map(f => (<div key={f.key} className="grid gap-2"><Label>{f.label}</Label><Input value={(editLead as any)[f.key] || ""} onChange={e => setEditLead({ ...editLead, [f.key]: e.target.value } as DbLead)} /></div>))}
              <div className="grid gap-2"><Label>Value (₹)</Label><Input type="number" value={editLead.value || 0} onChange={e => setEditLead({ ...editLead, value: Number(e.target.value) })} /></div>
              <div className="grid gap-2"><Label>Lead Type</Label><Select value={editLead.lead_type || ""} onValueChange={v => setEditLead({ ...editLead, lead_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Budget</Label><Select value={editLead.budget || ""} onValueChange={v => setEditLead({ ...editLead, budget: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Lead Temperature</Label><Select value={editLead.temperature || "warm"} onValueChange={v => setEditLead({ ...editLead, temperature: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{LEAD_TEMPERATURE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Brand Stage</Label><Select value={editLead.stage || DEFAULT_LEAD_STAGE} onValueChange={v => setEditLead({ ...editLead, stage: v, sub_stage: "" })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Sub Stage</Label><Select value={editLead.sub_stage || "none"} onValueChange={v => setEditLead({ ...editLead, sub_stage: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">-- None --</SelectItem>{getSubStagesForStage(editLead.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Status</Label><Select value={editLead.status} onValueChange={v => setEditLead({ ...editLead, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Business Status</Label><Select value={editLead.business_status || "active"} onValueChange={v => setEditLead({ ...editLead, business_status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["active", "no-go", "done"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Source</Label><Select value={editLead.source || "Website"} onValueChange={v => setEditLead({ ...editLead, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2 sm:col-span-2"><Label>Remark (for call scheduling)</Label><Textarea value={editLead.remark || ""} onChange={e => setEditLead({ ...editLead, remark: e.target.value })} placeholder="e.g., call at 2:30 PM" /></div>
              <div className="grid gap-2 sm:col-span-2"><Label>CX Comment</Label><Textarea value={editLead.cx_comment || ""} onChange={e => setEditLead({ ...editLead, cx_comment: e.target.value })} /></div>
              <Button onClick={handleUpdate} className="sm:col-span-2">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Leegality Sign Dialog ──
function LeegalitySignDialog({ lead, open, onClose, onSignInitiated }: {
  lead: DbLead | null;
  open: boolean;
  onClose: () => void;
  onSignInitiated: (leadId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [agreementType, setAgreementType] = useState("service_agreement");
  
  if (!lead) return null;
  
  const handleSign = async () => {
    setLoading(true);
    try {
      await onSignInitiated(lead.id);
      onClose();
    } catch (error) {
      console.error("Sign initiation failed:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <FileSignature className="h-5 w-5" />
            Leegality eSign Agreement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="font-semibold text-green-800">{lead.name}</p>
            <p className="text-sm text-green-600 mt-1">{lead.email || lead.phone}</p>
            {lead.company && <p className="text-xs text-green-600">{lead.company}</p>}
          </div>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Agreement Type</Label>
              <Select value={agreementType} onValueChange={setAgreementType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agreement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service_agreement">Service Agreement</SelectItem>
                  <SelectItem value="nda">NDA</SelectItem>
                  <SelectItem value="partnership">Partnership Agreement</SelectItem>
                  <SelectItem value="custom">Custom Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
              <p className="font-semibold">✓ Legally compliant with:</p>
              <p>• IT Act 2000 (Aadhaar eSign)</p>
              <p>• Indian Stamp Act (eStamp)</p>
              <p>• DPDP Act 2023</p>
              <p>• RBI/SEBI guidelines</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSign} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
            Continue to Sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lost Lead Dialog ──
function LostLeadDialog({ lead, open, onClose, onConfirm }: {
  lead: DbLead | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (leadId: string, reason: string) => void;
}) {
  const [lostReason, setLostReason] = useState("");
  
  useEffect(() => {
    if (open) setLostReason("");
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Mark Lead as Lost
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm mb-4">
            Are you sure you want to mark <strong>{lead?.name}</strong> as lost?
          </p>
          <div className="space-y-2">
            <Label>Lost Reason</Label>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {SUB_STAGES.lost.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={() => lostReason && onConfirm(lead!.id, lostReason)}
            disabled={!lostReason}
          >
            Confirm Lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Employee Lead Count Modal ──
function EmployeeLeadCountModal({ leads, profiles, open, onClose, onFilterByEmployee }: {
  leads: DbLead[];
  profiles: { user_id: string; display_name: string | null }[];
  open: boolean;
  onClose: () => void;
  onFilterByEmployee: (userId: string) => void;
}) {
  const employeeStats = useMemo(() => {
    return profiles.map(p => {
      const empLeads = leads.filter(l => l.assigned_to === p.user_id);
      const stageBreakdown = LEAD_STAGES.map(s => ({
        ...s, count: empLeads.filter(l => l.stage === s.value).length,
      }));
      return { ...p, total: empLeads.length, converted: empLeads.filter(l => l.stage === "converted").length, stageBreakdown };
    }).sort((a, b) => b.total - a.total);
  }, [leads, profiles]);

  const unassigned = useMemo(() => leads.filter(l => !l.assigned_to).length, [leads]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Employee Lead Distribution
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium text-muted-foreground">Unassigned</p>
              <p className="text-xs text-muted-foreground">Not assigned to anyone</p>
            </div>
            <Badge variant="outline" className="text-base px-3 py-1">{unassigned}</Badge>
          </div>
          {employeeStats.map(emp => {
            const color = avatarColor(emp.display_name || "?");
            return (
              <div key={emp.user_id} className="p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: color }}>
                      {getInitials(emp.display_name || "?")}
                    </div>
                    <div>
                      <p className="font-semibold">{emp.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{emp.converted} converted / {emp.total} total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-base px-3 py-1">{emp.total}</Badge>
                    <Button size="sm" variant="outline"
                      onClick={() => { onFilterByEmployee(emp.user_id); onClose(); }}
                      disabled={emp.total === 0}>View</Button>
                  </div>
                </div>
                {emp.total > 0 && (
                  <>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {emp.stageBreakdown.filter(s => s.count > 0).map(s => (
                        <span key={s.value} className="text-[11px] px-2 py-0.5 rounded border font-medium" style={{ color: s.color, background: s.bg, borderColor: `${s.color}30` }}>
                          {s.label}: {s.count}
                        </span>
                      ))}
                    </div>
                    <Progress value={(emp.converted / emp.total) * 100} className="h-1 mt-2" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Template Download ──
function downloadExcelTemplate() {
  const template = [
    {
      "Name": "John Doe",
      "Email": "john@example.com",
      "Phone": "9876543210",
      "Company": "ABC Corp",
      "Source": "Website",
      "Value": 5000000,
      "Lead Type": "Herbal & Ayurvedic",
      "Address": "Mumbai, India",
      "CX Comment": "Interested in products",
      "Budget": "₹5l+",
      "Stage": "ringing",
      "Sub Stage": "ringing_1st",
      "Remark": "Call after 2 PM",
      "Temperature": "Hot"
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lead Template");
  XLSX.writeFile(wb, "lead_import_template.xlsx");
  toast.success("Template downloaded! Fill it with your data and re-upload.");
}
