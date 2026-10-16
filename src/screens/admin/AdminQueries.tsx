import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Reply,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

const isNeonStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";
type QueryRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string | null;
  assigned_to: string | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
};
type ResponseStatus = "resolved" | "in_progress";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "resolved":
      return (
        <Badge className="gap-1 bg-emerald-600">
          <CheckCircle className="h-3 w-3" />
          Resolved
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          In progress
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
};

const AdminQueries = () => {
  const { toast } = useToast();
  const [queries, setQueries] = useState<QueryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuery, setSelectedQuery] = useState<QueryRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [responseStatus, setResponseStatus] =
    useState<ResponseStatus>("resolved");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchQueries = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      let data: QueryRow[];
      if (isNeonStaging) {
        const response = await fetch("/api/v1/neon-staging/admin/contact-queries", { cache: "no-store" });
        if (!response.ok) throw new Error("Contact queries could not be loaded.");
        const payload = await response.json() as { data: QueryRow[] };
        data = payload.data;
      } else {
        const { supabase } = await import("@/integrations/supabase/client");
        const result = await supabase.from("contact_queries").select("*")
          .order("created_at", { ascending: false });
        if (result.error) throw result.error;
        data = result.data ?? [];
      }
      setQueries(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Contact queries could not be loaded.");
      setQueries([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchQueries();
  }, [fetchQueries]);

  const filteredQueries = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return queries.filter((query) => {
      const matchesSearch =
        !search ||
        query.name.toLowerCase().includes(search) ||
        query.email.toLowerCase().includes(search) ||
        query.subject.toLowerCase().includes(search) ||
        query.message.toLowerCase().includes(search);
      const normalizedStatus = query.status || "pending";
      const matchesStatus =
        statusFilter === "all" || normalizedStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [queries, searchQuery, statusFilter]);

  const openQuery = (query: QueryRow) => {
    setSelectedQuery(query);
    setReplyText(query.response ?? "");
    setResponseStatus(
      query.status === "in_progress" ? "in_progress" : "resolved",
    );
  };

  const closeQuery = () => {
    setSelectedQuery(null);
    setReplyText("");
    setResponseStatus("resolved");
  };

  const handleReply = async () => {
    const response = replyText.trim();
    if (!selectedQuery || !response) return;

    setIsReplying(true);
    let updatedQuery: QueryRow | null = null;
    let error: Error | null = null;
    try {
      if (isNeonStaging) {
        const result = await fetch("/api/v1/neon-staging/admin/contact-queries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedQuery.id, response, status: responseStatus }),
        });
        if (!result.ok) throw new Error("The response could not be saved.");
        updatedQuery = (await result.json() as { data: QueryRow }).data;
      } else {
        const { supabase } = await import("@/integrations/supabase/client");
        const result = await supabase.from("contact_queries")
          .update({ response, responded_at: new Date().toISOString(), status: responseStatus })
          .eq("id", selectedQuery.id).select("*").maybeSingle();
        if (result.error) throw result.error;
        updatedQuery = result.data;
      }
    } catch (caught) { error = caught instanceof Error ? caught : new Error("The response could not be saved."); }
    setIsReplying(false);

    if (error || !updatedQuery) {
      toast({
        variant: "destructive",
        title: "Response save could not be verified",
        description:
          error?.message ||
          "The database did not return an updated query record.",
      });
      return;
    }

    setQueries((current) =>
      current.map((query) =>
        query.id === updatedQuery.id ? updatedQuery : query,
      ),
    );
    closeQuery();
    toast({
      title: "Response saved",
      description: `The live query record was updated to ${
        responseStatus === "resolved" ? "resolved" : "in progress"
      }. No email was sent because email delivery is not configured.`,
    });
  };

  const handleDelete = async (query: QueryRow) => {
    if (
      !window.confirm(
        `Delete the contact query from ${query.name}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(query.id);
    let deletedRow: { id: string } | null = null;
    let error: Error | null = null;
    try {
      if (isNeonStaging) {
        const result = await fetch("/api/v1/neon-staging/admin/contact-queries", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: query.id }),
        });
        if (!result.ok) throw new Error("The query could not be deleted.");
        deletedRow = (await result.json() as { data: { id: string } }).data;
      } else {
        const { supabase } = await import("@/integrations/supabase/client");
        const result = await supabase.from("contact_queries").delete()
          .eq("id", query.id).select("id").maybeSingle();
        if (result.error) throw result.error;
        deletedRow = result.data;
      }
    } catch (caught) { error = caught instanceof Error ? caught : new Error("The query could not be deleted."); }
    setDeletingId(null);

    if (error || !deletedRow) {
      toast({
        variant: "destructive",
        title: "Query deletion could not be verified",
        description:
          error?.message ||
          "The database did not confirm that this record was removed.",
      });
      return;
    }

    setQueries((current) =>
      current.filter((currentQuery) => currentQuery.id !== query.id),
    );
    if (selectedQuery?.id === query.id) closeQuery();
    toast({
      title: "Query deleted",
      description: "The live contact query record was removed.",
    });
  };

  const stats = [
    {
      label: "Pending",
      value: queries.filter((query) => !query.status || query.status === "pending")
        .length,
      color: "text-amber-600",
    },
    {
      label: "In progress",
      value: queries.filter((query) => query.status === "in_progress").length,
      color: "text-primary",
    },
    {
      label: "Resolved",
      value: queries.filter((query) => query.status === "resolved").length,
      color: "text-emerald-600",
    },
  ];

  return (
    <OperationsPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="workspace-kicker">Support inbox</p>
          <h1 className="text-2xl font-display font-bold">Contact Queries</h1>
          <p className="text-muted-foreground">
            Review live submissions and save response notes to their records.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void fetchQueries()}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {loadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-destructive">
                Contact queries are unavailable
              </p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => void fetchQueries()}
              className="shrink-0"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className={`text-2xl font-bold ${stat.color}`}>
                {isLoading ? "—" : stat.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name, email, subject, or message..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
            aria-label="Search contact queries"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-full sm:w-44"
            aria-label="Filter contact queries by status"
          >
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                  <span className="mt-2 block text-sm text-muted-foreground">
                    Loading live contact queries...
                  </span>
                </TableCell>
              </TableRow>
            ) : filteredQueries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  {queries.length === 0
                    ? "No contact queries are available."
                    : "No queries match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredQueries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell>
                    <div className="flex min-w-52 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{query.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {query.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-56">
                      <p className="line-clamp-1 font-medium">{query.subject}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {query.message}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(query.status)}</TableCell>
                  <TableCell>
                    {query.assigned_to ? (
                      <span className="text-sm">{query.assigned_to}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(query.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openQuery(query)}
                        aria-label={`View query from ${query.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openQuery(query)}
                        aria-label={`Write a response to ${query.name}`}
                      >
                        <Reply className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => void handleDelete(query)}
                        disabled={deletingId === query.id}
                        aria-label={`Delete query from ${query.name}`}
                      >
                        {deletingId === query.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={Boolean(selectedQuery)}
        onOpenChange={(open) => {
          if (!open) closeQuery();
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Query details
            </DialogTitle>
            <DialogDescription>
              Saving a response updates this database record. It does not send
              an email.
            </DialogDescription>
          </DialogHeader>

          {selectedQuery && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col gap-4 rounded-2xl bg-muted/60 p-4 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{selectedQuery.name}</p>
                  <a
                    href={`mailto:${selectedQuery.email}`}
                    className="flex items-center gap-2 break-all text-sm text-muted-foreground hover:text-primary"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    {selectedQuery.email}
                  </a>
                </div>
                <div className="self-start sm:self-auto">
                  {getStatusBadge(selectedQuery.status)}
                </div>
              </div>

              <div>
                <h4 className="font-semibold">{selectedQuery.subject}</h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
                  {selectedQuery.message}
                </p>
              </div>

              {selectedQuery.response && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Saved response
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {selectedQuery.response}
                  </p>
                  {selectedQuery.responded_at && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Updated {formatDateTime(selectedQuery.responded_at)}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3 border-t pt-5">
                <div>
                  <h4 className="font-semibold">Response note</h4>
                  <p className="text-sm text-muted-foreground">
                    This is stored for the admin team. Use the email link above
                    if you also need to contact the sender.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="query-response">Response</Label>
                  <Textarea
                    id="query-response"
                    placeholder="Write the response saved with this query..."
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Select
                    value={responseStatus}
                    onValueChange={(value: ResponseStatus) =>
                      setResponseStatus(value)
                    }
                  >
                    <SelectTrigger
                      className="w-full sm:w-48"
                      aria-label="Status after saving response"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resolved">
                        Mark as resolved
                      </SelectItem>
                      <SelectItem value="in_progress">
                        Keep in progress
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="hero"
                    className="w-full sm:w-auto"
                    onClick={() => void handleReply()}
                    disabled={isReplying || !replyText.trim()}
                  >
                    {isReplying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Reply className="mr-2 h-4 w-4" />
                    )}
                    {isReplying ? "Saving..." : "Save response"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
};

export default AdminQueries;
