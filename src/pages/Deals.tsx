import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmQuery, useCrmInsert } from "@/hooks/useCrm";
import { Plus, IndianRupee, Loader2 } from "lucide-react";

interface DbDeal { id: string; title: string; company: string | null; value: number | null; stage: string; probability: number | null; contact_name: string | null; expected_close: string | null; created_at: string; }

const stages = [
  { key: "prospecting", label: "Prospecting", color: "bg-info" },
  { key: "proposal", label: "Proposal", color: "bg-warning" },
  { key: "negotiation", label: "Negotiation", color: "bg-primary" },
  { key: "closed_won", label: "Won", color: "bg-success" },
  { key: "closed_lost", label: "Lost", color: "bg-destructive" },
] as const;

const formatCurrency = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

export default function Deals() {
  const { data: deals = [], isLoading } = useCrmQuery<DbDeal>("deals");
  const insertDeal = useCrmInsert("deals");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", value: "", contact_name: "", expected_close: "", stage: "prospecting" });

  const handleAdd = async () => {
    if (!form.title || !form.company) return;
    const prob = form.stage === "prospecting" ? 20 : form.stage === "proposal" ? 40 : 60;
    await insertDeal.mutateAsync({
      title: form.title, company: form.company, value: Number(form.value) || 0,
      contact_name: form.contact_name, expected_close: form.expected_close || null,
      stage: form.stage as any, probability: prob,
    });
    setForm({ title: "", company: "", value: "", contact_name: "", expected_close: "", stage: "prospecting" });
    setDialogOpen(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Deals Pipeline</h1><p className="text-muted-foreground">Track your deals through each stage</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Deal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Deal</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              {[{ l: "Title", k: "title" }, { l: "Company", k: "company" }, { l: "Value (₹)", k: "value" }, { l: "Contact Name", k: "contact_name" }, { l: "Expected Close", k: "expected_close", t: "date" }].map(f => (
                <div key={f.k} className="grid gap-2"><Label>{f.l}</Label><Input type={f.t || "text"} value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} /></div>
              ))}
              <div className="grid gap-2">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{stages.filter(s => s.key !== "closed_lost").map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={insertDeal.isPending} className="mt-2">{insertDeal.isPending ? "Adding..." : "Add Deal"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stages.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.key);
          const total = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
          return (
            <div key={stage.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatCurrency(total)} total</p>
              <div className="space-y-2">
                {stageDeals.map(deal => (
                  <Card key={deal.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{deal.company}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold flex items-center gap-1"><IndianRupee className="h-3 w-3" />{formatCurrency(deal.value || 0)}</span>
                        <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
