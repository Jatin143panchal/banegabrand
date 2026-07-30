import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Building2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUSES = ["not_started", "in_progress", "review", "completed", "blocked"];

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "Processing",
  review: "Review",
  completed: "Done",
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

export default function MyTasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [remarks, setRemarks] = useState<Record<string, string>>({});

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

  const update = useMutation({
    mutationFn: async ({ id, status, remark }: { id: string; status?: string; remark?: string }) => {
      const patch: any = {};
      if (status) {
        patch.status = status;
        if (status === "completed") patch.completion_date = new Date().toISOString();
      }
      if (remark !== undefined) patch.employee_remarks = remark;
      const { error } = await supabase.from("project_tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_tasks", user?.email] });
      toast({ title: "Task updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => (t.status || "not_started") === s).length }),
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">Aapko sabhi projects se jo tasks assign hue hain, wo yahan dikhte hain</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{tasks.length}</p>
          </CardContent>
        </Card>
        {STATUSES.map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">{STATUS_LABELS[s]}</p>
              <p className="text-2xl font-bold">{counts[s] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Tasks</CardTitle>
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
                <TableHead>Remarks</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id}>
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
                        <p className="text-xs text-muted-foreground font-mono">{t.projects.project_id}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.department ? <Badge variant="outline">{t.department}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium}`}>
                      {t.priority?.charAt(0).toUpperCase() + t.priority?.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.due_date ? format(new Date(t.due_date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={t.status || "not_started"}
                      onValueChange={(v) => update.mutate({ id: t.id, status: v })}
                    >
                      <SelectTrigger className="w-36 h-8">
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
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <Textarea
                      className="min-h-[60px]"
                      placeholder="Apna update likhein..."
                      defaultValue={t.employee_remarks || ""}
                      onChange={(e) => setRemarks({ ...remarks, [t.id]: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        update.mutate({ id: t.id, remark: remarks[t.id] ?? t.employee_remarks ?? "" })
                      }
                    >
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    Koi task assign nahi hua hai abhi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
