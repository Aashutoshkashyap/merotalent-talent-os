/** Existing package bundles, with explicit exact-scope pricing for temporary offers. */
export interface ScopedAccessPlan {
  module_scope: string[] | null;
  features?: Record<string, unknown> | null;
}

export function accessPlanCovers(plan: ScopedAccessPlan, modules: string[]): boolean {
  const scope = plan.module_scope ?? [];
  return modules.length > 0 && modules.every(module => scope.includes(module)) &&
    (plan.features?.exact_module_scope !== true || scope.length === new Set(modules).size);
}

export function accessValidityLabel(days: number | null | undefined): string {
  return days === 1 ? "24 hours" : `${days || 30} days`;
}

/** Used only when explicitly configuring offers; checkout always reads stored prices. */
export function temporaryAccessOffers() {
  const modules = ["college", "events", "jobs", "mentor"];
  const labels: Record<string, string> = { college: "College", events: "Events", jobs: "Jobs", mentor: "Mentor" };
  const unitPrice = 10;
  const durationDays = 1;
  return Array.from({ length: (1 << modules.length) - 1 }, (_, index) => {
    const scope = modules.filter((_, bit) => (index + 1) & (1 << bit));
    return {
      code: `temporary-24h-${scope.join("-")}`,
      name: `Temporary test: ${scope.map(module => labels[module]).join(" + ")}`,
      description: `Temporary testing offer: NPR ${unitPrice} per module × ${scope.length}; 24 hours from verified payment. Super Admin approval and entity assignment are also required. Jobs and applications remain free.`,
      audience: null, price: unitPrice * scope.length, currency: "NPR", billing_interval: "one_time",
      package_kind: "paid", module_scope: scope, duration_days: durationDays,
      is_active: true, is_publicly_selectable: true, is_default_free: false, lead_access_mode: "full",
      sort_order: -100 + scope.length,
      features: { temporary_test: true, exact_module_scope: true,
        profile_editing: true, media_management: true, lead_viewing: true, analytics: true,
        job_management: scope.includes("jobs"), event_management: scope.includes("events"),
        college_applications: scope.includes("college"), job_applications: scope.includes("jobs"),
        mentor_bookings: scope.includes("mentor"), event_registrations: scope.includes("events") },
    };
  });
}
