// Usage:
// ADMIN_TOKEN=... node scripts/send-notification.ts "Title" "Body" "https://nft-season.vercel.app/?group=live"
//
// Optional:
// NOTIFY_API="https://nft-season.vercel.app"  (defaults to production)

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const admin = process.env.ADMIN_TOKEN;
  if (!admin) die("Missing ADMIN_TOKEN env var");

  const apiBase = process.env.NOTIFY_API?.replace(/\/+$/, "") || "https://nft-season.vercel.app";

  const [title, body, targetUrl] = process.argv.slice(2);
  if (!title || !body || !targetUrl) {
    die('Usage: npm run notify:send -- "Title" "Body" "https://nft-season.vercel.app/..."');
  }

  const resp = await fetch(`${apiBase}/api/notify/broadcast`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${admin}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ title, body, targetUrl }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    die(`Send failed: status=${resp.status}\n${text}`);
  }

  console.log(text);
}

main().catch((e) => die(String(e)));
