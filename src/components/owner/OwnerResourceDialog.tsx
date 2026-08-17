import type { FormEvent, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OwnerResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

/**
 * Shared dialog shell for owner-controlled resources. The resource-specific
 * components still define their fields, while save/cancel behaviour and
 * accessibility stay consistent across company, mentor, and institute tools.
 */
const OwnerResourceDialog = ({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  onSubmit,
  children,
}: OwnerResourceDialogProps) => (
  <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[24px] border-[#f0e3da]">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form className="space-y-5" onSubmit={onSubmit}>
        {children}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-[#eadfd7]"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-xl bg-[#c2410c] text-white hover:bg-[#9a3412]"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

export default OwnerResourceDialog;
