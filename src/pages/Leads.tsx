import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useCrmQuery, useCrmInsert, useCrmUpdate, useCrmDelete } from "@/hooks/useCrm";
import { useCanAssignTasks, useAllProfiles } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadActivityLogger } from "@/hooks/useLeadActivity";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Filter, Loader2, Upload, FileSpreadsheet, Trash2, Edit, Eye, Star, Download, X, UserCheck, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadCommentsPanel from "@/components/LeadCommentsPanel";
import { useBulkAssignLeads } from "@/hooks/useLeadComments";
import { isToday, subDays } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  DEFAULT_LEAD_STAGE,
  formatStageLabel,
  getSubStagesForStage,
  LEAD_STAGES,
  LEAD_STATUSES,
} from "@/lib/leadStages";

interface DbLead {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  source: string | null; status: string; value: number | null; business_status: string | null;
  assigned_to: string | null; created_at: string; next_call_date: string | null;
  lead_type: string | null; address: string | null; cx_comment: string | null;
  budget: string | null; stage: string | null; sub_stage: string | null; remark: string | null;
}

const LEAD_TYPES = ["Herbal & Ayurvedic", "Cosmetics", "Food & Beverage", "Pharma", "Nutraceutical", "Other"];
const BUDGETS = ["₹5l+", "₹50k - ₹1l", "₹1l - ₹3l", "₹3l - ₹5l", "Below ₹50k"];
const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  contacted: "outline",
  answered: "outline",
  not_answered: "outline",
  qualified: "secondary",
  converted: "default",
  lost: "destructive",
};
const formatCurrency = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

