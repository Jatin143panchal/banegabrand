import { useState, useRef, useEffect, useMemo } from "react";
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
import { useCrmQuery, useCrmInsert, useCrmUpdate, useCrmDelete } from "@/hooks/useCrm";
import { useCanAssignTasks, useAllProfiles } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadActivityLogger } from "@/hooks/useLeadActivity";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Search, Loader2, Upload, FileSpreadsheet, Trash2, Edit, Eye,
  Download, X, UserCheck, CheckSquare, Users, Phone, Mail,
  MessageCircle, Calendar, Filter, UserCircle
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadCommentsPanel from "@/components/LeadCommentsPanel";
import { useBulkAssignLeads } from "@/hooks/useLeadComments";
import { isToday, subDays, format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ── Stages config ──────────────────────────────────────────────────────────

const DEFAULT_LEAD_STAGE = "ringing";

const LEAD_STAGES = [
  { value: "ringing", label: "Ringing", color: "#f97316", bg: "#fff7ed", icon: "📞" },
  { value: "callback", label: "Callback", color: "#3b82f6", bg: "#eff6ff", icon: "🔔" },
  { value: "dp", label: "DP", color: "#8b5cf6", bg: "#f5f3ff", icon: "📋" },
  { value: "vms", label: "VMS", color: "#06b6d4", bg: "#ecfeff", icon: "🎙" },
  { value: "pg", label: "PG", color: "#ec4899", bg: "#fdf2f8", icon: "👥" },
  { value: "converted", label: "Converted", color: "#10b981", bg: "#ecfdf5", icon: "✅" },
  { value: "not_interested", label: "Not Interested", color: "#6b7280", bg: "#f9fafb", icon: "🚫" },
  { value: "lost", label: "Lost", color: "#ef4444", bg: "#fef2f2", icon: "❌" },
];

const LEAD_STATUSES = [
  { value: "ringing", label: "Ringing" },
  { value: "callback", label: "Callback" },
  { value: "dp", label: "DP" },
  { value: "vms", label: "VMS" },
  { value: "pg", label: "PG" },
  { value: "converted", label: "Converted" },
  { value: "not_interested", label: "Not Interested" },
  { value: "lost", label: "Lost" },
];

const SUB_STAGES: Record<string, { value: string; label: string }[]> = {
  ringing: [
    { value: "ringing_1st", label: "1st Ring" },
    { value: "ringing_2nd", label: "2nd Ring" },
    { value: "ringing_3rd", label: "3rd Ring" },
  ],
  callback: [
    { value: "callback_scheduled", label: "Callback Scheduled" },
    { value: "callback_done", label: "Callback Done" },
  ],
  dp: [
    { value: "dp_sent", label: "DP Sent" },
    { value: "dp_reviewed", label: "DP Reviewed" },
  ],
  vms: [
    { value: "vms_left", label: "VMS Left" },
    { value: "vms_replied", label: "VMS Replied" },
  ],
  pg: [
    { value: "pg_initiated", label: "PG Initiated" },
    { value: "pg_confirmed", label: "PG Confirmed" },
  ],
  converted: [
    { value: "meeting_booked", label: "Meeting Booked" },
    { value: "business_generated", label: "Business Generated" },
  ],
  lost: [
    { value: "lost_budget", label: "Budget Constraint" },
    { value: "lost_timing", label: "Bad Timing" },
    { value: "lost_other", label: "Other Reason" },
  ],
  not_interested: [
    { value: "ni_price", label: "Price Issue" },
    { value: "ni_timing", label: "Bad Timing" },
    { value: "ni_other", label: "Other Reason" },
  ],
};

function getSubStagesForStage(stage: string | null | undefined) {
  return SUB_STAGES[stage || ""] || [];
}

function formatStageLabel(value: string | null | undefined): string {
  if (!value) return "-";
  for (const s of LEAD_STAGES) if (s.value === value) return s.label;
  for (const arr of Object.values(SUB_STAGES)) for (const s of arr) if (s.value === value) return s.label;
  for (const s of LEAD_STATUSES) if (s.value === value) return s.label;
  return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getStageConfig(stage: string | null | undefined) {
  return LEAD_STAGES.find(s => s.value === stage) || null;
}

interface DbLead {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  source: string | null; status: string; value: number | null; business_status: string | null;
  assigned_to: string | null; created_at: string; next_call_date: string | null;
  lead_type: string | null; address: string | null; cx_comment: string | null;
  budget: string | null; stage: string | null; sub_stage: string | null; remark: string | null;
  assign_date?: string | null;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const LEAD_TYPES = ["Herbal & Ayurvedic", "Cosmetics", "Food & Beverage", "Pharma", "Nutraceutical", "Other"];
const BUDGETS = ["₹5l+", "₹50k - ₹1l", "₹1l - ₹3l", "₹3l - ₹5l", "Below ₹50k"];

const formatCurrency = (val: number | null) => `₹${((val || 0) / 100000).toFixed(1)}L`;

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#06b6d4", "#f59e0b", "#ef4444",
];

function avatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function getLeadScore(lead: DbLead): number {
  let score = 0;
  if (lead.name) score += 10;
  if (lead.email) score += 15;
  if (lead.phone) score += 15;
  if (lead.company) score += 10;
  if (lead.source) score += 10;
  if ((lead.value || 0) > 0) score += 15;
  const stage = lead.stage || lead.status || "";
  if (stage === "converted") score += 30;
  else if (stage === "pg") score += 25;
  else if (stage === "dp") score += 20;
  else if (stage === "callback") score += 15;
  else if (stage === "vms") score += 12;
  else if (stage === "ringing") score += 5;
  else if (stage === "not_interested") score += 0;
  else if (stage === "lost") score += 0;
  if (lead.sub_stage === "meeting_booked" || lead.sub_stage === "business_generated") score += 10;
  return Math.min(score, 100);
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `2px solid ${color}`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 10, fontWeight: 600, color,
      }}>
        {score}
      </div>
    </div>
  );
}

