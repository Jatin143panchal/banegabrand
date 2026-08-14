import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Building2, Send, ClipboardList, Clock, CheckCircle, AlertTriangle, XCircle, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore, isToday, startOfDay } from "date-fns";

const STATUSES = ["not_started", "in_progress", "review", "completed", "blocked"] as const;

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  blocked: "Blocked",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

interface ProjectTaskRow {
  id: string;
  project_id: string;
  task_name: string;
  description: string | null;
  department: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completion_date: string | null;
  employee_remarks: string | null;
  assigned_to_email: string | null;
  projects: {
    name: string;
    project_id: string;
    brand_name: string | null;
  } | null;
}

interface TaskHistoryRow {
  id: string;
  task_id: string;
  changed_by_email: string | null;
  action_type: "status_change" | "remark" | "created";
  old_value: string | null;
  new_value: string | null;
  message: string | null;
  created_at: string;
}

type StatFilter = "all" | "not_started" | "in_progress" | "review" | "completed" | "blocked" | "overdue" | "today";

function getDueBucket(dueDate: string | null) {
  if (!dueDate) return "no_date";
  const d = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return "overdue";
  if (isToday(d)) return "today";
  return "later";
}

function StatFilterCard({
  label,
  value,
  active,
  onClick,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
  icon?: any;
  colorClass?: string;
}) {
  return (
    <Card
      className={`transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary" : ""} ${
        active ? "border-primary shadow-md ring-2 ring-primary/30" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          {Icon && (
            <div className={`p-2 rounded-full ${colorClass || "bg-muted text-muted-foreground"}`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Task Detail Dialog
// ============================================================
function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: ProjectTaskRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["task_history", task?.id],
    enabled: !!task?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_history")
        .select("*")
        .eq("task_id", task!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as TaskHistoryRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!task) return;
      const patch: any = { status };
      if (status === "completed") patch.completion_date = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("project_tasks")
        .update(patch)
        .eq("id", task.id);
      if (updateError) throw updateError;
      const { error: historyError } = await supabase.from("task_history").insert({
        task_id: task.id,
        changed_by_email: user?.email ?? null,
        action_type: "status_change",
        old_value: task.status || "not_started",
        new_value: status,
      });
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_tasks"] });
      qc.invalidateQueries({ queryKey: ["task_history", task?.id] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const sendRemark = useMutation({
    mutationFn: async (text: string) => {
      if (!task || !text.trim()) return;
      const { error: updateError } = await supabase
        .from("project_tasks")
        .update({ employee_remarks: text })
        .eq("id", task.id);
      if (updateError) throw updateError;
      const { error: historyError } = await supabase.from("task_history").insert({
        task_id: task.id,
        changed_by_email: user?.email ?? null,
        action_type: "remark",
        message: text,
      });
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["my_tasks"] });
      qc.invalidateQueries({ queryKey: ["task_history", task?.id] });
      toast({ title: "Update saved" });
    },
    onError: (e: any) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{task.task_name}</DialogTitle>
          {task.description && <DialogDescription>{task.description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {task.projects && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {task.projects.name}
              {task.projects.brand_name ? ` • ${task.projects.brand_name}` : ""}
            </span>
          )}
          {task.department && <Badge variant="outline">{task.department}</Badge>}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
              PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
            }`}
          >
            {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
          </span>
          {task.due_date && (
            <span className="text-xs text-muted-foreground">
              Due {format(new Date(task.due_date), "dd MMM yyyy")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select
            value={task.status || "not_started"}
            onValueChange={(v) => updateStatus.mutate(v)}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-h-0 flex flex-col border rounded-md">
          <div className="px-3 py-2 border-b bg-muted/40">
            <p className="text-xs font-medium uppercase text-muted-foreground">History</p>
          </div>
          <ScrollArea className="flex-1 p-3">
            {historyLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No history yet
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="rounded-lg border bg-card p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{h.changed_by_email || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(h.created_at), "dd MMM, HH:mm")}
                      </span>
                    </div>
                    {h.action_type === "status_change" ? (
                      <p className="text-sm">
                        Status changed:{" "}
                        <span className="text-muted-foreground">
                          {STATUS_LABELS[h.old_value || "not_started"] || h.old_value}
                        </span>{" "}
                        →{" "}
                        <span className="font-medium">
                          {STATUS_LABELS[h.new_value || "not_started"] || h.new_value}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{h.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-2 flex items-end gap-2">
            <Textarea
              className="min-h-[44px] max-h-32 resize-none"
              placeholder="Write an update..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (message.trim()) sendRemark.mutate(message);
                }
              }}
            />
            <Button
              size="icon"
              disabled={!message.trim() || sendRemark.isPending}
              onClick={() => sendRemark.mutate(message)}
            >
              {sendRemark.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MyTasks page
// ============================================================
export default function MyTasks() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<ProjectTaskRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statFilter, setStatFilter] = useState<StatFilter>("all");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my_tasks", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          id, project_id, task_name, description, department,
          priority, status, due_date, completion_date, employee_remarks,
          assigned_to_email,
          projects ( name, project_id, brand_name )
        `)
        .eq("assigned_to_email", user?.email)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as unknown as ProjectTaskRow[];
    },
  });

  const counts = useMemo(() => {
    const byStatus = STATUSES.reduce(
      (acc, s) => ({
        ...acc,
        [s]: tasks.filter((t) => (t.status || "not_started") === s).length,
      }),
      {} as Record<string, number>
    );
    return {
      total: tasks.length,
      ...byStatus,
      overdue: tasks.filter(
        (t) => getDueBucket(t.due_date) === "overdue" && t.status !== "completed"
      ).length,
      today: tasks.filter(
        (t) => getDueBucket(t.due_date) === "today" && t.status !== "completed"
      ).length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const status = t.status || "not_started";
      if (statFilter === "all") return true;
      if (statFilter === "overdue") {
        return getDueBucket(t.due_date) === "overdue" && status !== "completed";
      }
      if (statFilter === "today") {
        return getDueBucket(t.due_date) === "today" && status !== "completed";
      }
      return status === statFilter;
    });
  }, [tasks, statFilter]);

  const openTask = (task: ProjectTaskRow) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          Tasks assigned to you across all projects
        </p>
      </div>

      {/* Clickable filter cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatFilterCard
          label="Total"
          value={counts.total}
          active={statFilter === "all"}
          onClick={() => setStatFilter("all")}
          icon={ClipboardList}
          colorClass="bg-blue-100 text-blue-600"
        />
        <StatFilterCard
          label="Not Started"
          value={counts.not_started || 0}
          active={statFilter === "not_started"}
          onClick={() => setStatFilter("not_started")}
          icon={Clock}
          colorClass="bg-gray-100 text-gray-600"
        />
        <StatFilterCard
          label="In Progress"
          value={counts.in_progress || 0}
          active={statFilter === "in_progress"}
          onClick={() => setStatFilter("in_progress")}
          icon={Loader2}
          colorClass="bg-indigo-100 text-indigo-600"
        />
        <StatFilterCard
          label="Review"
          value={counts.review || 0}
          active={statFilter === "review"}
          onClick={() => setStatFilter("review")}
          icon={Filter}
          colorClass="bg-purple-100 text-purple-600"
        />
        <StatFilterCard
          label="Completed"
          value={counts.completed || 0}
          active={statFilter === "completed"}
          onClick={() => setStatFilter("completed")}
          icon={CheckCircle}
          colorClass="bg-green-100 text-green-600"
        />
        <StatFilterCard
          label="Blocked"
          value={counts.blocked || 0}
          active={statFilter === "blocked"}
          onClick={() => setStatFilter("blocked")}
          icon={XCircle}
          colorClass="bg-red-100 text-red-600"
        />
        <StatFilterCard
          label="Overdue"
          value={counts.overdue}
          active={statFilter === "overdue"}
          onClick={() => setStatFilter("overdue")}
          icon={AlertTriangle}
          colorClass="bg-orange-100 text-orange-600"
        />
        <StatFilterCard
          label="Today"
          value={counts.today}
          active={statFilter === "today"}
          onClick={() => setStatFilter("today")}
          icon={Clock}
          colorClass="bg-amber-100 text-amber-600"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Assigned Tasks
            {statFilter !== "all" && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · filtered:{" "}
                {statFilter === "today"
                  ? "Today"
                  : statFilter === "overdue"
                  ? "Overdue"
                  : STATUS_LABELS[statFilter] || statFilter}
              </span>
            )}
          </CardTitle>
          {statFilter !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setStatFilter("all")}>
              Clear filter
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project / Client</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openTask(t)}
                >
                  <TableCell>
                    <p className="font-medium text-sm">{t.task_name}</p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.projects ? (
                      <div className="text-sm">
                        <p className="font-medium inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {t.projects.name}
                        </p>
                        {t.projects.brand_name && (
                          <p className="text-xs text-muted-foreground">{t.projects.brand_name}</p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono">
                          {t.projects.project_id}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.department ? (
                      <Badge variant="outline">{t.department}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium
                      }`}
                    >
                      {t.priority?.charAt(0).toUpperCase() + t.priority?.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.due_date ? format(new Date(t.due_date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {STATUS_LABELS[t.status || "not_started"] || t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-sm text-muted-foreground"
                  >
                    {tasks.length === 0
                      ? "No tasks assigned yet"
                      : "No tasks match this filter"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TaskDetailDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
