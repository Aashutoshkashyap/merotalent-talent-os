"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ModuleFormDefinition, ModuleFormField } from "@/lib/forms/module-form-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CollegeApplicationDialogProps {
  instituteId: string;
  instituteName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApiEnvelope<T> {
  data: T | null;
  error: {
    message: string;
    fields?: Record<string, string[]>;
  } | null;
}

type FormValues = Record<string, string | number | boolean>;

const inputType = (field: ModuleFormField) => {
  if (["email", "tel", "url", "number", "date", "time"].includes(field.type)) return field.type;
  return "text";
};

export default function CollegeApplicationDialog({
  instituteId,
  instituteName,
  open,
  onOpenChange,
}: CollegeApplicationDialogProps) {
  const { session, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [definition, setDefinition] = useState<ModuleFormDefinition | null>(null);
  const [values, setValues] = useState<FormValues>({ collegeId: instituteId });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const returnPath = useMemo(
    () => {
      const params = new URLSearchParams(location.search);
      params.set("apply", "1");
      return `${location.pathname}?${params.toString()}`;
    },
    [location.pathname, location.search],
  );

  useEffect(() => {
    if (!open || !user) return;

    const controller = new AbortController();
    setIsLoading(true);
    setFormError(null);

    fetch("/api/v1/forms/college_application", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as ApiEnvelope<ModuleFormDefinition>;
        if (!response.ok || !payload.data) throw new Error(payload.error?.message || "The application form is unavailable.");
        return payload.data;
      })
      .then((formDefinition) => {
        setDefinition(formDefinition);
        const defaults: FormValues = {};
        for (const field of formDefinition.fields) {
          if (field.key === formDefinition.targetField) defaults[field.key] = instituteId;
          else if (field.key === "fullName") defaults[field.key] = profile?.full_name || "";
          else if (field.key === "email") defaults[field.key] = profile?.email || user.email || "";
          else defaults[field.key] = field.type === "checkbox" ? false : "";
        }
        setValues(defaults);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFormError(error instanceof Error ? error.message : "The application form is unavailable.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [instituteId, open, profile?.email, profile?.full_name, user]);

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setFieldErrors({});
      setFormError(null);
      setDefinition(null);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !session) {
      navigate("/login", { state: { from: { pathname: returnPath } } });
      return;
    }
    onOpenChange(nextOpen);
  };

  const updateValue = (field: ModuleFormField, rawValue: string | boolean) => {
    const value = field.type === "number" && typeof rawValue === "string" && rawValue !== ""
      ? Number(rawValue)
      : rawValue;
    setValues((current) => ({ ...current, [field.key]: value }));
    setFieldErrors((current) => {
      if (!current[field.key]) return current;
      const next = { ...current };
      delete next[field.key];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!definition || !session) {
      handleOpenChange(true);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/v1/submissions/college_application", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as ApiEnvelope<{ id: string; status: string }>;

      if (!response.ok || payload.error) {
        setFieldErrors(payload.error?.fields ?? {});
        throw new Error(payload.error?.message || "Your application could not be submitted.");
      }

      setSubmitted(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Your application could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl border-slate-200">
        {submitted ? (
          <div className="flex flex-col items-center px-2 py-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="mt-5 text-2xl">Application submitted</DialogTitle>
            <DialogDescription className="mt-2 max-w-sm leading-relaxed">
              Your application to {instituteName} is safely stored in MeroTalent. You can track its status from your dashboard.
            </DialogDescription>
            <Button onClick={() => onOpenChange(false)} className="mt-6 rounded-xl bg-[#0073e6] px-6 hover:bg-[#0062c4]">
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{definition?.title || "Apply to this college"}</DialogTitle>
              <DialogDescription>
                {definition?.description || `Send your details to ${instituteName}.`}
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#0073e6]" />
                Loading application form…
              </div>
            ) : definition ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {definition.fields.map((field) => {
                    if (field.type === "hidden") {
                      return <input key={field.key} type="hidden" name={field.key} value={String(values[field.key] ?? "")} />;
                    }

                    const error = fieldErrors[field.key]?.[0];
                    const fullWidth = field.type === "textarea" || ["message", "currentQualification"].includes(field.key);
                    return (
                      <div key={field.key} className={`space-y-1.5 ${fullWidth ? "sm:col-span-2" : ""}`}>
                        <Label htmlFor={`college-application-${field.key}`} className="text-xs font-extrabold text-slate-700">
                          {field.label}{field.required ? " *" : ""}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            id={`college-application-${field.key}`}
                            value={String(values[field.key] ?? "")}
                            onChange={(event) => updateValue(field, event.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            minLength={field.minLength}
                            maxLength={field.maxLength}
                            rows={4}
                            aria-invalid={Boolean(error)}
                            className="rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                          />
                        ) : (
                          <Input
                            id={`college-application-${field.key}`}
                            type={inputType(field)}
                            value={String(values[field.key] ?? "")}
                            onChange={(event) => updateValue(field, event.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            minLength={field.minLength}
                            maxLength={field.maxLength}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            autoComplete={field.autocomplete}
                            aria-invalid={Boolean(error)}
                            className="h-11 rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                          />
                        )}
                        {field.helpText && <p className="text-[11px] text-slate-500">{field.helpText}</p>}
                        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                      </div>
                    );
                  })}
                </div>

                {formError && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <DialogFooter className="gap-2 pt-2 sm:space-x-0">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-slate-200">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#0073e6] hover:bg-[#0062c4]">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {definition.submitLabel}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div role="alert" className="flex min-h-40 items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
                {formError || "The application form is temporarily unavailable."}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
