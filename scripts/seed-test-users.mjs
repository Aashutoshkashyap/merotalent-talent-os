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

const requiredFixtureRoles = [...allowedRoles];

const allowedDelegatedPermissions = new Set(["job.post", "event.organize"]);
const privateFixtureDescription = "Private QA fixture created by the secure seed process.";
const seedSource = "seed-test-users";

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
  if (parsed.users.length !== requiredFixtureRoles.length) {
    fail("The seed configuration must contain exactly five QA users.");
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

  for (const role of requiredFixtureRoles) {
    if (users.filter((user) => user.role === role).length !== 1) {
      fail(`The seed configuration must contain exactly one ${role} user.`);
    }
  }

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

  let currentQuery = client
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .in("status", ["trialing", "active"])
    .is("deleted_at", null);
  currentQuery = entityId === null
    ? currentQuery.is("entity_id", null)
    : currentQuery.eq("entity_id", entityId);
  const { data: current, error: currentError } = await currentQuery.maybeSingle();
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

function isMissingFreeTierRpcError(error) {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "");
  return (
    (code === "PGRST202" || code === "42883") &&
    message.includes("provision_default_free_tier")
  );
}

async function ensureDefaultFreeTier(
  client,
  capability,
  { userId, entityType, entityId, module, legacy },
) {
  if (capability.mode !== "legacy") {
    const { error } = await client.rpc("provision_default_free_tier", {
      p_user_id: userId,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_module: module,
    });

    if (!error) {
      capability.mode = "rpc";
      return;
    }
    if (!isMissingFreeTierRpcError(error)) throw error;
    capability.mode = "legacy";
  }

  await ensureComplimentaryEntitlement(client, {
    userId,
    entityType,
    entityId,
    ...legacy,
  });
}

async function writeFixture(client, table, existingId, values) {
  const result = existingId
    ? await client.from(table).update(values).eq("id", existingId).select("id").single()
    : await client.from(table).insert(values).select("id").single();
  if (result.error || !result.data) {
    throw result.error ?? new Error(`Could not write the ${table} QA fixture.`);
  }
  return result.data.id;
}