function StagePill({ stage, subStage }: { stage: string | null; subStage: string | null }) {
  const cfg = getStageConfig(stage);
  if (!cfg) return <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{
        display: "inline-block", padding: "2px 8px", borderRadius: 12,
        fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg,
        border: `1px solid ${cfg.color}30`,
      }}>
        {cfg.icon} {cfg.label}
      </span>
      {subStage && (
        <span style={{ fontSize: 10, color: "#64748b" }}>{formatStageLabel(subStage)}</span>
      )}
    </div>
  );
}

function EmployeeCard({ name, count, onClick, active }: {
  name: string; count: number; onClick: () => void; active: boolean;
}) {
  const color = avatarColor(name);
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        padding: "10px 14px", borderRadius: 12, border: `2px solid ${active ? color : "#e2e8f0"}`,
        background: active ? `${color}10` : "white", cursor: "pointer", transition: "all 0.15s",
        minWidth: 80,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: 700, fontSize: 13,
      }}>
        {getInitials(name)}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: active ? color : "#374151", textAlign: "center", lineHeight: 1.2 }}>{name}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, color: "white", background: color,
        borderRadius: 10, padding: "1px 8px",
      }}>{count}</span>
      <span style={{ fontSize: 10, color: "#94a3b8" }}>Leads</span>
    </button>
  );
}

interface EmployeeLeadCountModalProps {
  leads: DbLead[];
  profiles: Profile[];
  open: boolean;
  onClose: () => void;
  onFilterByEmployee: (userId: string) => void;
}

function EmployeeLeadCountModal({ leads, profiles, open, onClose, onFilterByEmployee }: EmployeeLeadCountModalProps) {
  const employeeStats = useMemo(() => profiles.map(p => {
    const empLeads = leads.filter(l => l.assigned_to === p.user_id);
    const stageBreakdown = LEAD_STAGES.map(s => ({
      ...s, count: empLeads.filter(l => l.stage === s.value).length,
    }));
    return { ...p, total: empLeads.length, converted: empLeads.filter(l => l.stage === "converted").length, stageBreakdown };
  }).sort((a, b) => b.total - a.total), [leads, profiles]);

  const unassigned = leads.filter(l => !l.assigned_to).length;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
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
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 700, fontSize: 12, flexShrink: 0,
                    }}>
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
                        <span key={s.value} style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 10,
                          color: s.color, background: s.bg, border: `1px solid ${s.color}30`, fontWeight: 500,
                        }}>
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

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  value: string;
  lead_type: string;
  address: string;
  cx_comment: string;
  budget: string;
  stage: string;
  sub_stage: string;
  remark: string;
}

