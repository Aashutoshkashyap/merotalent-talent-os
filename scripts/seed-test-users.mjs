#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const allowedRoles = new Set([
  "admin",
  "talent",
  "institution",
  "company",
  "mentor",
]);

const allowedDelegatedPermissions = new Set(["job.post", "event.organize"]);

const fail = (message) => {
  throw new Error(message);
};

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

function validatePassword(password, email) {
  if (typeof password !== "string" || password.length < 14) {
    fail(`Password for ${email} must contain at least 14 characters.`);
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    fail(`Password for ${email} must include upper, lower, number, and symbol characters.`);
  }
  if (/^(replace-with|change-me|generate-a-unique)/i.test(password)) {
    fail(`Password for ${email} is still an example value and must be replaced.`);
  }
}

function projectRefFromUrl(url) {
  const hostname = new URL(url).hostname;
  const match = /^([a-z0-9]+)[.]supabase[.]co$/i.exec(hostname);
  return match?.[1] ?? null;
}

async function loadConfiguration() {
  const fileName = process.env.SEED_USERS_FILE?.trim();
  if (!fileName) {
    fail("SEED_USERS_FILE must point to an untracked JSON configuration file.");
  }

  const parsed = JSON.parse(await readFile(fileName, "utf8"));
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.users)) {
    fail("The seed configuration must contain a users array.");
  }
  if (parsed.users.length < 1 || parsed.users.length > 20) {
    fail("The seed configuration must contain between 1 and 20 users.");
  }

  const seen = new Set();
  const users = parsed.users.map((candidate, index) => {
    const email = normalizeEmail(candidate.email);
    const role = String(candidate.role ?? "").trim();
    const fullName = String(candidate.fullName ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+[.][^\s@]+$/.test(email)) {
      fail(`User ${index + 1} has an invalid email address.`);
    }
    if (seen.has(email)) fail(`Duplicate seed email: ${email}`);
    seen.add(email);
    if (!allowedRoles.has(role)) fail(`Unsupported role for ${email}: ${role}`);
    if (fullName.length < 2 || fullName.length > 120) {
      fail(`Full name for ${email} must contain 2 to 120 characters.`);
    }
    validatePassword(candidate.password, email);

    const permissions = Array.isArray(candidate.permissions)
      ? [...new Set(candidate.permissions.map((value) => String(value).trim()).filter(Boolean))]
      : [];
    for (const permission of permissions) {
      if (!allowedDelegatedPermissions.has(permission)) {
        fail(`Unsupported delegated permission for ${email}: ${permission}`);
      }
    }

    return { email, role, fullName, password: candidate.password, permissions };
  });

  return { users };
}

async function findAuthUser(client, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => normalizeEmail(candidate.email) === email);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  fail("Seed lookup exceeded the supported Auth user count.");
}

async function ensureAuthUser(client, seed) {
  let user = await findAuthUser(client, seed.email);
  if (!user) {
    const { data, error } = await client.auth.admin.createUser({
      email: seed.email,
      password: seed.password,
      email_confirm: true,
      user_metadata: {
        account_type: seed.role === "admin" ? "talent" : seed.role,
        full_name: seed.fullName,
        seeded_test_account: true,
      },
    });
    if (error || !data.user) throw error ?? new Error("Auth user creation failed.");
    user = data.user;
  } else {
    if (user.user_metadata?.seeded_test_account !== true) {
      fail(`Refusing to overwrite an existing non-seed account: ${seed.email}`);
    }
    const attributes = {
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        full_name: seed.fullName,
        seeded_test_account: true,
      },
    };
    attributes.password = seed.password;
    const { data, error } = await client.auth.admin.updateUserById(user.id, attributes);
    if (error || !data.user) throw error ?? new Error("Auth user update failed.");
    user = data.user;
  }

  const { error: profileError } = await client.from("profiles").upsert(
    {
      user_id: user.id,
      email: seed.email,
      full_name: seed.fullName,
      account_status: "active",
      deleted_at: null,
      email_verified_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (profileError) throw profileError;
  return user;
}

async function verifySeedLogin(url, publicKey, seed) {
  const client = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: seed.email,
    password: seed.password,
  });
  if (error || !data.user || !data.session) {
    throw error ?? new Error(`Login verification failed for ${seed.email}.`);
  }

  const { data: access, error: accessError } = await client.rpc("get_my_access_context");
  if (accessError) throw accessError;
  const roles = Array.isArray(access?.roles) ? access.roles : [];
  const permissions = Array.isArray(access?.permissions) ? access.permissions : [];
  if (access?.account_status !== "active" || !roles.includes(seed.role)) {
    fail(`Access verification failed for ${seed.email}.`);
  }
  for (const permission of seed.permissions) {
    if (!permissions.includes(permission)) {
      fail(`Delegated permission verification failed for ${seed.email}: ${permission}`);
    }
  }
  const { error: signOutError } = await client.auth.signOut();
  if (signOutError) throw signOutError;
}

