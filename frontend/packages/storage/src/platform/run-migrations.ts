import type { Database, Migration } from "../types";

const MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS __migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )
`;

export async function runMigrations(
  db: Database,
  migrations: Migration[],
): Promise<void> {
  await db.execute(MIGRATION_TABLE_SQL);

  const applied = await db.query<{ version: number }>(
    "SELECT version FROM __migrations ORDER BY version",
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  const sorted = [...migrations].sort((a, b) => a.version - b.version);

  for (const migration of sorted) {
    if (appliedVersions.has(migration.version)) continue;

    await db.transaction(async (tx) => {
      await tx.execute(migration.up);
      await tx.execute(
        "INSERT INTO __migrations (version, applied_at) VALUES (?, ?)",
        [migration.version, Date.now()],
      );
    });
  }
}
