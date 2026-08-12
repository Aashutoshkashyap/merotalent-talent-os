import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ServerCog,
  Shield,
  UserRoundCog,
  Users,
} from "lucide-react";
import { OperationsPage } from "./OperationsUI";

interface AdminRecord {
  roleId: string;
  userId: string;
  role: "admin";
  addedAt: string;
  profile: {
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
}

const formatAssignmentDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const AdminIdentity = ({ admin }: { admin: AdminRecord }) => {
  const name = admin.profile?.fullName?.trim() || "Unnamed administrator";
  const email = admin.profile?.email || "Profile record unavailable";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#fff1e8] text-[#c2410c]">
        {admin.profile?.avatarUrl ? (
          // The avatar URL is stored on the administrator's live profile.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={admin.profile.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Shield className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#17162e]">{name}</p>
        <p className="truncate text-sm text-muted-foreground">{email}</p>
      </div>
    </div>
  );
};

const AdminManagement = () => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data: roleRows, error: rolesError } = await supabase
      .from("user_roles")
      .select("id, user_id, role, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true });

    if (rolesError) {
      setAdmins([]);
      setError(
        `Admin role assignments could not be loaded. ${rolesError.message}`,
      );
      setIsLoading(false);
      return;
    }

    if (!roleRows?.length) {
      setAdmins([]);
      setIsLoading(false);
      return;
    }

    const userIds = [...new Set(roleRows.map((row) => row.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, avatar_url")
      .in("user_id", userIds);

    if (profilesError) {
      setAdmins([]);
      setError(
        `Admin identities could not be matched to profiles. ${profilesError.message}`,
      );
      setIsLoading(false);
      return;
    }

    const profileByUserId = new Map(
      (profiles ?? []).map((profile) => [profile.user_id, profile]),
    );

    setAdmins(
      roleRows.map((row) => {
        const profile = profileByUserId.get(row.user_id);

        return {
          roleId: row.id,
          userId: row.user_id,
          role: "admin",
          addedAt: row.created_at,
          profile: profile
            ? {
                email: profile.email,
                fullName: profile.full_name,
                avatarUrl: profile.avatar_url,
              }
            : null,
        };
      }),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const linkedProfileCount = useMemo(
    () => admins.filter((admin) => admin.profile).length,
    [admins],
  );

  return (
    <OperationsPage>
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#c2410c]">
            <span className="h-2 w-2 rounded-full bg-[#c2410c]" aria-hidden="true" />
            Access control
          </div>
          <h1 className="text-2xl font-display font-bold sm:text-3xl">
            Administrators
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Accounts currently assigned the full administrator role.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="hero" className="shrink-0" aria-label="View administrator provisioning steps">
              <UserRoundCog className="mr-2 h-4 w-4" aria-hidden="true" />
              Provision admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg border-[#f1e2d7] bg-[#fffdfb]">
            <DialogHeader>
              <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1e8] text-[#c2410c]">
                <ServerCog className="h-6 w-6" aria-hidden="true" />
              </div>
              <DialogTitle>Owner-side provisioning required</DialogTitle>
              <DialogDescription className="text-left leading-6">
                This client application does not have a secure server-side
                administrator invite endpoint, so it cannot safely create an
                Auth user or claim that an invitation was sent.
              </DialogDescription>
            </DialogHeader>

            <ol className="space-y-3 pt-2" aria-label="Administrator provisioning steps">
              {[
                "Create or invite the identity from the owning Supabase project or another trusted server-side admin workflow.",
                "Confirm that the Auth identity has a matching profile row with the correct user ID.",
                "Assign the admin role in user_roles through an audited, authorized workflow, then refresh this page.",
              ].map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-2xl border border-[#f1e2d7] bg-white p-3.5"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#c2410c] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-[#5f596b]">{step}</span>
                </li>
              ))}
            </ol>

            <div className="rounded-2xl bg-[#fff1e8] p-4 text-sm leading-6 text-[#7c3a16]">
              Keep the Supabase service-role key on the server only. Never place
              it in browser code or a public environment variable.
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Administrator access summary">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1e8] text-[#c2410c]">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Admin accounts
              </p>
              <p className="mt-1 text-2xl font-bold text-[#17162e]">
                {isLoading ? "—" : admins.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf8f2] text-[#31836b]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Linked profiles
              </p>
              <p className="mt-1 text-2xl font-bold text-[#17162e]">
                {isLoading ? "—" : linkedProfileCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#c2410c] bg-[#c2410c] text-white">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-100">
                Provisioning
              </p>
              <p className="mt-1 font-semibold">Owner controlled</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#f2e7df]">
          <div>
            <CardTitle className="text-lg">Administrator accounts</CardTitle>
            <CardDescription className="mt-1">
              Sourced from live <code>user_roles</code> and <code>profiles</code>{" "}
              records. Auth invitation and activity status are not exposed here.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadAdmins()}
            disabled={isLoading}
            aria-label="Refresh administrator list"
            title="Refresh administrator list"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5" aria-live="polite" aria-label="Loading administrators">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-[#f2e7df] p-4"
                >
                  <Skeleton className="h-11 w-11 rounded-[14px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56 max-w-full" />
                  </div>
                  <Skeleton className="hidden h-7 w-20 rounded-full sm:block" />
                </div>
              ))}
              <span className="sr-only">Loading administrator role assignments</span>
            </div>
          ) : error ? (
            <div className="m-5 flex flex-col items-start gap-4 rounded-[20px] border border-red-200 bg-red-50 p-5" role="alert">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-red-900">Live admin data is unavailable</p>
                  <p className="mt-1 text-sm leading-6 text-red-700">{error}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => void loadAdmins()}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
            </div>
          ) : admins.length === 0 ? (
            <div className="px-5 py-14 text-center" role="status">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff1e8] text-[#c2410c]">
                <Shield className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-[#17162e]">
                No readable admin assignments
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                No <code>admin</code> role rows were returned. This can mean none
                exist, or that the current session is not permitted to read them.
                Use the owner-side provisioning workflow before refreshing.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {admins.map((admin) => (
                  <article
                    key={admin.roleId}
                    className="rounded-[20px] border border-[#f2e7df] bg-white p-4"
                  >
                    <AdminIdentity admin={admin} />
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#f2e7df] pt-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Role
                        </dt>
                        <dd className="mt-1">
                          <Badge>Admin</Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Assigned
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-[#17162e]">
                          <time dateTime={admin.addedAt}>
                            {formatAssignmentDate(admin.addedAt)}
                          </time>
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {admin.profile
                        ? "Identity matched to a profile record"
                        : "No readable matching profile record"}
                    </p>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Administrator</TableHead>
                      <TableHead scope="col">Role</TableHead>
                      <TableHead scope="col">Profile link</TableHead>
                      <TableHead scope="col">Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.roleId}>
                        <TableCell>
                          <AdminIdentity admin={admin} />
                        </TableCell>
                        <TableCell>
                          <Badge>Admin</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              admin.profile
                                ? "border-[#bfe6d7] bg-[#eef9f5] text-[#27715c]"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                            }
                          >
                            {admin.profile ? "Profile linked" : "Unavailable"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <time dateTime={admin.addedAt}>
                            {formatAssignmentDate(admin.addedAt)}
                          </time>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </OperationsPage>
  );
};

export default AdminManagement;
