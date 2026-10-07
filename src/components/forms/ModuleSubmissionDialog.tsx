"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  fetchModuleFormDefinition,
  ModuleFormClientError,
  submitAuthenticatedModuleForm,
} from "@/lib/forms/module-form-client";
import type {
  ModuleFormDefinition,
  ModuleFormField,
  ModuleFormType,
} from "@/lib/forms/module-form-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StudentProfileRequirement } from "@/components/forms/StudentProfileRequirement";
import { missingStudentProfileFields } from "@/lib/student/profile-readiness";

type FormValue = string | number | boolean | string[];
type FormValues = Record<string, FormValue>;

interface ModuleSubmissionDialogProps {
  module: ModuleFormType;
  targetId: string;
  targetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: (result: { id: string; status: string }) => void | Promise<void>;
  successTitle?: string;
  successDescription?: string;
}

const inputType = (field: ModuleFormField) => {
  if (["email", "tel", "url", "number", "date", "time"].includes(field.type)) {
    return field.type;
  }
  return "text";
};

const initialValueForField = (
  field: ModuleFormField,
  definition: ModuleFormDefinition,
  targetId: string,
  profile: ReturnType<typeof useAuth>["profile"],
  userEmail?: string,
): FormValue => {
  if (field.key === definition.targetField) return targetId;
  if (field.key === "fullName") return profile?.full_name || "";
  if (field.key === "email") return userEmail || profile?.email || "";
  if (field.key === "phone") return profile?.phone || "";
  if (field.key === "currentQualification") return profile?.education || "";
  if (field.key === "attendeeCount") return 1;
  if (field.type === "checkbox") return false;
  if (field.type === "multiselect") return [];
  if (field.type === "select") return field.options?.[0]?.value || "";
  return "";
};

