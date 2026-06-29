import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCrmQuery, useCrmInsert, useCrmUpdate } from "@/hooks/useCrm";
import { Plus, IndianRupee, Loader2, User, Building2, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

// ============================================================
// TYPES
// ============================================================
interface SalesPunchRequest {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  company_name: string | null;
  amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  assigned_to: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  expected_completion_date: string | null;
  budget_allocated: number;
  budget_utilized: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CONSTANTS
// ============================================================
const statuses = [
  { key: "draft", label: "Draft", color: "bg-gray-400" },
  { key: "submitted", label: "Submitted", color: "bg-blue-500" },
  { key: "approved", label: "Approved", color: "bg-green-500" },
  { key: "rejected", label: "Rejected", color: "bg-red-500" },
  { key: "cancelled", label: "Cancelled", color: "bg-gray-500" },
  { key: "completed", label: "Completed", color: "bg-emerald-500" },
] as const;

const priorities = [
  { key: "low", label: "Low", color: "bg-blue-100 text-blue-700" },
  { key: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { key: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { key: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" },
] as const;

const formatCurrency = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SalesPunch() {
  const { data: requests = [], isLoading } = useCrmQuery<SalesPunchRequest>("sales_punch_requests");
  const insertRequest = useCrmInsert("sales_punch_requests");
  const updateRequest = useCrmUpdate("sales_punch_requests");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    company_name: "",
    amount: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    category: "",
    expected_completion_date: "",
    budget_allocated: "",
  });

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleAdd = async () => {
    // Fix: Better validation with error feedback
    if (!form.title.trim() || !form.client_name.trim()) {
      // You might want to add toast notification here
      return;
    }
    
    try {
      await insertRequest.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim() || null,
        client_phone: form.client_phone.trim() || null,
        company_name: form.company_name.trim() || null,
        amount: Number(form.amount) || 0,
        priority: form.priority,
        category: form.category.trim() || null,
        expected_completion_date: form.expected_completion_date || null,
        budget_allocated: Number(form.budget_allocated) || 0,
        budget_utilized: 0,
        status: "draft",
      });

      // Reset form
      setForm({
        title: "",
        description: "",
        client_name: "",
        client_email: "",
        client_phone: "",
        company_name: "",
        amount: "",
        priority: "medium",
        category: "",
        expected_completion_date: "",
        budget_allocated: "",
      });
      setDialogOpen(false);
    } catch (error) {
      console.error("Error creating request:", error);
      // You might want to show error toast here
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'approved') updates.approved_at = new Date().toISOString();
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      if (newStatus === 'submitted') updates.submitted_at = new Date().toISOString();
      
      await updateRequest.mutateAsync({ id, ...updates });
    } catch (error) {
      console.error("Error updating status:", error);
      // You might want to show error toast here
    }
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Punch</h1>
          <p className="text-muted-foreground">Manage your sales requests through approval pipeline</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sales Punch Request</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Title */}
              <div className="grid gap-2">
                <Label>Request Title *</Label>
                <Input 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  placeholder="Enter request title"
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              {/* Client Name & Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Client Name *</Label>
                  <Input 
                    value={form.client_name} 
                    onChange={e => setForm({ ...form, client_name: e.target.value })} 
                    placeholder="Enter client name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={form.company_name} 
                    onChange={e => setForm({ ...form, company_name: e.target.value })} 
                    placeholder="Enter company name"
                  />
                </div>
              </div>

              {/* Client Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Client Email</Label>
                  <Input 
                    type="email"
                    value={form.client_email} 
                    onChange={e => setForm({ ...form, client_email: e.target.value })} 
                    placeholder="Enter client email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Client Phone</Label>
                  <Input 
                    value={form.client_phone} 
                    onChange={e => setForm({ ...form, client_phone: e.target.value })} 
                    placeholder="Enter client phone"
                  />
                </div>
              </div>

              {/* Amount & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Amount (₹)</Label>
                  <Input 
                    type="number"
                    min="0"
                    step="1"
                    value={form.amount} 
                    onChange={e => setForm({ ...form, amount: e.target.value })} 
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Budget Allocated (₹)</Label>
                  <Input 
                    type="number"
                    min="0"
                    step="1"
                    value={form.budget_allocated} 
                    onChange={e => setForm({ ...form, budget_allocated: e.target.value })} 
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(p => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Input 
                    value={form.category} 
                    onChange={e => setForm({ ...form, category: e.target.value })} 
                    placeholder="Enter category"
                  />
                </div>
              </div>

              {/* Expected Completion Date */}
              <div className="grid gap-2">
                <Label>Expected Completion Date</Label>
                <Input 
                  type="date"
                  value={form.expected_completion_date} 
                  onChange={e => setForm({ ...form, expected_completion_date: e.target.value })} 
                />
              </div>

              <Button 
                onClick={handleAdd} 
                disabled={insertRequest.isPending || !form.title.trim() || !form.client_name.trim()} 
                className="mt-2"
              >
                {insertRequest.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Request"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ===== PIPELINE COLUMNS ===== */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statuses.map(status => {
          const statusRequests = requests.filter(r => r.status === status.key);
          const totalAmount = statusRequests.reduce((s, r) => s + (r.amount || 0), 0);

          return (
            <div key={status.key} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                  <h3 className="text-sm font-semibold">{status.label}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {statusRequests.length}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalAmount)} total
              </p>

              {/* Cards */}
              <div className="space-y-2">
                {statusRequests.map(request => {
                  const priority = priorities.find(p => p.key === request.priority);
                  
                  return (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        {/* Request Number & Priority */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {request.request_number}
                          </p>
                          {priority && (
                            <Badge className={`text-xs ${priority.color}`}>
                              {priority.label}
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <p className="text-sm font-medium truncate mt-1">
                          {request.title}
                        </p>

                        {/* Client & Company */}
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {request.client_name}
                          </p>
                          {request.company_name && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <p className="text-xs text-muted-foreground truncate">
                                {request.company_name}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Amount & Date */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold flex items-center gap-1">
                            <IndianRupee className="h-3 w-3 flex-shrink-0" />
                            {formatCurrency(request.amount || 0)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            {request.expected_completion_date 
                              ? format(new Date(request.expected_completion_date), 'dd/MM/yy')
                              : 'N/A'}
                          </span>
                        </div>

                        {/* ===== ACTION BUTTONS ===== */}
                        {request.status === 'draft' && (
                          <Button 
                            size="sm" 
                            className="w-full mt-2 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, 'submitted');
                            }}
                          >
                            Submit for Approval
                          </Button>
                        )}

                        {request.status === 'submitted' && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 border-green-600 hover:bg-green-50 h-7 text-xs flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(request.id, 'approved');
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-600 hover:bg-red-50 h-7 text-xs flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(request.id, 'rejected');
                              }}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {request.status === 'approved' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 h-7 text-xs w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, 'completed');
                            }}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Completed
                          </Button>
                        )}

                        {request.status === 'rejected' && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            Rejected
                          </div>
                        )}

                        {request.status === 'completed' && (
                          <div className="mt-2 p-2 bg-emerald-50 rounded text-xs text-emerald-600">
                            <CheckCircle className="h-3 w-3 inline mr-1" />
                            Completed on {request.completed_at ? format(new Date(request.completed_at), 'dd/MM/yy') : 'N/A'}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Empty State */}
                {statusRequests.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <p className="text-xs text-muted-foreground">No requests</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
