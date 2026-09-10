import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText, BarChart3, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

const reportsList = [
  { id: "revenue", title: "Revenue Report", description: "Payment transactions, currency, gateway statuses, and net revenue." },
  { id: "applications", title: "College & Job Applications", description: "All student submissions to colleges and job postings." },
  { id: "sessions", title: "Mentor Sessions", description: "Completed, scheduled, and trial mentorship session bookings." },
  { id: "jobs", title: "Job Postings & Activity", description: "Active, approved, and expired job listings analytics." },
  { id: "events", title: "Events & Ticket Registrations", description: "Event turnouts, registrations, and ticket sales." },
  { id: "subscriptions", title: "Subscriptions & Renewal Rates", description: "Active subscriptions, trial conversions, and expirations." },
];

export default function AdminReports() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState("revenue");
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadReport = async () => {
    setIsExporting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError || !authData.session?.access_token) throw new Error("Your administrator session has expired. Sign in again.");
      const params = new URLSearchParams({ format, limit: "5000" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const response = await fetch(`/api/v1/admin/reports/${selectedReport}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authData.session.access_token}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "The report could not be generated.");
      }
      const blob = await response.blob();
      const filename = response.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1]
        || `merotalent-${selectedReport}-${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "xml"}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast({ title: "Report downloaded", description: `Exported ${filename} successfully.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export Failed", description: err?.message || "Export error." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics & Reports Export</h1>
          <p className="text-muted-foreground">Generate and export system reports to CSV or Excel</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Export Controls
            </CardTitle>
            <CardDescription>Select report scope and format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Report Category</Label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reportsList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={format === "csv" ? "default" : "outline"}
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setFormat("csv")}
                  type="button"
                >
                  <FileText className="w-4 h-4" />
                  CSV
                </Button>
                <Button
                  variant={format === "xlsx" ? "default" : "outline"}
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setFormat("xlsx")}
                  type="button"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel (.xml)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>From Date (Optional)</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date (Optional)</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <Button
              variant="hero"
              className="w-full mt-4"
              onClick={handleDownloadReport}
              disabled={isExporting}
            >
              {isExporting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Download Report</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Report Cards Grid */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {reportsList.map((rep) => (
            <Card
              key={rep.id}
              className={`cursor-pointer transition-all ${
                selectedReport === rep.id ? "ring-2 ring-primary border-primary shadow-md" : "hover:border-slate-300"
              }`}
              onClick={() => setSelectedReport(rep.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{rep.title}</span>
                  {selectedReport === rep.id && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{rep.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </OperationsPage>
  );
}
