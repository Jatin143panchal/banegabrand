import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["pending", "in_progress", "completed", "blocked"];

export default function MyTasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my_tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const update = useMutation({
    mutationFn: async ({ id, status, remark }: { id: string; status?: string; remark?: string }) => {
      const patch: any = {};
      if (status) {
        patch.task_status = status;
        patch.completed = status === "completed";
        if (status === "completed") patch.completed_at = new Date().toISOString();
      }
      if (remark !== undefined) patch.employee_remarks = remark;
      const { error } = await supabase.from("activities").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter(t => (t.task_status || "pending") === s).length }), {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">Update progress on tasks assigned to you</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.map(s => (
          <Card key={s}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{s.replace("_", " ")}</p><p className="text-2xl font-bold">{counts[s] || 0}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Assigned Tasks</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(t => (
                <TableRow key={t.id}>
                  <TableCell><p className="font-medium text-sm">{t.title}</p><p className="text-xs text-muted-foreground">{t.description}</p></TableCell>
                  <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                  <TableCell className="text-sm">{t.due_date || "—"}</TableCell>
                  <TableCell>
                    <Select value={t.task_status || "pending"} onValueChange={v => update.mutate({ id: t.id, status: v })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <Textarea
                      className="min-h-[60px]"
                      placeholder="Add remarks..."
                      defaultValue={t.employee_remarks || ""}
                      onChange={e => setRemarks({ ...remarks, [t.id]: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: t.id, remark: remarks[t.id] ?? t.employee_remarks ?? "" })}>Save</Button>
                  </TableCell>
                </TableRow>
              ))}
              {tasks.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No tasks assigned to you</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
