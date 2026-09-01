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
  PieChart, PieChartIcon, ChartColumn, ShieldCheck,
  PhoneCall, Layers, ChevronDown, ChevronUp
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadCommentsPanel from "@/components/LeadCommentsPanel";
import { useBulkAssignLeads } from "@/hooks/useLeadComments";
import { isToday, isPast, isFuture, subDays, format, startOfDay } from "date-fns";
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
  /** true = admin put this lead in Shared Pool (visible to employees until claimed) */
  in_shared_pool?: boolean | null;
  /** true = employee claimed this lead from Shared Pool (counts toward the 10 pool limit) */
  claimed_from_pool?: boolean | null;
}




// ── Follow-up urgency config ──
const FOLLOWUP_BUCKETS = [
  { value: "overdue", label: "Overdue",   color: "#ef4444", bg: "#fef2f2", icon: "⏰" },
  { value: "today",   label: "Today",     color: "#f97316", bg: "#fff7ed", icon: "📅" },
  { value: "upcoming",label: "Upcoming",  color: "#3b82f6", bg: "#eff6ff", icon: "🔜" },
];

function getFollowupBucket(nextCallDate: string | null | undefined): "overdue" | "today" | "upcoming" | null {
  if (!nextCallDate) return null;
  const d = startOfDay(new Date(nextCallDate));
  const today = startOfDay(new Date());
  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  // upcoming = future, today = due today, overdue = 1 or 2 days past only
  if (diffDays < 0) return "upcoming";
  if (diffDays === 0) return "today";
  if (diffDays >= 1 && diffDays <= 2) return "overdue";
  return null; // 3+ days past → follow-up list se hata do
}

/** Safe merge: never keep two rows with same id */
function dedupeLeads(rows: DbLead[]): DbLead[] {
  const seen = new Set<string>();
  const out: DbLead[] = [];
  for (const l of rows) {
    if (!l?.id || seen.has(l.id)) continue;
    seen.add(l.id);
    out.push({
      ...l,
      stage: l.stage === "New" ? "new" : l.stage,
    });
  }
  return out;
}

/** Employee ko sirf apni assigned leads dikhne chahiye */
function isLeadVisibleToEmployee(lead: DbLead, userId: string): boolean {
  return lead.assigned_to === userId;
}

function getFollowupBucketConfig(bucket: string | null) {
  return FOLLOWUP_BUCKETS.find(b => b.value === bucket) || null;
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

function FollowupPill({ nextCallDate }: { nextCallDate: string | null | undefined }) {
  const bucket = getFollowupBucket(nextCallDate);
  const cfg = getFollowupBucketConfig(bucket);
  if (!cfg || !nextCallDate) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
        <span>{cfg.icon}</span>{cfg.label}
      </span>
      <span className="text-[10px] text-muted-foreground">{format(new Date(nextCallDate), "dd MMM yyyy")}</span>
    </div>
  );
}