const emptyForm: LeadFormData = {
  name: "", email: "", phone: "", company: "", source: "Website", value: "",
  lead_type: "Herbal & Ayurvedic", address: "", cx_comment: "",
  budget: "₹50k - ₹1l", stage: DEFAULT_LEAD_STAGE, sub_stage: "", remark: "",
};

export default function Leads() {
  const { user } = useAuth();
  const canAssign = useCanAssignTasks();
  const { data: profiles = [] } = useAllProfiles();
  const logActivity = useLeadActivityLogger();
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading } = useCrmQuery<DbLead>("leads");
  const insertLead = useCrmInsert("leads");
  const updateLead = useCrmUpdate<Record<string, unknown>>("leads");
  const deleteLead = useCrmDelete("leads");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterAssignment, setFilterAssignment] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterLeadType, setFilterLeadType] = useState("all");
  const [filterBudget, setFilterBudget] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<DbLead | null>(null);
  const [editLead, setEditLead] = useState<DbLead | null>(null);
  const [filterPreset, setFilterPreset] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const bulkAssign = useBulkAssignLeads();
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<LeadFormData>(emptyForm);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Real-time subscription for auto-refresh on assign/update
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads' }, 
        () => {
          console.log('Lead changed, refreshing...');
          refreshLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshLeads = () => {
    queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
  };

  const assignLead = useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const assign_date = new Date().toISOString();
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to, assign_date })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshLeads();
      toast.success("Lead assigned successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const p = profiles.find(p => p.user_id === userId);
    return p?.display_name || "Unknown";
  };

  const openLeadDetail = (lead: DbLead) => {
    setDetailLead(lead);
    logActivity(lead.id, "viewed", `Opened ${lead.name}`);
  };

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const matchSearch =
        (l.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.company || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.phone || "").includes(search) ||
        (l.email || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || l.status === filterStatus;
      const matchStage = filterStage === "all" || l.stage === filterStage;
      const matchLeadType = filterLeadType === "all" || l.lead_type === filterLeadType;
      const matchBudget = filterBudget === "all" || l.budget === filterBudget;
      const matchAssignment =
        filterAssignment === "all" ||
        (filterAssignment === "mine" && l.assigned_to === user?.id) ||
        (filterAssignment === "unassigned" && !l.assigned_to);
      const matchEmployee =
        filterEmployee === "all" ||
        (filterEmployee === "unassigned" && !l.assigned_to) ||
        l.assigned_to === filterEmployee;
      const matchPreset =
        filterPreset === "all" ||
        (filterPreset === "today" && isToday(new Date(l.created_at))) ||
        (filterPreset === "fresh" && (l.stage === "ringing") && new Date(l.created_at) >= subDays(new Date(), 3)) ||
        (filterPreset === "followup" && l.next_call_date && new Date(l.next_call_date) <= new Date()) ||
        (filterPreset === "not_interested" && l.stage === "not_interested");
      const createdAt = new Date(l.created_at);
      const matchDateFrom = !dateFrom || createdAt >= new Date(dateFrom);
      const matchDateTo = !dateTo || createdAt <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchStatus && matchStage && matchLeadType && matchBudget &&
        matchAssignment && matchEmployee && matchPreset && matchDateFrom && matchDateTo;
    });
  }, [leads, search, filterStatus, filterStage, filterLeadType, filterBudget, 
      filterAssignment, filterEmployee, filterPreset, dateFrom, dateTo, user?.id]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !bulkAssignTo) return;
    try {
      const assign_date = new Date().toISOString();
      await supabase.from("leads")
        .update({ assigned_to: bulkAssignTo, assign_date })
        .in("id", Array.from(selectedIds));
      await bulkAssign.mutateAsync({ leadIds: Array.from(selectedIds), assignedTo: bulkAssignTo });
      refreshLeads();
      toast.success(`${selectedIds.size} leads assigned successfully`);
      setSelectedIds(new Set());
      setBulkAssignTo("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Assign failed");
    }
  };

  const handleAdd = async () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    const finalEmail = form.email || `lead_${Date.now()}@import.com`;
    
    await insertLead.mutateAsync({
      name: form.name,
      email: finalEmail,
      phone: form.phone || null,
      company: form.company || null,
      source: form.source,
      value: Number(form.value) || 0,
      status: form.stage,
      lead_type: form.lead_type,
      address: form.address || null,
      cx_comment: form.cx_comment || null,
      budget: form.budget,
      stage: form.stage,
      sub_stage: form.sub_stage || null,
      remark: form.remark || null,
    } as any);
    refreshLeads();
    setForm(emptyForm);
    setDialogOpen(false);
    toast.success("Lead added successfully");
  };

  // ========== FIXED EXCEL IMPORT ==========
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    
    console.log("File selected:", file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);
        
        console.log("Rows found:", jsonData.length);
        
        if (jsonData.length === 0) {
          toast.error("Excel file is empty");
          return;
        }
        
        const mapped = jsonData.map((row: any, idx: number) => {
          // Map columns exactly as per Excel
          const name = row.Name || row.name || row["Lead Name"] || Object.values(row)[0] || `Lead ${idx + 1}`;
          const email = row.Email || row.email || row["Email Address"] || `temp_${Date.now()}_${idx}@import.com`;
          const phone = String(row.Number || row.Phone || row.phone || row.Mobile || "");
          const company = row.Company || row.company || "";
          const source = row.Source || row.source || "Excel Import";
          const value = Number(row.Value || row.value || 0);
          const lead_type = row["Lead type"] || row["Lead Type"] || "";
          const address = row.Address || row.address || "";
          const cx_comment = row["CX Comment"] || row.cx_comment || "";
          const budget = row.Budget || row.budget || "";
          let stage = row.Stage || row.stage || DEFAULT_LEAD_STAGE;
          // Convert "New" to "ringing"
          if (stage === "New" || stage === "new") stage = "ringing";
          const sub_stage = row["Sub Stage"] || row.sub_stage || "";
          const remark = row.Remark || row.remark || "";
          
          return {
            name: String(name).trim(),
            email: String(email).trim(),
            phone: String(phone).replace(/[^0-9]/g, ''),
            company: String(company).trim(),
            source: String(source),
            value: isNaN(value) ? 0 : value,
            lead_type: String(lead_type),
            address: String(address),
            cx_comment: String(cx_comment).replace(/_/g, ' '),
            budget: String(budget),
            stage: stage,
            sub_stage: String(sub_stage),
            remark: String(remark),
          };
        });
        
        console.log("Mapped leads:", mapped.length);
        setUploadPreview(mapped);
        toast.success(`${mapped.length} leads loaded. Click Import to save.`);
        
      } catch (err) {
        console.error("Parse error:", err);
        toast.error("Failed to parse file");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkImport = async () => {
    if (uploadPreview.length === 0) {
      toast.error("No leads to import");
      return;
    }
    
    setUploading(true);
    setImportProgress(0);
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < uploadPreview.length; i++) {
      const lead = uploadPreview[i];
      try {
        if (!lead.name || lead.name === "") {
          failed++;
          continue;
        }
        
        await insertLead.mutateAsync({
          name: lead.name,
          email: lead.email || `auto_${Date.now()}_${i}@import.com`,
          phone: lead.phone || null,
          company: lead.company || null,
          source: lead.source || "Excel Import",
          value: lead.value || 0,
          status: lead.stage || DEFAULT_LEAD_STAGE,
          lead_type: lead.lead_type || null,
          address: lead.address || null,
          cx_comment: lead.cx_comment || null,
          budget: lead.budget || null,
          stage: lead.stage || DEFAULT_LEAD_STAGE,
          sub_stage: lead.sub_stage || null,
          remark: lead.remark || null,
        } as any);
        success++;
        setImportProgress(Math.round(((i + 1) / uploadPreview.length) * 100));
      } catch (err) {
        console.error("Import error:", err);
        failed++;
      }
    }
    
    setUploading(false);
    setUploadPreview([]);
    setUploadOpen(false);
    setImportProgress(0);
    if (fileRef.current) fileRef.current.value = "";
    refreshLeads();
    
    if (failed > 0) {
      toast.warning(`${success} imported, ${failed} failed`);
    } else {
      toast.success(`${success} leads imported successfully!`);
    }
  };

  const handleUpdate = async () => {
    if (!editLead) return;
    await updateLead.mutateAsync({
      id: editLead.id,
      name: editLead.name,
      email: editLead.email,
      phone: editLead.phone,
      company: editLead.company,
      source: editLead.source,
      value: editLead.value,
      status: editLead.stage as any,
      business_status: editLead.business_status,
      lead_type: editLead.lead_type,
      address: editLead.address,
      cx_comment: editLead.cx_comment,
      budget: editLead.budget,
      stage: editLead.stage,
      sub_stage: editLead.sub_stage,
      remark: editLead.remark,
    } as any);
    logActivity(editLead.id, "updated", `Stage: ${editLead.stage}`);
    refreshLeads();
    setEditLead(null);
    toast.success("Lead updated");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await deleteLead.mutateAsync(id);
    refreshLeads();
    setDetailLead(null);
    toast.success("Lead deleted");
  };

  // ========== FIXED EXPORT ==========
  const handleExport = () => {
    const exportData = leads.map((lead, index) => ({
      "S.No.": index + 1,
      "Lead Name": lead.name || "",
      "Company": lead.company || "",
      "Phone": lead.phone || "",
      "Email": lead.email || "",
      "Stage": formatStageLabel(lead.stage || lead.status || ""),
      "Sub Stage": formatStageLabel(lead.sub_stage || ""),
      "Assigned To": getProfileName(lead.assigned_to),
      "Lead Type": lead.lead_type || "",
      "Budget": lead.budget || "",
      "Score": getLeadScore(lead),
      "Created": format(new Date(lead.created_at), "dd MMM yyyy"),
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 8 },   // S.No.
      { wch: 25 },  // Lead Name
      { wch: 20 },  // Company
      { wch: 15 },  // Phone
      { wch: 30 },  // Email
      { wch: 15 },  // Stage
      { wch: 18 },  // Sub Stage
      { wch: 20 },  // Assigned To
      { wch: 15 },  // Lead Type
      { wch: 12 },  // Budget
      { wch: 8 },   // Score
      { wch: 15 },  // Created
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success(`${leads.length} leads exported successfully!`);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterStage("all");
    setFilterAssignment("all");
    setFilterEmployee("all");
    setFilterLeadType("all");
    setFilterBudget("all");
    setDateFrom("");
    setDateTo("");
    setFilterPreset("all");
  };

  const stats = useMemo(() => ({
    totalValue: leads.reduce((s, l) => s + (l.value || 0), 0),
    convertedCount: leads.filter(l => l.stage === "converted").length,
    notInterestedCount: leads.filter(l => l.stage === "not_interested").length,
    ringingCount: leads.filter(l => l.stage === "ringing").length,
    callbackCount: leads.filter(l => l.stage === "callback").length,
    dpCount: leads.filter(l => l.stage === "dp").length,
    vmsCount: leads.filter(l => l.stage === "vms").length,
    pgCount: leads.filter(l => l.stage === "pg").length,
    convertedTotal: leads.filter(l => l.stage === "converted").length,
    lostCount: leads.filter(l => l.stage === "lost").length,
  }), [leads]);

  const currentEmployeeName = filterEmployee !== "all" && filterEmployee !== "unassigned" 
    ? getProfileName(filterEmployee) 
    : null;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const typedProfiles = profiles as Profile[];

  return (
    <div className="space-y-5">
      {/* Sticky Header Wrapper */}
      <div className="sticky top-0 z-50 bg-white pt-3 pb-2 space-y-3 border-b shadow-lg">
        
        {/* Header Section */}
        <div className="px-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
              <p className="text-muted-foreground text-sm">Manage and track all your leads in one place.</p>
              {currentEmployeeName && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="gap-1">
                    <UserCircle className="h-3 w-3" />
                    Filtering: {currentEmployeeName}
                    <button onClick={() => setFilterEmployee("all")} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />Export Excel
              </Button>
              
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Import Excel</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Import Leads from Excel/CSV</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">Upload Excel (.xlsx, .xls) or CSV file</p>
                      <p className="text-xs text-muted-foreground mb-3">Supports columns: Name, Email, Phone, Company, Stage, etc.</p>
                      <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="max-w-xs mx-auto" />
                    </div>
                    
                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Importing...</span>
                          <span>{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="h-2" />
                      </div>
                    )}
                    
                    {uploadPreview.length > 0 && !uploading && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{uploadPreview.length} leads ready</p>
                          <Button variant="ghost" size="sm" onClick={() => { setUploadPreview([]); if (fileRef.current) fileRef.current.value = ""; }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="max-h-60 overflow-auto rounded border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Stage</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {uploadPreview.slice(0, 10).map((r, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm">{r.name}</TableCell>
                                  <TableCell className="text-sm">{r.email}</TableCell>
                                  <TableCell className="text-sm">{r.phone}</TableCell>
                                  <TableCell className="text-sm">{r.company}</TableCell>
                                  <TableCell className="text-sm">{r.stage}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleBulkImport} disabled={uploading || uploadPreview.length === 0}>
                      {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : `Import ${uploadPreview.length} Leads`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />+ Add Lead</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4 sm:grid-cols-2">
                    {[
                      { label: "Name *", key: "name" },
                      { label: "Email", key: "email" },
                      { label: "Number", key: "phone" },
                      { label: "Company", key: "company" },
                      { label: "Address", key: "address" },
                      { label: "Value (₹)", key: "value" },
                    ].map(f => (
                      <div key={f.key} className="grid gap-2">
                        <Label>{f.label}</Label>
                        <Input value={form[f.key as keyof LeadFormData] as string} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
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
                      <Label>Brand Stage</Label>
                      <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v, sub_stage: "" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}</SelectContent>
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
                          {["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s =>
                            <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label>CX Comment</Label>
                      <Textarea value={form.cx_comment} onChange={e => setForm({ ...form, cx_comment: e.target.value })} placeholder="Customer interaction notes..." />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label>Remark</Label>
                      <Textarea value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} placeholder="Additional remarks..." />
                    </div>
                    <Button onClick={handleAdd} disabled={insertLead.isPending} className="mt-2 sm:col-span-2">
                      {insertLead.isPending ? "Adding..." : "Add Lead"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 overflow-x-auto">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Card style={{ minWidth: 140, cursor: "pointer" }} onClick={clearFilters} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Users style={{ color: "#3b82f6", width: 20, height: 20 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 700 }}>{leads.length}</p>
                    <p style={{ fontSize: 11, color: "#64748b" }}>Total Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ minWidth: 100, cursor: "pointer" }} onClick={() => setFilterStage(filterStage === "ringing" ? "all" : "ringing")} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>📞</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#f97316" }}>{stats.ringingCount}</p>
                    <p style={{ fontSize: 10, color: "#64748b" }}>Ringing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ minWidth: 100, cursor: "pointer" }} onClick={() => setFilterStage(filterStage === "callback" ? "all" : "callback")} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>🔔</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>{stats.callbackCount}</p>
                    <p style={{ fontSize: 10, color: "#64748b" }}>Callback</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ minWidth: 100, cursor: "pointer" }} onClick={() => setFilterStage(filterStage === "dp" ? "all" : "dp")} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>📋</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#8b5cf6" }}>{stats.dpCount}</p>
                    <p style={{ fontSize: 10, color: "#64748b" }}>DP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ minWidth: 100, cursor: "pointer" }} onClick={() => setFilterStage(filterStage === "vms" ? "all" : "vms")} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>🎙</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4" }}>{stats.vmsCount}</p>
                    <p style={{ fontSize: 10, color: "#64748b" }}>VMS</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ minWidth: 100, cursor: "pointer" }} onClick={() => setFilterStage(filterStage === "pg" ? "all" : "pg")} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>👥</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#ec4899" }}>{stats.pgCount}</p>
                    <p style={{ fontSize: 10, color: "#64748b" }}>PG</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ minWidth: 100, cursor: "pointer" }} onClick={() => setFilterStage(filterStage === "converted" ? "all" : "converted")} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>{stats.convertedTotal}</p>
                    <p style={{ fontSize: 10, color: "#64748b" }}>Converted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ minWidth: 100, cursor: "pointer" }} onClick={() => setFilterStage(filterStage === "not_interested" ? "all" : "not_interested")} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>🚫</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#6b7280" }}>{stats.notInterestedCount}</p>
                    <p style={{ fontSize: 10, color: "#64748b" }}>Not Int.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card style={{ minWidth: 100, cursor: "pointer" }} onClick={() => setFilterStage(filterStage === "lost" ? "all" : "lost")} className="hover:shadow-md">
              <CardContent className="p-3">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 24 }}>❌</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>{stats.lostCount}</p>
                    <p style={{ fontSize: 10, color: "#64748b" }}>Lost</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Employees panel */}
        {canAssign && typedProfiles.length > 0 && (
          <div className="px-4">
            <Card>
              <CardContent className="p-3">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>Leads by Employee</p>
                    <p style={{ fontSize: 10, color: "#94a3b8" }}>Click on employee to filter</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEmpModalOpen(true)}>View All</Button>
                </div>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {typedProfiles.slice(0, 6).map(p => (
                    <EmployeeCard
                      key={p.user_id}
                      name={p.display_name || "Unknown"}
                      count={leads.filter(l => l.assigned_to === p.user_id).length}
                      active={filterEmployee === p.user_id}
                      onClick={() => setFilterEmployee(filterEmployee === p.user_id ? "all" : p.user_id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Section */}
        <div className="px-4">
          <Card className="shadow-md bg-white border">
            <CardHeader className="pb-2 pt-2">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={filterAssignment} onValueChange={setFilterAssignment}>
                  <SelectTrigger className="w-36 h-9"><SelectValue placeholder="All Employees" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="mine">Assigned to Me</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterLeadType} onValueChange={setFilterLeadType}>
                  <SelectTrigger className="w-36 h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterBudget} onValueChange={setFilterBudget}>
                  <SelectTrigger className="w-32 h-9"><SelectValue placeholder="All Budgets" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Budgets</SelectItem>
                    {BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 bg-muted/30 rounded-md px-2 py-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-9 text-sm" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-9 text-sm" />
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-9">Clear</Button>
                <Select value={filterPreset} onValueChange={setFilterPreset}>
                  <SelectTrigger className="w-36 h-9"><SelectValue placeholder="All Time" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today's Leads</SelectItem>
                    <SelectItem value="fresh">Fresh Leads (3 days)</SelectItem>
                    <SelectItem value="followup">Follow-up Due</SelectItem>
                    <SelectItem value="not_interested">🚫 Not Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {canAssign && selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-3 mt-3 p-3 rounded-lg border bg-primary/5">
                  <Badge><CheckSquare className="h-3 w-3 mr-1" />{selectedIds.size} selected</Badge>
                  <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
                    <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                    <SelectContent>
                      {typedProfiles.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || "Unknown"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleBulkAssign} disabled={bulkAssign.isPending}>
                    <UserCheck className="mr-1 h-4 w-4" />Bulk Assign
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                </div>
              )}
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Leads Table */}
      <div className="px-4">
        <Card>
          <CardContent className="pt-6">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No leads found. Add your first lead or import from Excel!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">S.No.</TableHead>
                      {canAssign && <TableHead className="w-10"><Checkbox /></TableHead>}
                      <TableHead>Lead Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Sub Stage</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="hidden lg:table-cell">Lead Type</TableHead>
                      <TableHead className="hidden lg:table-cell">Budget</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((lead, index) => (
                      <TableRow key={lead.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        {canAssign && <TableCell><Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>}
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.company || "-"}</TableCell>
                        <TableCell>{lead.phone || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.email || "-"}</TableCell>
                        <TableCell><StagePill stage={lead.stage} subStage={null} /></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{formatStageLabel(lead.sub_stage)}</span></TableCell>
                        <TableCell>{getProfileName(lead.assigned_to)}</TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.lead_type || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.budget || "-"}</TableCell>
                        <TableCell><ScoreBadge score={getLeadScore(lead)} /></TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(lead.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLeadDetail(lead)} title="View Details">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditLead(lead)} title="Edit">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(lead.id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <EmployeeLeadCountModal leads={leads} profiles={typedProfiles} open={empModalOpen} onClose={() => setEmpModalOpen(false)} onFilterByEmployee={(userId) => { setFilterEmployee(userId); setFilterAssignment("all"); }} />
      
      {/* Lead Detail Dialog - Eyes Section */}
      <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
          {detailLead && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">{getInitials(detailLead.name)}</div>
                  <div>
                    <h3 className="font-bold text-lg">{detailLead.name}</h3>
                    {detailLead.company && <p className="text-sm text-muted-foreground">{detailLead.company}</p>}
                  </div>
                </div>
                <ScoreBadge score={getLeadScore(detailLead)} />
              </div>
              
              <Progress value={getLeadScore(detailLead)} className="h-2" />
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium break-all">{detailLead.email || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{detailLead.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Company</p>
                  <p className="font-medium">{detailLead.company || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Address</p>
                  <p className="font-medium">{detailLead.address || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Lead Type</p>
                  <p className="font-medium">{detailLead.lead_type || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Budget</p>
                  <p className="font-medium">{detailLead.budget || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Brand Stage</p>
                  <Select
                    value={detailLead.stage || "ringing"}
                    onValueChange={async (v) => {
                      const updated = { ...detailLead, stage: v, sub_stage: "" };
                      setDetailLead(updated);
                      await updateLead.mutateAsync({ id: detailLead.id, stage: v, sub_stage: "", status: v } as any);
                      logActivity(detailLead.id, "updated", `Stage: ${v}`);
                      refreshLeads();
                      toast.success("Stage updated");
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Sub Stage</p>
                  <Select
                    value={detailLead.sub_stage || "none"}
                    onValueChange={async (v) => {
                      const val = v === "none" ? "" : v;
                      setDetailLead({ ...detailLead, sub_stage: val });
                      await updateLead.mutateAsync({ id: detailLead.id, sub_stage: val } as any);
                      logActivity(detailLead.id, "updated", `Sub Stage: ${val}`);
                      refreshLeads();
                      toast.success("Sub Stage updated");
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- None --</SelectItem>
                      {getSubStagesForStage(detailLead.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Source</p>
                  <p className="font-medium">{detailLead.source || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Value</p>
                  <p className="font-medium">{formatCurrency(detailLead.value)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Assigned To</p>
                  <p className="font-medium">{getProfileName(detailLead.assigned_to)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created At</p>
                  <p className="font-medium">{format(new Date(detailLead.created_at), "dd MMM yyyy")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">CX Comment</p>
                  <p className="font-medium whitespace-pre-wrap">{detailLead.cx_comment || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Remark</p>
                  <p className="font-medium whitespace-pre-wrap">{detailLead.remark || "-"}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {detailLead.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${detailLead.phone}`}>
                      <Phone className="mr-1 h-3 w-3" />Call
                    </a>
                  </Button>
                )}
                {detailLead.email && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${detailLead.email}`}>
                      <Mail className="mr-1 h-3 w-3" />Email
                    </a>
                  </Button>
                )}
                {detailLead.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`https://wa.me/${detailLead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-1 h-3 w-3" />WhatsApp
                    </a>
                  </Button>
                )}
              </div>
              <LeadCommentsPanel leadId={detailLead.id} leadStage={detailLead.stage} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editLead} onOpenChange={() => setEditLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          {editLead && (
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Name</Label><Input value={editLead.name} onChange={e => setEditLead({ ...editLead, name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Email</Label><Input value={editLead.email || ""} onChange={e => setEditLead({ ...editLead, email: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Phone</Label><Input value={editLead.phone || ""} onChange={e => setEditLead({ ...editLead, phone: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Company</Label><Input value={editLead.company || ""} onChange={e => setEditLead({ ...editLead, company: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Address</Label><Input value={editLead.address || ""} onChange={e => setEditLead({ ...editLead, address: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Value (₹)</Label><Input type="number" value={editLead.value || 0} onChange={e => setEditLead({ ...editLead, value: Number(e.target.value) })} /></div>
              <div className="grid gap-2"><Label>Lead Type</Label><Select value={editLead.lead_type || ""} onValueChange={v => setEditLead({ ...editLead, lead_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Budget</Label><Select value={editLead.budget || ""} onValueChange={v => setEditLead({ ...editLead, budget: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Brand Stage</Label><Select value={editLead.stage || DEFAULT_LEAD_STAGE} onValueChange={v => setEditLead({ ...editLead, stage: v, sub_stage: "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Sub Stage</Label><Select value={editLead.sub_stage || "none"} onValueChange={v => setEditLead({ ...editLead, sub_stage: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- None --</SelectItem>{getSubStagesForStage(editLead.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Source</Label><Select value={editLead.source || "Website"} onValueChange={v => setEditLead({ ...editLead, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2 sm:col-span-2"><Label>CX Comment</Label><Textarea value={editLead.cx_comment || ""} onChange={e => setEditLead({ ...editLead, cx_comment: e.target.value })} /></div>
              <div className="grid gap-2 sm:col-span-2"><Label>Remark</Label><Textarea value={editLead.remark || ""} onChange={e => setEditLead({ ...editLead, remark: e.target.value })} /></div>
              <Button onClick={handleUpdate} disabled={updateLead.isPending} className="sm:col-span-2">{updateLead.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
