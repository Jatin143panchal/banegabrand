import { useState, useRef, useEffect } from "react";
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
  Plus, Search, Filter, Loader2, Upload, FileSpreadsheet, Trash2, Edit, Eye,
  Star, Download, X, UserCheck, CheckSquare, Users, Phone, Mail,
  MessageCircle, Calendar, TrendingUp, BarChart3, AlarmClock, Flag, XCircle,
  AlertTriangle, FileSignature, Flame, Snowflake, Sun
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadCommentsPanel from "@/components/LeadCommentsPanel";
import { useBulkAssignLeads } from "@/hooks/useLeadComments";
import { isToday, subDays, format, parseISO, differenceInMinutes } from "date-fns";
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

// ── Lead Temperature Status ──────────────────────────────────────────────────
const LEAD_TEMPERATURE = [
  { value: "hot",   label: "🔥 Hot",   color: "#ef4444", bg: "#fef2f2" },
  { value: "warm",  label: "☀️ Warm",  color: "#f97316", bg: "#fff7ed" },
  { value: "cold",  label: "❄️ Cold",  color: "#3b82f6", bg: "#eff6ff" },
];

const LEAD_STATUSES = [
  { value: "Ringing",            label: "Ringing"           },
  { value: "Callback",           label: "Callback"          },
  { value: "DP",                 label: "DP"                },
  { value: "VMS",                label: "VMS"               },
  { value: "PG",                 label: "PG"                },
  { value: "Converted",          label: "Converted"         },
  { value: "Lost",               label: "Lost"              },
  { value: "Meeting Booked",     label: "Meeting Booked"    },
  { value: "Business Generated", label: "Business Generated"},
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
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Temperature Badge ──────────────────────────────────────────────────────
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

// ── Stage Pill ────────────────────────────────────────────────────────────────
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

// ── Employee Card in header ───────────────────────────────────────────────────
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

// ── Employee Lead Count Modal ─────────────────────────────────────────────────
interface EmployeeLeadCountModalProps {
  leads: DbLead[];
  profiles: { user_id: string; display_name: string | null }[];
  open: boolean;
  onClose: () => void;
  onFilterByEmployee: (userId: string) => void;
}

function EmployeeLeadCountModal({ leads, profiles, open, onClose, onFilterByEmployee }: EmployeeLeadCountModalProps) {
  const employeeStats = profiles.map(p => {
    const empLeads = leads.filter(l => l.assigned_to === p.user_id);
    const stageBreakdown = LEAD_STAGES.map(s => ({
      ...s, count: empLeads.filter(l => l.stage === s.value).length,
    }));
    return { ...p, total: empLeads.length, converted: empLeads.filter(l => l.stage === "converted").length, stageBreakdown };
  }).sort((a, b) => b.total - a.total);

  const unassigned = leads.filter(l => !l.assigned_to).length;

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

// ── Call Reminder Popup Component ─────────────────────────────────────────────
function CallReminderPopup({ leads, onDismiss, onCallNow }: { 
  leads: DbLead[]; 
  onDismiss: (leadId: string) => void; 
  onCallNow: (lead: DbLead) => void;
}) {
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  
  if (leads.length === 0) return null;
  
  const currentLead = leads[currentLeadIndex];
  
  return (
    <Dialog open={true} onOpenChange={() => onDismiss(currentLead.id)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-orange-500" />
            Call Reminder
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🔔</div>
            <p className="text-sm text-muted-foreground">Time to call!</p>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="font-semibold text-lg">{currentLead.name}</p>
              <p className="text-sm text-muted-foreground">{currentLead.company || "No company"}</p>
              {currentLead.phone && (
                <p className="text-sm mt-2">
                  <Phone className="inline h-3 w-3 mr-1" />
                  {currentLead.phone}
                </p>
              )}
              {currentLead.remark && (
                <p className="text-xs mt-2 p-2 bg-white rounded">
                  <span className="font-semibold">Note:</span> {currentLead.remark}
                </p>
              )}
            </div>
            
            {leads.length > 1 && (
              <p className="text-xs text-center text-muted-foreground">
                {currentLeadIndex + 1} of {leads.length} calls pending
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          {leads.length > 1 && currentLeadIndex < leads.length - 1 && (
            <Button 
              variant="outline" 
              onClick={() => setCurrentLeadIndex(prev => prev + 1)}
            >
              Next
            </Button>
          )}
          <Button variant="outline" onClick={() => onDismiss(currentLead.id)}>
            Remind Later
          </Button>
          <Button onClick={() => onCallNow(currentLead)}>
            <Phone className="mr-2 h-4 w-4" />
            Call Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lost Lead Dialog ─────────────────────────────────────────────────────────
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

// ── Leegality Sign Dialog ─────────────────────────────────────────────────────
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

// ── Excel Template Download ───────────────────────────────────────────────────
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

// ── Main Component ───────────────────────────────────────────────────────────
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
  const bulkAssign = useBulkAssignLeads();
  const [uploadPreview, setUploadPreview]   = useState<any[]>([]);
  const [uploading, setUploading]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [pendingReminders, setPendingReminders] = useState<DbLead[]>([]);
  const [showReminder, setShowReminder] = useState(false);
  const [lostLeadDialog, setLostLeadDialog] = useState<DbLead | null>(null);
  const [leegalitySignDialog, setLeegalitySignDialog] = useState<DbLead | null>(null);
  const [leegalityLoading, setLeegalityLoading] = useState<string | null>(null);
  const [sendingAgreement, setSendingAgreement] = useState<string | null>(null);
  const [agreementData, setAgreementData] = useState<Record<string, any>>({});

  const emptyForm = {
    name: "", email: "", phone: "", company: "", source: "Website", value: "",
    lead_type: "Herbal & Ayurvedic", address: "", cx_comment: "",
    budget: "₹50k - ₹1l", stage: DEFAULT_LEAD_STAGE, sub_stage: "", remark: "",
    temperature: "warm",
  };
  const [form, setForm] = useState(emptyForm);

  const checkForDuplicate = async (leadData: any, excludeId?: string) => {
    try {
      const { data, error } = await supabase.rpc('check_duplicate_lead', {
        p_email: leadData.email || null,
        p_phone: leadData.phone || null,
        p_name: leadData.name,
        p_company: leadData.company || null,
        p_exclude_id: excludeId || null
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error checking duplicate:", error);
      return null;
    }
  };

  const handleSendAgreement = async (lead: DbLead) => {
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
        console.log("Signing link:", result.sign_url);
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
  };

  const fetchAgreementStatus = async (leadId: string) => {
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
  };

  const handleLeegalitySign = async (leadId: string) => {
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
        console.error("VITE_SUPABASE_URL is not set!");
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
        setDetailLead(prev => prev ? { ...prev, leegality_status: "pending", leegality_document_id: result.document_id } : prev);
        
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
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('agreement_signed') === 'true') {
      const leadId = urlParams.get('lead_id');
      toast.success("Agreement signed successfully!");
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      if (leadId) {
        fetchAgreementStatus(leadId);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (detailLead?.id) {
      fetchAgreementStatus(detailLead.id);
    }
  }, [detailLead?.id]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const upcomingCalls = leads.filter(lead => {
        if (!lead.remark) return false;
        const timeMatch = lead.remark.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const period = timeMatch[3].toUpperCase();
          
          if (period === "PM" && hours !== 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;
          
          const callTime = new Date(now);
          callTime.setHours(hours, minutes, 0, 0);
          
          const diffMinutes = differenceInMinutes(callTime, now);
          if (diffMinutes >= -5 && diffMinutes <= 10 && lead.stage !== "lost") {
            return true;
          }
        }
        return false;
      });
      
      const newReminders = upcomingCalls.filter(
        lead => !pendingReminders.some(r => r.id === lead.id)
      );
      
      if (newReminders.length > 0) {
        setPendingReminders(prev => [...prev, ...newReminders]);
        setShowReminder(true);
      }
    };
    
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [leads, pendingReminders]);

  const dismissReminder = (leadId: string) => {
    setPendingReminders(prev => prev.filter(r => r.id !== leadId));
    if (pendingReminders.length === 1) {
      setShowReminder(false);
    }
  };

  const handleCallNow = (lead: DbLead) => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
      logActivity(lead.id, "called", `Called from reminder - ${lead.phone}`);
    }
    dismissReminder(lead.id);
  };

  const markLeadAsLost = async (leadId: string, reason: string) => {
    try {
      const lostDate = new Date().toISOString();
      await supabase
        .from("leads")
        .update({ 
          stage: "lost", 
          status: "Lost",
          lost_reason: reason,
          lost_date: lostDate,
          business_status: "no-go"
        })
        .eq("id", leadId);
      
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      logActivity(leadId, "updated", `Marked as lost - Reason: ${reason}`);
      toast.success("Lead marked as lost");
      setLostLeadDialog(null);
      setDetailLead(null);
    } catch (error: any) {
      toast.error(error.message);
    }
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
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success("Lead assigned successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const p = (profiles as { user_id: string; display_name: string | null }[]).find(p => p.user_id === userId);
    return p?.display_name || "Unknown";
  };

  const handleUpdateStageFromDetail = async (id: string, stage: string, subStage: string) => {
    try {
      await supabase.from("leads").update({ stage, sub_stage: subStage }).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      if (detailLead && detailLead.id === id) {
        setDetailLead({ ...detailLead, stage, sub_stage: subStage });
      }
      toast.success("Stage updated");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openLeadDetail = (lead: DbLead) => {
    setDetailLead(lead);
    logActivity(lead.id, "viewed", `Opened ${lead.name}`);
  };

  const handleAddLead = async () => {
    if (!form.name || !form.email) { 
      toast.error("Name and Email are required"); 
      return; 
    }
    
    try {
      await insertLead.mutateAsync({
        name: form.name, email: form.email, phone: form.phone, company: form.company,
        source: form.source, value: Number(form.value) || 0, status: "new" as any,
        lead_type: form.lead_type, address: form.address, cx_comment: form.cx_comment,
        budget: form.budget, stage: form.stage, sub_stage: form.sub_stage, remark: form.remark,
        temperature: form.temperature,
      } as any);
      setForm(emptyForm);
      setDialogOpen(false);
      toast.success("Lead added successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filtered = leads.filter(l => {
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
      filterEmployee === "all" ||
      (filterEmployee === "unassigned" && !l.assigned_to) ||
      l.assigned_to === filterEmployee;
    const matchPreset =
      filterPreset === "all" ||
      (filterPreset === "today"    && isToday(new Date(l.created_at))) ||
      (filterPreset === "fresh"    && (l.status === "new" || l.stage === "ringing") && new Date(l.created_at) >= subDays(new Date(), 3)) ||
      (filterPreset === "followup" && l.next_call_date && new Date(l.next_call_date) <= new Date());
    const createdAt = new Date(l.created_at);
    const matchDateFrom = !dateFrom || createdAt >= new Date(dateFrom);
    const matchDateTo   = !dateTo   || createdAt <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchStatus && matchStage && matchLeadType && matchBudget &&
           matchAssignment && matchEmployee && matchPreset && matchDateFrom && matchDateTo &&
           matchTemperature;
  });

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
      const count = await bulkAssign.mutateAsync({ leadIds: Array.from(selectedIds), assignedTo: bulkAssignTo });
      toast.success(`${count} leads assigned successfully`);
      setSelectedIds(new Set());
      setBulkAssignTo("");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Assign failed"); }
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
          toast.error("No valid leads found. Ensure columns: Name, Email, Phone, Company, Source, Value, Lead Type, Budget, Stage, Sub Stage, Remark, Temperature");
      } catch { toast.error("Failed to parse file. Please upload a valid Excel or CSV file."); }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkImport = async () => {
    if (uploadPreview.length === 0) return;
    setUploading(true);
    let success = 0;
    let duplicates = 0;
    let duplicateList: any[] = [];
    
    for (const lead of uploadPreview) {
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
      
      try {
        await insertLead.mutateAsync({
          name: lead.name, email: lead.email, phone: lead.phone, company: lead.company,
          source: lead.source, value: lead.value, status: "new" as any,
          lead_type: lead.lead_type, address: lead.address, cx_comment: lead.cx_comment,
          budget: lead.budget, stage: lead.stage || "ringing", sub_stage: lead.sub_stage, remark: lead.remark,
          temperature: lead.temperature || "warm",
        } as any);
        success++;
      } catch (error) {
        console.error("Error importing lead:", error);
      }
    }
    
    setUploading(false);
    setUploadPreview([]);
    setUploadOpen(false);
    if (fileRef.current) fileRef.current.value = "";
    
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
  };

  const handleUpdate = async () => {
    if (!editLead) return;
    
    await updateLead.mutateAsync({
      id: editLead.id, name: editLead.name, email: editLead.email, phone: editLead.phone,
      company: editLead.company, source: editLead.source, value: editLead.value,
      status: editLead.status as any, business_status: editLead.business_status,
      lead_type: editLead.lead_type, address: editLead.address, cx_comment: editLead.cx_comment,
      budget: editLead.budget, stage: editLead.stage, sub_stage: editLead.sub_stage,
      remark: editLead.remark, temperature: editLead.temperature,
    } as any);
    logActivity(editLead.id, "updated", `Status: ${editLead.status}`);
    setEditLead(null);
    toast.success("Lead updated");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await deleteLead.mutateAsync(id);
    setDetailLead(null);
    toast.success("Lead deleted");
  };

  const handleExport = () => {
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
  };

  const clearFilters = () => {
    setSearch(""); setFilterStatus("all"); setFilterStage("all");
    setFilterAssignment("all"); setFilterEmployee("all");
    setFilterLeadType("all"); setFilterBudget("all");
    setFilterTemperature("all");
    setDateFrom(""); setDateTo(""); setFilterPreset("all");
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const typedProfiles = profiles as { user_id: string; display_name: string | null }[];

  const totalValue    = leads.reduce((s, l) => s + (l.value || 0), 0);
  const convertedCount = leads.filter(l => l.status === "converted" || l.stage === "converted").length;
  const lostCount = leads.filter(l => l.stage === "lost").length;
  const hotCount = leads.filter(l => l.temperature === "hot").length;
  const warmCount = leads.filter(l => l.temperature === "warm").length;
  const coldCount = leads.filter(l => l.temperature === "cold").length;

  return (
    <div className="space-y-5">
      {showReminder && pendingReminders.length > 0 && (
        <CallReminderPopup
          leads={pendingReminders}
          onDismiss={dismissReminder}
          onCallNow={handleCallNow}
        />
      )}
      
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
                    ⚠️ Duplicate leads (based on email/phone/name) will be automatically skipped
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
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : `Import ${uploadPreview.length} Leads (Duplicates will be skipped)`}
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
                <Button onClick={handleAddLead} disabled={insertLead.isPending} className="mt-2 sm:col-span-2">
                  {insertLead.isPending ? "Adding..." : "Add Lead"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{leads.length}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Total Leads</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>All time</p>
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
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#ef4444" }}>{hotCount}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Hot Leads</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>High priority</p>
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
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#f97316" }}>{warmCount}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Warm Leads</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>Medium priority</p>
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
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#3b82f6" }}>{coldCount}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Cold Leads</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>Low priority</p>
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
                <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{convertedCount}</p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Converted</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>
                  {((convertedCount / leads.length) * 100).toFixed(1)}% rate
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

      <Card className="sticky top-0 z-20 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative" style={{ flex: "1 1 200px", minWidth: 160 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAssignment} onValueChange={setFilterAssignment}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Assigned To" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="mine">Assigned to Me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTemperature} onValueChange={setFilterTemperature}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Temperature" /></SelectTrigger>
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
              <SelectTrigger className="w-40"><SelectValue placeholder="Lead Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {LEAD_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBudget} onValueChange={setFilterBudget}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Budget" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Budgets</SelectItem>
                {BUDGETS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar style={{ width: 16, height: 16, color: "#94a3b8" }} />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 140 }} className="text-sm" />
              <span style={{ color: "#94a3b8", fontSize: 12 }}>to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 140 }} className="text-sm" />
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
            <Select value={filterPreset} onValueChange={setFilterPreset}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Quick Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today's Leads</SelectItem>
                <SelectItem value="fresh">Fresh Leads</SelectItem>
                <SelectItem value="followup">Follow-up Due</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

        <CardContent>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Total Leads: <span style={{ color: "#3b82f6" }}>{filtered.length}</span>
              {filtered.length !== leads.length && <span style={{ color: "#94a3b8", fontWeight: 400 }}> (filtered from {leads.length})</span>}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-3 w-3" />Export Excel
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No leads found. Add your first lead or import from Excel!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canAssign && <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))} onCheckedChange={() => { const all = filtered.every(l => selectedIds.has(l.id)); setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(l => all ? next.delete(l.id) : next.add(l.id)); return next; }); }} /></TableHead>}
                    <TableHead>Lead Name</TableHead><TableHead>Company</TableHead><TableHead>Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead><TableHead>Stage / Sub Stage</TableHead>
                    <TableHead>Temperature</TableHead><TableHead>Assigned To</TableHead>
                    <TableHead className="hidden lg:table-cell">Lead Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Budget</TableHead><TableHead>Lead Score</TableHead>
                    <TableHead>Created At</TableHead><TableHead className="hidden xl:table-cell">Assign Date</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(lead => {
                    const score = getLeadScore(lead);
                    const assignee = getProfileName(lead.assigned_to);
                    const assigneeColor = lead.assigned_to ? avatarColor(assignee) : "#94a3b8";
                    return (
                      <TableRow key={lead.id} style={{ verticalAlign: "middle" }}>
                        {canAssign && (<TableCell><Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>)}
                        <TableCell><div style={{ display: "flex", alignItems: "center", gap: 8 }}><p style={{ fontWeight: 600, fontSize: 13 }}>{lead.name}</p><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openLeadDetail(lead)} title="View Details"><Eye className="h-3 w-3" /></Button></div></TableCell>
                        <TableCell style={{ fontSize: 13, color: "#374151" }}>{lead.company || "-"}</TableCell>
                        <TableCell>{lead.phone ? <a href={`tel:${lead.phone}`} style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>{lead.phone}</a> : <span style={{ color: "#94a3b8", fontSize: 13 }}>-</span>}</TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.email ? <a href={`mailto:${lead.email}`} style={{ fontSize: 12, color: "#64748b", textDecoration: "none" }}>{lead.email}</a> : <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>}</TableCell>
                        <TableCell><StagePill stage={lead.stage} subStage={lead.sub_stage} /></TableCell>
                        <TableCell><TemperatureBadge temperature={lead.temperature} /></TableCell>
                        <TableCell>
                          {lead.assigned_to ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: assigneeColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                {getInitials(assignee)}
                              </div>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 500 }}>{assignee}</span>
                                {lead.assign_date && (<p style={{ fontSize: 10, color: "#94a3b8" }}>{format(new Date(lead.assign_date), "dd MMM yyyy")}</p>)}
                              </div>
                            </div>
                          ) : (
                            canAssign ? (
                              <Select value="" onValueChange={v => assignLead.mutate({ id: lead.id, assigned_to: v })}>
                                <SelectTrigger className="w-32 h-7 text-xs">
                                  <SelectValue placeholder="Assign..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {typedProfiles.map(p => (
                                    <SelectItem key={p.user_id} value={p.user_id}>
                                      {p.display_name || "Unknown"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span style={{ fontSize: 12, color: "#94a3b8" }}>Unassigned</span>
                            )
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.lead_type ? (<span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "#f1f5f9", color: "#475569", fontWeight: 500 }}>{lead.lead_type}</span>) : "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell" style={{ fontSize: 13, color: "#374151" }}>{lead.budget || "-"}</TableCell>
                        <TableCell><ScoreBadge score={score} /></TableCell>
                        <TableCell style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{format(new Date(lead.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell className="hidden xl:table-cell" style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{lead.assign_date ? format(new Date(lead.assign_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell><div style={{ display: "flex", gap: 2 }}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLeadDetail(lead)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditLead(lead)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                          {lead.stage !== "lost" && lead.stage !== "converted" && (<Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setLostLeadDialog(lead)} title="Mark as Lost"><Flag className="h-3.5 w-3.5" /></Button>)}
                          {lead.stage === "converted" && (<Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => setLeegalitySignDialog(lead)} title="eSign via Leegality" disabled={leegalityLoading === lead.id}>{leegalityLoading === lead.id ? (<Loader2 className="h-3.5 w-3.5 animate-spin" />) : (<FileSignature className="h-3.5 w-3.5" />)}</Button>)}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(lead.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {filtered.length > 0 && (<p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 12 }}>Showing 1 to {Math.min(filtered.length, 50)} of {filtered.length} leads</p>)}
        </CardContent>
      </Card>

      <EmployeeLeadCountModal leads={leads} profiles={typedProfiles} open={empModalOpen} onClose={() => setEmpModalOpen(false)} onFilterByEmployee={(userId) => { setFilterEmployee(userId); setFilterAssignment("all"); }} />

      <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
          {detailLead && (
            <div className="space-y-4 py-2">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(detailLead.name), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 16 }}>{getInitials(detailLead.name)}</div>
                  <div><h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{detailLead.name}</h3>{detailLead.company && <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{detailLead.company}</p>}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TemperatureBadge temperature={detailLead.temperature} />
                  <ScoreBadge score={getLeadScore(detailLead)} />
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
                <div><p className="text-muted-foreground text-xs">Temperature</p><p className="font-medium"><TemperatureBadge temperature={detailLead.temperature} /></p></div>
                <div className="grid gap-1"><p className="text-muted-foreground text-xs">Brand Stage</p><Select value={detailLead.stage || "ringing"} onValueChange={async (v) => { const updated = { ...detailLead, stage: v, sub_stage: "" }; setDetailLead(updated); await handleUpdateStageFromDetail(detailLead.id, v, ""); logActivity(detailLead.id, "updated", `Stage: ${v}`); }}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-1"><p className="text-muted-foreground text-xs">Sub Stage</p><Select value={detailLead.sub_stage || "none"} onValueChange={async (v) => { const val = v === "none" ? "" : v; setDetailLead({ ...detailLead, sub_stage: val }); await handleUpdateStageFromDetail(detailLead.id, detailLead.stage || "ringing", val); logActivity(detailLead.id, "updated", `Sub Stage: ${val}`); }}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">-- None --</SelectItem>{getSubStagesForStage(detailLead.stage).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div><p className="text-muted-foreground text-xs">Source</p><p className="font-medium">{detailLead.source || "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 10, background: detailLead.stage === "lost" ? "#fef2f2" : "#f0fdf4", color: detailLead.stage === "lost" ? "#dc2626" : "#16a34a", border: `1px solid ${detailLead.stage === "lost" ? "#fecaca" : "#bbf7d0"}`, fontWeight: 600 }}>{formatStageLabel(detailLead.status)}</span></div>
                <div><p className="text-muted-foreground text-xs">Value</p><p className="font-medium">{formatCurrency(detailLead.value || 0)}</p></div>
                <div><p className="text-muted-foreground text-xs">Business Status</p><p className="font-medium">{detailLead.business_status || "Active"}</p></div>
                <div><p className="text-muted-foreground text-xs">Assigned To</p><p className="font-medium">{getProfileName(detailLead.assigned_to)}</p></div>
                <div><p className="text-muted-foreground text-xs">Assign Date</p><p className="font-medium">{detailLead.assign_date ? format(new Date(detailLead.assign_date), "dd MMM yyyy") : "-"}</p></div>
                <div><p className="text-muted-foreground text-xs">Created At</p><p className="font-medium">{format(new Date(detailLead.created_at), "dd MMM yyyy")}</p></div>
                {detailLead.lost_reason && (<div className="col-span-2"><p className="text-muted-foreground text-xs">Lost Reason</p><p className="font-medium text-red-600">{formatStageLabel(detailLead.lost_reason)}</p></div>)}
                {detailLead.leegality_status && (<div className="col-span-2"><p className="text-muted-foreground text-xs">eSign Status</p><span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 10, background: detailLead.leegality_status === "completed" ? "#ecfdf5" : "#fef3c7", color: detailLead.leegality_status === "completed" ? "#16a34a" : "#d97706", border: `1px solid ${detailLead.leegality_status === "completed" ? "#bbf7d0" : "#fde68a"}`, fontWeight: 500 }}>{detailLead.leegality_status === "completed" ? "✓ Signed" : detailLead.leegality_status === "pending" ? "⏳ Pending" : "Not Started"}</span></div>)}
                {agreementData[detailLead.id] && (<div className="col-span-2 mt-2 p-3 rounded-lg border bg-muted/20"><p className="text-muted-foreground text-xs font-semibold mb-2">Agreement Status</p><div className="flex items-center gap-2 flex-wrap"><Badge className={agreementData[detailLead.id].status === 'signed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : agreementData[detailLead.id].status === 'sent' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}>{agreementData[detailLead.id].status === 'signed' && '✓ Signed'}{agreementData[detailLead.id].status === 'sent' && '📤 Sent'}{agreementData[detailLead.id].status === 'not_sent' && 'Not Sent'}{agreementData[detailLead.id].status === 'rejected' && '❌ Rejected'}</Badge>{agreementData[detailLead.id].signed_date && (<span className="text-xs text-muted-foreground">Signed: {format(new Date(agreementData[detailLead.id].signed_date), "dd MMM yyyy, hh:mm a")}</span>)}{agreementData[detailLead.id].leegality_sign_url && agreementData[detailLead.id].status !== 'signed' && (<Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild><a href={agreementData[detailLead.id].leegality_sign_url} target="_blank" rel="noopener noreferrer">View Signing Link</a></Button>)}{agreementData[detailLead.id].signed_pdf_url && (<Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild><a href={agreementData[detailLead.id].signed_pdf_url} target="_blank" rel="noopener noreferrer">📄 Download Signed PDF</a></Button>)}</div></div>)}
                <div className="col-span-2"><p className="text-muted-foreground text-xs">CX Comment</p><p className="font-medium whitespace-pre-wrap">{detailLead.cx_comment || "-"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Remark</p><p className="font-medium whitespace-pre-wrap">{detailLead.remark || "-"}</p></div>
              </div>
              <div className="flex gap-2 pt-2 flex-wrap">
                {detailLead.phone && (<Button size="sm" variant="outline" asChild><a href={`tel:${detailLead.phone}`} onClick={() => logActivity(detailLead.id, "called", detailLead.phone || undefined)}><Phone className="mr-1 h-3 w-3" />Call</a></Button>)}
                {detailLead.email && (<Button size="sm" variant="outline" asChild><a href={`mailto:${detailLead.email}`} onClick={() => logActivity(detailLead.id, "emailed", detailLead.email || undefined)}><Mail className="mr-1 h-3 w-3" />Email</a></Button>)}
                {detailLead.phone && (<Button size="sm" variant="outline" asChild><a href={`https://wa.me/${detailLead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={() => logActivity(detailLead.id, "whatsapp", detailLead.phone || undefined)}><MessageCircle className="mr-1 h-3 w-3" />WhatsApp</a></Button>)}
                {detailLead.stage !== "lost" && detailLead.stage !== "converted" && (<Button size="sm" variant="destructive" onClick={() => setLostLeadDialog(detailLead)}><Flag className="mr-1 h-3 w-3" />Mark as Lost</Button>)}
                {detailLead.stage === "converted" && (<><Button size="sm" variant="default" onClick={() => handleSendAgreement(detailLead)} disabled={sendingAgreement === detailLead.id} className="bg-blue-600 hover:bg-blue-700">{sendingAgreement === detailLead.id ? (<Loader2 className="mr-1 h-3 w-3 animate-spin" />) : (<FileSignature className="mr-1 h-3 w-3" />)}Send Agreement</Button><Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setLeegalitySignDialog(detailLead)} disabled={leegalityLoading === detailLead.id}>{leegalityLoading === detailLead.id ? (<Loader2 className="mr-1 h-3 w-3 animate-spin" />) : (<FileSignature className="mr-1 h-3 w-3" />)}eSign via Leegality</Button></>)}
              </div>
              <LeadCommentsPanel leadId={detailLead.id} leadStage={detailLead.stage} />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <Button onClick={handleUpdate} disabled={updateLead.isPending} className="sm:col-span-2">{updateLead.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
