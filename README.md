````md
# Vibe coding chat
https://chatgpt.com/g/g-p-67ec51b2f62c8191814610600615be0d-crypto/c/694470d3-747c-8329-92e7-5a5d27e50ae8

# NFT Season

A Farcaster Mini App that curates new, live, and past NFT mints across the Farcaster ecosystem.

Built with Vite and the official `@farcaster/create-mini-app` scaffold.

Dark-mode first.  
No backend.  
No paid APIs.  
All content is data-driven.

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

Local app will be available at:

```
http://localhost:5173
```

---

## Build

```bash
npm run build
```

This runs:

* TypeScript type checking
* Vite production build

Output is written to `dist/`.

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

After **every production deploy**, you must refresh the Mini App manifest in Farcaster.

1. Open:

```
https://farcaster.xyz/~/developers/mini-apps/manifest?domain=nft-season.vercel.app
```

2. Click **Refresh**

This is required for Farcaster to re-read:

* `/.well-known/farcaster.json`
* account association
* icon / splash image
* metadata updates

---

## Farcaster Manifest

The Mini App manifest lives at:

```
public/.well-known/farcaster.json
```

It is served statically by Vite from the `public` directory.

Common edits:

* `iconUrl` and `splashImageUrl`
* app name / description
* developer metadata
* tags

---

## Assets

Static assets are served from `public/`.

Important files:

```text
public/thumbs/miniapp.png   # Mini App icon & splash
public/thumbs/tmp.png       # Temporary collection thumbnails
```

---

## Updating NFT Data (Most Important Section)

All NFT data lives in **one file**:

```
src/data/collections.ts
```

This file is intentionally structured so:

* NFT collections are defined **once**
* Collections can appear in **multiple groups**
* No data is duplicated

---

## How to Add a New NFT Collection

### Step 1: Add the collection definition

Find the `collectionsById` object in:

```
src/data/collections.ts
```

Add a new entry **once**:

```ts
"example-nft": {
  id: "example-nft",
  name: "Example NFT",
  creators: ["@creatorhandle"],
  miniapp: "https://farcaster.xyz/miniapps/XXXXX/example",
  opensea: "https://opensea.io/collection/example",
  network: "Base", // Base | Arbitrum | Ethereum
  thumbnail: "/thumbs/tmp.png"
}
```

Notes:

* `id` must be **unique** and URL-safe
* `miniapp` is optional
* `opensea` is optional
* If only OpenSea exists, the button will correctly say **OpenSea**
* Creator handles must include `@`

---

### Step 2: Add the collection to one or more groups

Scroll down to the `groups` array in the same file.

Each group references collections by **ID only**.

Example:

```ts
{
  title: "We are Live",
  description: "Time to click buttons. The following limited edition mints are Live.",
  lastUpdated: "Dec 18, 2037",
  featuredId: "example-nft", // optional
  itemIds: [
    "example-nft",
    "another-nft"
  ]
}
```

You can:

* Add the same collection ID to **multiple groups**
* Feature it in **only one group** by setting `featuredId`
* Omit `featuredId` entirely if nothing is featured

---

### Featured Rules (Important)

* `featuredId` is **group-specific**
* A collection can appear in many groups
* A collection should be featured in **at most one group**
* Featured collections appear at the top and are **not duplicated** in the list

---

## Button Behavior (Automatic)

Buttons are determined automatically:

* If primary link is OpenSea → button says **OpenSea**
* If group is **Be Early** → button says **Allow List**
* Otherwise → **Mint**

No manual labeling needed.

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

Mini App created by **@raspishake**
Raspberry Shake, S.A.
[https://raspberryshake.org](https://raspberryshake.org)

```
