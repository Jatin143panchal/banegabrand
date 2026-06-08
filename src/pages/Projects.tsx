import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHasRole, useAllProfiles } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Briefcase, IndianRupee, Calendar } from "lucide-react";
import { toast } from "sonner";
type Project = {
  id: string;
  name: string;
  client: string | null;
  owner_id: string | null;
  status: string;
  priority: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  progress: number;
  description: string | null;
  created_at: string;
};
const STATUSES = ["planning", "in_progress", "on_hold", "completed", "cancelled"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "completed") return "default";
  if (s === "cancelled") return "destructive";
  if (s === "in_progress") return "default";
  return "secondary";
};
const emptyForm: Partial<Project> = {
  name: "", client: "", owner_id: null, status: "planning", priority: "medium",
  start_date: "", end_date: "", budget: 0, progress: 0, description: "",
};
export default function Projects() {
  const qc = useQueryClient();
  const canEdit = useHasRole("owner", "admin", "hr_manager", "tl");
  const { data: profiles = [] } = useAllProfiles();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project>>(emptyForm);
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Project>) => {
      const clean: any = { ...payload };
      if (!clean.start_date) delete clean.start_date;
      if (!clean.end_date) delete clean.end_date;
      if (clean.owner_id === "" || clean.owner_id === "none") clean.owner_id = null;
      clean.budget = Number(clean.budget) || 0;
      clean.progress = Math.max(0, Math.min(100, Number(clean.progress) || 0));
      if (editing) {
        const { error } = await supabase.from("projects" as any).update(clean).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("projects" as any).insert({ ...clean, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(editing ? "Project updated" : "Project created");
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Project) => { setEditing(p); setForm(p); setOpen(true); };
  const ownerName = (id: string | null) => profiles.find((p: any) => p.user_id === id)?.display_name || "Unassigned";
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === "in_progress").length,
    completed: projects.filter(p => p.status === "completed").length,
    budget: projects.reduce((s, p) => s + Number(p.budget || 0), 0),
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Briefcase className="h-7 w-7 text-primary" /> Project Management</h1>
          <p className="text-muted-foreground">Track all projects, owners, budgets and progress</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Project</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Project</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="col-span-2"><Label>Project Name *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Client</Label><Input value={form.client || ""} onChange={(e) => setForm({ ...form, client: e.target.value })} /></div>
                <div><Label>Project Owner</Label>
                  <Select value={form.owner_id || "none"} onValueChange={(v) => setForm({ ...form, owner_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {profiles.map((p: any) => <SelectItem key={p.user_id} value={p.user_id}>{p.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={form.status || "planning"} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={form.priority || "medium"} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Start Date</Label><Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                <div><Label>Budget (₹)</Label><Input type="number" value={form.budget || 0} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></div>
                <div><Label>Progress (%)</Label><Input type="number" min={0} max={100} value={form.progress || 0} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} /></div>
                <div className="col-span-2"><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Projects</p><p className="text-3xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Active</p><p className="text-3xl font-bold text-primary">{stats.active}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completed</p><p className="text-3xl font-bold text-green-500">{stats.completed}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Budget</p><p className="text-3xl font-bold flex items-center"><IndianRupee className="h-6 w-6" />{stats.budget.toLocaleString("en-IN")}</p></CardContent></Card>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : projects.length === 0 ? (
        <Card className="glass-card"><CardContent className="py-12 text-center text-muted-foreground">No projects yet. {canEdit && "Click 'New Project' to create one."}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Card key={p.id} className="glass-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <Badge variant={statusColor(p.status)}>{p.status.replace("_", " ")}</Badge>
                </div>
                {p.client && <p className="text-sm text-muted-foreground">{p.client}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-3 w-3" /> Owner: <span className="text-foreground font-medium">{ownerName(p.owner_id)}</span></p>
                  {(p.start_date || p.end_date) && (
                    <p className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-3 w-3" /> {p.start_date || "—"} → {p.end_date || "—"}</p>
                  )}
                  <p className="flex items-center gap-2 text-muted-foreground"><IndianRupee className="h-3 w-3" /> Budget: <span className="text-foreground font-medium">₹{Number(p.budget).toLocaleString("en-IN")}</span></p>
                  {p.priority && <p className="text-muted-foreground">Priority: <Badge variant="outline">{p.priority}</Badge></p>}
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>Progress</span><span>{p.progress}%</span></div>
                  <Progress value={p.progress} />
                </div>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                {canEdit && (
                  <div className="flex justify-end gap-1 pt-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete project?")) deleteMutation.mutate(p.id); }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
