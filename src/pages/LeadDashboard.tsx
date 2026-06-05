import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmQuery } from "@/hooks/useCrm";
import { useAllProfiles, useCanAssignTasks, useIsOwnerOrAdmin, useIsManager } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkAssignLeads } from "@/hooks/useLeadComments";
import { useLeadActivityLogger } from "@/hooks/useLeadActivity";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone, Calendar, Sparkles, UserCheck, Clock, Loader2,
  Users, MessageSquare, CheckSquare, AlertCircle,
} from "lucide-react";
import { format, isToday, isPast, startOfDay, subDays } from "date-fns";
import { toast } from "sonner";
import { formatStageLabel } from "@/lib/leadStages";
import LeadCommentsPanel from "@/components/LeadCommentsPanel";
import LeadActivityFeed from "@/components/LeadActivityFeed";

interface DbLead {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  status: string; stage: string | null; sub_stage: string | null; assigned_to: string | null;
  created_at: string; next_call_date: string | null; business_status: string | null;
  cx_comment: string | null;
}

interface Activity {
  id: string; title: string; type: string; assigned_to: string | null;
  due_date: string | null; task_status: string | null; completed: boolean | null;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default", contacted: "outline", answered: "outline", not_answered: "outline",
  qualified: "secondary", converted: "default", lost: "destructive",
};

function isFreshLead(lead: DbLead) {
  const created = new Date(lead.created_at);
  const threeDaysAgo = subDays(new Date(), 3);
  return (lead.status === "new" || lead.stage === "new") && created >= threeDaysAgo;
}

function isTodayLead(lead: DbLead) {
  return isToday(new Date(lead.created_at));
}

function isFollowUpDue(lead: DbLead) {
  if (!lead.next_call_date) return false;
  const d = startOfDay(new Date(lead.next_call_date));
  const today = startOfDay(new Date());
  return d <= today;
}