// Lead scoring based on data completeness and status
function getLeadScore(lead: DbLead): number {
  let score = 0;
  if (lead.name) score += 10;
  if (lead.email) score += 15;
  if (lead.phone) score += 15;
  if (lead.company) score += 10;
  if (lead.source) score += 10;
  if ((lead.value || 0) > 0) score += 15;
  if (lead.status === "converted") score += 30;
  else if (lead.status === "qualified") score += 25;
  else if (lead.status === "answered") score += 20;
  else if (lead.status === "contacted") score += 15;
  else if (lead.status === "new") score += 5;
  if (lead.sub_stage === "meeting_booked" || lead.sub_stage === "business_generated") score += 10;
  return Math.min(score, 100);
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-primary";
  if (score >= 40) return "text-muted-foreground";
  return "text-destructive";
}

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<DbLead | null>(null);
  const [editLead, setEditLead] = useState<DbLead | null>(null);
  const [filterPreset, setFilterPreset] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const bulkAssign = useBulkAssignLeads();
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", source: "Website", value: "", lead_type: "Herbal & Ayurvedic", address: "", cx_comment: "", budget: "₹50k - ₹1l", stage: DEFAULT_LEAD_STAGE, sub_stage: "", remark: "" });

  const assignLead = useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const { error } = await supabase.from("leads").update({ assigned_to }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success("Lead assigned to employee");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const p = (profiles as { user_id: string; display_name: string | null }[]).find(p => p.user_id === userId);
    return p?.display_name || "Unknown";
  };

  const openLeadDetail = (lead: DbLead) => {
    setDetailLead(lead);
    logActivity(lead.id, "viewed", `Opened ${lead.name}`);
  };

  const filtered = leads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || (l.company || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchStage = filterStage === "all" || l.stage === filterStage;
    const matchAssignment =
      filterAssignment === "all" ||
      (filterAssignment === "mine" && l.assigned_to === user?.id) ||
      (filterAssignment === "unassigned" && !l.assigned_to);
    const matchPreset =
      filterPreset === "all" ||
      (filterPreset === "today" && isToday(new Date(l.created_at))) ||
      (filterPreset === "fresh" && (l.status === "new" || l.stage === "new") && new Date(l.created_at) >= subDays(new Date(), 3)) ||
      (filterPreset === "followup" && l.next_call_date && new Date(l.next_call_date) <= new Date());
    return matchSearch && matchStatus && matchStage && matchAssignment && matchPreset;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !bulkAssignTo) return;
    try {
      const count = await bulkAssign.mutateAsync({ leadIds: Array.from(selectedIds), assignedTo: bulkAssignTo });
      toast.success(`${count} leads assign ho gaye`);
      setSelectedIds(new Set());
      setBulkAssignTo("");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Assign failed"); }
  };

  const handleAdd = async () => {
    if (!form.name || !form.email) return;
    await insertLead.mutateAsync({
      name: form.name, email: form.email, phone: form.phone, company: form.company,
      source: form.source, value: Number(form.value) || 0, status: "new" as any,
      lead_type: form.lead_type, address: form.address, cx_comment: form.cx_comment,
      budget: form.budget, stage: form.stage, sub_stage: form.sub_stage, remark: form.remark,
    } as any);
    setForm({ name: "", email: "", phone: "", company: "", source: "Website", value: "", lead_type: "Herbal & Ayurvedic", address: "", cx_comment: "", budget: "₹50k - ₹1l", stage: DEFAULT_LEAD_STAGE, sub_stage: "", remark: "" });
    setDialogOpen(false);
    toast.success("Lead added successfully");
  };

  // Excel/CSV upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);
        
        // Map common column names
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
          stage: row.Stage || row.stage || "",
          sub_stage: row["Sub Stage"] || row.sub_stage || "",
          remark: row.Remark || row.remark || row.Remarks || "",
        })).filter((r: any) => r.name);

        setUploadPreview(mapped);
        if (mapped.length === 0) {
          toast.error("No valid leads found. Ensure columns: Name, Email, Phone, Company, Source, Value");
        }
      } catch {
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
          name: lead.name, email: lead.email, phone: lead.phone,
          company: lead.company, source: lead.source, value: lead.value,
          status: "new" as any,
          lead_type: lead.lead_type, address: lead.address, cx_comment: lead.cx_comment,
          budget: lead.budget, stage: lead.stage, sub_stage: lead.sub_stage, remark: lead.remark,
        } as any);
        success++;
      } catch { /* skip duplicates */ }
    }
    setUploading(false);
    setUploadPreview([]);
    setUploadOpen(false);
    if (fileRef.current) fileRef.current.value = "";
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
      status: editLead.status as any,
      business_status: editLead.business_status,
      lead_type: editLead.lead_type,
      address: editLead.address,
      cx_comment: editLead.cx_comment,
      budget: editLead.budget,
      stage: editLead.stage,
      sub_stage: editLead.sub_stage,
      remark: editLead.remark,
    } as any);
    logActivity(editLead.id, "updated", `Status: ${editLead.status}`);
    setEditLead(null);
    toast.success("Lead updated");
  };

  const handleDelete = async (id: string) => {
    await deleteLead.mutateAsync(id);
    setDetailLead(null);
    toast.success("Lead deleted");
  };

  // Export leads to Excel
  const handleExport = () => {
    const exportData = leads.map(l => ({
      Name: l.name, Email: l.email, Number: l.phone, Company: l.company,
      "Lead type": l.lead_type, Address: l.address, "CX Comment": l.cx_comment,
      Budget: l.budget, Stage: l.stage, "Sub Stage": l.sub_stage, Remark: l.remark,
      Source: l.source, Status: l.status, Value: l.value, "Business Status": l.business_status,
      "Created At": new Date(l.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads_export.xlsx");
    toast.success("Leads exported!");
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Leads</h1><p className="text-muted-foreground">Manage your sales leads</p></div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild><Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import Excel</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Import Leads from Excel/CSV</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Upload Excel (.xlsx, .xls) or CSV file</p>
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
                        <TableHeader><TableRow>
                          <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Company</TableHead><TableHead>Source</TableHead>
                        </TableRow></TableHeader>
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
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                {[{ label: "Name *", key: "name" }, { label: "Email *", key: "email" }, { label: "Number", key: "phone" }, { label: "Company", key: "company" }, { label: "Address", key: "address" }, { label: "Value (₹)", key: "value" }].map(f => (
                  <div key={f.key} className="grid gap-2"><Label>{f.label}</Label><Input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} /></div>
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
                    <SelectContent>{["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
                <Button onClick={handleAdd} disabled={insertLead.isPending} className="mt-2 sm:col-span-2">{insertLead.isPending ? "Adding..." : "Add Lead"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{leads.length}</p><p className="text-xs text-muted-foreground">Total Leads</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{leads.filter(l => l.status === "new").length}</p><p className="text-xs text-muted-foreground">New</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{leads.filter(l => l.status === "qualified").length}</p><p className="text-xs text-muted-foreground">Qualified</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{leads.filter(l => l.status === "converted" || l.stage === "converted").length}</p><p className="text-xs text-muted-foreground">Converted</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{leads.filter(l => l.assigned_to === user?.id).length}</p><p className="text-xs text-muted-foreground">Assigned to Me</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{formatCurrency(leads.reduce((s, l) => s + (l.value || 0), 0))}</p><p className="text-xs text-muted-foreground">Total Value</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAssignment} onValueChange={setFilterAssignment}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Assignment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="mine">Assigned to Me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPreset} onValueChange={setFilterPreset}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Quick Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
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
                  {(profiles as { user_id: string; display_name: string | null }[]).map(p => (
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
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No leads found. Add your first lead or import from Excel!</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canAssign && <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))} onCheckedChange={() => { const all = filtered.every(l => selectedIds.has(l.id)); setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(l => all ? next.delete(l.id) : next.add(l.id)); return next; }); }} /></TableHead>}
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Lead Type</TableHead>
                  <TableHead className="hidden md:table-cell">Address</TableHead>
                  <TableHead className="hidden xl:table-cell">CX Comment</TableHead>
                  <TableHead className="hidden lg:table-cell">Budget</TableHead>
                  <TableHead>Brand Stage</TableHead>
                  <TableHead className="hidden md:table-cell">Sub Stage</TableHead>
                  <TableHead className="hidden xl:table-cell">Remark</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  {canAssign && <TableHead>Assigned To</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(lead => {
                  const score = getLeadScore(lead);
                  return (
                    <TableRow key={lead.id}>
                      {canAssign && <TableCell><Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>}
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          {lead.email && <a href={`mailto:${lead.email}`} className="text-xs text-muted-foreground hover:text-primary block">{lead.email}</a>}
                          {lead.phone && <a href={`tel:${lead.phone}`} className="text-xs text-muted-foreground hover:text-primary">📞 {lead.phone}</a>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{lead.lead_type && <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">{lead.lead_type}</Badge>}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{lead.address || "-"}</TableCell>
                      <TableCell className="hidden xl:table-cell text-xs max-w-[180px] truncate">{lead.cx_comment || "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{lead.budget || "-"}</TableCell>
                      <TableCell><span className="text-xs">{formatStageLabel(lead.stage)}</span></TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{formatStageLabel(lead.sub_stage)}</TableCell>
                      <TableCell className="hidden xl:table-cell text-xs max-w-[160px] truncate">{lead.remark || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Star className={`h-3.5 w-3.5 ${getScoreColor(score)}`} />
                          <span className={`text-sm font-medium ${getScoreColor(score)}`}>{score}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={statusColors[lead.status] || "outline"}>{formatStageLabel(lead.status)}</Badge></TableCell>
                      {canAssign && (
                        <TableCell>
                          <Select value={lead.assigned_to || ""} onValueChange={v => assignLead.mutate({ id: lead.id, assigned_to: v })}>
                            <SelectTrigger className="w-36 h-8"><SelectValue placeholder="Assign" /></SelectTrigger>
                            <SelectContent>
                              {(profiles as { user_id: string; display_name: string | null }[]).map(p => (
                                <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || "Unknown"}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLeadDetail(lead)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditLead(lead)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(lead.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
          {detailLead && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{detailLead.name}</h3>
                <div className="flex items-center gap-1.5">
                  <Star className={`h-4 w-4 ${getScoreColor(getLeadScore(detailLead))}`} />
                  <span className={`font-bold ${getScoreColor(getLeadScore(detailLead))}`}>{getLeadScore(detailLead)}/100</span>
                </div>
              </div>
              <Progress value={getLeadScore(detailLead)} className="h-2" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Email</p><p className="font-medium break-all">{detailLead.email || "-"}</p></div>
                <div><p className="text-muted-foreground">Number</p><p className="font-medium">{detailLead.phone || "-"}</p></div>
                <div><p className="text-muted-foreground">Company</p><p className="font-medium">{detailLead.company || "-"}</p></div>
                <div><p className="text-muted-foreground">Address</p><p className="font-medium">{detailLead.address || "-"}</p></div>
                <div><p className="text-muted-foreground">Lead Type</p><p className="font-medium">{detailLead.lead_type || "-"}</p></div>
                <div><p className="text-muted-foreground">Budget</p><p className="font-medium">{detailLead.budget || "-"}</p></div>
                <div><p className="text-muted-foreground">Brand Stage</p><p className="font-medium">{formatStageLabel(detailLead.stage)}</p></div>
                <div><p className="text-muted-foreground">Sub Stage</p><p className="font-medium">{formatStageLabel(detailLead.sub_stage)}</p></div>
                <div><p className="text-muted-foreground">Source</p><p className="font-medium">{detailLead.source || "-"}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge variant={statusColors[detailLead.status]}>{formatStageLabel(detailLead.status)}</Badge></div>
                <div><p className="text-muted-foreground">Value</p><p className="font-medium">{formatCurrency(detailLead.value || 0)}</p></div>
                <div><p className="text-muted-foreground">Business Status</p><Badge variant="outline">{detailLead.business_status || "Active"}</Badge></div>
                <div><p className="text-muted-foreground">Assigned To</p><p className="font-medium">{getProfileName(detailLead.assigned_to)}</p></div>
                <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(detailLead.created_at).toLocaleDateString()}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">CX Comment</p><p className="font-medium whitespace-pre-wrap">{detailLead.cx_comment || "-"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Remark</p><p className="font-medium whitespace-pre-wrap">{detailLead.remark || "-"}</p></div>
              </div>
              <div className="flex gap-2 pt-2">
                {detailLead.phone && <Button size="sm" variant="outline" asChild><a href={`tel:${detailLead.phone}`} onClick={() => logActivity(detailLead.id, "called", detailLead.phone || undefined)}>📞 Call</a></Button>}
                {detailLead.email && <Button size="sm" variant="outline" asChild><a href={`mailto:${detailLead.email}`} onClick={() => logActivity(detailLead.id, "emailed", detailLead.email || undefined)}>✉️ Email</a></Button>}
                {detailLead.phone && <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${detailLead.phone.replace(/[^0-9]/g, "")}`} target="_blank" onClick={() => logActivity(detailLead.id, "whatsapp", detailLead.phone || undefined)}>💬 WhatsApp</a></Button>}
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
              {[{ label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Number", key: "phone" }, { label: "Company", key: "company" }, { label: "Address", key: "address" }].map(f => (
                <div key={f.key} className="grid gap-2"><Label>{f.label}</Label><Input value={(editLead as any)[f.key] || ""} onChange={e => setEditLead({ ...editLead, [f.key]: e.target.value } as DbLead)} /></div>
              ))}
              <div className="grid gap-2"><Label>Value (₹)</Label><Input type="number" value={editLead.value || 0} onChange={e => setEditLead({ ...editLead, value: Number(e.target.value) })} /></div>
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
                  <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
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
                <Label>Status</Label>
                <Select value={editLead.status} onValueChange={v => setEditLead({ ...editLead, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
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
                  <SelectContent>{["Website", "Referral", "LinkedIn", "Cold Call", "Trade Show", "Excel Import", "WhatsApp", "Facebook Ads", "Google Ads"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
              <Button onClick={handleUpdate} disabled={updateLead.isPending} className="sm:col-span-2">{updateLead.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
