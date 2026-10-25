"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { presentFieldLabel } from "@/lib/ui/field-labels";

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

function labelCopy(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, child => {
    if (typeof child === "string" || typeof child === "number") return <span data-field-label-copy="">{child}</span>;
    // Preserve controls, custom components, handlers and refs. Only decorate
    // literal copy in native layout elements inside a wrapping label.
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && (child.type === React.Fragment ||
      (typeof child.type === "string" && !["input", "textarea", "select", "button", "a", "option", "svg"].includes(child.type)))) {
      return React.cloneElement(child, undefined, labelCopy(child.props.children));
    }
    return child;
  });
}

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
    if (localRef.current) return presentFieldLabel(localRef.current);
  });
  return <LabelPrimitive.Root ref={assignRef} className={cn(labelVariants(), className)} {...props}>
    {labelCopy(children)}
  </LabelPrimitive.Root>;
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