export default function LeadDashboard() {
  const { user } = useAuth();
  const canAssign = useCanAssignTasks();
  const isLeader = useIsOwnerOrAdmin() || useIsManager();
  const { data: profiles = [] } = useAllProfiles();
  const { data: leads = [], isLoading } = useCrmQuery<DbLead>("leads");
  const bulkAssign = useBulkAssignLeads();
  const logActivity = useLeadActivityLogger();

  const { data: myTasks = [] } = useQuery({
    queryKey: ["my_activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("assigned_to", user!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [detailLead, setDetailLead] = useState<DbLead | null>(null);
  const [activeTab, setActiveTab] = useState("daily");

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const p = (profiles as { user_id: string; display_name: string | null }[]).find((p) => p.user_id === userId);
    return p?.display_name || "Unknown";
  };

  const myLeads = useMemo(() => leads.filter((l) => l.assigned_to === user?.id), [leads, user]);
  const todayLeads = useMemo(() => leads.filter(isTodayLead), [leads]);
  const freshLeads = useMemo(() => leads.filter(isFreshLead), [leads]);
  const followUpLeads = useMemo(() => leads.filter(isFollowUpDue), [leads]);
  const unassignedLeads = useMemo(() => leads.filter((l) => !l.assigned_to), [leads]);
  const todayTasks = useMemo(() =>
    myTasks.filter((t) => t.due_date && isToday(new Date(t.due_date)) && t.task_status !== "completed"),
    [myTasks]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (list: DbLead[]) => {
    const allSelected = list.every((l) => selectedIds.has(l.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        list.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        list.forEach((l) => next.add(l.id));
        return next;
      });
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) { toast.error("Pehle leads select karo"); return; }
    if (!bulkAssignTo) { toast.error("Employee select karo"); return; }
    try {
      const count = await bulkAssign.mutateAsync({ leadIds: Array.from(selectedIds), assignedTo: bulkAssignTo });
      toast.success(`${count} leads assign ho gaye — ${getProfileName(bulkAssignTo)}`);
      setSelectedIds(new Set());
      setBulkAssignTo("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Assign nahi hua");
    }
  };

  const openLead = (lead: DbLead) => {
    setDetailLead(lead);
    logActivity(lead.id, "viewed", `Dashboard: ${lead.name}`);
  };

  const getTabLeads = (): DbLead[] => {
    switch (activeTab) {
      case "daily": return myLeads.filter(isFollowUpDue);
      case "today": return todayLeads;
      case "fresh": return freshLeads;
      case "mine": return myLeads;
      case "followup": return followUpLeads;
      case "unassigned": return unassignedLeads;
      default: return myLeads;
    }
  };

  const tabLeads = getTabLeads();

  const LeadTable = ({ list }: { list: DbLead[] }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {canAssign && (
              <TableHead className="w-10">
                <Checkbox
                  checked={list.length > 0 && list.every((l) => selectedIds.has(l.id))}
                  onCheckedChange={() => toggleSelectAll(list)}
                />
              </TableHead>
            )}
            <TableHead>Lead</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Next Call</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canAssign ? 7 : 6} className="text-center text-sm text-muted-foreground py-8">
                Koi lead nahi mili is filter mein
              </TableCell>
            </TableRow>
          ) : list.map((lead) => (
            <TableRow key={lead.id} className={isFollowUpDue(lead) ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
              {canAssign && (
                <TableCell>
                  <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                </TableCell>
              )}
              <TableCell>
                <p className="font-medium text-sm">{lead.name}</p>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <Phone className="h-3 w-3" />{lead.phone}
                  </a>
                )}
                {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
              </TableCell>
              <TableCell><span className="text-xs">{formatStageLabel(lead.stage)}</span></TableCell>
              <TableCell><Badge variant={statusColors[lead.status] || "outline"} className="text-xs">{formatStageLabel(lead.status)}</Badge></TableCell>
              <TableCell className="text-xs">{getProfileName(lead.assigned_to)}</TableCell>
              <TableCell>
                {lead.next_call_date ? (
                  <span className={`text-xs flex items-center gap-1 ${isPast(new Date(lead.next_call_date)) && !isToday(new Date(lead.next_call_date)) ? "text-destructive font-medium" : ""}`}>
                    <Calendar className="h-3 w-3" />
                    {format(new Date(lead.next_call_date), "dd MMM yyyy")}
                  </span>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openLead(lead)}>Open</Button>
                  {lead.phone && (
                    <Button size="sm" variant="ghost" className="h-7" asChild>
                      <a href={`tel:${lead.phone}`} onClick={() => logActivity(lead.id, "called", lead.phone || undefined)}>
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lead Dashboard</h1>
        <p className="text-muted-foreground">Daily calls, follow-ups, comments aur bulk assignment — sab ek jagah</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Phone className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{myLeads.length}</p><p className="text-xs text-muted-foreground">Mere Leads</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Calendar className="h-5 w-5 text-blue-500" /></div>
          <div><p className="text-2xl font-bold">{todayLeads.length}</p><p className="text-xs text-muted-foreground">Aaj ke Leads</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Sparkles className="h-5 w-5 text-green-500" /></div>
          <div><p className="text-2xl font-bold">{freshLeads.length}</p><p className="text-xs text-muted-foreground">Fresh Leads</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-amber-500" /></div>
          <div><p className="text-2xl font-bold">{followUpLeads.length}</p><p className="text-xs text-muted-foreground">Follow-up Due</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><CheckSquare className="h-5 w-5 text-purple-500" /></div>
          <div><p className="text-2xl font-bold">{todayTasks.length}</p><p className="text-xs text-muted-foreground">Aaj ke Tasks</p></div>
        </CardContent></Card>
        {canAssign && (
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Users className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold">{unassignedLeads.length}</p><p className="text-xs text-muted-foreground">Unassigned</p></div>
          </CardContent></Card>
        )}
      </div>

      {/* Daily Tasks */}
      {todayTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Aaj ke Daily Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <Badge variant="outline" className="text-xs mt-1">{task.type}</Badge>
                  </div>
                  <Badge>{task.task_status || "pending"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Assign Bar */}
      {canAssign && selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <Badge variant="default"><CheckSquare className="h-3 w-3 mr-1" />{selectedIds.size} leads selected</Badge>
            <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Employee select karo" /></SelectTrigger>
              <SelectContent>
                {(profiles as { user_id: string; display_name: string | null }[]).map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || "Unknown"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleBulkAssign} disabled={bulkAssign.isPending}>
              {bulkAssign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserCheck className="mr-1 h-4 w-4" />Bulk Assign</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </CardContent>
        </Card>
      )}

      {/* Lead Tabs */}
      <Card>
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="daily" className="text-xs">Aaj Call Karo ({myLeads.filter(isFollowUpDue).length})</TabsTrigger>
              <TabsTrigger value="today" className="text-xs">Today's Leads ({todayLeads.length})</TabsTrigger>
              <TabsTrigger value="fresh" className="text-xs">Fresh Leads ({freshLeads.length})</TabsTrigger>
              <TabsTrigger value="mine" className="text-xs">Mere Leads ({myLeads.length})</TabsTrigger>
              <TabsTrigger value="followup" className="text-xs">Follow-ups ({followUpLeads.length})</TabsTrigger>
              {canAssign && <TabsTrigger value="unassigned" className="text-xs">Unassigned ({unassignedLeads.length})</TabsTrigger>}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          <LeadTable list={tabLeads} />
        </CardContent>
      </Card>

      {/* Activity feed for managers */}
      {isLeader && <LeadActivityFeed />}

      {/* Lead Detail + Comments Dialog */}
      <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {detailLead?.name}
            </DialogTitle>
          </DialogHeader>
          {detailLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{detailLead.phone || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Company</p><p className="font-medium">{detailLead.company || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Stage</p><p className="font-medium">{formatStageLabel(detailLead.stage)}</p></div>
                <div><p className="text-muted-foreground text-xs">Assigned</p><p className="font-medium">{getProfileName(detailLead.assigned_to)}</p></div>
              </div>
              <div className="flex gap-2">
                {detailLead.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${detailLead.phone}`} onClick={() => logActivity(detailLead.id, "called", detailLead.phone || undefined)}>
                      <Phone className="mr-1 h-4 w-4" />Call
                    </a>
                  </Button>
                )}
                {detailLead.phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`https://wa.me/${detailLead.phone.replace(/[^0-9]/g, "")}`} target="_blank" onClick={() => logActivity(detailLead.id, "whatsapp", detailLead.phone || undefined)}>
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
              <LeadCommentsPanel leadId={detailLead.id} leadStage={detailLead.stage} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
