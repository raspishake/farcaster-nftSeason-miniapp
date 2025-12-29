````md
# Vibe coding chat
- Initial development of miniapp: https://chatgpt.com/g/g-p-67ec51b2f62c8191814610600615be0d-crypto/c/694470d3-747c-8329-92e7-5a5d27e50ae8
- Adding in notifications: https://chatgpt.com/g/g-p-67ec51b2f62c8191814610600615be0d-crypto/c/694ecc57-d8ec-8330-9b8f-a1d32bf741e8

# NFT Season

A Farcaster Mini App that curates new, live, and past NFT mints across the Farcaster ecosystem.

Built with Vite and the official `@farcaster/create-mini-app` scaffold.

Dark-mode first.  
No backend.  
No paid APIs.  
All content is data-driven.

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

* I generally save original image as thumb/imagename-orig.png
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
* Manage group items via search + add/remove, not multi-select pain
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
* Search is scoped to active group
* Creator handles open Farcaster profiles in-app when possible

---

## Resources

* [https://miniapps.farcaster.xyz/](https://miniapps.farcaster.xyz/)

---

Mini App created by **@raspishake**
Raspberry Shake, S.A.
[https://raspberryshake.org](https://raspberryshake.org)

```

:contentReference[oaicite:0]{index=0}
::contentReference[oaicite:1]{index=1}
```
