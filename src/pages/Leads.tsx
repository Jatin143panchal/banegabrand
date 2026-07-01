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
  FileSignature, Flame, Snowflake, Sun, ChevronLeft, ChevronRight
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadCommentsPanel from "@/components/LeadCommentsPanel";
import { useBulkAssignLeads } from "@/hooks/useLeadComments";
import { isToday, subDays, format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

function TemperatureBadge({ temperature }: { temperature: string | null | undefined }) {
  const config = getTemperatureConfig(temperature);
  if (!config) return <span style={{ fontSize: 11, color: "#94a3b8" }}>-</span>;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 12,
      fontSize: 11, fontWeight: 600,
      color: config.color, background: config.bg,
      border: `1px solid ${config.color}30`,
    }}>
      {config.label}
    </span>
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
        {cfg.label}
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
  profiles: { user_id: string; display_name: string | null }[];
  open: boolean;
  onClose: () => void;
  onFilterByEmployee: (userId: string) => void;
}

function EmployeeLeadCountModal({ leads, profiles, open, onClose, onFilterByEmployee }: EmployeeLeadCountModalProps) {
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

function EmployeeFilterSection({ 
  profiles, 
  leads, 
  onSelectEmployee, 
  selectedEmployee,
  onSelectStage,
  selectedStage,
  onSelectStatus,
  selectedStatus,
  temperatureFilter,
  onTemperatureFilterChange
}: {
  profiles: { user_id: string; display_name: string | null }[];
  leads: DbLead[];
  onSelectEmployee: (userId: string | null) => void;
  selectedEmployee: string | null;
  onSelectStage: (stage: string | null) => void;
  selectedStage: string | null;
  onSelectStatus: (status: string | null) => void;
  selectedStatus: string | null;
  temperatureFilter: string;
  onTemperatureFilterChange: (value: string) => void;
}) {
  const [searchEmployee, setSearchEmployee] = useState("");
  
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      (p.display_name || "").toLowerCase().includes(searchEmployee.toLowerCase())
    );
  }, [profiles, searchEmployee]);
  
  const employeeStats = useMemo(() => {
    return filteredProfiles.map(p => {
      const empLeads = leads.filter(l => l.assigned_to === p.user_id);
      const stageCounts = LEAD_STAGES.map(s => ({
        ...s,
        count: empLeads.filter(l => l.stage === s.value).length
      }));
      const statusCounts = LEAD_STATUSES.map(s => ({
        ...s,
        count: empLeads.filter(l => l.status === s.value).length
      }));
      return {
        ...p,
        total: empLeads.length,
        converted: empLeads.filter(l => l.stage === "converted").length,
        lost: empLeads.filter(l => l.stage === "lost").length,
        stageCounts,
        statusCounts,
        hot: empLeads.filter(l => l.temperature === "hot").length,
        warm: empLeads.filter(l => l.temperature === "warm").length,
        cold: empLeads.filter(l => l.temperature === "cold").length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredProfiles, leads]);
  
  const unassignedCount = useMemo(() => leads.filter(l => !l.assigned_to).length, [leads]);
  const hotCount = useMemo(() => leads.filter(l => l.temperature === "hot").length, [leads]);
  const warmCount = useMemo(() => leads.filter(l => l.temperature === "warm").length, [leads]);
  const coldCount = useMemo(() => leads.filter(l => l.temperature === "cold").length, [leads]);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Leads Overview
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              View and filter leads by employee, stage, and status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Total: {leads.length}
            </Badge>
            {selectedEmployee && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onSelectEmployee(null)}
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
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee..."
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
          <div 
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedEmployee === "unassigned" 
                ? "border-primary bg-primary/5" 
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onSelectEmployee(selectedEmployee === "unassigned" ? null : "unassigned")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                  ?
                </div>
                <div>
                  <p className="font-semibold text-sm">Unassigned</p>
                  <p className="text-xs text-muted-foreground">{unassignedCount} leads</p>
                </div>
              </div>
              <Badge variant={selectedEmployee === "unassigned" ? "default" : "outline"}>
                {unassignedCount}
              </Badge>
            </div>
          </div>
          
          {employeeStats.map(emp => {
            const color = avatarColor(emp.display_name || "?");
            const isActive = selectedEmployee === emp.user_id;
            return (
              <div 
                key={emp.user_id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isActive 
                    ? "border-primary bg-primary/5" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => onSelectEmployee(isActive ? null : emp.user_id)}
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
                      <p className="font-semibold text-sm">{emp.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.converted} converted / {emp.lost} lost
                      </p>
                    </div>
                  </div>
                  <Badge variant={isActive ? "default" : "outline"}>
                    {emp.total}
                  </Badge>
                </div>
                
                <div className="flex gap-1 mt-2">
                  {emp.hot > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                      🔥 {emp.hot}
                    </span>
                  )}
                  {emp.warm > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                      ☀️ {emp.warm}
                    </span>
                  )}
                  {emp.cold > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      ❄️ {emp.cold}
                    </span>
                  )}
                </div>
                
                {emp.total > 0 && (
                  <div className="mt-2">
                    <Progress 
                      value={(emp.converted / emp.total) * 100} 
                      className="h-1" 
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {emp.stageCounts.filter(s => s.count > 0).slice(0, 4).map(s => (
                        <span 
                          key={s.value}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ 
                            background: s.bg, 
                            color: s.color,
                            border: `1px solid ${s.color}30`
                          }}
                        >
                          {s.label}: {s.count}
                        </span>
                      ))}
                      {emp.stageCounts.filter(s => s.count > 0).length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{emp.stageCounts.filter(s => s.count > 0).length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex flex-wrap gap-2 items-center border-t pt-3">
          <span className="text-sm font-medium mr-2">Quick Filter:</span>
          
          <div className="flex flex-wrap gap-1">
            {LEAD_STAGES.map(s => {
              const count = leads.filter(l => l.stage === s.value).length;
              const isActive = selectedStage === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => onSelectStage(isActive ? null : s.value)}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    isActive 
                      ? `ring-2 ring-offset-1` 
                      : "hover:bg-gray-100"
                  }`}
                  style={{
                    background: isActive ? s.bg : "transparent",
                    color: isActive ? s.color : "#64748b",
                    border: `1px solid ${isActive ? s.color : "#e2e8f0"}`,
                  }}
                >
                  {s.icon} {s.label} ({count})
                </button>
              );
            })}
          </div>
          
          <span className="text-sm font-medium mx-2">|</span>
          
          <div className="flex flex-wrap gap-1">
            {LEAD_STATUSES.slice(0, 6).map(s => {
              const count = leads.filter(l => l.status === s.value).length;
              const isActive = selectedStatus === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => onSelectStatus(isActive ? null : s.value)}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    isActive 
                      ? "bg-primary text-white" 
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {s.label} ({count})
                </button>
              );
            })}
          </div>

          <span className="text-sm font-medium mx-2">|</span>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Temp:</span>
            <Select 
              value={temperatureFilter} 
              onValueChange={onTemperatureFilterChange}
            >
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="All Temperatures" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌡️ All Leads ({leads.length})</SelectItem>
                <SelectItem value="hot">🔥 Hot Leads ({hotCount})</SelectItem>
                <SelectItem value="warm">☀️ Warm Leads ({warmCount})</SelectItem>
                <SelectItem value="cold">❄️ Cold Leads ({coldCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(selectedEmployee || selectedStage || selectedStatus || temperatureFilter !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                onSelectEmployee(null);
                onSelectStage(null);
                onSelectStatus(null);
                onTemperatureFilterChange("all");
              }}
              className="text-xs text-red-500"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
  
  // ── Fetch leads function with role-based filtering ──
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Fetching leads for user:", user?.id);
      
      // Check if user is admin
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
      
      // If NOT admin, only fetch leads assigned to this user
      if (!isAdmin && user?.id) {
        console.log("🔍 Filtering by assigned_to:", user.id);
        query = query.eq("assigned_to", user.id);
      } else {
        console.log("👑 Admin - fetching all leads");
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
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
  
  // ── Real-time subscription with role-based filtering ──
  useEffect(() => {
    let isMounted = true;
    let isAdmin = false;
    
    // Check user role
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
          
          // For non-admins, only show their own leads
          if (!isAdmin && user?.id) {
            const lead = payload.new as DbLead;
            if (lead && lead.assigned_to !== user.id) {
              return; // Ignore updates for other employees' leads
            }
          }
          
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
  }, [user?.id]);

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

  // ── DIRECT DUPLICATE CHECK - NO RPC ──
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

  // ── UPDATE STAGE - DIRECT QUERY ──
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

  // ── ADD LEAD - DIRECT QUERY ──
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

  // ── UPDATE LEAD - DIRECT QUERY ──
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

  // ── DELETE LEAD - DIRECT QUERY ──
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const typedProfiles = profiles as { user_id: string; display_name: string | null }[];

  return (
    <div className="space-y-5">
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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm">Manage and track all your leads in one place.</p>
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
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
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
                  <p className="text-xs text-amber-600 mb-2">
                    ⚠️ Duplicate leads will be automatically skipped
                  </p>
                  <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="max-w-xs mx-auto" />
                </div>
                {uploadPreview.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{uploadPreview.length} leads found in file</p>
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

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card style={{ minWidth: 160, flex: "0 0 auto" }}>
          <CardContent className="p-4">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: "#eff6ff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Users style={{ color: "#3b82f6", width: 24, height: 24 }} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{stats.totalLeads}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ minWidth: 140, flex: "0 0 auto" }}>
          <CardContent className="p-4">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: "#fef2f2",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Flame style={{ color: "#ef4444", width: 24, height: 24 }} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#ef4444" }}>{stats.hotCount}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Hot Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ minWidth: 140, flex: "0 0 auto" }}>
          <CardContent className="p-4">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: "#fff7ed",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sun style={{ color: "#f97316", width: 24, height: 24 }} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#f97316" }}>{stats.warmCount}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Warm Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ minWidth: 140, flex: "0 0 auto" }}>
          <CardContent className="p-4">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: "#eff6ff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Snowflake style={{ color: "#3b82f6", width: 24, height: 24 }} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#3b82f6" }}>{stats.coldCount}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Cold Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ minWidth: 160, flex: "0 0 auto" }}>
          <CardContent className="p-4">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: "#ecfdf5",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <TrendingUp style={{ color: "#10b981", width: 24, height: 24 }} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{stats.convertedCount}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Converted</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>
                  {stats.totalLeads > 0 ? ((stats.convertedCount / stats.totalLeads) * 100).toFixed(1) : 0}% rate
                </p>
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

      {/* Stage Filter */}
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

      {/* Rest of your UI - Main Table and Dialogs */}
      {/* ... (baaki ka UI same hai, I'm keeping it short for brevity) */}
      
    </div>
  );
}
