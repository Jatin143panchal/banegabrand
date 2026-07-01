import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useHasRole } from "@/hooks/useAdmin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, UserCheck, Loader2, CheckSquare, AlertCircle, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { isToday, subDays } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import LeadActivityFeed from "@/components/LeadActivityFeed";

interface Activity { 
  id: string; 
  title: string; 
  type: string; 
  description: string | null; 
  assigned_to: string | null; 
  completed: boolean | null; 
  task_status: string | null; 
  employee_remarks: string | null; 
  due_date: string | null; 
  contact_name: string | null; 
  created_at: string; 
}

interface Lead { 
  id: string; 
  name: string; 
  status: string; 
  assigned_to: string | null; 
  business_status: string | null; 
  value: number | null; 
  company: string | null; 
  phone: string | null; 
  stage: string | null; 
  created_at: string; 
}

interface Profile { 
  id: string; 
  user_id: string; 
  display_name: string | null; 
}

export default function TaskAssignment() {
  const { user } = useAuth();
  const isAdmin = useHasRole("admin", "owner", "hr_manager", "tl");
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ 
    title: "", 
    type: "task", 
    description: "", 
    assigned_to: "", 
    due_date: "", 
    contact_name: "" 
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [leadTab, setLeadTab] = useState("all");
  const [error, setError] = useState<string | null>(null);

  // Fetch Profiles with better error handling
  const { 
    data: profiles = [], 
    isLoading: pl, 
    error: profilesError,
    refetch: refetchProfiles 
  } = useQuery({
    queryKey: ["profiles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, display_name")
        .order("display_name");
      
      if (error) throw new Error(error.message);
      return data as Profile[];
    },
    enabled: !!user && isAdmin,
    retry: 2,
  });

  // Fetch Activities
  const { 
    data: activities = [], 
    isLoading: al, 
    error: activitiesError,
    refetch: refetchActivities 
  } = useQuery({
    queryKey: ["admin", "activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw new Error(error.message);
      return data as Activity[];
    },
    enabled: !!user && isAdmin,
    retry: 2,
  });

  // Fetch Leads
  const { 
    data: leads = [], 
    isLoading: ll, 
    error: leadsError,
    refetch: refetchLeads 
  } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw new Error(error.message);
      return data as Lead[];
    },
    enabled: !!user && isAdmin,
    retry: 2,
  });

  // Assign Task Mutation
  const assignTask = useMutation({
    mutationFn: async (task: any) => {
      const { error } = await supabase.from("activities").insert({
        ...task,
        user_id: task.assigned_to || user!.id,
        completed: false,
        task_status: "pending",
      });
      if (error) throw new Error(error.message);
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "activities"] });
      toast.success("Task assigned successfully");
      setDialogOpen(false);
      setForm({ title: "", type: "task", description: "", assigned_to: "", due_date: "", contact_name: "" });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to assign task");
      setError(e.message);
    },
  });

  // Assign Lead Mutation
  const assignLead = useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to })
        .eq("id", id);
      
      if (error) throw new Error(error.message);
      return { id, assigned_to };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success("Lead assigned successfully");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to assign lead");
    },
  });

  // Update Business Status Mutation
  const updateBusinessStatus = useMutation({
    mutationFn: async ({ id, business_status }: { id: string; business_status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ business_status })
        .eq("id", id);
      
      if (error) throw new Error(error.message);
      return { id, business_status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success("Business status updated");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to update business status");
    },
  });

  // Bulk Assign Leads
  const bulkAssign = useMutation({
    mutationFn: async ({ leadIds, assignedTo }: { leadIds: string[]; assignedTo: string }) => {
      const { error, count } = await supabase
        .from("leads")
        .update({ assigned_to: assignedTo })
        .in("id", leadIds);
      
      if (error) throw new Error(error.message);
      return count || leadIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success(`${count} leads assigned successfully`);
      setSelectedIds(new Set());
      setBulkAssignTo("");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Bulk assign failed");
    },
  });

  const getTaskStatus = (act: Activity) =>
    act.task_status || (act.completed ? "completed" : "pending");

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const p = (profiles as Profile[]).find(p => p.user_id === userId);
    return p?.display_name || "Unknown";
  };

  const handleAdd = async () => {
    if (!form.title) {
      toast.error("Please enter a task title");
      return;
    }
    await assignTask.mutateAsync({
      title: form.title,
      type: form.type,
      description: form.description || null,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      contact_name: form.contact_name || null,
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { 
      const next = new Set(prev); 
      if (next.has(id)) next.delete(id); 
      else next.add(id); 
      return next; 
    });
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one lead");
      return;
    }
    if (!bulkAssignTo) {
      toast.error("Please select an employee to assign");
      return;
    }
    await bulkAssign.mutateAsync({ 
      leadIds: Array.from(selectedIds), 
      assignedTo: bulkAssignTo 
    });
  };

  // Check if user is admin
  if (!isAdmin) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to view this page. Only admins can access task assignment.
        </p>
      </Card>
    );
  }

  // Loading state
  if (pl || al || ll) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading task assignment data...</p>
      </div>
    );
  }

  // Error state
  if (profilesError || activitiesError || leadsError) {
    const errorMsg = profilesError?.message || activitiesError?.message || leadsError?.message;
    return (
      <Card className="p-8 text-center border-red-200 bg-red-50">
        <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Data</h2>
        <p className="text-red-600 mb-4">{errorMsg || "Failed to load data"}</p>
        <Button onClick={() => {
          refetchProfiles();
          refetchActivities();
          refetchLeads();
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  const assignedLeads = leads.filter(l => l.assigned_to).length;
  const pendingTasks = activities.filter(a => getTaskStatus(a) !== "completed").length;
  const doneTasks = activities.filter(a => getTaskStatus(a) === "completed").length;

  const filteredLeads = leads.filter(l => {
    if (leadTab === "today") return isToday(new Date(l.created_at));
    if (leadTab === "fresh") return (l.status === "new" || l.stage === "new") && new Date(l.created_at) >= subDays(new Date(), 3);
    if (leadTab === "unassigned") return !l.assigned_to;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task & Lead Assignment</h1>
          <p className="text-muted-foreground">Assign tasks and leads to team members — track overall status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Assign Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign New Task</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  placeholder="Enter task title"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["call", "email", "meeting", "task", "note"].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                  <SelectContent>
                    {(profiles as Profile[]).map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.display_name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  placeholder="Task description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  value={form.due_date} 
                  onChange={e => setForm({ ...form, due_date: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Contact Name</Label>
                <Input 
                  value={form.contact_name} 
                  onChange={e => setForm({ ...form, contact_name: e.target.value })} 
                  placeholder="Contact name"
                />
              </div>
              <Button onClick={handleAdd} disabled={assignTask.isPending}>
                {assignTask.isPending ? "Assigning..." : "Assign Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{leads.length}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{assignedLeads}</p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{pendingTasks}</p>
            <p className="text-xs text-muted-foreground">Pending Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{doneTasks}</p>
            <p className="text-xs text-muted-foreground">Completed Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Assignment with Bulk */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Assignment & Bulk Assign</CardTitle>
          <Tabs value={leadTab} onValueChange={setLeadTab}>
            <TabsList className="mt-2">
              <TabsTrigger value="all" className="text-xs">All ({leads.length})</TabsTrigger>
              <TabsTrigger value="today" className="text-xs">
                Today's ({leads.filter(l => isToday(new Date(l.created_at))).length})
              </TabsTrigger>
              <TabsTrigger value="fresh" className="text-xs">
                Fresh ({leads.filter(l => (l.status === "new" || l.stage === "new") && new Date(l.created_at) >= subDays(new Date(), 3)).length})
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="text-xs">
                Unassigned ({leads.filter(l => !l.assigned_to).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg border bg-primary/5">
              <Badge><CheckSquare className="h-3 w-3 mr-1" />{selectedIds.size} selected</Badge>
              <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="Assign to employee" />
                </SelectTrigger>
                <SelectContent>
                  {(profiles as Profile[]).map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.display_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={handleBulkAssign} 
                disabled={bulkAssign.isPending}
              >
                <UserCheck className="mr-1 h-4 w-4" />
                Bulk Assign {selectedIds.size} Leads
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id))}
                      onCheckedChange={() => {
                        const all = filteredLeads.every(l => selectedIds.has(l.id));
                        setSelectedIds(prev => { 
                          const next = new Set(prev); 
                          filteredLeads.forEach(l => all ? next.delete(l.id) : next.add(l.id)); 
                          return next; 
                        });
                      }}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.has(lead.id)} 
                        onCheckedChange={() => toggleSelect(lead.id)} 
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{lead.name}</p>
                      {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{lead.company || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{lead.status}</Badge></TableCell>
                    <TableCell>
                      <Select 
                        value={lead.business_status || "active"} 
                        onValueChange={v => updateBusinessStatus.mutate({ id: lead.id, business_status: v })}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="no-go">No-Go</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={lead.assigned_to || ""} 
                        onValueChange={v => assignLead.mutate({ id: lead.id, assigned_to: v })}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {(profiles as Profile[]).map(p => (
                            <SelectItem key={p.user_id} value={p.user_id}>
                              {p.display_name || "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.assigned_to ? "default" : "outline"} className="text-xs">
                        {lead.assigned_to ? <><UserCheck className="h-3 w-3 mr-1" />Assigned</> : "Unassigned"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No leads in this filter
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Tasks */}
      <Card>
        <CardHeader><CardTitle className="text-base">All Tasks</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map(act => (
                  <TableRow key={act.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{act.title}</p>
                      <p className="text-xs text-muted-foreground">{act.description}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline">{act.type}</Badge></TableCell>
                    <TableCell className="text-sm">{getProfileName(act.assigned_to)}</TableCell>
                    <TableCell className="text-sm">{act.due_date || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getTaskStatus(act) === "completed" ? "secondary" : "default"}>
                        {getTaskStatus(act).replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {act.employee_remarks || "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {activities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      No tasks yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <LeadActivityFeed />
    </div>
  );
}
