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
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<LeadFormData>(emptyForm);

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

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
    if (!form.name || !form.email) {
      toast.error("Name and Email are required");
      return;
    }
    await insertLead.mutateAsync({
      name: form.name,
      email: form.email,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          name: row.Name || row.name || row["Full Name"] || row["Lead Name"] || "",
          email: row.Email || row.email || row["Email Address"] || "",
          phone: String(row.Number || row.Phone || row.phone || row["Mobile"] || row["Phone Number"] || ""),
          company: row.Company || row.company || row["Company Name"] || row["Organization"] || "",
          source: row.Source || row.source || row["Lead Source"] || "Excel Import",
          value: Number(row.Value || row.value || row["Deal Value"] || 0),
          lead_type: row["Lead type"] || row["Lead Type"] || row.lead_type || "",
          address: row.Address || row.address || "",
          cx_comment: row["CX Comment"] || row.cx_comment || row.Comment || "",
          budget: row.Budget || row.budget || "",
          stage: row.Stage || row.stage || DEFAULT_LEAD_STAGE,
          sub_stage: row["Sub Stage"] || row.sub_stage || "",
          remark: row.Remark || row.remark || row.Remarks || "",
        })).filter((r: any) => r.name);
        setUploadPreview(mapped);
        if (mapped.length === 0)
          toast.error("No valid leads found. Ensure columns: Name, Email, Phone, Company, Source, Value");
      } catch (err) {
        console.error("File parse error:", err);
        toast.error("Failed to parse file. Please upload a valid Excel or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkImport = async () => {
    if (uploadPreview.length === 0) return;
    setUploading(true);
    let success = 0;
    for (const lead of uploadPreview) {
      try {
        await insertLead.mutateAsync({
          name: lead.name,
          email: lead.email,
          phone: lead.phone || null,
          company: lead.company || null,
          source: lead.source,
          value: lead.value,
          status: lead.stage,
          lead_type: lead.lead_type || null,
          address: lead.address || null,
          cx_comment: lead.cx_comment || null,
          budget: lead.budget || null,
          stage: lead.stage,
          sub_stage: lead.sub_stage || null,
          remark: lead.remark || null,
        } as any);
        success++;
      } catch (err) {
        console.error("Lead import error:", err);
      }
    }
    setUploading(false);
    setUploadPreview([]);
    setUploadOpen(false);
    if (fileRef.current) fileRef.current.value = "";
    refreshLeads();
    toast.success(`${success} leads imported successfully!`);
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

  const handleExport = () => {
    const exportData = leads.map(l => ({
      Name: l.name,
      Email: l.email,
      Number: l.phone,
      Company: l.company,
      "Lead type": l.lead_type,
      Address: l.address,
      "CX Comment": l.cx_comment,
      Budget: l.budget,
      Stage: l.stage,
      "Sub Stage": l.sub_stage,
      Remark: l.remark,
      Source: l.source,
      Status: l.status,
      Value: l.value,
      "Business Status": l.business_status,
      "Assigned To": getProfileName(l.assigned_to),
      "Assign Date": l.assign_date ? format(new Date(l.assign_date), "dd MMM yyyy") : "",
      "Created At": format(new Date(l.created_at), "dd MMM yyyy"),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads_export.xlsx");
    toast.success("Leads exported!");
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
      {/* Sticky Header Wrapper - Everything here stays frozen */}
      <div className="sticky top-0 z-40 bg-background pt-3 pb-2 space-y-3 border-b shadow-lg">
        
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
                    <button
                      onClick={() => setFilterEmployee("all")}
                      className="ml-1 hover:text-destructive"
                    >
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
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Import Leads from Excel/CSV</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">Upload Excel (.xlsx, .xls) or CSV file</p>
                      <p className="text-xs text-muted-foreground mb-3">Columns: Name, Email, Phone, Company, Source, Value</p>
                      <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="max-w-xs mx-auto" />
                    </div>
                    {uploadPreview.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{uploadPreview.length} leads found</p>
                          <Button variant="ghost" size="sm" onClick={() => { setUploadPreview([]); if (fileRef.current) fileRef.current.value = ""; }}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="max-h-60 overflow-auto rounded border">
                          <Table>
                            <TableHeader>
                              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Company</TableHead><TableHead>Source</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                              {uploadPreview.slice(0, 10).map((r, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm">{r.name}</TableCell>
                                  <TableCell className="text-sm">{r.email}</TableCell>
                                  <TableCell className="text-sm">{r.phone}</TableCell>
                                  <TableCell className="text-sm">{r.company}</TableCell>
                                  <TableCell className="text-sm">{r.source}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {uploadPreview.length > 10 && <p className="text-xs text-muted-foreground text-center py-2">...and {uploadPreview.length - 10} more</p>}
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
                      { label: "Email *", key: "email" },
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

        {/* Top Cards: Total + Employees */}
        <div className="px-4">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Card
              style={{ minWidth: 160, flex: "0 0 auto", cursor: "pointer", transition: "box-shadow 0.15s" }}
              onClick={clearFilters}
              className="hover:shadow-md hover:ring-2 hover:ring-blue-200"
            >
              <CardContent className="p-4">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: "#eff6ff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Users style={{ color: "#3b82f6", width: 24, height: 24 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{leads.length}</p>
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Total Leads</p>
                    <p style={{ fontSize: 11, color: "#94a3b8" }}>Click to reset filters</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              style={{ minWidth: 160, flex: "0 0 auto", cursor: "pointer", transition: "box-shadow 0.15s" }}
              onClick={() => setFilterStage(filterStage === "not_interested" ? "all" : "not_interested")}
              className="hover:shadow-md hover:ring-2 hover:ring-gray-200"
            >
              <CardContent className="p-4">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: "#f9fafb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24,
                  }}>
                    🚫
                  </div>
                  <div>
                    <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#6b7280" }}>{stats.notInterestedCount}</p>
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Not Interested</p>
                    <p style={{ fontSize: 11, color: "#94a3b8" }}>Click to filter</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {canAssign && typedProfiles.length > 0 && (
              <Card style={{ flex: 1, minWidth: 300 }}>
                <CardContent className="p-4">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>Leads by Employee</p>
                      <p style={{ fontSize: 11, color: "#94a3b8" }}>See how many leads are assigned to each employee.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEmpModalOpen(true)}>View All</Button>
                  </div>
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                    {typedProfiles.slice(0, 5).map(p => (
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
            )}
          </div>
        </div>

        {/* Stage Stats Bar */}
        <div className="px-4">
          <Card>
            <CardContent className="p-4">
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "#374151" }}>Stages</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {LEAD_STAGES.map(s => {
                  const count = leads.filter(l => l.stage === s.value).length;
                  const active = filterStage === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setFilterStage(active ? "all" : s.value)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                        border: `2px solid ${active ? s.color : "#e2e8f0"}`,
                        background: active ? s.bg : "white",
                        transition: "all 0.15s", fontWeight: 500,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{s.icon}</span>
                      <span style={{ fontSize: 13, color: active ? s.color : "#374151" }}>{s.label}</span>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: "white",
                        background: s.color, borderRadius: 8, padding: "1px 8px", marginLeft: 2,
                      }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section - THIS WILL BE FROZEN */}
        <div className="px-4">
          <Card className="shadow-md bg-white border-0">
            <CardHeader className="pb-2 pt-2">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Search */}
                <div className="relative" style={{ flex: "1 1 200px", minWidth: 160 }}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                
                {/* Assigned To Filter */}
                <Select value={filterAssignment} onValueChange={setFilterAssignment}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="mine">Assigned to Me</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Lead Type Filter */}
                <Select value={filterLeadType} onValueChange={setFilterLeadType}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                {/* Budget Filter */}
                <Select value={filterBudget} onValueChange={setFilterBudget}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue placeholder="All Budgets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Budgets</SelectItem>
                    {BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                {/* Date Range */}
                <div className="flex items-center gap-2 bg-muted/30 rounded-md px-2 py-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-36 h-9 text-sm"
                    placeholder="From Date"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-36 h-9 text-sm"
                    placeholder="To Date"
                  />
                </div>
                
                {/* Clear Button */}
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-9">
                  Clear
                </Button>
                
                {/* Quick Filter */}
                <Select value={filterPreset} onValueChange={setFilterPreset}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today's Leads</SelectItem>
                    <SelectItem value="fresh">Fresh Leads (3 days)</SelectItem>
                    <SelectItem value="followup">Follow-up Due</SelectItem>
                    <SelectItem value="not_interested">🚫 Not Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk assign bar */}
              {canAssign && selectedIds.size > 0 && (
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

      {/* Leads Table Section - This scrolls */}
      <div className="px-4">
        <Card>
          <CardContent className="pt-6">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Total Leads: <span style={{ color: "#3b82f6" }}>{filtered.length}</span>
                {filtered.length !== leads.length && <span style={{ color: "#94a3b8", fontWeight: 400 }}> (filtered from {leads.length})</span>}
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                No leads found. Add your first lead or import from Excel!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canAssign && (
                        <TableHead className="w-10">
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
                          />
                        </TableHead>
                      )}
                      <TableHead>Lead Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead>Stage / Sub Stage</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="hidden lg:table-cell">Lead Type</TableHead>
                      <TableHead className="hidden lg:table-cell">Budget</TableHead>
                      <TableHead>Lead Score</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="hidden xl:table-cell">Assign Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(lead => {
                      const score = getLeadScore(lead);
                      const assignee = getProfileName(lead.assigned_to);
                      const assigneeColor = lead.assigned_to ? avatarColor(assignee) : "#94a3b8";
                      const isNotInterested = lead.stage === "not_interested";
                      return (
                        <TableRow
                          key={lead.id}
                          style={{
                            verticalAlign: "middle",
                            opacity: isNotInterested ? 0.65 : 1,
                            background: isNotInterested ? "#f9fafb" : undefined,
                          }}
                        >
                          {canAssign && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(lead.id)}
                                onCheckedChange={() => toggleSelect(lead.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <p style={{ fontWeight: 600, fontSize: 13 }}>{lead.name}</p>
                              {isNotInterested && (
                                <span style={{
                                  fontSize: 10, padding: "1px 6px", borderRadius: 8,
                                  background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb",
                                }}>NI</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell style={{ fontSize: 13, color: "#374151" }}>{lead.company || "-"}</TableCell>
                          <TableCell>
                            {lead.phone
                              ? <a href={`tel:${lead.phone}`} style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>{lead.phone}</a>
                              : <span style={{ color: "#94a3b8", fontSize: 13 }}>-</span>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {lead.email
                              ? <a href={`mailto:${lead.email}`} style={{ fontSize: 12, color: "#64748b", textDecoration: "none" }}>{lead.email}</a>
                              : <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>}
                          </TableCell>
                          <TableCell>
                            <StagePill stage={lead.stage} subStage={lead.sub_stage} />
                          </TableCell>
                          <TableCell>
                            {lead.assigned_to ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: "50%", background: assigneeColor,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "white", fontSize: 10, fontWeight: 700, flexShrink: 0,
                                }}>
                                  {getInitials(assignee)}
                                </div>
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: 500 }}>{assignee}</span>
                                  {lead.assign_date && (
                                    <p style={{ fontSize: 10, color: "#94a3b8" }}>
                                      {format(new Date(lead.assign_date), "dd MMM yyyy")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              canAssign ? (
                                <Select
                                  value=""
                                  onValueChange={v => assignLead.mutate({ id: lead.id, assigned_to: v })}
                                >
                                  <SelectTrigger className="w-32 h-7 text-xs">
                                    <SelectValue placeholder="Assign..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {typedProfiles.map(p => (
                                      <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || "Unknown"}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span style={{ fontSize: 12, color: "#94a3b8" }}>Unassigned</span>
                              )
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {lead.lead_type ? (
                              <span style={{
                                fontSize: 11, padding: "2px 8px", borderRadius: 8,
                                background: "#f1f5f9", color: "#475569", fontWeight: 500,
                              }}>{lead.lead_type}</span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell" style={{ fontSize: 13, color: "#374151" }}>
                            {lead.budget || "-"}
                          </TableCell>
                          <TableCell>
                            <ScoreBadge score={score} />
                          </TableCell>
                          <TableCell style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                            {format(new Date(lead.created_at), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell" style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                            {lead.assign_date ? format(new Date(lead.assign_date), "dd MMM yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            <div style={{ display: "flex", gap: 2 }}>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLeadDetail(lead)} title="View">
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {filtered.length > 0 && (
              <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 12 }}>
                Showing {filtered.length} of {leads.length} leads
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Modal */}
      <EmployeeLeadCountModal
        leads={leads}
        profiles={typedProfiles}
        open={empModalOpen}
        onClose={() => setEmpModalOpen(false)}
        onFilterByEmployee={(userId) => {
          setFilterEmployee(userId);
          setFilterAssignment("all");
        }}
      />

      {/* Lead Detail Dialog */}
      <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
          {detailLead && (
            <div className="space-y-4 py-2">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: avatarColor(detailLead.name),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 700, fontSize: 16,
                  }}>
                    {getInitials(detailLead.name)}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{detailLead.name}</h3>
                    {detailLead.company && <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{detailLead.company}</p>}
                  </div>
                </div>
                <ScoreBadge score={getLeadScore(detailLead)} />
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

                <div className="grid gap-1">
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

                <div><p className="text-muted-foreground text-xs">Source</p><p className="font-medium">{detailLead.source || "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p>
                  <span style={{
                    fontSize: 11, padding: "2px 10px", borderRadius: 10,
                    background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", fontWeight: 600,
                  }}>{formatStageLabel(detailLead.status)}</span>
                </div>
                <div><p className="text-muted-foreground text-xs">Value</p><p className="font-medium">{formatCurrency(detailLead.value)}</p></div>
                <div><p className="text-muted-foreground text-xs">Business Status</p><p className="font-medium">{detailLead.business_status || "Active"}</p></div>
                <div><p className="text-muted-foreground text-xs">Assigned To</p><p className="font-medium">{getProfileName(detailLead.assigned_to)}</p></div>
                <div><p className="text-muted-foreground text-xs">Assign Date</p>
                  <p className="font-medium">
                    {detailLead.assign_date ? format(new Date(detailLead.assign_date), "dd MMM yyyy") : "-"}
                  </p>
                </div>
                <div><p className="text-muted-foreground text-xs">Created At</p>
                  <p className="font-medium">{format(new Date(detailLead.created_at), "dd MMM yyyy")}</p>
                </div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">CX Comment</p><p className="font-medium whitespace-pre-wrap">{detailLead.cx_comment || "-"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Remark</p><p className="font-medium whitespace-pre-wrap">{detailLead.remark || "-"}</p></div>
              </div>

              <div className="flex gap-2 pt-2">
                {detailLead.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${detailLead.phone}`} onClick={() => logActivity(detailLead.id, "called", detailLead.phone || undefined)}>
                      <Phone className="mr-1 h-3 w-3" />Call
                    </a>
                  </Button>
                )}
                {detailLead.email && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${detailLead.email}`} onClick={() => logActivity(detailLead.id, "emailed", detailLead.email || undefined)}>
                      <Mail className="mr-1 h-3 w-3" />Email
                    </a>
                  </Button>
                )}
                {detailLead.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`https://wa.me/${detailLead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      onClick={() => logActivity(detailLead.id, "whatsapp", detailLead.phone || undefined)}>
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

      {/* Edit Lead Dialog */}
      <Dialog open={!!editLead} onOpenChange={() => setEditLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          {editLead && (
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              {[
                { label: "Name", key: "name" },
                { label: "Email", key: "email" },
                { label: "Number", key: "phone" },
                { label: "Company", key: "company" },
                { label: "Address", key: "address" },
              ].map(f => (
                <div key={f.key} className="grid gap-2">
                  <Label>{f.label}</Label>
                  <Input value={(editLead as any)[f.key] || ""} onChange={e => setEditLead({ ...editLead, [f.key]: e.target.value } as DbLead)} />
                </div>
              ))}
              <div className="grid gap-2">
                <Label>Value (₹)</Label>
                <Input type="number" value={editLead.value || 0} onChange={e => setEditLead({ ...editLead, value: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Lead Type</Label>
                <Select value={editLead.lead_type || ""} onValueChange={v => setEditLead({ ...editLead, lead_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Budget</Label>
                <Select value={editLead.budget || ""} onValueChange={v => setEditLead({ ...editLead, budget: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Brand Stage</Label>
                <Select value={editLead.stage || DEFAULT_LEAD_STAGE} onValueChange={v => setEditLead({ ...editLead, stage: v, sub_stage: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Sub Stage</Label>
                <Select value={editLead.sub_stage || "none"} onValueChange={v => setEditLead({ ...editLead, sub_stage: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- None --</SelectItem>
                    {getSubStagesForStage(editLead.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Business Status</Label>
                <Select value={editLead.business_status || "active"} onValueChange={v => setEditLead({ ...editLead, business_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active", "no-go", "done"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Source</Label>
                <Select value={editLead.source || "Website"} onValueChange={v => setEditLead({ ...editLead, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s =>
                      <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>CX Comment</Label>
                <Textarea value={editLead.cx_comment || ""} onChange={e => setEditLead({ ...editLead, cx_comment: e.target.value })} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Remark</Label>
                <Textarea value={editLead.remark || ""} onChange={e => setEditLead({ ...editLead, remark: e.target.value })} />
              </div>
              <Button onClick={handleUpdate} disabled={updateLead.isPending} className="sm:col-span-2">
                {updateLead.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
