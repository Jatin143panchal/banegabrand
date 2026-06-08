// ADD THESE IMPORTS AT TOP

import * as XLSX from "xlsx";
import { Plus, Pencil, Trash2, GraduationCap, Upload, Download } from "lucide-react";

// ADD INSIDE COMPONENT

const [uploading, setUploading] = useState(false);

// ================= IMPORT EXCEL =================

const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (event) => {
    try {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      setUploading(true);

      for (const row of rows) {
        await supabase.from("workshop_leads").insert({
          name: row.Name || "",
          email: row.Email || "",
          phone: row.Phone || "",
          company: row.Company || "",
          city: row.City || "",
          workshop_name: row.WorkshopName || "",
          workshop_date: row.WorkshopDate || null,
          workshop_topic: row.Topic || "",
          trainer: row.Trainer || "",
          interest: row.Interest || "",
          budget: row.Budget || "",
          status: row.Status || "new",
          remark: row.Remark || "",
        });
      }

      qc.invalidateQueries({ queryKey: ["workshop_leads"] });
      toast.success(`${rows.length} Workshop Leads Imported`);
    } catch (error) {
      console.error(error);
      toast.error("Excel import failed");
    } finally {
      setUploading(false);
    }
  };

  reader.readAsBinaryString(file);
};

// ================= EXPORT EXCEL =================

const handleExportExcel = () => {
  const exportData = leads.map((lead) => ({
    Name: lead.name,
    Email: lead.email,
    Phone: lead.phone,
    Company: lead.company,
    City: lead.city,
    WorkshopName: lead.workshop_name,
    WorkshopDate: lead.workshop_date,
    Topic: lead.workshop_topic,
    Trainer: lead.trainer,
    Interest: lead.interest,
    Budget: lead.budget,
    Status: lead.status,
    Remark: lead.remark,
    CreatedAt: lead.created_at,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Workshop Leads"
  );

  XLSX.writeFile(
    workbook,
    `Workshop_Leads_${new Date().toISOString().split("T")[0]}.xlsx`
  );

  toast.success("Workshop Leads Exported");
};

// ================= REPLACE COMPLETE HEADER SECTION =================

<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold flex items-center gap-2">
      <GraduationCap className="h-7 w-7 text-primary" />
      Workshop Leads
    </h1>
    <p className="text-muted-foreground">
      Leads captured from training workshops
    </p>
  </div>

  <div className="flex gap-2">

    <Button
      variant="outline"
      onClick={handleExportExcel}
    >
      <Download className="mr-2 h-4 w-4" />
      Export Excel
    </Button>

    <label>
      <input
        type="file"
        hidden
        accept=".xlsx,.xls,.csv"
        onChange={handleImportExcel}
      />

      <Button
        variant="outline"
        asChild
        disabled={uploading}
      >
        <span>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Importing..." : "Import Excel"}
        </span>
      </Button>
    </label>

    {canEdit && (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Workshop Lead
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "Add"} Workshop Lead
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name || ""}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone || ""}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                value={form.email || ""}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Company</Label>
              <Input
                value={form.company || ""}
                onChange={(e) =>
                  setForm({ ...form, company: e.target.value })
                }
              />
            </div>

            <div>
              <Label>City</Label>
              <Input
                value={form.city || ""}
                onChange={(e) =>
                  setForm({ ...form, city: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Workshop Name *</Label>
              <Input
                value={form.workshop_name || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    workshop_name: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Workshop Date</Label>
              <Input
                type="date"
                value={form.workshop_date || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    workshop_date: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Topic</Label>
              <Input
                value={form.workshop_topic || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    workshop_topic: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Trainer</Label>
              <Input
                value={form.trainer || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    trainer: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Budget</Label>
              <Input
                value={form.budget || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    budget: e.target.value,
                  })
                }
              />
            </div>

            <div className="col-span-2">
              <Label>Interest</Label>
              <Input
                value={form.interest || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interest: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={form.status || "new"}
                onValueChange={(v) =>
                  setForm({ ...form, status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Remark</Label>
              <Textarea
                value={form.remark || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    remark: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={
                !form.name ||
                !form.workshop_name ||
                saveMutation.isPending
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}

  </div>
</div>
