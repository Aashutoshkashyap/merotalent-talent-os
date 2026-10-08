/** Hard stop for migration writers: a variable name is not branch proof. */
export function requireNeonMigrationStaging(databaseUrl) {
  let url;
  try { url = new URL(databaseUrl); }
  catch { throw new Error("A valid Neon migration-staging database URL is required."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== "ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech") {
    throw new Error("Refusing database writes: the URL is not the verified migration-staging compute.");
  }
}
