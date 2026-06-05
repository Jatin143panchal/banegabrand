import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Users } from "lucide-react";
import { format } from "date-fns";
import { useHasRole } from "@/hooks/useAdmin";

interface Att {
  id: string; user_id: string; date: string;
  check_in: string | null; check_out: string | null;
  status: string; type: string; notes: string | null;
}
interface Profile { user_id: string; display_name: string | null; }

export default function TeamAttendance() {
  const allowed = useHasRole("owner", "admin", "hr_manager", "tl");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["team_attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").order("date", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Att[];
    },
    enabled: allowed,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, display_name");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: allowed,
  });

  if (!allowed) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="p-8 text-center space-y-2">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-medium">Restricted</p>
          <p className="text-sm text-muted-foreground">Only Owner / Admin / HR Manager / Team Lead can view team attendance.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.display_name || "Unknown";
  const today = format(new Date(), "yyyy-MM-dd");
  const todayRecords = records.filter((r) => r.date === today);
  const presentToday = todayRecords.filter((r) => r.status === "present").length;
  const onLeaveToday = todayRecords.filter((r) => r.status === "leave").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Attendance</h1>
        <p className="text-muted-foreground">Daily check-in / check-out across the team.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{presentToday}</p><p className="text-xs text-muted-foreground">Present today</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-amber-600" /><div><p className="text-2xl font-bold">{onLeaveToday}</p><p className="text-xs text-muted-foreground">On leave today</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div><p className="text-2xl font-bold">{profiles.length}</p><p className="text-xs text-muted-foreground">Total members</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Records</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No attendance records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium text-sm">{nameOf(r.user_id)}</TableCell>
                    <TableCell className="text-sm">{r.check_in ? format(new Date(r.check_in), "hh:mm a") : "-"}</TableCell>
                    <TableCell className="text-sm">{r.check_out ? format(new Date(r.check_out), "hh:mm a") : "-"}</TableCell>
                    <TableCell><Badge variant={r.status === "present" ? "default" : r.status === "leave" ? "outline" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.notes || "-"}</TableCell>
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
