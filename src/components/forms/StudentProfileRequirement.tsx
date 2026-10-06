"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ModuleFormType } from "@/lib/forms/module-form-types";
import {
  missingStudentProfileFields,
  type StudentApplicationProfile,
} from "@/lib/student/profile-readiness";

export function StudentProfileRequirement({
  module,
  profile,
  email,
  onRefresh,
}: {
  module: ModuleFormType;
  profile: StudentApplicationProfile | null;
  email?: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const missing = missingStudentProfileFields(module, profile, email);
  if (!missing.length) return null;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-bold">Complete your student profile before submitting.</p>
          <p className="mt-1">Missing: {missing.join(", ")}.</p>
          <p className="mt-1 text-xs">Your saved name, email and phone will be used for this submission.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/dashboard/profile"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-lg bg-[#0073e6] px-3 text-xs font-bold text-white hover:bg-[#0062c4]"
        >
          Complete profile
        </Link>
        <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={() => void refresh()}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          I’ve updated it
        </Button>
      </div>
    </div>
  );
}
