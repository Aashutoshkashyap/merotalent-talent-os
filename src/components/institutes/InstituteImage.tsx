"use client";

/* eslint-disable @next/next/no-img-element -- public directory media is runtime-configured Supabase content */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { resolveCollegeMediaUrl } from "@/lib/institutes/public-institutes";

interface InstituteImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  source?: string | null;
}

export default function InstituteImage({ source, alt, className, ...props }: InstituteImageProps) {
  const resolved = resolveCollegeMediaUrl(source);
  const [src, setSrc] = useState(resolved);

  useEffect(() => setSrc(resolved), [resolved]);

  const isPlaceholder = src === "/placeholder.svg";

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      onError={() => {
        if (!isPlaceholder) setSrc("/placeholder.svg");
      }}
      className={cn(
        isPlaceholder ? "bg-slate-50 object-contain p-8" : "object-cover",
        className,
      )}
    />
  );
}