// ── Chart Components ──
function LeadCharts({ leads }: { leads: DbLead[] }) {
  const stageData = useMemo(() => {
    try {
      return LEAD_STAGES.map(s => ({
        name: s.label,
        value: leads.filter(l => l?.stage === s.value).length,
        color: s.color
      }));
    } catch (e) {
      console.error("Error processing stage data:", e);
      return LEAD_STAGES.map(s => ({ name: s.label, value: 0, color: s.color }));
    }
  }, [leads]);

  const dailyTrend = useMemo(() => {
    try {
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
    } catch (e) {
      console.error("Error processing trend data:", e);
      return [];
    }
  }, [leads]);

  const hasData = leads && leads.length > 0;

  if (!hasData) {
    return (
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No data available for charts</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
   
    </div>
  );
}

// ── Follow-up Section ──────────────────────────────────────────────────────
function FollowUpSection({
  leads,
  onOpenLead,
}: {
  leads: DbLead[];
  onOpenLead: (lead: DbLead) => void;
}) {
  const [bucketFilter, setBucketFilter] = useState<"all" | "overdue" | "today" | "upcoming">("all");
  const [fuDateFrom, setFuDateFrom] = useState("");
  const [fuDateTo, setFuDateTo] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const followupLeads = useMemo(() => {
    return leads
      .filter(l => !!l.next_call_date)
      .filter(l => l.stage !== "converted" && l.stage !== "lost")
      .filter(l => {
        const bucket = getFollowupBucket(l.next_call_date);
        if (!bucket) return false;
        if (bucketFilter !== "all" && bucket !== bucketFilter) return false;
        if (fuDateFrom && new Date(l.next_call_date as string) < new Date(fuDateFrom)) return false;
        if (fuDateTo && new Date(l.next_call_date as string) > new Date(fuDateTo + "T23:59:59")) return false;
        return true;
      })
      .sort((a, b) => new Date(a.next_call_date as string).getTime() - new Date(b.next_call_date as string).getTime());
  }, [leads, bucketFilter, fuDateFrom, fuDateTo]);

  const counts = useMemo(() => {
    const base = leads.filter(l => {
      if (!l.next_call_date || l.stage === "converted" || l.stage === "lost") return false;
      return !!getFollowupBucket(l.next_call_date);
    });
    return {
      overdue: base.filter(l => getFollowupBucket(l.next_call_date) === "overdue").length,
      today: base.filter(l => getFollowupBucket(l.next_call_date) === "today").length,
      upcoming: base.filter(l => getFollowupBucket(l.next_call_date) === "upcoming").length,
    };
  }, [leads]);

  return (
    <Card className="border-orange-200 shadow-md">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <PhoneCall className="h-5 w-5" style={{ color: "#f97316" }} />
              Follow-ups
              <Badge className="ml-2 bg-orange-500 text-white">
                {counts.overdue + counts.today} Due Today/Overdue
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {counts.overdue + counts.today} leads need attention today - filter by status or date
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCollapsed(c => !c)}>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => setBucketFilter("all")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all text-sm"
            style={{ borderColor: bucketFilter === "all" ? "#64748b" : "#e2e8f0", background: bucketFilter === "all" ? "#f8fafc" : "white" }}
          >
            <span style={{ color: bucketFilter === "all" ? "#334155" : "#374151" }}>All</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#64748b" }}>
              {counts.overdue + counts.today + counts.upcoming}
            </span>
          </button>
          {FOLLOWUP_BUCKETS.map(b => {
            const active = bucketFilter === b.value;
            const isUrgent = b.value === "today" || b.value === "overdue";
            return (
              <button
                key={b.value}
                onClick={() => setBucketFilter(active ? "all" : (b.value as any))}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all text-sm"
                style={{ 
                  borderColor: active ? b.color : (isUrgent ? "#f97316" : "#e2e8f0"), 
                  background: active ? b.bg : (isUrgent ? "#fff7ed" : "white"),
                }}
              >
                <span>{b.icon}</span>
                <span style={{ color: active ? b.color : (isUrgent ? "#f97316" : "#374151") }}>{b.label}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: b.color }}>
                  {counts[b.value as keyof typeof counts]}
                </span>
                {isUrgent && !active && counts[b.value as keyof typeof counts] > 0 && (
                  <span className="text-[10px] text-orange-500 animate-pulse">●</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={fuDateFrom} onChange={e => setFuDateFrom(e.target.value)} className="w-36 text-sm" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={fuDateTo} onChange={e => setFuDateTo(e.target.value)} className="w-36 text-sm" />
          {(fuDateFrom || fuDateTo || bucketFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFuDateFrom(""); setFuDateTo(""); setBucketFilter("all"); }}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="max-h-[400px] overflow-y-auto">
          {followupLeads.length === 0 ? (
            <div className="text-center py-6">
              <PhoneCall className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No follow-ups match this filter.</p>
              <p className="text-xs text-muted-foreground mt-1">All caught up! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {followupLeads.map(lead => {
                const bucket = getFollowupBucket(lead.next_call_date);
                const cfg = getFollowupBucketConfig(bucket);
                const isUrgent = bucket === "today" || bucket === "overdue";
                return (
                  <div
                    key={lead.id}
                    onClick={() => onOpenLead(lead)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors relative ${isUrgent ? 'bg-orange-50/50 border-orange-200' : ''}`}
                    style={{ borderLeftWidth: 4, borderLeftColor: cfg?.color || "#e2e8f0" }}
                  >
                    {isUrgent && (
                      <div className="absolute -top-1 -right-1">
                        <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full">Urgent</span>
                      </div>
                    )}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: avatarColor(lead.name) }}>
                      {getInitials(lead.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold truncate">{lead.name}</p>
                        <StagePill stage={lead.stage} subStage={null} />
                        <TemperatureBadge temperature={lead.temperature} />
                        {isUrgent && (
                          <Badge variant="destructive" className="text-[10px]">Due {bucket === "overdue" ? 'Overdue' : 'Today'}</Badge>
                        )}
                      </div>
                      {lead.remark && <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.remark}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {cfg && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(new Date(lead.next_call_date as string), "dd MMM yyyy")}
                      </p>
                    </div>
                    {lead.phone && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" asChild onClick={e => e.stopPropagation()}>
                        <a href={`tel:${lead.phone}`}><Phone className="h-3.5 w-3.5" /></a>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Bulk Delete Confirmation Dialog ──
function BulkDeleteDialog({ 
  open, 
  onClose, 
  onConfirm, 
  count 
}: { 
  open: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  count: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Bulk Delete Leads
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm mb-2">
            Are you sure you want to delete <strong>{count}</strong> selected lead{count > 1 ? 's' : ''}?
          </p>
          <p className="text-xs text-muted-foreground">
            This action cannot be undone. All lead data including comments and history will be permanently removed.
          </p>
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warning: This will permanently delete all selected leads
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {count} Lead{count > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Stage Change Dialog ──
function BulkStageChangeDialog({ 
  open, 
  onClose, 
  onConfirm, 
  count,
  currentStage
}: { 
  open: boolean; 
  onClose: () => void; 
  onConfirm: (stage: string, subStage: string) => void; 
  count: number;
  currentStage: string | null;
}) {
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedSubStage, setSelectedSubStage] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedStage("");
      setSelectedSubStage("");
    }
  }, [open]);

  const subStages = getSubStagesForStage(selectedStage);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Layers className="h-5 w-5" />
            Bulk Change Stage
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm">
            Change stage for <strong>{count}</strong> selected lead{count > 1 ? 's' : ''}.
            {currentStage && (
              <span className="text-muted-foreground block mt-1">
                Current stage: <Badge variant="outline">{formatStageLabel(currentStage)}</Badge>
              </span>
            )}
          </p>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>New Stage</Label>
              <Select value={selectedStage} onValueChange={(v) => {
                setSelectedStage(v);
                setSelectedSubStage("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage..." />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.icon} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {subStages.length > 0 && (
              <div className="space-y-2">
                <Label>Sub Stage (Optional)</Label>
                <Select value={selectedSubStage} onValueChange={setSelectedSubStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {subStages.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              This will update the stage for all selected leads
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => onConfirm(selectedStage, selectedSubStage)}
            disabled={!selectedStage}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Layers className="mr-2 h-4 w-4" />
            Update {count} Lead{count > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [showAllLeads, setShowAllLeads] = useState(true);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkStageDialogOpen, setBulkStageDialogOpen] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

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
      
      const isAdmin = profile?.role === "admin" || !!canAssign;
      console.log("👑 Is Admin:", isAdmin, "| role:", profile?.role, "| canAssign:", canAssign);
      
      const PAGE_SIZE = 1000;
      let allRows: DbLead[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        // Employees: only their assigned leads
        if (!isAdmin && user?.id) {
          query = query.eq("assigned_to", user.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error("❌ Supabase error:", error);
          throw error;
        }

        const batch = (data as DbLead[]) || [];
        allRows = allRows.concat(batch);
        console.log(`📦 Batch ${from / PAGE_SIZE + 1}: ${batch.length} rows (total so far: ${allRows.length})`);

        if (batch.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      }

      allRows = dedupeLeads(allRows);
      
      console.log("✅ Fetched leads TOTAL (deduped):", allRows.length);
      setLeads(allRows);
      return allRows;
    } catch (error) {
      console.error("❌ Error fetching leads:", error);
      toast.error("Failed to fetch leads");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, canAssign]);

  useEffect(() => {
    if (isInitialFetch) {
      fetchLeads();
      setIsInitialFetch(false);
    }
  }, [fetchLeads, isInitialFetch]);

  useEffect(() => {
    if (!user?.id) return;

    const channelName = `leads-changes-${user.id}`;
    let cancelled = false;

    // Remove leftover channels with this topic (React Strict Mode / canAssign flip)
    supabase
      .getChannels()
      .filter((c) => c.topic === `realtime:${channelName}`)
      .forEach((c) => {
        supabase.removeChannel(c);
      });

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        (payload) => {
          if (cancelled) return;

          const isAdmin = !!canAssign;

          setLeads((prev) => {
            switch (payload.eventType) {
              case "INSERT": {
                const row = payload.new as DbLead;
                if (!row?.id) return prev;
                if (prev.some((l) => l.id === row.id)) return prev;
                if (!isAdmin && !isLeadVisibleToEmployee(row, user.id)) {
                  return prev;
                }
                return dedupeLeads([
                  { ...row, stage: row.stage === "New" ? "new" : row.stage },
                  ...prev,
                ]);
              }
              case "UPDATE": {
                const row = payload.new as DbLead;
                if (!row?.id) return prev;
                const normalized = {
                  ...row,
                  stage: row.stage === "New" ? "new" : row.stage,
                };
                if (!isAdmin && !isLeadVisibleToEmployee(normalized, user.id)) {
                  return prev.filter((l) => l.id !== normalized.id);
                }
                if (prev.some((l) => l.id === normalized.id)) {
                  return prev.map((l) =>
                    l.id === normalized.id ? normalized : l
                  );
                }
                return dedupeLeads([normalized, ...prev]);
              }
              case "DELETE":
                return prev.filter((l) => l.id !== (payload.old as any)?.id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Leads realtime status:", status);
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id, canAssign]);

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
  const [exportStage, setExportStage] = useState("all");
  const [importSummary, setImportSummary] = useState<{ imported: number } | null>(null);
  const [liveTotalCount, setLiveTotalCount] = useState<number | null>(null);
  const [liveCountPulsing, setLiveCountPulsing] = useState(false);

  type StatsFilter = "all" | "today" | "followup" | "hot" | "warm" | "cold" | "converted";
  const [statsFilter, setStatsFilter] = useState<StatsFilter>("all");

  const statsFilterLabels: Record<StatsFilter, string> = {
    all: "All Leads",
    today: "Today's Leads",
    followup: "Follow-ups Due",
    hot: "🔥 Hot Leads",
    warm: "☀️ Warm Leads",
    cold: "❄️ Cold Leads",
    converted: "✅ Converted Leads",
  };

  const fetchLiveTotalCount = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user?.id)
        .single();
      const isAdmin = profile?.role === "admin" || !!canAssign;

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
  }, [user?.id, canAssign]);

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

  const markLeadAsLost = useCallback(async (leadId: string, reason: string) => {
    const lostDate = new Date().toISOString();
    const patch = {
      stage: "lost",
      status: "lost",
      lost_reason: reason,
      lost_date: lostDate,
      business_status: "no-go",
    };

    setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, ...patch } : l)));
    if (detailLead && detailLead.id === leadId) {
      setDetailLead(null);
    }
    setLostLeadDialog(null);

    try {
      const { error } = await supabase
        .from("leads")
        .update(patch)
        .eq("id", leadId);

      if (error) throw error;

      logActivity(leadId, "updated", `Marked as lost - Reason: ${reason}`);
      toast.success("Lead marked as lost");
    } catch (error: any) {
      toast.error(error.message || "Failed to mark lead as lost");
      await fetchLeads();
    }
  }, [detailLead, logActivity, fetchLeads]);

  const assignLead = useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const finalAssignedTo = assigned_to === "unassigned" ? null : assigned_to;
      const assign_date = finalAssignedTo ? new Date().toISOString() : null;

      const patch: Partial<DbLead> = {
        assigned_to: finalAssignedTo,
        assign_date,
        in_shared_pool: false,
        claimed_from_pool: false,
      };

      setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
      if (detailLead && detailLead.id === id) {
        setDetailLead(prev => (prev ? { ...prev, ...patch } : prev));
      }

      const { error } = await supabase
        .from("leads")
        .update(patch)
        .eq("id", id);
        
      if (error) throw error;
      
      return { id, assigned_to: finalAssignedTo };
    },
    onSuccess: () => {
      toast.success("Lead assigned successfully");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to assign lead");
      fetchLeads();
    },
  });

  const getProfileName = useCallback((userId: string | null) => {
    if (!userId) return "Unassigned";
    const p = (profiles as {
      user_id: string;
      display_name: string | null;
      email?: string | null;
    }[]).find((p) => p.user_id === userId);
    if (!p) return "Unknown";
    const displayName = p.display_name != null ? String(p.display_name).trim() : "";
    if (displayName) return displayName;
    const email = p.email != null ? String(p.email).trim() : "";
    if (email) return email;
    return "Unnamed User";
  }, [profiles]);

  const handleUpdateStageFromDetail = useCallback(async (id: string, stage: string, subStage: string) => {
    const updateData: any = { 
      stage, 
      sub_stage: subStage,
    };
    
    const existingLead = leads.find(l => l.id === id);
    
    if (stage === "converted") {
      updateData.status = "converted";
      updateData.business_status = "done";
    } else if (stage === "lost") {
      updateData.status = "lost";
      updateData.business_status = "no-go";
    } else if (existingLead) {
      updateData.status = existingLead.status || stage;
    }

    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...updateData } : l)));
    if (detailLead && detailLead.id === id) {
      setDetailLead(prev => (prev ? { ...prev, ...updateData } : prev));
    }

    try {
      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success(`Stage updated to ${formatStageLabel(stage)}`);
      logActivity(id, "updated", `Stage: ${stage}${subStage ? `, Sub-Stage: ${subStage}` : ''}`);
    } catch (error: any) {
      console.error("Stage update error:", error);
      toast.error(error.message || "Failed to update stage");
      await fetchLeads();
    }
  }, [leads, detailLead, logActivity, fetchLeads]);

  const openLeadDetail = useCallback((lead: DbLead) => {
    setDetailLead(lead);
    logActivity(lead.id, "viewed", `Opened ${lead.name}`);
  }, [logActivity]);

  const handleAddLead = useCallback(async () => {
    if (!form.name || !form.email) { 
      toast.error("Name and Email are required"); 
      return; 
    }
    
    try {
      const assign_date = user?.id ? new Date().toISOString() : null;

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
          assigned_to: user?.id || null,
          assign_date,
        });
      
      if (error) throw error;
      
      setForm(emptyForm);
      setDialogOpen(false);
      toast.success("Lead added & assigned to you");
      await fetchLeads();
    } catch (error: any) {
      console.error("Add lead error:", error);
      toast.error(error.message || "Failed to add lead");
    }
  }, [form, fetchLeads, emptyForm, user?.id]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    
    setBulkDeleteDialogOpen(false);
    
    const previousLeads = leads;
    
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    setSelectedIds(new Set());
    
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .in("id", ids);
      
      if (error) throw error;
      
      await fetchLiveTotalCount();
      
      toast.success(`${ids.length} lead${ids.length > 1 ? 's' : ''} deleted successfully`);
      
      ids.forEach(id => {
        logActivity(id, "deleted", `Bulk deleted lead`);
      });
    } catch (error: any) {
      setLeads(previousLeads);
      console.error("Bulk delete error:", error);
      toast.error(error.message || "Failed to delete leads");
      await fetchLeads();
    }
  }, [selectedIds, leads, fetchLiveTotalCount, logActivity, fetchLeads]);

  const handleBulkStageChange = useCallback(async (stage: string, subStage: string) => {
    if (selectedIds.size === 0 || !stage) return;
    const ids = Array.from(selectedIds);
    
    setBulkStageDialogOpen(false);
    
    const updateData: any = { 
      stage: stage,
      sub_stage: subStage || null,
    };
    
    if (stage === "converted") {
      updateData.status = "converted";
      updateData.business_status = "done";
    } else if (stage === "lost") {
      updateData.status = "lost";
      updateData.business_status = "no-go";
    }
    
    setLeads(prev => prev.map(l => {
      if (ids.includes(l.id)) {
        const updated = { ...l, ...updateData };
        if (stage === "converted") {
          updated.status = "converted";
          updated.business_status = "done";
        } else if (stage === "lost") {
          updated.status = "lost";
          updated.business_status = "no-go";
        }
        return updated;
      }
      return l;
    }));
    
    setSelectedIds(new Set());
    
    try {
      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .in("id", ids);
      
      if (error) throw error;
      
      toast.success(`${ids.length} lead${ids.length > 1 ? 's' : ''} stage updated to ${formatStageLabel(stage)}`);
      
      ids.forEach(id => {
        logActivity(id, "updated", `Bulk stage changed to: ${stage}${subStage ? `, Sub-Stage: ${subStage}` : ''}`);
      });
    } catch (error: any) {
      console.error("Bulk stage change error:", error);
      toast.error(error.message || "Failed to update stages");
      await fetchLeads();
    }
  }, [selectedIds, logActivity, fetchLeads]);

  const filterPresetOptions = useMemo(() => ({
    all: () => true,
    today: (l: DbLead) => isToday(new Date(l.created_at)),
    fresh: (l: DbLead) => 
      (l.status === "new" || l.stage === "ringing") && 
      new Date(l.created_at) >= subDays(new Date(), 3),
    followup: (l: DbLead) => 
      l.next_call_date && new Date(l.next_call_date) <= new Date()
  }), []);

  const filtered = useMemo(() => {
    const presetFn = filterPresetOptions[filterPreset as keyof typeof filterPresetOptions] || (() => true);
    
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
      const createdAt = new Date(l.created_at);
      const matchDateFrom = !dateFrom || createdAt >= new Date(dateFrom);
      const matchDateTo   = !dateTo   || createdAt <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchStatus && matchStage && matchLeadType && matchBudget &&
             matchAssignment && matchEmployee && presetFn(l) && 
             matchDateFrom && matchDateTo && matchTemperature;
    });
  }, [leads, search, filterStatus, filterStage, filterAssignment, 
      filterLeadType, filterBudget, filterTemperature, dateFrom, dateTo, 
      filterPreset, employeeFilter, user, filterPresetOptions]);

  const dashboardLeads = useMemo(() => {
    let base: DbLead[];
    switch (statsFilter) {
      case "today":
        base = filtered.filter(l => isToday(new Date(l.created_at)));
        break;
      case "followup":
        base = filtered.filter(l => {
          const b = getFollowupBucket(l.next_call_date);
          return (b === "overdue" || b === "today" || b === "upcoming") &&
            l.stage !== "converted" && l.stage !== "lost";
        });
        break;
      case "hot":
      case "warm":
      case "cold":
        base = filtered.filter(l => l.temperature === statsFilter);
        break;
      case "converted":
        base = filtered.filter(l => l.stage === "converted");
        break;
      case "all":
      default:
        base = filtered;
        break;
    }

    // Employees: table shows only their assigned leads (pool is a separate section)
    if (!canAssign && user?.id) {
      base = base.filter(l => l.assigned_to === user.id);
    }

    if (!showAllLeads && statsFilter === "all") {
      return base.filter(l => {
        const isTodayLead = isToday(new Date(l.created_at));
        const bucket = getFollowupBucket(l.next_call_date);
        const isActiveFollowup =
          !!bucket && l.stage !== "converted" && l.stage !== "lost";
        return isTodayLead || isActiveFollowup;
      });
    }
    return base;
  }, [filtered, statsFilter, showAllLeads, canAssign, user?.id]);

  const totalPages = Math.ceil(dashboardLeads.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return dashboardLeads.slice(start, end);
  }, [dashboardLeads, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dashboardLeads.length]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleBulkAssign = useCallback(async () => {
    if (selectedIds.size === 0 || !bulkAssignTo) return;
    const assign_date = new Date().toISOString();
    const ids = Array.from(selectedIds);

    const patch = {
      assigned_to: bulkAssignTo,
      assign_date,
      in_shared_pool: false,
      claimed_from_pool: false,
    };

    setLeads(prev => prev.map(l => (ids.includes(l.id) ? { ...l, ...patch } : l)));

    try {
      const { error } = await supabase
        .from("leads")
        .update(patch)
        .in("id", ids);
      
      if (error) throw error;
      
      toast.success(`${selectedIds.size} leads assigned successfully`);
      setSelectedIds(new Set());
      setBulkAssignTo("");
    } catch (e: unknown) { 
      toast.error(e instanceof Error ? e.message : "Assign failed"); 
      await fetchLeads();
    }
  }, [selectedIds, bulkAssignTo, fetchLeads]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
          stage:      "new",
          sub_stage:  "",
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

  const handleBulkImport = useCallback(async () => {
    if (uploadPreview.length === 0) return;
    setUploading(true);
    let success = 0;
    let skipped = 0;

    const normEmail = (e: string | null | undefined) =>
      String(e ?? "").toLowerCase().trim();
    const normPhone = (p: string | null | undefined) =>
      String(p ?? "").replace(/\D/g, "");
    const isFakeEmail = (e: string) =>
      !e ||
      ["no mail", "nomail", "n/a", "na", "none", "-", "null"].includes(e);

    const emailsInFile = [
      ...new Set(
        uploadPreview
          .map((l: any) => normEmail(l.email))
          .filter((e: string) => e && !isFakeEmail(e))
      ),
    ];
    const phonesInFile = [
      ...new Set(
        uploadPreview
          .map((l: any) => normPhone(l.phone))
          .filter((p: string) => p.length >= 8)
      ),
    ];

    const existingEmails = new Set<string>();
    const existingPhones = new Set<string>();

    try {
      if (emailsInFile.length > 0) {
        for (let i = 0; i < emailsInFile.length; i += 100) {
          const chunk = emailsInFile.slice(i, i + 100);
          const { data } = await supabase
            .from("leads")
            .select("email")
            .in("email", chunk);
          (data || []).forEach((r: any) => {
            const e = normEmail(r.email);
            if (e && !isFakeEmail(e)) existingEmails.add(e);
          });
        }
      }
      if (phonesInFile.length > 0) {
        for (let i = 0; i < phonesInFile.length; i += 100) {
          const chunk = phonesInFile.slice(i, i + 100);
          const { data } = await supabase
            .from("leads")
            .select("phone")
            .in("phone", chunk);
          (data || []).forEach((r: any) => {
            const p = normPhone(r.phone);
            if (p.length >= 8) existingPhones.add(p);
          });
        }
      }
    } catch (err) {
      console.error("Duplicate pre-check failed:", err);
    }

    const seenInFile = new Set<string>();

    for (const lead of uploadPreview) {
      const leadName = String(lead.name ?? "").trim();
      if (!leadName) {
        skipped++;
        continue;
      }

      const emailKey = normEmail(lead.email);
      const phoneKey = normPhone(lead.phone);
      const hasRealEmail = !!(emailKey && !isFakeEmail(emailKey));
      const hasRealPhone = phoneKey.length >= 8;

      const fileKey = hasRealEmail
        ? `e:${emailKey}`
        : hasRealPhone
        ? `p:${phoneKey}`
        : `n:${leadName.toLowerCase()}`;

      if (seenInFile.has(fileKey)) {
        skipped++;
        continue;
      }
      seenInFile.add(fileKey);

      if (hasRealEmail && existingEmails.has(emailKey)) {
        skipped++;
        continue;
      }
      if (hasRealPhone && existingPhones.has(phoneKey)) {
        skipped++;
        continue;
      }

      try {
        const { error } = await supabase.from("leads").insert({
          name: leadName,
          email: hasRealEmail ? String(lead.email ?? "").trim() : null,
          phone: lead.phone || null,
          company: lead.company || null,
          source: lead.source || "Excel Import",
          value: Number(lead.value) || 0,
          status: "new",
          lead_type: lead.lead_type || null,
          address: lead.address || null,
          cx_comment: lead.cx_comment || null,
          budget: lead.budget || null,
          stage: "new",
          sub_stage: "",
          remark: lead.remark || null,
          temperature: lead.temperature || "warm",
          assigned_to: null,
          assign_date: null,
          in_shared_pool: false,
          claimed_from_pool: false,
        });

        if (error) {
          console.error("Insert error:", lead.name, error.message);
          skipped++;
          continue;
        }

        if (hasRealEmail) existingEmails.add(emailKey);
        if (hasRealPhone) existingPhones.add(phoneKey);
        success++;
      } catch (err) {
        console.error("Import error:", lead.name, err);
        skipped++;
      }
    }

    setUploading(false);
    setUploadPreview([]);
    if (fileRef.current) fileRef.current.value = "";

    await fetchLeads();
    await fetchLiveTotalCount();

    setImportSummary({ imported: success });

    if (skipped > 0) {
      toast.success(
        `${success} leads imported · ${skipped} duplicates skipped`
      );
    } else {
      toast.success(`${success} leads imported`);
    }
    setUploadOpen(false);
  }, [uploadPreview, fetchLeads, fetchLiveTotalCount]);

  const handleUpdate = useCallback(async () => {
    if (!editLead) return;
    
    try {
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
          next_call_date: editLead.next_call_date,
        })
        .eq("id", editLead.id);
      
      if (error) throw error;
      
      setLeads(prev => prev.map(l => (l.id === editLead.id ? { ...l, ...editLead } : l)));
      logActivity(editLead.id, "updated", `Status: ${editLead.status}`);
      setEditLead(null);
      toast.success("Lead updated");
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update lead");
    }
  }, [editLead, logActivity]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setLeads(prev => prev.filter(l => l.id !== id));
      setDetailLead(null);
      toast.success("Lead deleted");
      await fetchLiveTotalCount();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lead");
    }
  }, [fetchLiveTotalCount]);

  const buildExportRows = useCallback((rows: DbLead[]) => {
    return rows.map(l => ({
      Name: l.name, Email: l.email, Number: l.phone, Company: l.company,
      "Lead Type": l.lead_type, Address: l.address, "CX Comment": l.cx_comment,
      Budget: l.budget, Stage: formatStageLabel(l.stage), "Sub Stage": formatStageLabel(l.sub_stage), Remark: l.remark,
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
  }, [getProfileName]);

  const handleExport = useCallback(() => {
    const exportData = buildExportRows(leads);
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads_export.xlsx");
    toast.success("Leads exported!");
  }, [leads, buildExportRows]);

  const handleExportByStage = useCallback((stage: string) => {
    const source = stage === "all" ? leads : leads.filter(l => l.stage === stage);
    if (source.length === 0) {
      toast.error(`No leads found for stage "${stage === "all" ? "All" : formatStageLabel(stage)}"`);
      return;
    }
    const exportData = buildExportRows(source);
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const stageLabel = stage === "all" ? "All Leads" : formatStageLabel(stage);
    XLSX.utils.book_append_sheet(wb, ws, stageLabel.slice(0, 31));
    XLSX.writeFile(wb, `leads_export_${stage === "all" ? "all" : stage}.xlsx`);
    toast.success(`${source.length} ${stageLabel} lead(s) exported!`);
  }, [leads, buildExportRows]);

  const clearFilters = useCallback(() => {
    setSearchInput(""); setSearch(""); setFilterStatus("all"); setFilterStage("all");
    setFilterAssignment("all");
    setFilterLeadType("all"); setFilterBudget("all");
    setFilterTemperature("all");
    setDateFrom(""); setDateTo(""); setFilterPreset("all");
    setEmployeeFilter(null);
    setCurrentPage(1);
  }, []);

  const handleTemperatureUpdate = useCallback(async (leadId: string, temperature: string) => {
    setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, temperature } : l)));
    if (detailLead && detailLead.id === leadId) {
      setDetailLead(prev => (prev ? { ...prev, temperature } : prev));
    }

    try {
      const { error } = await supabase
        .from("leads")
        .update({ temperature })
        .eq("id", leadId);
      
      if (error) throw error;
      
      logActivity(leadId, "updated", `Temperature changed to: ${temperature}`);
      toast.success(`Temperature updated to ${temperature.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update temperature");
      await fetchLeads();
    }
  }, [detailLead, logActivity, fetchLeads]);

  const stats = useMemo(() => {
    const visible = canAssign ? leads : leads.filter(l => l.assigned_to === user?.id);
    const totalLeads = visible.length;
    const totalValue = visible.reduce((s, l) => s + (l.value || 0), 0);
    const convertedCount = visible.filter(l => l.status === "converted" || l.stage === "converted").length;
    const lostCount = visible.filter(l => l.stage === "lost").length;
    const hotCount = visible.filter(l => l.temperature === "hot").length;
    const warmCount = visible.filter(l => l.temperature === "warm").length;
    const coldCount = visible.filter(l => l.temperature === "cold").length;
    const todayCount = visible.filter(l => isToday(new Date(l.created_at))).length;
    const followupCount = visible.filter(l => {
      const b = getFollowupBucket(l.next_call_date);
      return (b === "overdue" || b === "today") && l.stage !== "converted" && l.stage !== "lost";
    }).length;
    return { totalLeads, totalValue, convertedCount, lostCount, hotCount, warmCount, coldCount, todayCount, followupCount };
  }, [leads, canAssign, user?.id]);

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

      <BulkDeleteDialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.size}
      />

      <BulkStageChangeDialog
        open={bulkStageDialogOpen}
        onClose={() => setBulkStageDialogOpen(false)}
        onConfirm={handleBulkStageChange}
        count={selectedIds.size}
        currentStage={selectedIds.size === 1 ? leads.find(l => l.id === Array.from(selectedIds)[0])?.stage || null : null}
      />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm">Manage and track all your leads in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <Select value={exportStage} onValueChange={setExportStage}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Export Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => handleExportByStage(exportStage)}>
              <Download className="mr-2 h-4 w-4" />
              Export {exportStage === "all" ? "All" : formatStageLabel(exportStage)}
            </Button>
          </div>
          <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) { setUploadPreview([]); setImportSummary(null); if (fileRef.current) fileRef.current.value = ""; } }}>
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
                    Required columns: Name, Email, Phone, Company, Source, Value, Lead Type, Budget, Remark, Temperature
                  </p>
                  <p className="text-xs text-violet-600 mb-2 flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Imported leads are added as unassigned New leads
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
                  </div>
                )}
              </div>
              <DialogFooter>
                {uploadPreview.length > 0 && (
                  <Button onClick={handleBulkImport} disabled={uploading || uploadPreview.length === 0}>
                    {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</> : `Import ${uploadPreview.length} Leads`}
                  </Button>
                )}
                {uploadPreview.length === 0 && importSummary && (
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <button
          type="button"
          onClick={() => setStatsFilter("all")}
          className={`text-left col-span-2 sm:col-span-1 lg:col-span-1 rounded-xl border-2 transition-all ${statsFilter === "all" ? "border-primary ring-2 ring-primary/20" : "border-primary/20 hover:border-primary/40"}`}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Users style={{ color: "#3b82f6", width: 24, height: 24 }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-2xl font-bold leading-none">
                    {liveTotalCount !== null ? liveTotalCount : stats.totalLeads}
                  </p>
                  <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${liveCountPulsing ? "animate-ping" : "animate-pulse"}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Radio className="h-3 w-3" /> Total Leads (Live)
                </p>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatsFilter(statsFilter === "today" ? "all" : "today")}
          className={`text-left rounded-xl border-2 transition-all ${statsFilter === "today" ? "border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/50" : "border-emerald-200 hover:border-emerald-400"}`}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Calendar style={{ color: "#10b981", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: "#10b981" }}>{stats.todayCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Today's Leads</p>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatsFilter(statsFilter === "followup" ? "all" : "followup")}
          className={`text-left rounded-xl border-2 transition-all ${statsFilter === "followup" ? "border-orange-500 ring-2 ring-orange-200 bg-orange-50/50" : "border-orange-200 hover:border-orange-400"}`}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <PhoneCall style={{ color: "#f97316", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: "#f97316" }}>{stats.followupCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Follow-ups Due</p>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatsFilter(statsFilter === "hot" ? "all" : "hot")}
          className={`text-left rounded-xl border-2 transition-all ${statsFilter === "hot" ? "border-red-500 ring-2 ring-red-200 bg-red-50/50" : "border-transparent hover:border-red-300"}`}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Flame style={{ color: "#ef4444", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: "#ef4444" }}>{stats.hotCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Hot Leads</p>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatsFilter(statsFilter === "warm" ? "all" : "warm")}
          className={`text-left rounded-xl border-2 transition-all ${statsFilter === "warm" ? "border-orange-500 ring-2 ring-orange-200 bg-orange-50/50" : "border-transparent hover:border-orange-300"}`}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Sun style={{ color: "#f97316", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: "#f97316" }}>{stats.warmCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Warm Leads</p>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatsFilter(statsFilter === "cold" ? "all" : "cold")}
          className={`text-left rounded-xl border-2 transition-all ${statsFilter === "cold" ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50/50" : "border-transparent hover:border-blue-300"}`}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Snowflake style={{ color: "#3b82f6", width: 24, height: 24 }} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color: "#3b82f6" }}>{stats.coldCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Cold Leads</p>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatsFilter(statsFilter === "converted" ? "all" : "converted")}
          className={`text-left col-span-2 sm:col-span-1 rounded-xl border-2 transition-all ${statsFilter === "converted" ? "border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/50" : "border-transparent hover:border-emerald-300"}`}
        >
          <div className="p-4">
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
          </div>
        </button>
      </div>

      {statsFilter !== "all" && (
        <div className="flex items-center gap-2 -mt-2">
          <Badge className="bg-primary/10 text-primary border border-primary/30">
            Filtering by: {statsFilterLabels[statsFilter]}
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStatsFilter("all")}>
            <X className="h-3 w-3 mr-1" />Clear
          </Button>
        </div>
      )}

      <LeadCharts leads={leads} />

      {canAssign && typedProfiles.length > 0 && (
        <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Employee Leads</h2>
                <Badge variant="outline" className="text-sm">
                  Total: {liveTotalCount !== null ? liveTotalCount : leads.length}
                </Badge>
                <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${liveCountPulsing ? "animate-ping" : "animate-pulse"}`} />
                {employeeFilter && (
                  <Badge 
                    variant="default" 
                    className="bg-primary/10 text-primary border-primary/30 cursor-pointer hover:bg-primary/20"
                    onClick={() => setEmployeeFilter(null)}
                  >
                    {employeeFilter === "unassigned" 
                      ? "Unassigned" 
                      : typedProfiles.find(p => p.user_id === employeeFilter)?.display_name || "Selected"}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {typedProfiles
                    .sort((a, b) => {
                      const aCount = leads.filter(l => l.assigned_to === a.user_id).length;
                      const bCount = leads.filter(l => l.assigned_to === b.user_id).length;
                      return bCount - aCount;
                    })
                    .slice(0, 4)
                    .map(emp => {
                      const count = leads.filter(l => l.assigned_to === emp.user_id).length;
                      const isActive = employeeFilter === emp.user_id;
                      if (count === 0) return null;
                      return (
                        <Button
                          key={emp.user_id}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          className={`text-xs h-7 ${isActive ? "bg-primary" : ""}`}
                          onClick={() => setEmployeeFilter(isActive ? null : emp.user_id)}
                        >
                          <span className="truncate max-w-[60px]">{emp.display_name || "Unknown"}</span>
                          <Badge variant={isActive ? "secondary" : "outline"} className="ml-1 text-[9px] h-4 px-1">
                            {count}
                          </Badge>
                        </Button>
                      );
                    })}
                </div>
                
                {leads.filter(l => !l.assigned_to).length > 0 && (
                  <Button
                    variant={employeeFilter === "unassigned" ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-7 ${employeeFilter === "unassigned" ? "bg-primary" : ""}`}
                    onClick={() => setEmployeeFilter(employeeFilter === "unassigned" ? null : "unassigned")}
                  >
                    Unassigned
                    <Badge variant={employeeFilter === "unassigned" ? "secondary" : "outline"} className="ml-1 text-[9px] h-4 px-1">
                      {leads.filter(l => !l.assigned_to).length}
                    </Badge>
                  </Button>
                )}
                
                <Select 
                  value={employeeFilter || "all"} 
                  onValueChange={(v) => setEmployeeFilter(v === "all" ? null : v)}
                >
                  <SelectTrigger className="w-44 h-7 text-xs">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📋 All Employees</SelectItem>
                    <SelectItem value="unassigned">❓ Unassigned ({leads.filter(l => !l.assigned_to).length})</SelectItem>
                    {typedProfiles
                      .sort((a, b) => {
                        const aCount = leads.filter(l => l.assigned_to === a.user_id).length;
                        const bCount = leads.filter(l => l.assigned_to === b.user_id).length;
                        return bCount - aCount;
                      })
                      .map(emp => {
                        const count = leads.filter(l => l.assigned_to === emp.user_id).length;
                        const converted = leads.filter(l => l.assigned_to === emp.user_id && l.stage === "converted").length;
                        return (
                          <SelectItem key={emp.user_id} value={emp.user_id}>
                            <span className="flex items-center justify-between w-full gap-4">
                              <span className="truncate">{emp.display_name || "Unknown"}</span>
                              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{count} leads</span>
                                {converted > 0 && <span className="text-green-600">✓{converted}</span>}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-t">
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{leads.filter(l => l.assigned_to).length}</span> Assigned
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{leads.filter(l => !l.assigned_to).length}</span> Unassigned
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{leads.filter(l => l.stage === "converted").length}</span> Converted
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{leads.filter(l => l.temperature === "hot").length}</span> 🔥 Hot
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{leads.filter(l => l.temperature === "warm").length}</span> ☀️ Warm
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{leads.filter(l => l.temperature === "cold").length}</span> ❄️ Cold
              </span>
              {employeeFilter && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEmployeeFilter(null)}
                  className="h-6 text-xs text-primary hover:text-primary/80"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

      <FollowUpSection leads={canAssign ? leads : leads.filter(l => l.assigned_to === user?.id)} onOpenLead={openLeadDetail} />

      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
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
              <Button 
                size="sm" 
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setBulkStageDialogOpen(true)}
                disabled={selectedIds.size === 0}
              >
                <Layers className="mr-1 h-4 w-4" />Bulk Stage
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="mr-1 h-4 w-4" />Bulk Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {showAllLeads ? (
                  <>Total Leads: <span className="text-primary">{dashboardLeads.length}</span></>
                ) : (
                  <>Showing <span style={{ color: "#f97316" }}>Today's + Follow-up</span> leads: <span className="text-primary">{dashboardLeads.length}</span></>
                )}
                {dashboardLeads.length !== leads.length && showAllLeads && <span className="text-muted-foreground font-normal"> (filtered from {leads.length})</span>}
              </p>
              <Button
                variant={showAllLeads ? "outline" : "default"}
                size="sm"
                onClick={() => setShowAllLeads(s => !s)}
                className={!showAllLeads ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Layers className="mr-2 h-3.5 w-3.5" />
                {showAllLeads ? "Show Today + Follow-ups Only" : "Show All Leads"}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExportByStage(filterStage)}>
                <Download className="mr-2 h-3 w-3" />
                Export {filterStage === "all" ? "Current View" : formatStageLabel(filterStage)}
              </Button>
            </div>
          </div>

          {dashboardLeads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No leads found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {showAllLeads ? "Try adjusting your filters." : "No leads created today or due for follow-up. Click \"Show All Leads\" to see everything."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={dashboardLeads.length > 0 && dashboardLeads.every(l => selectedIds.has(l.id))} onCheckedChange={() => { const all = dashboardLeads.every(l => selectedIds.has(l.id)); setSelectedIds(prev => { const next = new Set(prev); dashboardLeads.forEach(l => all ? next.delete(l.id) : next.add(l.id)); return next; }); }} /></TableHead>
                      <TableHead>Lead Name</TableHead><TableHead>Company</TableHead><TableHead>Phone</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead><TableHead>Stage / Sub Stage</TableHead>
                      <TableHead>Temperature</TableHead><TableHead>Follow-up</TableHead><TableHead>Assigned To</TableHead>
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
                          <TableCell><FollowupPill nextCallDate={lead.next_call_date} /></TableCell>
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
                                disabled={!canAssign}
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
              
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between mt-4 gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, dashboardLeads.length)} of {dashboardLeads.length} leads
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
                <div><p className="text-muted-foreground text-xs">Follow-up Date</p><FollowupPill nextCallDate={detailLead.next_call_date} /></div>
                
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
              <div className="grid gap-2"><Label>Follow-up / Next Call Date</Label><Input type="date" value={editLead.next_call_date ? editLead.next_call_date.slice(0, 10) : ""} onChange={e => setEditLead({ ...editLead, next_call_date: e.target.value || null })} /></div>
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
              <p className="text-xs text-muted-foreground">Not assigned to any employee</p>
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
