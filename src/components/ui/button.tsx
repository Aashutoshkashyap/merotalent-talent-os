import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(249,115,22,0.18)] hover:-translate-y-0.5 hover:bg-[#9a3412] hover:shadow-[0_12px_24px_rgba(249,115,22,0.24)] active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/25",
        outline: "border border-[#e6ddd6] bg-white text-foreground shadow-[0_4px_12px_rgba(77,48,31,0.04)] hover:border-[#fdba74] hover:bg-[#fffaf7]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:shadow-lg hover:shadow-secondary/25 active:scale-[0.98]",
        ghost: "hover:bg-[#fff1e8] hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        // Hero variants for landing page
        hero: "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:-translate-y-0.5 hover:bg-[#9a3412] hover:shadow-[0_14px_30px_rgba(249,115,22,0.28)]",
        "hero-secondary": "border border-[#e6ddd6] bg-white text-foreground shadow-[0_6px_18px_rgba(77,48,31,0.06)] hover:border-[#fdba74] hover:bg-[#fffaf7]",
        "hero-outline": "border-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground",
        // Accent button
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]",
        // Success button for positive actions
        success: "bg-success text-success-foreground hover:bg-success/90 hover:shadow-lg hover:shadow-success/25",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
