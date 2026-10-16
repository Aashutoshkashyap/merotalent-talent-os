/** Restricted local access to encrypted recovery snapshots; never emits row data. */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { decryptSourceSnapshot, encryptSourceSnapshot, summarizeSourceSnapshot,
  validateSourceSnapshot } from "./source-auth-snapshot.mjs";

export const sourceSnapshotKeychainService = "MeroTalent Neon Migration Source Snapshots v1";
const account = "dtirpilgzlsfryucanlg";

export function sourceSnapshotKey(createIfMissing = false) {
  if (process.env.NEON_MIGRATION_SNAPSHOT_ENCRYPTION_KEY) return process.env.NEON_MIGRATION_SNAPSHOT_ENCRYPTION_KEY;
  try {
    return execFileSync("security", ["find-generic-password", "-s", sourceSnapshotKeychainService, "-a", account, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (error?.status !== 44 || !createIfMissing) throw new Error("The local snapshot keychain is unavailable.");
    const key = randomBytes(32).toString("base64");
    try {
      execFileSync("security", ["add-generic-password", "-s", sourceSnapshotKeychainService, "-a", account, "-w", key],
        { stdio: ["ignore", "pipe", "pipe"] });
    } catch { throw new Error("The snapshot encryption key could not be stored securely."); }
    return key;
  }
}

export async function readEncryptedSourceSnapshot(artifact) {
  if (!isAbsolute(artifact ?? "")) throw new Error("An absolute encrypted snapshot artifact path is required.");
  const file = await lstat(artifact);
  if (!file.isFile() || file.isSymbolicLink() || (file.mode & 0o077) !== 0 ||
      file.uid !== process.getuid?.() || file.size > 50 * 1024 * 1024) {
    throw new Error("The encrypted artifact must be a restricted owner-readable regular file.");
  }
  const snapshot = decryptSourceSnapshot(await readFile(artifact, "utf8"), sourceSnapshotKey());
  return validateSourceSnapshot(snapshot, snapshot.publicTableNames);
}

export async function persistEncryptedSourceSnapshot(snapshot) {
  const directory = process.env.NEON_MIGRATION_ARTIFACT_DIRECTORY ??
    join(homedir(), "Library", "Application Support", "MeroTalent", "migration-artifacts");
  if (!isAbsolute(directory)) throw new Error("The migration artifact directory must be absolute.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const folder = await lstat(directory);
  if (!folder.isDirectory() || folder.isSymbolicLink() || folder.uid !== process.getuid?.() || (folder.mode & 0o077) !== 0) {
    throw new Error("The migration artifact directory must be private to this operator.");
  }
  const summary = summarizeSourceSnapshot(snapshot);
  const artifact = join(directory, `source-${snapshot.statementTimestamp.replace(/[^0-9]/g, "")}-${summary.snapshotSha256.slice(0, 12)}.aes256gcm.json`);
  await writeFile(artifact, encryptSourceSnapshot(snapshot, sourceSnapshotKey(true)), { mode: 0o600, flag: "wx" });
  await chmod(artifact, 0o600);
  const restored = await readEncryptedSourceSnapshot(artifact);
  if (summarizeSourceSnapshot(restored).snapshotSha256 !== summary.snapshotSha256) {
    throw new Error("Encrypted snapshot readback verification failed.");
  }
  return artifact;
}
