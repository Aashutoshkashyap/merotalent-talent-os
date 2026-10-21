import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Eye,
  Info,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

type NotificationRow = Tables<"notifications">;
type ProfileSummary = Pick<
  Tables<"profiles">,
  "user_id" | "email" | "full_name" | "updated_at"
>;

interface AdminMember {
  userId: string;
  email: string | null;
  fullName: string | null;
  updatedAt: string | null;
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getTypeIcon = (type: string | null) => {
  switch (type) {
    case "warning":
    case "alert":
      return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />;
    case "success":
      return <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />;
    default:
      return <Info className="h-4 w-4 shrink-0 text-primary" />;
  }
};

const AdminNotifications = () => {
  const { user } = useAuth();
  const isNeonStaging = isNeonClientRuntime();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationRow | null>(null);
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
    recipients: "admins",
  });

  const fetchLiveData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      if (isNeonStaging) {
        const response = await fetch("/api/v1/neon-staging/admin/notifications", {
          credentials: "same-origin", cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error("The notification records could not be loaded.");
        const data = payload?.data;
        const members = Array.isArray(data?.adminMembers) ? data.adminMembers as ProfileSummary[] : [];
        const recipients = Array.isArray(data?.profiles) ? data.profiles as ProfileSummary[] : [];
        setNotifications(Array.isArray(data?.notifications) ? data.notifications as NotificationRow[] : []);
        setProfiles([...new Map([...members, ...recipients].map(row => [row.user_id, row])).values()]);
        setAdminMembers(members.map(row => ({ userId: row.user_id, email: row.email,
          fullName: row.full_name, updatedAt: row.updated_at })));
        return;
      }
      const [notificationsResult, adminRolesResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(250),
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
      ]);

      if (notificationsResult.error) throw notificationsResult.error;
      if (adminRolesResult.error) throw adminRolesResult.error;

      const notificationRows = notificationsResult.data ?? [];
      const adminIds = [
        ...new Set((adminRolesResult.data ?? []).map((role) => role.user_id)),
      ];
      const profileIds = [
        ...new Set([
          ...adminIds,
          ...notificationRows.map((notification) => notification.recipient_id),
        ]),
      ];

      let profileRows: ProfileSummary[] = [];
      if (profileIds.length > 0) {
        const profileResult = await supabase
          .from("profiles")
          .select("user_id, email, full_name, updated_at")
          .in("user_id", profileIds);

        if (profileResult.error) throw profileResult.error;
        profileRows = profileResult.data ?? [];
      }

      const profileById = new Map(
        profileRows.map((profile) => [profile.user_id, profile]),
      );

      setNotifications(notificationRows);
      setProfiles(profileRows);
      setAdminMembers(
        adminIds.map((userId) => {
          const profile = profileById.get(userId);
          return {
            userId,
            email: profile?.email ?? null,
            fullName: profile?.full_name ?? null,
            updatedAt: profile?.updated_at ?? null,
          };
        }),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "The notification records could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isNeonStaging]);

  useEffect(() => {
    void fetchLiveData();
  }, [fetchLiveData]);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.user_id, profile])),
    [profiles],
  );

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = notifications.filter(
    (notification) =>
      new Date(notification.created_at).getTime() >= weekStart,
  ).length;

  const recipientLabel = (recipientId: string) => {
    const profile = profileById.get(recipientId);
    return profile?.full_name || profile?.email || `User ${recipientId.slice(0, 8)}`;
  };

  const resetComposer = () => {
    setNewNotification({
      title: "",
      message: "",
      type: "info",
      recipients: "admins",
    });
  };

  const handleSendNotification = async () => {
    const title = newNotification.title.trim();
    const message = newNotification.message.trim();

    if (!title || !message) {
      toast({
        variant: "destructive",
        title: "Title and message are required",
        description: "Complete both fields before saving the notification.",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign-in required",
        description: "Your session is not available. Sign in again and retry.",
      });
      return;
    }

    if (isNeonStaging) {
      setIsSending(true);
      try {
        const response = await fetch("/api/v1/neon-staging/admin/notifications", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, message, type: newNotification.type, recipients: newNotification.recipients }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !Number.isInteger(payload?.data?.created)) throw new Error("Notification save could not be verified.");
        toast({ title: "In-app notification saved", description: `${payload.data.created} notification record(s) created. Email and push delivery are separate.` });
        setIsCreateOpen(false); resetComposer(); await fetchLiveData();
      } catch (error) { toast({ variant: "destructive", title: "Notification save failed",
        description: error instanceof Error ? error.message : "Please try again." }); }
      finally { setIsSending(false); }
      return;
    }

    const recipientIds =
      newNotification.recipients === "admins"
        ? adminMembers.map((member) => member.userId)
        : newNotification.recipients === "self"
          ? [user.id]
          : newNotification.recipients.startsWith("user:")
            ? [newNotification.recipients.slice(5)]
            : [];

    const uniqueRecipientIds = [...new Set(recipientIds.filter(Boolean))];
    if (uniqueRecipientIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No recipients available",
        description:
          "No live administrator account matched this recipient selection.",
      });
      return;
    }

    setIsSending(true);
    const { data: insertedRows, error } = await supabase
      .from("notifications")
      .insert(
        uniqueRecipientIds.map((recipientId) => ({
          recipient_id: recipientId,
          sender_id: user.id,
          title,
          message,
          type: newNotification.type,
          category: "admin",
          is_read: false,
        })),
      )
      .select("id");
    setIsSending(false);

    if (error || insertedRows?.length !== uniqueRecipientIds.length) {
      toast({
        variant: "destructive",
        title: "Notification save could not be verified",
        description:
          error?.message ||
          "The database did not return every saved record, so no delivery is being claimed. Refresh before retrying.",
      });
      return;
    }

    toast({
      title: "In-app notification saved",
      description: `${uniqueRecipientIds.length} live notification ${
        uniqueRecipientIds.length === 1 ? "record was" : "records were"
      } created. Email and push delivery are not configured.`,
    });
    setIsCreateOpen(false);
    resetComposer();
    await fetchLiveData();
  };

  const handleDelete = async (notification: NotificationRow) => {
    if (
      !window.confirm(
        `Delete the notification record “${notification.title}”? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(notification.id);
    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/admin/notifications", {
          method: "DELETE", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" }, body: JSON.stringify({ id: notification.id }),
        });
        if (!response.ok) throw new Error("Notification removal could not be verified.");
        setNotifications(current => current.filter(item => item.id !== notification.id));
        setSelectedNotification(current => current?.id === notification.id ? null : current);
        toast({ title: "Notification removed", description: "The record is hidden from the notification center." });
      } catch (error) { toast({ variant: "destructive", title: "Removal failed",
        description: error instanceof Error ? error.message : "Please try again." }); }
      finally { setDeletingId(null); }
      return;
    }
    const { data: deletedRow, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notification.id)
      .select("id")
      .maybeSingle();
    setDeletingId(null);

    if (error || !deletedRow) {
      toast({
        variant: "destructive",
        title: "Notification deletion could not be verified",
        description:
          error?.message ||
          "The database did not confirm that this record was removed.",
      });
      return;
    }

    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id),
    );
    setSelectedNotification((current) =>
      current?.id === notification.id ? null : current,
    );
    toast({
      title: "Notification deleted",
      description: "The live in-app notification record was removed.",
    });
  };

  const handleMarkAsRead = async (notification: NotificationRow) => {
    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/admin/notifications", {
          method: "PATCH", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" }, body: JSON.stringify({ id: notification.id }),
        });
        if (!response.ok) throw new Error("Could not mark as read.");
        setNotifications(current => current.map(item => item.id === notification.id ? { ...item, is_read: true } : item));
        setSelectedNotification(current => current?.id === notification.id ? { ...current, is_read: true } : current);
        toast({ title: "Notification updated", description: "Marked as read successfully." });
      } catch (error) { toast({ variant: "destructive", title: "Could not mark as read",
        description: error instanceof Error ? error.message : "Please try again." }); }
      return;
    }
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Could not mark as read",
        description: error.message,
      });
    } else {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
      setSelectedNotification((current) =>
        current?.id === notification.id ? { ...current, is_read: true } : current
      );
      toast({
        title: "Notification updated",
        description: "Marked as read successfully.",
      });
    }
  };

  const composeForMember = (member: AdminMember) => {
    setNewNotification((current) => ({
      ...current,
      recipients: `user:${member.userId}`,
    }));
    setIsCreateOpen(true);
  };

  return (
    <OperationsPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="workspace-kicker">Admin communications</p>
          <h1 className="text-2xl font-display font-bold">
            Notification Center
          </h1>
          <p className="text-muted-foreground">
            Create and review live in-app notification records.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void fetchLiveData()}
            disabled={isLoading}
            aria-label="Refresh notification records"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="flex-1 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                New notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Save an in-app notification
                </DialogTitle>
                <DialogDescription>
                  This creates rows in the notification center. It does not send
                  email, SMS, or push messages.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="notification-title">Title</Label>
                  <Input
                    id="notification-title"
                    placeholder="Notification title"
                    value={newNotification.title}
                    onChange={(event) =>
                      setNewNotification({
                        ...newNotification,
                        title: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification-message">Message</Label>
                  <Textarea
                    id="notification-message"
                    placeholder="Write your in-app message..."
                    value={newNotification.message}
                    onChange={(event) =>
                      setNewNotification({
                        ...newNotification,
                        message: event.target.value,
                      })
                    }
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="notification-type">Type</Label>
                    <Select
                      value={newNotification.type}
                      onValueChange={(value) =>
                        setNewNotification({
                          ...newNotification,
                          type: value,
                        })
                      }
                    >
                      <SelectTrigger id="notification-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Information</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="alert">Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-recipients">Recipients</Label>
                    <Select
                      value={newNotification.recipients}
                      onValueChange={(value) =>
                        setNewNotification({
                          ...newNotification,
                          recipients: value,
                        })
                      }
                    >
                      <SelectTrigger id="notification-recipients">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admins">
                          All administrators ({adminMembers.length})
                        </SelectItem>
                        <SelectItem value="self">Only me</SelectItem>
                        {adminMembers.map((member) => (
                          <SelectItem
                            key={member.userId}
                            value={`user:${member.userId}`}
                          >
                            {member.fullName ||
                              member.email ||
                              `Admin ${member.userId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={() => void handleSendNotification()}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isSending ? "Saving..." : "Save notification"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-destructive">
                Live notifications are unavailable
              </p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => void fetchLiveData()}
              className="shrink-0"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Saved records",
            value: notifications.length,
            icon: Bell,
            color: "text-primary",
          },
          {
            label: "Administrator accounts",
            value: adminMembers.length,
            icon: Users,
            color: "text-orange-700",
          },
          {
            label: "Unread records",
            value: unreadCount,
            icon: MessageSquare,
            color: "text-amber-600",
          },
          {
            label: "Created in 7 days",
            value: thisWeekCount,
            icon: Clock,
            color: "text-emerald-600",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-muted ${stat.color}`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sent">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="sent" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2">
            <Users className="h-4 w-4" />
            Admin team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notification</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                      <span className="mt-2 block text-sm text-muted-foreground">
                        Loading live notification records...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : notifications.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No notification records are available.
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <div className="flex min-w-56 items-start gap-3">
                          {getTypeIcon(notification.type)}
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="line-clamp-1 text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {notification.category || "general"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {recipientLabel(notification.recipient_id)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            notification.is_read ? "secondary" : "outline"
                          }
                        >
                          {notification.is_read ? "Read" : "Unread"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(notification.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => void handleMarkAsRead(notification)}
                              aria-label={`Mark notification ${notification.title} as read`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setSelectedNotification(notification)
                            }
                            aria-label={`View notification ${notification.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => void handleDelete(notification)}
                            disabled={deletingId === notification.id}
                            aria-label={`Delete notification ${notification.title}`}
                          >
                            {deletingId === notification.id ? (
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
        </TabsContent>

        <TabsContent value="admins" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Live administrator accounts
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Profile updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : adminMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No administrator profiles are visible to this account.
                    </TableCell>
                  </TableRow>
                ) : (
                  adminMembers.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.fullName || "Administrator"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email ||
                                `User ${member.userId.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Admin</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {member.updatedAt
                          ? formatDateTime(member.updatedAt)
                          : "Profile unavailable"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => composeForMember(member)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Create in-app message
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(selectedNotification)}
        onOpenChange={(open) => {
          if (!open) setSelectedNotification(null);
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notification details</DialogTitle>
            <DialogDescription>
              Live data from the in-app notifications table.
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4">
                {getTypeIcon(selectedNotification.type)}
                <div>
                  <p className="font-semibold">
                    {selectedNotification.title}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {selectedNotification.message}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Recipient</dt>
                <dd className="text-right font-medium">
                  {recipientLabel(selectedNotification.recipient_id)}
                </dd>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-right font-medium capitalize">
                  {selectedNotification.category || "general"}
                </dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-right font-medium">
                  {selectedNotification.is_read ? "Read" : "Unread"}
                </dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-right font-medium">
                  {formatDateTime(selectedNotification.created_at)}
                </dd>
              </dl>
              <DialogFooter className="gap-2 sm:gap-0">
                {!selectedNotification.is_read && (
                  <Button
                    variant="hero"
                    onClick={() => void handleMarkAsRead(selectedNotification)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as read
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedNotification(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
};

export default AdminNotifications;
