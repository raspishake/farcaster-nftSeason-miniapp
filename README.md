Here is a **clean, corrected README.md** tailored to *NFT Season*, with exactly what you asked added and nothing fluffy.

Replace your entire `README.md` with this:

````md
# NFT Season

A Farcaster Mini App that curates new, live, and past NFT mints across the Farcaster ecosystem.

Built with Vite and the official `@farcaster/create-mini-app` scaffold.

---

## Development

### Install
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

After **every production deploy**, you must refresh the Mini App manifest in Farcaster:

1. Open:

```
https://farcaster.xyz/~/developers/mini-apps/manifest?domain=nft-season.vercel.app
```

2. Click **Refresh**

This step is required for Farcaster to re-read:

* `/.well-known/farcaster.json`
* account association
* icon / splash image
* metadata updates

---

## Farcaster Manifest

The Mini App manifest lives at:

```
/public/.well-known/farcaster.json
```

It is served statically by Vite from the `public` directory.

Common edits:

* `iconUrl` and `splashImageUrl`
* app name / description
* developer metadata
* tags

Example location:

```text
public/.well-known/farcaster.json
```

---

## Assets

Static assets are served from `public/`.

Important files:

```text
public/thumbs/miniapp.png   # Mini App icon & splash
public/thumbs/tmp.png       # Temporary collection thumbnails
```

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

## Updating NFT Lists

All NFT groups and collections live in:

```
src/data/collections.ts
```

To update content:

* Edit text only
* No code changes required
* Redeploy after changes

---

## Notes

* Dark-mode first
* No backend
* No paid APIs
* Designed to be edited via a single data file

Mini App created by **@raspishake**
Raspberry Shake, S.A.
[https://raspberryshake.org](https://raspberryshake.org)

