export const MODULE_FORM_TYPES = [
  "college_application",
  "job_application",
  "mentor_booking",
  "event_registration",
] as const;

export type ModuleFormType = (typeof MODULE_FORM_TYPES)[number];

export type ModuleFormFieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "multiselect"
  | "checkbox"
  | "file_reference"
  | "hidden";

export interface ModuleFormOption {
  label: string;
  value: string;
}

export interface ModuleFormField {
  key: string;
  label: string;
  type: ModuleFormFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  autocomplete?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  accept?: string[];
  options?: ModuleFormOption[];
  mustBeTrue?: boolean;
}

export interface ModuleFormDefinition {
  module: ModuleFormType;
  version: number;
  title: string;
  description: string;
  submitLabel: string;
  targetField: string;
  fields: readonly ModuleFormField[];
}

export type ModuleFormValues = Record<string, unknown>;

