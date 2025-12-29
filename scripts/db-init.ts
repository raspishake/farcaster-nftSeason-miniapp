// scripts/db-init.ts
import postgres from "postgres";

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) die("Missing DATABASE_URL (or POSTGRES_URL)");

  const sql = postgres(url, { max: 1 });

  await sql`
    CREATE TABLE IF NOT EXISTS miniapp_notification_subscribers (
      fid BIGINT NOT NULL,
      app_fid BIGINT NOT NULL,
      token TEXT,
      notification_url TEXT,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (fid, app_fid)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_subscribers_enabled ON miniapp_notification_subscribers (enabled);`;

  await sql.end();
  console.log("✓ DB schema ready");
}

main().catch((e) => {
  console.error("DB init failed:", e);
  process.exit(1);
});