async function ensureRole(client, userId, role) {
  const { data: admins, error: adminReadError } = await client
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (adminReadError) throw adminReadError;

  if (role === "admin" && (admins ?? []).length === 0) {
    const { error } = await client.rpc("bootstrap_first_admin", {
      p_user_id: userId,
    });
    if (error) throw error;
    return;
  }

  const isOnlyAdmin =
    role !== "admin" &&
    admins?.length === 1 &&
    admins[0]?.user_id === userId;
  if (isOnlyAdmin) {
    fail("Refusing to replace the final active administrator with a non-admin role.");
  }

  const { error: deleteError } = await client
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .neq("role", role);
  if (deleteError) throw deleteError;
  const { error: insertError } = await client
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (insertError) throw insertError;
}

async function ensureDelegatedPermissions(client, userId, requestedPermissions) {
  const managedCodes = [...allowedDelegatedPermissions];
  const { data: permissionRows, error: permissionError } = await client
    .from("permissions")
    .select("id,code")
    .in("code", managedCodes);
  if (permissionError) throw permissionError;

  const permissionByCode = new Map(
    (permissionRows ?? []).map((permission) => [permission.code, permission.id]),
  );
  for (const code of requestedPermissions) {
    if (!permissionByCode.has(code)) {
      fail(`Permission is missing from the database: ${code}`);
    }
  }

  const managedIds = [...permissionByCode.values()];
  if (managedIds.length) {
    const { error: deleteError } = await client
      .from("user_permissions")
      .delete()
      .eq("user_id", userId)
      .in("permission_id", managedIds);
    if (deleteError) throw deleteError;
  }

  if (!requestedPermissions.length) return;
  const { error: insertError } = await client.from("user_permissions").insert(
    requestedPermissions.map((code) => ({
      user_id: userId,
      permission_id: permissionByCode.get(code),
      granted_by: null,
      expires_at: null,
    })),
  );
  if (insertError) throw insertError;
}

async function ensureComplimentaryEntitlement(
  client,
  { userId, entityType, entityId, audience, code, name, features },
) {
  const { data: packageRow, error: packageError } = await client
    .from("packages")
    .upsert(
      {
        code,
        name,
        description: "Non-payment test entitlement created by the secure seed process.",
        audience,
        price: 0,
        currency: "NPR",
        billing_interval: "year",
        features,
        lead_access_mode: "full",
        is_active: true,
        deleted_at: null,
      },
      { onConflict: "code" },
    )
    .select("id")
    .single();
  if (packageError) throw packageError;

  const { data: current, error: currentError } = await client
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("status", ["trialing", "active"])
    .is("deleted_at", null)
    .maybeSingle();
  if (currentError) throw currentError;

  const values = {
    user_id: userId,
    package_id: packageRow.id,
    entity_type: entityType,
    entity_id: entityId,
    start_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    payment_status: "not_required",
    metadata: { source: "seed-test-users", complimentary: true, test_fixture: true },
    deleted_at: null,
  };
  const result = current
    ? await client.from("subscriptions").update(values).eq("id", current.id)
    : await client.from("subscriptions").insert(values);
  if (result.error) throw result.error;
}

