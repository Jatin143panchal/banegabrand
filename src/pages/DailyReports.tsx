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
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, FileText } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/export";

export default function DailyReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isLeader = useHasRole("admin", "owner", "hr_manager", "tl");

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("8");
  const [completed, setCompleted] = useState("");
  const [pending, setPending] = useState("");
  const [blockers, setBlockers] = useState("");
  const [notes, setNotes] = useState("");
  const [myReports, setMyReports] = useState<any[]>([]);
  const [teamReports, setTeamReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const loadMine = async () => {
    if (!user) return;
    const { data } = await supabase.from("daily_reports").select("*").eq("user_id", user.id).order("report_date", { ascending: false });
    setMyReports(data ?? []);
  };
  const loadTeam = async () => {
    const { data } = await supabase.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(100);
    setTeamReports(data ?? []);
    const { data: p } = await supabase.from("profiles").select("user_id, display_name");
    setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.user_id, x.display_name])));
  };

  useEffect(() => { loadMine(); if (isLeader) loadTeam(); }, [user?.id, isLeader]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("daily_reports").insert({
      user_id: user.id,
      report_date: date,
      hours_worked: Number(hours),
      tasks_completed: completed,
      tasks_pending: pending,
      blockers,
      notes,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Daily report submitted" });
      setCompleted(""); setPending(""); setBlockers(""); setNotes("");
      loadMine();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Reports</h1>
        <p className="text-muted-foreground text-sm">Submit your daily work report</p>
      </div>

      <Tabs defaultValue="submit">
        <TabsList>
          <TabsTrigger value="submit">Submit Today</TabsTrigger>
          <TabsTrigger value="mine">My Reports</TabsTrigger>
          {isLeader && <TabsTrigger value="team">Team Reports</TabsTrigger>}
        </TabsList>

        <TabsContent value="submit">
          <Card>
            <CardHeader><CardTitle>New Daily Report</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div><Label>Hours Worked</Label><Input type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
                </div>
                <div><Label>Tasks Completed</Label><Textarea rows={3} value={completed} onChange={(e) => setCompleted(e.target.value)} required /></div>
                <div><Label>Tasks Pending</Label><Textarea rows={2} value={pending} onChange={(e) => setPending(e.target.value)} /></div>
                <div><Label>Blockers</Label><Textarea rows={2} value={blockers} onChange={(e) => setBlockers(e.target.value)} /></div>
                <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                <Button type="submit"><Plus className="h-4 w-4 mr-2" />Submit Report</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mine">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Hours</TableHead><TableHead>Completed</TableHead><TableHead>Pending</TableHead></TableRow></TableHeader>
                <TableBody>
                  {myReports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.report_date}</TableCell>
                      <TableCell>{r.hours_worked}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.tasks_completed}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.tasks_pending}</TableCell>
                    </TableRow>
                  ))}
                  {myReports.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No reports yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isLeader && (
          <TabsContent value="team">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const rows = teamReports.map((r) => ({ employee: profiles[r.user_id] ?? r.user_id, date: r.report_date, hours: r.hours_worked, completed: r.tasks_completed, pending: r.tasks_pending, blockers: r.blockers, notes: r.notes }));
                    exportToCSV(`daily-reports-${new Date().toISOString().slice(0,10)}`, rows);
                  }}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const rows = teamReports.map((r) => ({ Employee: profiles[r.user_id] ?? r.user_id, Date: r.report_date, Hours: r.hours_worked, Completed: r.tasks_completed, Pending: r.tasks_pending, Blockers: r.blockers }));
                    exportToPDF("Team Daily Reports", rows);
                  }}><FileText className="h-4 w-4 mr-2" />Export PDF</Button>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Hours</TableHead><TableHead>Completed</TableHead><TableHead>Blockers</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {teamReports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{profiles[r.user_id] ?? r.user_id.slice(0, 8)}</TableCell>
                        <TableCell>{r.report_date}</TableCell>
                        <TableCell>{r.hours_worked}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.tasks_completed}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.blockers}</TableCell>
                      </TableRow>
                    ))}
                    {teamReports.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No team reports yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
