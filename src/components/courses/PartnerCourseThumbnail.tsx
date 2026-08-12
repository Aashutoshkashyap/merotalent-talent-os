import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface PartnerCourseThumbnailProps {
  source: string | null | undefined;
  title: string;
  className?: string;
  imageClassName?: string;
}

export const PartnerCourseThumbnail = ({
  source,
  title,
  className,
  imageClassName,
}: PartnerCourseThumbnailProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [source]);

  return (
    <div className={cn("relative overflow-hidden bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)]", className)}>
      {source && !failed ? (
        <img
          src={source}
          alt={title}
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-2 text-slate-500">
          <BookOpen className="h-8 w-8" aria-hidden="true" />
          <span className="text-xs font-bold">Partner course</span>
        </div>
      )}
    </div>
  );
};
