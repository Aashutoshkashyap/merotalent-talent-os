import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  AlertCircle,
  Award,
  BookOpenCheck,
  CalendarDays,
  Loader2,
  Medal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

type BadgeRow = Database["public"]["Tables"]["badges"]["Row"];
type BadgeInsert = Database["public"]["Tables"]["badges"]["Insert"];

interface BadgeWithAwardCount extends BadgeRow {
  awardCount: number;
}

interface BadgeQueryRow extends BadgeRow {
  user_badges: Array<{ count: number }> | null;
}

const CATEGORY_OPTIONS = [
  { value: "achievement", label: "Achievement" },
  { value: "competition", label: "Competition" },
  { value: "skill", label: "Skill" },
  { value: "community", label: "Community" },
] as const;

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "achievement",
  iconUrl: "",
};

const formatCategory = (category: string | null) => {
  if (!category) return "Uncategorized";

  return category
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDate = (date: string) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const CategoryGlyph = ({
  category,
  className,
}: {
  category: string | null;
  className?: string;
}) => {
  switch (category?.toLowerCase()) {
    case "achievement":
      return <Trophy className={className} aria-hidden="true" />;
    case "competition":
      return <Medal className={className} aria-hidden="true" />;
    case "skill":
      return <BookOpenCheck className={className} aria-hidden="true" />;
    case "community":
      return <Users className={className} aria-hidden="true" />;
    default:
      return <Award className={className} aria-hidden="true" />;
  }
};

const BadgeArtwork = ({ badge }: { badge: BadgeRow }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = badge.icon_url?.trim() ?? "";
  const canRenderImage =
    !imageFailed &&
    (imageUrl.startsWith("https://") ||
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("/"));
  const canRenderSymbol = imageUrl.length > 0 && imageUrl.length <= 8;

  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[#fff1e8] text-[#c2410c] ring-1 ring-[#f5d9c7]">
      {canRenderImage ? (
        // Badge icons can come from user-configured remote hosts, which cannot
        // be safely enumerated in Next's static image allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : canRenderSymbol ? (
        <span className="text-2xl" aria-hidden="true">
          {imageUrl}
        </span>
      ) : (
        <CategoryGlyph category={badge.category} className="h-6 w-6" />
      )}
    </div>
  );
};

const AdminBadges = () => {
  const { toast } = useToast();
  const [badges, setBadges] = useState<BadgeWithAwardCount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [badgeToDelete, setBadgeToDelete] = useState<BadgeWithAwardCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchBadges = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from("badges")
      .select("*, user_badges(count)")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
      setBadges([]);
      setIsLoading(false);
      return;
    }

    const rows = (data ?? []) as BadgeQueryRow[];
    setBadges(
      rows.map(({ user_badges: awardAggregate, ...badge }) => ({
        ...badge,
        awardCount: awardAggregate?.[0]?.count ?? 0,
      })),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchBadges();
  }, [fetchBadges]);

  const filteredBadges = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) return badges;

    return badges.filter((badge) =>
      [badge.name, badge.description, badge.category].some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [badges, searchQuery]);

  const totalAwards = useMemo(
    () => badges.reduce((total, badge) => total + badge.awardCount, 0),
    [badges],
  );

  const categoryCount = useMemo(
    () =>
      new Set(
        badges
          .map((badge) => badge.category?.trim().toLowerCase())
          .filter((category): category is string => Boolean(category)),
      ).size,
    [badges],
  );

  const awardedBadgeCount = useMemo(
    () => badges.filter((badge) => badge.awardCount > 0).length,
    [badges],
  );

  const stats = [
    { label: "Badge catalogue", value: badges.length, icon: Award },
    { label: "Awards issued", value: totalAwards, icon: Trophy },
    { label: "Active categories", value: categoryCount, icon: Target },
    { label: "Badges in use", value: awardedBadgeCount, icon: Sparkles },
  ];

  const resetCreateForm = () => {
    setFormData(EMPTY_FORM);
    setMutationError(null);
  };

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) resetCreateForm();
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = formData.name.trim();

    if (!name) {
      setMutationError("Enter a badge name before creating it.");
      return;
    }

    setIsSubmitting(true);
    setMutationError(null);

    const payload: BadgeInsert = {
      name,
      description: formData.description.trim() || null,
      category: formData.category || null,
      icon_url: formData.iconUrl.trim() || null,
    };

    const { data, error } = await supabase
      .from("badges")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      const message =
        error?.message ??
        "The database did not return the created badge, so no success was recorded.";
      setMutationError(message);
      setIsSubmitting(false);
      return;
    }

    setBadges((currentBadges) => [
      { ...data, awardCount: 0 },
      ...currentBadges.filter((badge) => badge.id !== data.id),
    ]);
    setIsSubmitting(false);
    setIsCreateDialogOpen(false);
    resetCreateForm();
    toast({
      title: "Badge created",
      description: `${data.name} is now available in the badge catalogue.`,
    });
  };

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!badgeToDelete) return;

    setIsDeleting(true);
    setMutationError(null);

    const { data, error } = await supabase
      .from("badges")
      .delete()
      .eq("id", badgeToDelete.id)
      .select("*");

    const deletedBadge = data?.find((badge) => badge.id === badgeToDelete.id);

    if (error || !deletedBadge) {
      const message =
        error?.message ??
        "The database did not return a deleted row. The badge may still exist.";
      setMutationError(message);
      setIsDeleting(false);
      return;
    }

    setBadges((currentBadges) =>
      currentBadges.filter((badge) => badge.id !== deletedBadge.id),
    );
    setIsDeleting(false);
    setBadgeToDelete(null);
    toast({
      title: "Badge deleted",
      description: `${deletedBadge.name} was removed from the catalogue.`,
    });
  };

  return (
    <OperationsPage>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c2410c]">
            <span className="h-2 w-2 rounded-full bg-[#c2410c]" />
            Achievement system
          </div>
          <h1 className="text-2xl font-display font-bold sm:text-3xl">
            Badge management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the real badge catalogue and see how often each achievement
            has been awarded.
          </p>
        </div>

        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={handleCreateDialogChange}
        >
          <DialogTrigger asChild>
            <Button
              className="w-full bg-[#c2410c] text-white hover:bg-[#9a3412] sm:w-auto"
              aria-label="Create a new badge"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create badge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create a badge</DialogTitle>
                <DialogDescription>
                  Add an achievement to the live badge catalogue. Every field
                  below maps directly to the badge record.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-5">
                <div className="space-y-2">
                  <Label htmlFor="badge-name">Badge name</Label>
                  <Input
                    id="badge-name"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Community champion"
                    maxLength={120}
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="badge-description">Description</Label>
                  <Textarea
                    id="badge-description"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Explain what someone must do to earn it."
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="badge-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        category: value,
                      }))
                    }
                  >
                    <SelectTrigger id="badge-category">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="badge-icon">Icon URL or short symbol</Label>
                  <Input
                    id="badge-icon"
                    value={formData.iconUrl}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        iconUrl: event.target.value,
                      }))
                    }
                    placeholder="https://… or 🏆"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use the category icon.
                  </p>
                </div>

                {mutationError && (
                  <div
                    role="alert"
                    className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{mutationError}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCreateDialogChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#c2410c] text-white hover:bg-[#9a3412]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Creating…
                    </>
                  ) : (
                    "Create badge"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {mutationError && !isCreateDialogOpen && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">The change was not confirmed</p>
              <p className="mt-0.5 text-red-600">{mutationError}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-red-700 hover:bg-red-100 hover:text-red-800"
            onClick={() => setMutationError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[22px] border border-[#f1e2d7] bg-white p-4 shadow-[0_14px_38px_rgba(74,45,27,0.055)] sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold tracking-[-0.04em] text-[#17162e] sm:text-3xl">
                  {isLoading ? "—" : stat.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.label}
                </p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#fff1e8] text-[#c2410c]">
                <stat.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[22px] border border-[#f1e2d7] bg-white p-3 shadow-[0_14px_38px_rgba(74,45,27,0.055)] sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search badge catalogue"
            placeholder="Search name, description or category"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="border-transparent bg-[#fcfaf8] pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => void fetchBadges()}
          disabled={isLoading}
          aria-label="Refresh badge catalogue and award counts"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh data
        </Button>
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading badges"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[22px] border border-[#f1e2d7] bg-white p-5"
            >
              <div className="flex gap-4">
                <Skeleton className="h-14 w-14 rounded-[18px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              <Skeleton className="mt-6 h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-[24px] border border-red-200 bg-white px-5 py-12 text-center shadow-[0_14px_38px_rgba(74,45,27,0.055)]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#17162e]">
            Badge data could not be loaded
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
            {loadError}
          </p>
          <Button
            className="mt-5 bg-[#c2410c] text-white hover:bg-[#9a3412]"
            onClick={() => void fetchBadges()}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : filteredBadges.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBadges.map((badge) => {
            return (
              <article
                key={badge.id}
                className="group relative overflow-hidden rounded-[24px] border border-[#f1e2d7] bg-white p-5 shadow-[0_14px_38px_rgba(74,45,27,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(74,45,27,0.1)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-[#c2410c]" />

                <div className="flex items-start gap-4">
                  <BadgeArtwork badge={badge} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-[#17162e]">
                      {badge.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                      {badge.description || "No achievement description added yet."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-[#f1e2d7] bg-[#fff8f3] text-[#8a4b2a]"
                  >
                    <CategoryGlyph
                      category={badge.category}
                      className="h-3 w-3"
                    />
                    {formatCategory(badge.category)}
                  </Badge>
                  <Badge
                    variant={badge.awardCount > 0 ? "secondary" : "outline"}
                  >
                    {badge.awardCount > 0 ? "In use" : "Not awarded yet"}
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#fcfaf8] p-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      Awards
                    </div>
                    <p className="mt-1 text-lg font-bold text-[#17162e]">
                      {badge.awardCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="border-l border-[#eadfd7] pl-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      Added
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-[#17162e]">
                      {formatDate(badge.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#f2e7df] pt-4">
                  <span className="text-xs text-muted-foreground">
                    Live database record
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setMutationError(null);
                      setBadgeToDelete(badge);
                    }}
                    aria-label={`Delete ${badge.name}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[#e8d7ca] bg-white px-5 py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[#fff1e8] text-[#c2410c]">
            <Award className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#17162e]">
            {badges.length === 0 ? "No badges created yet" : "No matching badges"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {badges.length === 0
              ? "Create the first badge to start the achievement catalogue."
              : "Try a different name, description or category."}
          </p>
          {badges.length === 0 && (
            <Button
              className="mt-5 bg-[#c2410c] text-white hover:bg-[#9a3412]"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create first badge
            </Button>
          )}
        </div>
      )}

      <AlertDialog
        open={Boolean(badgeToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setBadgeToDelete(null);
            setMutationError(null);
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-[24px] border-[#f1e2d7] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this badge?</AlertDialogTitle>
            <AlertDialogDescription>
              {badgeToDelete?.awardCount
                ? `${badgeToDelete.name} has ${badgeToDelete.awardCount.toLocaleString()} recorded awards. The database may block deletion while those records exist.`
                : `${badgeToDelete?.name ?? "This badge"} will be removed from the live catalogue.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {mutationError && (
            <div
              role="alert"
              className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{mutationError}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
              aria-label={`Confirm deletion of ${badgeToDelete?.name ?? "badge"}`}
            >
              {isDeleting ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete badge
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperationsPage>
  );
};

export default AdminBadges;
