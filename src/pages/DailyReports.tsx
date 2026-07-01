import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHasRole } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, AlertCircle, User, Plus, RefreshCw, Filter, Search } from "lucide-react";
import { format, isToday, isTomorrow, isAfter, parseISO } from "date-fns";

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, any> = {
    pending: { className: "bg-yellow-500/10 text-yellow-600 border-yellow-200", label: "Pending" },
    in_progress: { className: "bg-blue-500/10 text-blue-600 border-blue-200", label: "In Progress" },
    completed: { className: "bg-green-500/10 text-green-600 border-green-200", label: "Completed" },
    blocked: { className: "bg-red-500/10 text-red-600 border-red-200", label: "Blocked" },
    cancelled: { className: "bg-gray-500/10 text-gray-600 border-gray-200", label: "Cancelled" },
  };
  const v = variants[status] || variants.pending;
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
};

// Priority Badge Component
const PriorityBadge = ({ priority }: { priority: string }) => {
  const variants: Record<string, any> = {
    low: { className: "bg-green-500/10 text-green-600", label: "Low" },
    medium: { className: "bg-yellow-500/10 text-yellow-600", label: "Medium" },
    high: { className: "bg-orange-500/10 text-orange-600", label: "High" },
    urgent: { className: "bg-red-500/10 text-red-600", label: "Urgent" },
  };
  const v = variants[priority] || variants.medium;
  return <Badge className={v.className}>{v.label}</Badge>;
};

// Task Form Modal
const TaskFormModal = ({ 
  open, 
  onOpenChange, 
  task, 
  onSave,
  employees,
  currentUser 
}: any) => {
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    assigned_to: task?.assigned_to || "",
    due_date: task?.due_date || new Date().toISOString().slice(0, 10),
    priority: task?.priority || "medium",
    notes: task?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ ...formData, id: task?.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task in detail"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assign To *</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.user_id} value={emp.user_id}>
                      {emp.display_name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{task ? "Update" : "Create"} Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Task Update Modal
const TaskUpdateModal = ({ open, onOpenChange, task, onUpdate }: any) => {
  const [status, setStatus] = useState(task?.status || "pending");
  const [progress, setProgress] = useState(task?.progress || 0);
  const [comment, setComment] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      id: task.id,
      status,
      progress,
      comment,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Task: {task?.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Progress: {progress}%</Label>
            <Input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <Label>Comment</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add an update comment..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export default function DailyTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = useHasRole("admin", "owner", "hr_manager", "tl");
  const isEmployee = useHasRole("employee");

  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  // Load Tasks
  const loadTasks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("daily_tasks")
        .select(`
          *,
          assigned_to_profile:profiles!assigned_to(display_name, email),
          assigned_by_profile:profiles!assigned_by(display_name, email)
        `);

      if (!isAdmin) {
        query = query.eq("assigned_to", user?.id);
      }

      const { data, error } = await query.order("due_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Load Employees (for admins)
  const loadEmployees = async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", 
        (await supabase.from("user_roles").select("user_id").in("role", ["employee"]))
          .data?.map((r: any) => r.user_id) || []
      );
    setEmployees(data || []);
  };

  useEffect(() => {
    loadTasks();
    if (isAdmin) loadEmployees();

    // Real-time subscription
    const channel = supabase
      .channel('daily-tasks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'daily_tasks' },
        () => loadTasks()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isAdmin]);

  // Create/Update Task
  const handleSaveTask = async (taskData: any) => {
    try {
      let result;
      if (taskData.id) {
        result = await supabase
          .from("daily_tasks")
          .update({
            ...taskData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskData.id);
      } else {
        result = await supabase
          .from("daily_tasks")
          .insert({
            ...taskData,
            assigned_by: user?.id,
            created_at: new Date().toISOString(),
          });
      }

      if (result.error) throw result.error;
      
      toast({
        title: taskData.id ? "Task Updated" : "Task Created",
        description: `Task "${taskData.title}" ${taskData.id ? "updated" : "created"} successfully`,
      });
      
      loadTasks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Update Task Status
  const handleUpdateTask = async ({ id, status, progress, comment }: any) => {
    try {
      // Update task
      const { error } = await supabase
        .from("daily_tasks")
        .update({
          status,
          progress,
          updated_at: new Date().toISOString(),
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;

      // Add update log
      await supabase
        .from("task_updates")
        .insert({
          task_id: id,
          user_id: user?.id,
          update_type: "status_change",
          content: comment,
          new_status: status,
          new_progress: progress,
        });

      toast({ title: "Task Updated", description: "Task status and progress updated" });
      loadTasks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Delete Task (Admin only)
  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      const { error } = await supabase
        .from("daily_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Task Deleted", description: "Task has been removed" });
      loadTasks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Filter Tasks
  const getFilteredTasks = () => {
    let filtered = tasks;
    
    if (filter !== "all") {
      filtered = filtered.filter((t) => t.status === filter);
    }

    if (search) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  // Statistics
  const getStats = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const overdue = tasks.filter((t) => 
      t.status !== "completed" && 
      t.status !== "cancelled" && 
      isAfter(new Date(), parseISO(t.due_date))
    ).length;

    return { total, completed, inProgress, pending, blocked, overdue };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Daily Tasks</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "Manage and assign tasks to your team" : "Track and update your daily tasks"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadTasks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => { setSelectedTask(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Loading tasks...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredTasks().map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {task.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.assigned_to_profile?.display_name || task.assigned_to?.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={isAfter(new Date(), parseISO(task.due_date)) && task.status !== "completed" ? "text-red-600" : ""}>
                            {format(parseISO(task.due_date), "MMM dd, yyyy")}
                          </span>
                          {isToday(parseISO(task.due_date)) && <Badge variant="outline">Today</Badge>}
                          {isTomorrow(parseISO(task.due_date)) && <Badge variant="outline">Tomorrow</Badge>}
                        </div>
                      </TableCell>
                      <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                      <TableCell><StatusBadge status={task.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 rounded-full h-2 transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-xs">{task.progress}%</span>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setSelectedTask(task); setFormOpen(true); }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {getFilteredTasks().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                        No tasks found. {isAdmin ? "Create a new task to get started." : "You have no tasks assigned."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <TaskFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        task={selectedTask}
        onSave={handleSaveTask}
        employees={employees}
        currentUser={user}
      />

      <TaskUpdateModal
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        task={selectedTask}
        onUpdate={handleUpdateTask}
      />
    </div>
  );
}
