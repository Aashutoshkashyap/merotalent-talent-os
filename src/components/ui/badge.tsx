import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold leading-4 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#fff1e8] text-primary hover:bg-[#ffe4d1]",
        secondary: "border-transparent bg-[#e5f7f0] text-[#36866d] hover:bg-[#d7f2e8]",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-[#eadfd7] bg-white text-[#68616d] hover:border-primary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
