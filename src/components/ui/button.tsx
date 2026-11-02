import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#071a3d] text-white shadow-[0_8px_18px_rgba(7,26,61,0.22)] hover:-translate-y-0.5 hover:bg-[#05132d] hover:shadow-[0_12px_24px_rgba(7,26,61,0.3)] active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/25",
        outline: "border border-[#e2e8f0] bg-[#f8fafc] text-[#071a3d] shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:border-[#071a3d] hover:bg-white",
        secondary: "bg-[#0f295a] text-white hover:bg-[#071a3d] hover:shadow-lg active:scale-[0.98]",
        ghost: "hover:bg-[#f1f5f9] hover:text-[#071a3d]",
        link: "text-[#071a3d] underline-offset-4 hover:underline",
        // Hero variants for landing page
        hero: "bg-[#071a3d] text-white shadow-[0_10px_24px_rgba(7,26,61,0.25)] hover:-translate-y-0.5 hover:bg-[#05132d] hover:shadow-[0_14px_30px_rgba(7,26,61,0.35)]",
        "hero-secondary": "border border-[#cbd5e1] bg-[#f8fafc] text-[#071a3d] shadow-[0_6px_18px_rgba(0,0,0,0.04)] hover:border-[#071a3d] hover:bg-white",
        "hero-outline": "border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:border-white",
        // Accent button
        accent: "bg-[#071a3d] text-white hover:bg-[#05132d] hover:shadow-lg active:scale-[0.98]",
        // Success button for positive actions
        success: "bg-emerald-700 text-white hover:bg-emerald-800 hover:shadow-lg",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-10 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
