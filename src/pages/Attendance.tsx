import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, LogIn, LogOut, CalendarDays, MapPin, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  type: string;
  notes: string | null;
  location_in: string | null;
  location_out: string | null;
  created_at: string;
}

const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  present: "default", absent: "destructive", late: "secondary", "half-day": "outline", leave: "outline",
};

export default function Attendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ date: "", type: "leave", notes: "" });
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!user,
  });

  const todayRecord = records.find(r => r.date === today);

  const checkIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance").insert({
        user_id: user!.id,
        date: today,
        check_in: new Date().toISOString(),
        status: "present",
        type: "regular",
        location_in: "Office",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); toast.success("Checked in!"); },
    onError: (e: any) => toast.error(e.message?.includes("unique") ? "Already checked in today" : e.message),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;
      const { error } = await supabase.from("attendance").update({
        check_out: new Date().toISOString(),
        location_out: "Office",
      }).eq("id", todayRecord.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); toast.success("Checked out!"); },
  });

  const applyLeave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance").insert({
        user_id: user!.id,
        date: leaveForm.date,
        status: "leave",
        type: leaveForm.type,
        notes: leaveForm.notes,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Leave applied");
      setLeaveForm({ date: "", type: "leave", notes: "" });
      setLeaveOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const thisMonth = records.filter(r => r.date.startsWith(format(new Date(), "yyyy-MM")));
  const presentDays = thisMonth.filter(r => r.status === "present").length;
  const leaveDays = thisMonth.filter(r => r.status === "leave").length;
  const totalWorking = new Date().getDate();

  const getTimeDiff = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return "-";
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance & Leave</h1>
          <p className="text-muted-foreground">Track your daily attendance</p>
        </div>
        <div className="flex gap-2">
          {!todayRecord ? (
            <Button onClick={() => checkIn.mutate()} disabled={checkIn.isPending} className="bg-green-600 hover:bg-green-700">
              <LogIn className="mr-2 h-4 w-4" />{checkIn.isPending ? "Checking in..." : "Check In"}
            </Button>
          ) : !todayRecord.check_out ? (
            <Button onClick={() => checkOut.mutate()} disabled={checkOut.isPending} variant="destructive">
              <LogOut className="mr-2 h-4 w-4" />{checkOut.isPending ? "Checking out..." : "Check Out"}
            </Button>
          ) : (
            <Badge variant="secondary" className="py-2 px-4">Today: {getTimeDiff(todayRecord.check_in, todayRecord.check_out)}</Badge>
          )}
          <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
            <DialogTrigger asChild><Button variant="outline"><Calendar className="mr-2 h-4 w-4" />Apply Leave</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Date</Label><input type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={leaveForm.date} onChange={e => setLeaveForm({ ...leaveForm, date: e.target.value })} /></div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={leaveForm.type} onValueChange={v => setLeaveForm({ ...leaveForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leave">Full Day Leave</SelectItem>
                      <SelectItem value="half-day">Half Day</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Reason</Label><Textarea value={leaveForm.notes} onChange={e => setLeaveForm({ ...leaveForm, notes: e.target.value })} placeholder="Reason for leave..." /></div>
                <Button onClick={() => applyLeave.mutate()} disabled={applyLeave.isPending || !leaveForm.date}>{applyLeave.isPending ? "Applying..." : "Submit"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10"><CalendarDays className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{presentDays}</p><p className="text-xs text-muted-foreground">Present this month</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10"><CalendarDays className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{leaveDays}</p><p className="text-xs text-muted-foreground">Leaves this month</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{todayRecord?.check_in ? format(new Date(todayRecord.check_in), "hh:mm a") : "--:--"}</p><p className="text-xs text-muted-foreground">Today Check In</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><MapPin className="h-5 w-5 text-muted-foreground" /></div><div><p className="text-2xl font-bold">{((presentDays / totalWorking) * 100).toFixed(0)}%</p><p className="text-xs text-muted-foreground">Attendance Rate</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Attendance History</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No attendance records yet. Check in to get started!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(rec => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium text-sm">{format(new Date(rec.date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">{rec.check_in ? format(new Date(rec.check_in), "hh:mm a") : "-"}</TableCell>
                    <TableCell className="text-sm">{rec.check_out ? format(new Date(rec.check_out), "hh:mm a") : "-"}</TableCell>
                    <TableCell className="text-sm">{getTimeDiff(rec.check_in, rec.check_out)}</TableCell>
                    <TableCell><Badge variant={statusBadge[rec.status] || "outline"}>{rec.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{rec.notes || "-"}</TableCell>
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
