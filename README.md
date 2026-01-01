# NFT Season

A Farcaster Mini App that curates new, live, and past NFT mints across the Farcaster ecosystem.

Built with Vite and the official `@farcaster/create-mini-app` scaffold.

Dark-mode first.  
No paid APIs.  
All content is data-driven.

Also includes a zero-vendor notifications pipeline (Farcaster Frame Notifications) plus local admin tools.

---

## Dependencies

### Core
- Node.js + npm
- Vite
- TypeScript
- React

### Tooling used by this repo
- `tsx`, runs TypeScript scripts directly (validation, editor, build info tasks)
- `sharp`, image resizing for thumbnails
- Vercel CLI (via `npx vercel`), deployment target
- Postgres client libs: `pg` (Neon, local scripts)

---

## Development

### Install dependencies
```bash
npm install
````

### Run locally

```bash
npm run dev
```

Local app:

```text
http://localhost:5173
```

---

## Build

```bash
npm run build
```

This runs:

* prebuild (write build info, then validate data)
* TypeScript type checking
* Vite production build

Output:

* `dist/`

---

## Deploy

Use the provided deploy script:

```bash
./deploy.sh
```

This will:

* Install dependencies
* Run a production build
* Deploy to Vercel using the linked project
* Verify the Farcaster manifest is reachable

---

## Post-Deploy (Required)

After every production deploy, refresh the Mini App manifest in Farcaster.

1. Open:

```text
https://farcaster.xyz/~/developers/mini-apps/manifest?domain=nft-season.vercel.app
```

2. Click **Refresh**

This forces Farcaster to re-read:

* `/.well-known/farcaster.json`
* account association
* icon and splash image
* metadata updates

---

## Farcaster Manifest

The Mini App manifest lives at:

```text
public/.well-known/farcaster.json
```

It is served statically by Vite from the `public` directory.

Common edits:

* `iconUrl` and `splashImageUrl`
* app name and description
* developer metadata
* tags

---

## Assets

Static assets are served from `public/`.

Important files:

```text
public/thumbs/miniapp.png   # Mini App icon and splash
public/thumbs/tmp.png       # Temporary collection thumbnails
```

---

## Thumbnail Generation

You will often manually download a collection image, then generate a correctly sized thumbnail.

Command:

```bash
npm run resize /path_to_manually_downloaded_image/collectionImage.png collectionImage
```

This will generate one or more resized outputs (depending on the script) under:

```text
public/thumbs/
```

Notes:

* I generally save original image as thumbs/imagename-orig.png
* Prefer square-ish source images.
* Use a clean slug for the output name (`collectionImage` above).

---

## Updating NFT Data (Most Important Section)

All NFT data lives in one file:

```text
src/data/collections.ts
```

This file is intentionally structured so:

* NFT collections are defined once
* Collections can appear in multiple groups
* No data is duplicated

---

## Web Editor (Recommended)

You can manage `collections.ts` without editing TypeScript directly.

The editor supports:

* Create, update, delete collections
* Create, update, delete groups
* Reorder groups
* Manage group items via search + add/remove (no multi-select pain)
* Save regenerates `src/data/collections.ts`
* Run `validate:data`
* Run `deploy.sh`

### Run the editor

Token mode (recommended):

```bash
export EDITOR_TOKEN="annoyingly-long-secret"
npm run editor
```

No-token mode (local only, Origin-checked):

```bash
export EDITOR_NO_TOKEN=1
npm run editor
```

Open:

```text
http://127.0.0.1:8787
```

Auth notes:

* The editor UI is local-only.
* In token mode, the UI requires the same header style as the rest of the admin tooling (header-based token, not cookies).

---

## Notifications (Farcaster Frame Notifications)

NFT Season supports Farcaster notifications with **zero vendors**:

* No Neynar.
* No third-party notification relay.
* Uses Farcaster’s official Frame Notifications endpoint (`/v1/frame-notifications`) with user opt-in tokens provided by the Farcaster client.

### What Neynar is (and is not) in this repo

**Neynar is a third-party Farcaster API provider** (profiles, casts, reactions, etc.).
This project does **not** use Neynar for anything, and does not require Neynar keys.

Notifications are sent directly to Farcaster’s notifications endpoint using tokens collected via the Mini App’s notifications opt-in flow.

### Mini App UI behavior

In `src/App.tsx`, the header includes a bell icon:

* If notifications are enabled, the bell shows a **blue checkmark**.
* Tapping the bell shows an in-app instruction message:
  "Never miss another NFT mint or allowlist on Farcaster! Tap the 3 dots menu to toggle Notifications ON/ OFF."

Users enable notifications from the Farcaster client’s ⋮ menu for the Mini App.

### Webhook + welcome notification

The Mini App receives notification opt-in events via:

```text
api/farcaster/webhook.ts
```

When a user enables notifications, the backend records their token and sends a one-time welcome notification:

> "You're in! Stay tuned for NFT alerts. Warp warp."

This welcome message is only sent once per fresh token.

### Database

Notification state is stored in Postgres (Neon). The key env var is:

```bash
export NOTIFY_DATABASE_URL='postgresql://...'
```

Recommended: put it in `~/.bashrc` so it exists for `npm run ...` scripts.

Tables commonly used:

* `miniapp_notification_subscribers` (tokens, enabled flag, fid)
* `miniapp_notification_webhook_events` (raw event capture for debugging)

You can inspect webhook events with psql (Neon requires endpoint param for some clients):

```bash
export DB_URL="postgresql://USER@ep-XXXX-pooler.REGION.aws.neon.tech/DB?sslmode=require&options=endpoint%3Dep-XXXX-pooler"
PGPASSWORD='...' psql "$DB_URL" -P pager=off -c "\d+ miniapp_notification_webhook_events"
```

### Notification scripts and APIs

Backend endpoints (Vercel serverless):

```text
api/notify/stats.ts
api/notify/diag.ts
api/notify/broadcast.ts
api/_db.ts
```

Scripts:

```text
scripts/send-notification.ts
scripts/db-init.ts
```

---

## Notifications Manager (Local Admin UI)

There is a dedicated local admin UI to manage notifications:

```text
scripts/notifications-manager.ts
```

Run it:

```bash
npm run notifications
```

Config:

```bash
export NOTIFY_MANAGER_PORT=8788     # optional
export EDITOR_TOKEN="..."           # required unless EDITOR_NO_TOKEN=1
export NOTIFY_DATABASE_URL="..."    # required
```

Open:

```text
http://127.0.0.1:8788
```

What it does:

* Shows subscriber count and a paginated subscriber list (50 per page)
* Shows recent webhook events (50 per page)
* Lets you compose a notification (title, body, target URL)
* Send test notification to fid `372916`
* Broadcast to all enabled subscribers
* Uses a stable `notificationId` by default for easier debugging
* If rate-limited, it shows: `rate limited, try again` (no auto-retry)

Auth model:

* Same style as the editor: local-only + header token
* UI itself loads locally, then you paste `EDITOR_TOKEN` once (stored in browser localStorage)
* API requests include `x-editor-token` automatically

---

## How to Add a New NFT Collection

### Step 1: Add the collection definition

Find the `collectionsById` object in:

```text
src/data/collections.ts
```

Add a new entry once:

```ts
"example-nft": {
  id: "example-nft",
  name: "Example NFT",
  creators: ["@creatorhandle"],
  miniapp: "https://farcaster.xyz/miniapps/XXXXX/example",
  opensea: "https://opensea.io/collection/example",
  network: "Base", // Base | Arbitrum | Ethereum | Degen | Celo
  thumbnail: "/thumbs/tmp.png"
}
```

Notes:

* `id` must be unique and URL-safe
* `miniapp` is optional
* `opensea` is optional
* creator handles must include `@`

---

### Step 2: Add the collection to one or more groups

Scroll down to the `groups` array in the same file.

Each group references collections by ID only.

Example:

```ts
{
  title: "We are Live",
  description: "Time to click buttons. The following limited edition mints are Live.",
  featuredId: "example-nft",
  itemIds: [
    "example-nft",
    "another-nft"
  ]
}
```

You can:

* Add the same collection ID to multiple groups
* Feature it in only one group by setting `featuredId`

---

## Featured Rules (Important)

* `featuredId` is group-specific
* A collection can appear in many groups
* Featured collections should not also appear in `itemIds` for the same group

---

## Button Behavior (Automatic)

Buttons are determined automatically:

* If primary link is OpenSea, button says **OpenSea**
* If group is **Be Early**, button says **Allow List**
* Otherwise, **Mint**

Miniapp links attempt to open via:

```ts
sdk.actions.openMiniApp()
```

with a safe fallback to browser navigation.

---

## Frame Embed (Optional)

To make the root app URL previewable in Farcaster feeds, add an `fc:frame`
meta tag to `index.html`:

```html
<meta
  name="fc:frame"
  content='{
    "version":"next",
    "imageUrl":"https://nft-season.vercel.app/thumbs/miniapp.png",
    "button":{
      "title":"Open",
      "action":{
        "type":"launch_frame",
        "name":"NFT Season",
        "url":"https://nft-season.vercel.app"
      }
    }
  }'