export default function ModuleSubmissionDialog({
  module,
  targetId,
  targetName,
  open,
  onOpenChange,
  onSubmitted,
  successTitle = "Registration submitted",
  successDescription,
}: ModuleSubmissionDialogProps) {
  const { profile, session, user, refreshProfile } = useAuth();
  const [definition, setDefinition] = useState<ModuleFormDefinition | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      setDefinition(null);
      setValues({});
      setFieldErrors({});
      setFormError(null);
      setSubmitted(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setFormError(null);
    void fetchModuleFormDefinition(module, controller.signal)
      .then((formDefinition) => {
        const defaults: FormValues = {};
        for (const field of formDefinition.fields) {
          defaults[field.key] = initialValueForField(
            field,
            formDefinition,
            targetId,
            profile,
            user?.email,
          );
        }
        setDefinition(formDefinition);
        setValues((current) => {
          if (current[formDefinition.targetField] !== targetId) return defaults;
          return {
            ...defaults,
            ...current,
            fullName: defaults.fullName,
            email: defaults.email,
            phone: defaults.phone,
            ...(formDefinition.module === "college_application" && !current.currentQualification
              ? { currentQualification: defaults.currentQualification }
              : {}),
          };
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFormError(
          error instanceof Error ? error.message : "This form is temporarily unavailable.",
        );
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [module, open, profile, targetId, user?.email]);

  const updateValue = (field: ModuleFormField, value: FormValue) => {
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
      setFormError("Sign in again before submitting this form.");
      return;
    }
    if (missingStudentProfileFields(module, profile, user?.email).length) {
      setFormError("Complete your student profile before submitting this form.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const result = await submitAuthenticatedModuleForm({
        accessToken: session.access_token,
        module,
        values,
      });
      if (onSubmitted) await onSubmitted(result);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ModuleFormClientError) {
        setFieldErrors(error.fields);
        if (error.code === "PROFILE_INCOMPLETE") void refreshProfile();
      }
      setFormError(
        error instanceof Error ? error.message : "The form could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-slate-200">
        {submitted ? (
          <div className="flex flex-col items-center px-2 py-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="mt-5 text-2xl">{successTitle}</DialogTitle>
            <DialogDescription className="mt-2 max-w-sm leading-relaxed">
              {successDescription || `Your submission for ${targetName} is stored in MeroTalent.`}
            </DialogDescription>
            <Button
              onClick={() => onOpenChange(false)}
              className="mt-6 rounded-xl bg-[#0073e6] px-6 hover:bg-[#0062c4]"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{definition?.title || "Loading form…"}</DialogTitle>
              <DialogDescription>
                {definition?.description || `Complete the form for ${targetName}.`}
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#0073e6]" />
                Loading secure form…
              </div>
            ) : definition ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {session && <StudentProfileRequirement module={module} profile={profile} email={user?.email} onRefresh={refreshProfile} />}
                <div className="grid gap-4 sm:grid-cols-2">
                  {definition.fields.map((field) => {
                    if (field.type === "hidden") {
                      return (
                        <input
                          key={field.key}
                          type="hidden"
                          name={field.key}
                          value={String(values[field.key] ?? "")}
                        />
                      );
                    }

                    const error = fieldErrors[field.key]?.[0];
                    const fullWidth = ["textarea", "checkbox", "multiselect"].includes(field.type);
                    const id = `${module}-${field.key}`;
                    return (
                      <div
                        key={field.key}
                        className={`space-y-1.5 ${fullWidth ? "sm:col-span-2" : ""}`}
                      >
                        {field.type !== "checkbox" && (
                          <Label htmlFor={id} className="text-xs font-extrabold text-slate-700">
                            {field.label}{field.required ? " *" : ""}
                          </Label>
                        )}

                        {field.type === "textarea" ? (
                          <Textarea
                            id={id}
                            value={String(values[field.key] ?? "")}
                            onChange={(event) => updateValue(field, event.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            maxLength={field.maxLength}
                            rows={4}
                            aria-invalid={Boolean(error)}
                            className="rounded-xl border-slate-200"
                          />
                        ) : field.type === "select" ? (
                          <Select
                            value={String(values[field.key] ?? "")}
                            onValueChange={(value) => updateValue(field, value)}
                          >
                            <SelectTrigger id={id} className="h-11 rounded-xl border-slate-200">
                              <SelectValue placeholder={`Choose ${field.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                            <Checkbox
                              id={id}
                              checked={Boolean(values[field.key])}
                              onCheckedChange={(checked) => updateValue(field, checked === true)}
                              aria-invalid={Boolean(error)}
                            />
                            <Label htmlFor={id} className="text-sm font-semibold leading-relaxed text-slate-700">
                              {field.label}{field.required ? " *" : ""}
                            </Label>
                          </div>
                        ) : field.type === "multiselect" ? (
                          <Input
                            id={id}
                            value={Array.isArray(values[field.key]) ? (values[field.key] as string[]).join(", ") : ""}
                            onChange={(event) => updateValue(
                              field,
                              event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                            )}
                            placeholder={field.placeholder || "Separate entries with commas"}
                            className="h-11 rounded-xl border-slate-200"
                          />
                        ) : field.type === "file_reference" ? (
                          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                            This file must be uploaded through the secure media control for its module.
                          </p>
                        ) : (
                          <Input
                            id={id}
                            type={inputType(field)}
                            value={String(values[field.key] ?? "")}
                            onChange={(event) => updateValue(
                              field,
                              field.type === "number" && event.target.value !== ""
                                ? Number(event.target.value)
                                : event.target.value,
                            )}
                            placeholder={field.placeholder}
                            required={field.required}
                            minLength={field.minLength}
                            maxLength={field.maxLength}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            autoComplete={field.autocomplete}
                            readOnly={Boolean(session) && ["fullName", "email", "phone"].includes(field.key)}
                            aria-invalid={Boolean(error)}
                            className="h-11 rounded-xl border-slate-200"
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
                  <Button type="submit" disabled={isSubmitting || Boolean(session && missingStudentProfileFields(module, profile, user?.email).length)} className="rounded-xl bg-[#0073e6] hover:bg-[#0062c4]">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {definition.submitLabel}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
                {formError || "This form is temporarily unavailable."}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
