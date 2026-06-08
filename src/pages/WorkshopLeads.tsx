import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHasRole } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
type WorkshopLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  workshop_name: string;
  workshop_date: string | null;
  workshop_topic: string | null;
  trainer: string | null;
  interest: string | null;
  budget: string | null;
  status: string;
  remark: string | null;
  created_at: string;
};
const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];
const emptyForm: Partial<WorkshopLead> = {
  name: "", email: "", phone: "", company: "", city: "",
  workshop_name: "", workshop_date: "", workshop_topic: "", trainer: "",
  interest: "", budget: "", status: "new", remark: "",
};
export default function WorkshopLeads() {
  const qc = useQueryClient();
  const canEdit = useHasRole("owner", "admin", "hr_manager", "tl");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkshopLead | null>(null);
  const [form, setForm] = useState<Partial<WorkshopLead>>(emptyForm);
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["workshop_leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workshop_leads" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkshopLead[];
    },
  });
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<WorkshopLead>) => {
      const clean: any = { ...payload };
      if (!clean.workshop_date) delete clean.workshop_date;
      if (editing) {
        const { error } = await supabase.from("workshop_leads" as any).update(clean).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("workshop_leads" as any).insert({ ...clean, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workshop_leads"] });
      toast.success(editing ? "Workshop lead updated" : "Workshop lead added");
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workshop_leads" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workshop_leads"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (l: WorkshopLead) => { setEditing(l); setForm(l); setOpen(true); };
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><GraduationCap className="h-7 w-7 text-primary" /> Workshop Leads</h1>
          <p className="text-muted-foreground">Leads captured from training workshops</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Workshop Lead</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Workshop Lead</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2">
                <div><Label>Name *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Company</Label><Input value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>Workshop Name *</Label><Input value={form.workshop_name || ""} onChange={(e) => setForm({ ...form, workshop_name: e.target.value })} /></div>
                <div><Label>Workshop Date</Label><Input type="date" value={form.workshop_date || ""} onChange={(e) => setForm({ ...form, workshop_date: e.target.value })} /></div>
                <div><Label>Topic</Label><Input value={form.workshop_topic || ""} onChange={(e) => setForm({ ...form, workshop_topic: e.target.value })} /></div>
                <div><Label>Trainer</Label><Input value={form.trainer || ""} onChange={(e) => setForm({ ...form, trainer: e.target.value })} /></div>
                <div><Label>Budget</Label><Input value={form.budget || ""} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
                <div className="col-span-2"><Label>Interest</Label><Input value={form.interest || ""} onChange={(e) => setForm({ ...form, interest: e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status || "new"} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Remark</Label><Textarea value={form.remark || ""} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || !form.workshop_name || saveMutation.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card className="glass-card">
        <CardHeader><CardTitle>All Workshop Leads ({leads.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading...</p> : leads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No workshop leads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Workshop</TableHead><TableHead>Date</TableHead>
                  <TableHead>Topic</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>{l.workshop_name}</TableCell>
                    <TableCell>{l.workshop_date || "—"}</TableCell>
                    <TableCell>{l.workshop_topic || "—"}</TableCell>
                    <TableCell>{l.phone || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(l.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
