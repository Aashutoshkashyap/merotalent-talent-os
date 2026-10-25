"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { connectFieldLabel } from "@/lib/ui/field-labels";

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, children, ...props }, ref) => {
  const localRef = React.useRef<HTMLLabelElement | null>(null);
  const assignRef = React.useCallback((node: HTMLLabelElement | null) => {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  React.useLayoutEffect(() => {
    if (localRef.current) return connectFieldLabel(localRef.current);
  });
  return <LabelPrimitive.Root ref={assignRef} className={cn(labelVariants(), className)} {...props}>
    {children}
  </LabelPrimitive.Root>;
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