async function ensureRoleFixture(client, user, seed) {
  if (seed.role === "institution") {
    let { data: institute, error } = await client
      .from("institutes")
      .select("id")
      .eq("owner_user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const slug = `test-college-${user.id.slice(0, 8)}`;
    const instituteValues = {
      owner_user_id: user.id,
      name: "MeroTalent Test College",
      short_name: "Test College",
      slug,
      type: "college",
      institution_category: "college",
      description: "Private test workspace created by the secure seed process.",
      status: "approved",
      applications_enabled: true,
      is_verified: false,
      deleted_at: null,
    };
    if (!institute) {
      const result = await client
        .from("institutes")
        .insert(instituteValues)
        .select("id")
        .single();
      if (result.error) throw result.error;
      institute = result.data;
    } else {
      const { error: instituteUpdateError } = await client
        .from("institutes")
        .update(instituteValues)
        .eq("id", institute.id);
      if (instituteUpdateError) throw instituteUpdateError;
    }
    const { error: accessError } = await client.from("institute_admins").upsert(
      {
        institute_id: institute.id,
        user_id: user.id,
        can_edit_profile: true,
        can_manage_courses: true,
        can_post_notices: true,
      },
      { onConflict: "institute_id,user_id" },
    );
    if (accessError) throw accessError;
    await ensureComplimentaryEntitlement(client, {
      userId: user.id,
      entityType: "college",
      entityId: institute.id,
      audience: "institution",
      code: "test-college-complimentary",
      name: "Test College Complimentary Access",
      features: { college_applications: true, event_registrations: true },
    });
  }

  if (seed.role === "company") {
    const { data: company, error } = await client.from("companies").upsert(
      {
        user_id: user.id,
        name: "MeroTalent Test Employer",
        description: "Private test workspace created by the secure seed process.",
        status: "approved",
        is_verified: true,
        deleted_at: null,
      },
      { onConflict: "user_id" },
    ).select("id").single();
    if (error) throw error;

    await ensureComplimentaryEntitlement(client, {
      userId: user.id,
      entityType: "company",
      entityId: company.id,
      audience: "company",
      code: "test-company-complimentary",
      name: "Test Company Complimentary Access",
      features: { job_applications: true, event_registrations: true },
    });

    const jobValues = {
      company_id: company.id,
      owner_user_id: user.id,
      title: "MeroTalent Test Opportunity",
      description: "Private test job created by the secure seed process.",
      location: "Kathmandu",
      job_type: "internship",
      experience_level: "entry",
      is_active: true,
      status: "published",
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      deleted_at: null,
    };
    const { data: existingJob, error: jobReadError } = await client
      .from("jobs")
      .select("id")
      .eq("owner_user_id", user.id)
      .eq("title", jobValues.title)
      .is("deleted_at", null)
      .maybeSingle();
    if (jobReadError) throw jobReadError;
    const jobResult = existingJob
      ? await client.from("jobs").update(jobValues).eq("id", existingJob.id)
      : await client.from("jobs").insert(jobValues);
    if (jobResult.error) throw jobResult.error;

    const eventValues = {
      organizer_user_id: user.id,
      organizer_type: "company",
      organizer_id: company.id,
      title: "MeroTalent Test Career Event",
      description: "Private test event created by the secure seed process.",
      event_type: "free",
      format: "online",
      meeting_url: "https://example.com/test-event",
      start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      registration_deadline: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
      status: "published",
      approval_status: "approved",
      is_active: true,
      approved_at: new Date().toISOString(),
      deleted_at: null,
    };
    const { data: existingEvent, error: eventReadError } = await client
      .from("events")
      .select("id")
      .eq("organizer_user_id", user.id)
      .eq("title", eventValues.title)
      .is("deleted_at", null)
      .maybeSingle();
    if (eventReadError) throw eventReadError;
    const eventResult = existingEvent
      ? await client.from("events").update(eventValues).eq("id", existingEvent.id)
      : await client.from("events").insert(eventValues);
    if (eventResult.error) throw eventResult.error;
  }

  if (seed.role === "mentor") {
    const { data: mentor, error } = await client.from("mentors").upsert(
      {
        user_id: user.id,
        headline: "MeroTalent Test Mentor",
        description: "Private test workspace created by the secure seed process.",
        approval_status: "approved",
        is_available: true,
        hourly_rate: 0,
        deleted_at: null,
      },
      { onConflict: "user_id" },
    ).select("id").single();
    if (error) throw error;

    await ensureComplimentaryEntitlement(client, {
      userId: user.id,
      entityType: "mentor",
      entityId: mentor.id,
      audience: "mentor",
      code: "test-mentor-complimentary",
      name: "Test Mentor Complimentary Access",
      features: { mentor_bookings: true, event_registrations: true },
    });

    const { data: existingService, error: serviceReadError } = await client
      .from("mentor_services")
      .select("id")
      .eq("mentor_id", mentor.id)
      .eq("title", "Test mentoring session")
      .is("deleted_at", null)
      .maybeSingle();
    if (serviceReadError) throw serviceReadError;
    const serviceValues = {
      mentor_id: mentor.id,
      title: "Test mentoring session",
      description: "Complimentary session used to verify the booking flow.",
      session_type: "one_to_one",
      duration_minutes: 60,
      capacity: 1,
      price: 0,
      currency: "NPR",
      is_active: true,
      deleted_at: null,
    };
    const serviceResult = existingService
      ? await client.from("mentor_services").update(serviceValues).eq("id", existingService.id)
      : await client.from("mentor_services").insert(serviceValues);
    if (serviceResult.error) throw serviceResult.error;
  }
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const publicKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !secret || !publicKey) {
    fail("SUPABASE_URL, SUPABASE_SECRET_KEY, and SUPABASE_PUBLISHABLE_KEY are required.");
  }
  const actualRef = projectRefFromUrl(url);
  const confirmedRef = process.env.SEED_CONFIRM_PROJECT_REF?.trim();
  if (!actualRef || confirmedRef !== actualRef) {
    fail("SEED_CONFIRM_PROJECT_REF must exactly match the Supabase project URL.");
  }

  const configuration = await loadConfiguration();
  const client = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const seed of configuration.users) {
    const user = await ensureAuthUser(client, seed);
    await ensureRole(client, user.id, seed.role);
    await ensureDelegatedPermissions(client, user.id, seed.permissions);
    await ensureRoleFixture(client, user, seed);
    await verifySeedLogin(url, publicKey, seed);
    console.log(`Provisioned ${seed.role}: ${seed.email}`);
  }

  console.log(`Provisioned ${configuration.users.length} test accounts without logging passwords.`);
}

main().catch((error) => {
  console.error(`Seed failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});