async function ensureRoleFixture(client, user, seed, entitlementCapability) {
  const fixture = {
    userId: user.id,
    email: seed.email,
    fullName: seed.fullName,
    role: seed.role,
  };

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
      name: "QA College",
      short_name: "QA College",
      slug,
      type: "college",
      institution_category: "college",
      description: privateFixtureDescription,
      status: entitlementCapability.mode === "legacy" ? "draft" : "approved",
      applications_enabled: false,
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
    await ensureDefaultFreeTier(client, entitlementCapability, {
      userId: user.id,
      entityType: "college",
      entityId: institute.id,
      module: "college",
      legacy: {
        audience: "institution",
        code: "test-college-complimentary",
        name: "QA College Access",
        features: { college_applications: true, event_registrations: true },
      },
    });

    if (seed.permissions.includes("event.organize")) {
      await ensureDefaultFreeTier(client, entitlementCapability, {
        userId: user.id,
        entityType: "college",
        entityId: institute.id,
        module: "events",
        legacy: {
          audience: "institution",
          code: "test-college-complimentary",
          name: "QA College Access",
          features: { college_applications: true, event_registrations: true },
        },
      });
    }

    if (seed.permissions.includes("job.post")) {
      await ensureDefaultFreeTier(client, entitlementCapability, {
        userId: user.id,
        entityType: "user",
        entityId: null,
        module: "jobs",
        legacy: {
          audience: "institution",
          code: "test-institution-job-complimentary",
          name: "QA College Job Access",
          features: { job_applications: true },
        },
      });
    }

    fixture.instituteId = institute.id;
  }

  if (seed.role === "company") {
    const { data: company, error } = await client.from("companies").upsert(
      {
        user_id: user.id,
        name: "QA Company",
        description: privateFixtureDescription,
        status: entitlementCapability.mode === "legacy" ? "pending" : "approved",
        is_verified: false,
        deleted_at: null,
      },
      { onConflict: "user_id" },
    ).select("id").single();
    if (error) throw error;

    await ensureDefaultFreeTier(client, entitlementCapability, {
      userId: user.id,
      entityType: "company",
      entityId: company.id,
      module: "jobs",
      legacy: {
        audience: "company",
        code: "test-company-complimentary",
        name: "QA Company Access",
        features: { job_applications: true, event_registrations: true },
      },
    });

    if (seed.permissions.includes("event.organize")) {
      await ensureDefaultFreeTier(client, entitlementCapability, {
        userId: user.id,
        entityType: "company",
        entityId: company.id,
        module: "events",
        legacy: {
          audience: "company",
          code: "test-company-complimentary",
          name: "QA Company Access",
          features: { job_applications: true, event_registrations: true },
        },
      });
    }

    const jobValues = {
      company_id: company.id,
      owner_user_id: user.id,
      title: "QA Job",
      description: privateFixtureDescription,
      location: "Kathmandu",
      job_type: "internship",
      experience_level: "entry",
      is_active: false,
      status: "draft",
      approval_status: "pending",
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      is_featured: false,
      application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      deleted_at: null,
    };
    const { data: existingJob, error: jobReadError } = await client
      .from("jobs")
      .select("id")
      .eq("owner_user_id", user.id)
      .in("title", ["QA Job", "MeroTalent Test Opportunity"])
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (jobReadError) throw jobReadError;
    const jobId = await writeFixture(client, "jobs", existingJob?.id, jobValues);

    const eventValues = {
      organizer_user_id: user.id,
      organizer_type: "company",
      organizer_id: company.id,
      title: "QA Event",
      description: privateFixtureDescription,
      event_type: "free",
      format: "online",
      meeting_url: "https://example.com/test-event",
      start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      registration_deadline: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
      status: "draft",
      approval_status: "pending",
      is_active: false,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      is_featured: false,
      deleted_at: null,
    };
    const { data: existingEvent, error: eventReadError } = await client
      .from("events")
      .select("id")
      .eq("organizer_user_id", user.id)
      .in("title", ["QA Event", "MeroTalent Test Career Event"])
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (eventReadError) throw eventReadError;
    const eventId = await writeFixture(client, "events", existingEvent?.id, eventValues);

    fixture.companyId = company.id;
    fixture.jobId = jobId;
    fixture.eventId = eventId;
  }

  if (seed.role === "mentor") {
    const { data: mentor, error } = await client.from("mentors").upsert(
      {
        user_id: user.id,
        headline: "QA Mentor",
        description: privateFixtureDescription,
        approval_status: entitlementCapability.mode === "legacy" ? "pending" : "approved",
        is_available: false,
        hourly_rate: 0,
        deleted_at: null,
      },
      { onConflict: "user_id" },
    ).select("id").single();
    if (error) throw error;

    await ensureDefaultFreeTier(client, entitlementCapability, {
      userId: user.id,
      entityType: "mentor",
      entityId: mentor.id,
      module: "mentor",
      legacy: {
        audience: "mentor",
        code: "test-mentor-complimentary",
        name: "QA Mentor Access",
        features: { mentor_bookings: true, event_registrations: true },
      },
    });

    if (seed.permissions.includes("event.organize")) {
      await ensureDefaultFreeTier(client, entitlementCapability, {
        userId: user.id,
        entityType: "mentor",
        entityId: mentor.id,
        module: "events",
        legacy: {
          audience: "mentor",
          code: "test-mentor-complimentary",
          name: "QA Mentor Access",
          features: { mentor_bookings: true, event_registrations: true },
        },
      });
    }

    const { data: existingService, error: serviceReadError } = await client
      .from("mentor_services")
      .select("id")
      .eq("mentor_id", mentor.id)
      .in("title", ["QA Session", "Test mentoring session"])
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (serviceReadError) throw serviceReadError;
    const serviceValues = {
      mentor_id: mentor.id,
      title: "QA Session",
      description: privateFixtureDescription,
      session_type: "one_to_one",
      duration_minutes: 60,
      capacity: 1,
      price: 0,
      currency: "NPR",
      is_active: false,
      deleted_at: null,
    };
    const mentorServiceId = await writeFixture(
      client,
      "mentor_services",
      existingService?.id,
      serviceValues,
    );

    fixture.mentorId = mentor.id;
    fixture.mentorServiceId = mentorServiceId;
  }

  return fixture;
}