/>
```

---

## Design Notes

* Dark-mode only
* No horizontal scrolling by design
* Search is scoped to active group (currently disabled in App.tsx)
* Creator handles open Farcaster profiles in-app when possible

---

## Resources

* [https://miniapps.farcaster.xyz/](https://miniapps.farcaster.xyz/)

---

## Vibe coding

### Links to conversations with LLM during history of code development

* Initial development of miniapp: [https://chatgpt.com/g/g-p-67ec51b2f62c8191814610600615be0d-crypto/c/694470d3-747c-8329-92e7-5a5d27e50ae8](https://chatgpt.com/g/g-p-67ec51b2f62c8191814610600615be0d-crypto/c/694470d3-747c-8329-92e7-5a5d27e50ae8)
* Adding in notifications: [https://chatgpt.com/g/g-p-67ec51b2f62c8191814610600615be0d-crypto/c/694ecc57-d8ec-8330-9b8f-a1d32bf741e8](https://chatgpt.com/g/g-p-67ec51b2f62c8191814610600615be0d-crypto/c/694ecc57-d8ec-8330-9b8f-a1d32bf741e8)

### What files to pass to chatGPT for editing different parts of the miniapp

#### Miniapp UI (what users see in Farcaster)

* `src/App.tsx` (always)
* `src/data/collections.ts`
* `src/components/CollectionRow.tsx`
* `src/components/FeaturedCard.tsx`
* `src/components/Tabs.tsx`
* `src/components/RichText.tsx`
* `src/lib/urls.ts`
* `src/lib/farcaster.ts`

If UI behavior touches notifications:

* `public/.well-known/farcaster.json` (only if we’re debugging manifest fields)

#### Editor web GUI (the protected admin UI you run via `npm run editor`)

* `scripts/editor-server.ts` (always)
* `src/data/collections.ts`
* `src/data/collections-archive.ts`

#### Notifications Manager (local admin UI you run via `npm run notifications`)

* `scripts/notifications-manager.ts` (always)
* `api/notify/broadcast.ts`, `api/notify/diag.ts`, `api/notify/stats.ts`
* `api/farcaster/webhook.ts`
* `api/_db.ts`
* `package.json` (if we add scripts/env vars)

#### Data validation, sorting, and build-time rules

* `scripts/validate-data.ts`
* `src/data/collections.ts`
* `package.json` (only if we add scripts or change commands)

#### Thumbnail pipeline

* `scripts/generate-thumbnails.ts`
* `src/data/collections.ts`

#### Styling/layout bugs (truncation, overlap, right-justified labels, pulsing)

* The component where the bug occurs:

  * list row: `src/components/CollectionRow.tsx`
  * featured: `src/components/FeaturedCard.tsx`
* Plus `src/App.tsx` (because it defines keyframes and sometimes wrapper layout)

#### Minimal “starter pack” for any new UI thread

* `src/App.tsx`
* `src/components/CollectionRow.tsx`
* `src/components/FeaturedCard.tsx`
* `src/data/collections.ts`

### Prompt engineering

If you want a feature added and for the underlying codebase/ functionality/ layout to be left unchanged, prompt with:

```
Surgical Patch Contract (SPC)

1) Treat the attached file(s) as GOD baseline.
2) Output the entire file(s) back.
3) No refactors, no reformatting, no renaming, no layout/UI changes, no behavior changes except the explicitly requested feature.
4) Preserve all existing whitespace, ordering, strings, CSS, and HTML.
5) Changes must be the minimum diff possible.
6) If you need extra files/interfaces to do this safely, ask first and do not guess.
7) After editing, do a self-check: “List every non-feature change you made.” If that list is not empty, redo it.

If you touch anything outside the requested feature, you owe me 10 pushups.
```

---

Mini App created by **@raspishake**
Raspberry Shake, S.A.
[https://raspberryshake.org](https://raspberryshake.org)

```