async function ensureSeedActivity(client, fixturesByRole) {
  const student = fixturesByRole.get("talent");
  const college = fixturesByRole.get("institution");
  const company = fixturesByRole.get("company");
  const mentor = fixturesByRole.get("mentor");
  if (
    !student?.userId ||
    !college?.instituteId ||
    !company?.jobId ||
    !company?.eventId ||
    !mentor?.mentorId ||
    !mentor?.mentorServiceId
  ) {
    fail("All QA owner fixtures must exist before activity is created.");
  }

  const collegeMarker = { source: seedSource, fixture: "qa-college-application" };
  const { data: existingCollegeApplication, error: collegeReadError } = await client
    .from("college_applications")
    .select("id")
    .eq("institute_id", college.instituteId)
    .eq("applicant_id", student.userId)
    .contains("form_data", collegeMarker)
    .limit(1)
    .maybeSingle();
  if (collegeReadError) throw collegeReadError;
  const collegeApplicationId = await writeFixture(
    client,
    "college_applications",
    existingCollegeApplication?.id,
    {
      institute_id: college.instituteId,
      applicant_id: student.userId,
      full_name: student.fullName,
      email: student.email,
      phone: null,
      program_interest: "QA Program",
      intake: "QA Intake",
      message: "Private QA application.",
      attachments: [],
      form_data: collegeMarker,
      status: "submitted",
      deleted_at: null,
    },
  );

  const jobMarker = { source: seedSource, fixture: "qa-job-application" };
  const { data: existingJobApplication, error: jobReadError } = await client
    .from("job_applications")
    .select("id")
    .eq("job_id", company.jobId)
    .eq("user_id", student.userId)
    .limit(1)
    .maybeSingle();
  if (jobReadError) throw jobReadError;
  const jobApplicationId = await writeFixture(
    client,
    "job_applications",
    existingJobApplication?.id,
    {
      job_id: company.jobId,
      user_id: student.userId,
      full_name: student.fullName,
      email: student.email,
      phone: null,
      resume_url: null,
      cover_letter: "Private QA application.",
      portfolio_url: null,
      skills_match_score: null,
      status: "submitted",
      notes: null,
      form_data: jobMarker,
      deleted_at: null,
    },
  );

  const scheduledStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);
  const bookingMarker = { source: seedSource, fixture: "qa-mentor-booking" };
  const { data: existingBooking, error: bookingReadError } = await client
    .from("mentor_bookings")
    .select("id")
    .eq("mentor_id", mentor.mentorId)
    .eq("student_id", student.userId)
    .contains("form_data", bookingMarker)
    .limit(1)
    .maybeSingle();
  if (bookingReadError) throw bookingReadError;
  const mentorBookingId = await writeFixture(
    client,
    "mentor_bookings",
    existingBooking?.id,
    {
      mentor_id: mentor.mentorId,
      mentor_service_id: mentor.mentorServiceId,
      student_id: student.userId,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: "pending",
      payment_status: "not_required",
      amount: 0,
      currency: "NPR",
      payment_id: null,
      notes: "Private QA booking.",
      form_data: bookingMarker,
      deleted_at: null,
    },
  );

  const eventMarker = { source: seedSource, fixture: "qa-event-registration" };
  const { data: existingRegistration, error: registrationReadError } = await client
    .from("event_registrations")
    .select("id")
    .eq("event_id", company.eventId)
    .eq("user_id", student.userId)
    .limit(1)
    .maybeSingle();
  if (registrationReadError) throw registrationReadError;
  const eventRegistrationId = await writeFixture(
    client,
    "event_registrations",
    existingRegistration?.id,
    {
      event_id: company.eventId,
      user_id: student.userId,
      status: "confirmed",
      payment_status: "not_required",
      ticket_quantity: 1,
      total_amount: 0,
      payment_id: null,
      form_data: eventMarker,
      deleted_at: null,
    },
  );

  const expectedActivity = [
    {
      sourceType: "college_application",
      sourceId: collegeApplicationId,
      ownerUserId: college.userId,
    },
    {
      sourceType: "job_application",
      sourceId: jobApplicationId,
      ownerUserId: company.userId,
    },
    {
      sourceType: "mentor_booking",
      sourceId: mentorBookingId,
      ownerUserId: mentor.userId,
    },
    {
      sourceType: "event_registration",
      sourceId: eventRegistrationId,
      ownerUserId: company.userId,
    },
  ];
  const sourceIds = expectedActivity.map((item) => item.sourceId);
  const { data: leads, error: leadsError } = await client
    .from("leads")
    .select("source_type,source_id,owner_user_id")
    .in("source_id", sourceIds)
    .is("deleted_at", null);
  if (leadsError) throw leadsError;
  const { data: notifications, error: notificationsError } = await client
    .from("notifications")
    .select("recipient_id,entity_id,channel")
    .in("entity_id", sourceIds)
    .is("deleted_at", null);
  if (notificationsError) throw notificationsError;

  for (const expected of expectedActivity) {
    if (
      !(leads ?? []).some(
        (lead) =>
          lead.source_type === expected.sourceType &&
          lead.source_id === expected.sourceId &&
          lead.owner_user_id === expected.ownerUserId,
      )
    ) {
      fail(`Lead trigger verification failed for ${expected.sourceType}.`);
    }
    for (const channel of ["dashboard", "email"]) {
      if (
        !(notifications ?? []).some(
          (notification) =>
            notification.recipient_id === expected.ownerUserId &&
            notification.entity_id === expected.sourceId &&
            notification.channel === channel,
        )
      ) {
        fail(`Notification trigger verification failed for ${expected.sourceType}/${channel}.`);
      }
    }
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

  const accountsByRole = new Map();
  for (const seed of configuration.users) {
    const user = await ensureAuthUser(client, seed);
    await ensureRole(client, user.id, seed.role);
    await ensureDelegatedPermissions(client, user.id, seed.permissions);
    await verifySeedLogin(url, publicKey, seed);
    accountsByRole.set(seed.role, { user, seed });
    console.log(`Provisioned ${seed.role}: ${seed.email}`);
  }

  const studentAccount = accountsByRole.get("talent");
  if (!studentAccount) fail("The QA student account was not provisioned.");
  const entitlementCapability = { mode: "unknown" };
  await ensureDefaultFreeTier(client, entitlementCapability, {
    userId: studentAccount.user.id,
    entityType: "user",
    entityId: null,
    module: "student",
    legacy: {
      audience: "talent",
      code: "test-student-complimentary",
      name: "QA Student Access",
      features: { application_submit: true, partnered_course_referrals: true },
    },
  });

  const fixturesByRole = new Map();
  for (const { user, seed } of accountsByRole.values()) {
    const fixture = await ensureRoleFixture(
      client,
      user,
      seed,
      entitlementCapability,
    );
    fixturesByRole.set(seed.role, fixture);
  }

  await ensureSeedActivity(client, fixturesByRole);
  console.log("QA accounts, private fixtures, and activity are ready.");
}

main().catch((error) => {
  console.error(`Seed failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});
