// scripts/generate-thumbnails.ts
//
// Thumbnail generator (fast + Farcaster-compatible):
// - Browser-like HTML fetch headers to get OG images that Farcaster uses
// - Semaphores per domain (OpenSea + HTML) to reduce aborts and speed variance
// - Miniapp: prefer OG image from the miniapp URL (matches cast previews most often)
//   fall back to farcaster.json manifest only if we can resolve it
// - OpenSea: fetch collection image + token image (collection URL must be opensea.io)
//
// Usage:
//   OPENSEA_API_KEY=xxxx npm run thumbs
//   OPENSEA_API_KEY=xxxx npm run thumbs -- --force
//
// Env knobs:
//   THUMBS_CONCURRENCY=6          overall concurrent collections
//   THUMBS_HTML_CONCURRENCY=4     concurrent HTML fetches
//   THUMBS_OPENSEA_CONCURRENCY=2  concurrent OpenSea API calls
//   THUMBS_TIMEOUT_MS=20000       fetch timeout
//
// Output:
//   public/thumbs/<id>-opensea-collection-orig.png
//   public/thumbs/<id>-opensea-token-orig.png
//   public/thumbs/<id>-miniapp-orig.png
//   public/thumbs/<id>.png
//
// Writes:
//   tmp/collections.ts.updated

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import crypto from "node:crypto"
import { fileURLToPath, pathToFileURL } from "node:url"

type AnyObj = Record<string, any>
type ImgKind = "opensea-collection" | "opensea-token" | "miniapp"

type OpenseaParsed =
  | { kind: "collection"; slug: string }
  | { kind: "asset"; chain: string; address: string; tokenId: string }
  | { kind: "unknown" }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

const SRC_COLLECTIONS = path.join(REPO_ROOT, "src", "data", "collections.ts")
const OUT_PUBLIC_THUMBS = path.join(REPO_ROOT, "public", "thumbs")
const OUT_TMP_UPDATED = path.join(REPO_ROOT, "tmp", "collections.ts.updated")
const CACHE_DIR = path.join(REPO_ROOT, "tmp", "thumb-cache")

const FORCE = process.argv.includes("--force")
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || ""

const CONCURRENCY = Number(process.env.THUMBS_CONCURRENCY || "6")
const HTML_CONCURRENCY = Number(process.env.THUMBS_HTML_CONCURRENCY || "4")
const OPENSEA_CONCURRENCY = Number(process.env.THUMBS_OPENSEA_CONCURRENCY || "2")
const FETCH_TIMEOUT_MS = Number(process.env.THUMBS_TIMEOUT_MS || "20000")

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function sha1(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex")
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

async function sleep(ms: number): Promise<void> {
  await new Promise(res => setTimeout(res, ms))
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function loadSharp() {
  const sharp = (await import("sharp")).default
  return sharp
}

async function writePngResized(srcPath: string, outPath: string, size = 128): Promise<void> {
  const sharp = await loadSharp()
  const input = await fs.readFile(srcPath)
  await sharp(input)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
}

class Semaphore {
  private available: number
  private queue: Array<() => void> = []
  constructor(max: number) {
    this.available = Math.max(1, max)
  }
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await new Promise<void>(resolve => {
      if (this.available > 0) {
        this.available--
        resolve()
      } else {
        this.queue.push(resolve)
      }
    })
    try {
      return await fn()
    } finally {
      this.available++
      const next = this.queue.shift()
      if (next) {
        this.available--
        next()
      }
    }
  }
}

const htmlSem = new Semaphore(HTML_CONCURRENCY)
const openseaSem = new Semaphore(OPENSEA_CONCURRENCY)

const HTML_HEADERS: Record<string, string> = {
  // Look like a browser so sites give you OG meta that Farcaster sees
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache"
}

function openseaUrlIsRealOpensea(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === "opensea.io" || u.hostname.endsWith(".opensea.io")
  } catch {
    return false
  }
}

function parseOpenseaUrl(url: string): OpenseaParsed {
  try {
    const u = new URL(url)

    const mCol = u.pathname.match(/^\/collection\/([^/?#]+)/i)
    if (mCol?.[1]) return { kind: "collection", slug: decodeURIComponent(mCol[1]) }

    const mAsset1 = u.pathname.match(/^\/assets\/([^/]+)\/(0x[a-fA-F0-9]{40})\/([^/?#]+)/i)
    if (mAsset1?.[1] && mAsset1?.[2] && mAsset1?.[3]) {
      return { kind: "asset", chain: mAsset1[1].toLowerCase(), address: mAsset1[2], tokenId: mAsset1[3] }
    }

    const mAsset2 = u.pathname.match(/^\/assets\/(0x[a-fA-F0-9]{40})\/([^/?#]+)/i)
    if (mAsset2?.[1] && mAsset2?.[2]) {
      return { kind: "asset", chain: "ethereum", address: mAsset2[1], tokenId: mAsset2[2] }
    }

    return { kind: "unknown" }
  } catch {
    return { kind: "unknown" }
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "follow" })
  } finally {
    clearTimeout(t)
  }
}

function isRetryableErr(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes("http 522") ||
    m.includes("http 520") ||
    m.includes("http 524") ||
    m.includes("fetch failed") ||
    m.includes("aborted") ||
    m.includes("timed out") ||
    m.includes("econnreset") ||
    m.includes("enetunreach") ||
    m.includes("eai_again")
  )
}

async function fetchBytes(url: string, headers?: Record<string, string>): Promise<Buffer> {
  const res = await fetchWithTimeout(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<any> {
  const res = await fetchWithTimeout(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  return await res.json()
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const res = await fetchWithTimeout(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  return await res.text()
}

async function fetchJsonWithRetries(url: string, headers: Record<string, string>, tries = 3): Promise<any> {
  let lastErr: Error | null = null
  for (let i = 0; i < tries; i++) {
    try {
      return await fetchJson(url, headers)
    } catch (e) {
      lastErr = e as Error
      const msg = String(lastErr.message || lastErr)
      if (!isRetryableErr(msg) || i === tries - 1) break
      await sleep(350 * Math.pow(2, i))
    }
  }
  throw lastErr ?? new Error("fetchJsonWithRetries failed")
}

async function cachedGetJson(url: string, headers: Record<string, string>, tries = 3): Promise<any> {
  await ensureDir(CACHE_DIR)
  const p = path.join(CACHE_DIR, `json-${sha1(url)}.json`)
  if (!FORCE && (await pathExists(p))) {
    const s = await fs.readFile(p, "utf-8")
    return JSON.parse(s)
  }
  const j = await fetchJsonWithRetries(url, headers, tries)
  await fs.writeFile(p, JSON.stringify(j), "utf-8")
  return j
}

async function cachedGetText(url: string, headers?: Record<string, string>): Promise<string> {
  await ensureDir(CACHE_DIR)
  const p = path.join(CACHE_DIR, `html-${sha1(url)}.txt`)
  if (!FORCE && (await pathExists(p))) return await fs.readFile(p, "utf-8")
  const t = await fetchText(url, headers)
  await fs.writeFile(p, t, "utf-8")
  return t
}

async function downloadIfNeeded(url: string, outPath: string, headers?: Record<string, string>): Promise<boolean> {
  if (!FORCE && (await pathExists(outPath))) return false
  const bytes = await fetchBytes(url, headers)
  await fs.writeFile(outPath, bytes)
  return true
}

// ---------- OG / HTML extraction ----------

function extractMetaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const reProp = new RegExp(`<meta[^>]+property=["']${escapeRegExp(key)}["'][^>]+content=["']([^"']+)["']`, "i")
    const reName = new RegExp(`<meta[^>]+name=["']${escapeRegExp(key)}["'][^>]+content=["']([^"']+)["']`, "i")
    const m1 = html.match(reProp)
    if (m1?.[1]) return m1[1]
    const m2 = html.match(reName)
    if (m2?.[1]) return m2[1]
  }
  return null
}

function extractLinkRelHref(html: string, rels: string[]): string | null {
  for (const rel of rels) {
    const re = new RegExp(`<link[^>]+rel=["']${escapeRegExp(rel)}["'][^>]+href=["']([^"']+)["']`, "i")
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

function absolutizeUrl(maybeRelative: string, baseUrl: string): string | null {
  try {
    const u = new URL(maybeRelative, baseUrl)
    return isHttpUrl(u.toString()) ? u.toString() : null
  } catch {
    return null
  }
}

function tryJsonLdImage(html: string): string | null {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)
  if (!scripts?.length) return null
  for (const s of scripts) {
    const inner = s.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "")
    try {
      const j = JSON.parse(inner)
      const img =
        (typeof j?.image === "string" && j.image) ||
        (typeof j?.logo === "string" && j.logo) ||
        (Array.isArray(j?.image) && typeof j.image[0] === "string" && j.image[0]) ||
        null
      if (img && isHttpUrl(img)) return img
    } catch {
      // ignore
    }
  }
  return null
}

async function resolveMiniappImageViaOg(url: string): Promise<{ imgUrl: string | null; reason: string }> {
  if (!isHttpUrl(url)) return { imgUrl: null, reason: "not http url" }

  return await htmlSem.withLock(async () => {
    const html = await cachedGetText(url, HTML_HEADERS)

    const og =
      extractMetaContent(html, ["og:image", "twitter:image", "twitter:image:src", "og:image:url", "og:image:secure_url"]) ||
      null
    const ld = tryJsonLdImage(html)
    const icon =
      extractLinkRelHref(html, ["apple-touch-icon", "icon", "shortcut icon"]) ||
      null

    const picked =
      (og && absolutizeUrl(og, url)) ||
      (ld && absolutizeUrl(ld, url)) ||
      (icon && absolutizeUrl(icon, url)) ||
      null

    if (picked) return { imgUrl: picked, reason: "ok" }
    return { imgUrl: null, reason: "no og/twitter/jsonld/icon found" }
  })
}

// ---------- Manifest fallback ----------

function guessManifestUrlFromMiniappUrl(miniappUrl: string): string | null {
  try {
    const u = new URL(miniappUrl)
    if (u.hostname !== "farcaster.xyz") return `${u.origin}/.well-known/farcaster.json`
    return null
  } catch {
    return null
  }
}

function tryExtractNextDataJson(html: string): AnyObj | null {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (!m?.[1]) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

function deepFindString(obj: any, pred: (s: string) => boolean): string | null {
  const seen = new Set<any>()
  const stack: any[] = [obj]
  while (stack.length) {
    const cur = stack.pop()
    if (!cur || typeof cur !== "object") continue
    if (seen.has(cur)) continue
    seen.add(cur)
    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v)
      continue
    }
    for (const v of Object.values(cur)) {
      if (typeof v === "string") {
        if (pred(v)) return v
      } else if (v && typeof v === "object") {
        stack.push(v)
      }
    }
  }
  return null
}

function extractDomainFromHomeUrl(homeUrl: string): string | null {
  try {
    return new URL(homeUrl).hostname
  } catch {
    return null
  }
}

async function resolveMiniappManifestUrl(miniappUrl: string): Promise<string | null> {
  const direct = guessManifestUrlFromMiniappUrl(miniappUrl)
  if (direct) return direct
  if (!isHttpUrl(miniappUrl)) return null

  // if it's farcaster.xyz we generally won't find the miniapp's domain reliably
  // and most apps do not publish farcaster.json anyway, so treat as optional fallback.
  const html = await htmlSem.withLock(async () => cachedGetText(miniappUrl, HTML_HEADERS))
  const next = tryExtractNextDataJson(html)

  if (next) {
    const wellKnown = deepFindString(next, s => s.includes("/.well-known/farcaster.json"))
    if (wellKnown && isHttpUrl(wellKnown)) return wellKnown

    const homeUrl = deepFindString(next, s => s.startsWith("http") && s.includes("://"))
    if (homeUrl) {
      const dom = extractDomainFromHomeUrl(homeUrl)
      if (dom) return `https://${dom}/.well-known/farcaster.json`
    }
  }

  const mWellKnown = html.match(/https?:\/\/[a-zA-Z0-9.-]+\/\.well-known\/farcaster\.json/i)?.[0]
  if (mWellKnown) return mWellKnown

  return null
}

function pickMiniappImageFromManifest(manifest: AnyObj): string | null {
  const miniapp = manifest?.miniapp
  if (!miniapp) return null
  const cand: string[] = []
  if (typeof miniapp.iconUrl === "string") cand.push(miniapp.iconUrl)
  if (typeof miniapp.splashImageUrl === "string") cand.push(miniapp.splashImageUrl)
  if (typeof miniapp.imageUrl === "string") cand.push(miniapp.imageUrl)
  if (typeof miniapp.logoUrl === "string") cand.push(miniapp.logoUrl)
  for (const u of cand) if (u && isHttpUrl(u) && u !== "N/A" && u !== "TBA") return u
  return null
}

// ---------- OpenSea ----------

async function openseaFetchCollectionImage(slug: string): Promise<string | null> {
  const url = `https://api.opensea.io/api/v2/collection/${encodeURIComponent(slug)}`
  const j = await openseaSem.withLock(async () => cachedGetJson(url, { "X-API-KEY": OPENSEA_API_KEY }, 4))
  const img =
    j?.collection?.image_url ||
    j?.collection?.imageUrl ||
    j?.collection?.image ||
    j?.image_url ||
    j?.imageUrl ||
    null
  return typeof img === "string" && isHttpUrl(img) ? img : null
}

async function openseaFetchTokenImageFromCollection(slug: string): Promise<string | null> {
  const url = `https://api.opensea.io/api/v2/collection/${encodeURIComponent(slug)}/nfts?limit=1`
  const j = await openseaSem.withLock(async () => cachedGetJson(url, { "X-API-KEY": OPENSEA_API_KEY }, 4))
  const nft = j?.nfts?.[0]
  const img = nft?.image_url || nft?.imageUrl || nft?.image_original_url || nft?.imageOriginalUrl || null
  return typeof img === "string" && isHttpUrl(img) ? img : null
}

// ---------- final thumb source selection ----------

async function pickBestSourceAsync(id: string): Promise<{ kind: ImgKind; srcPath: string } | null> {
  const prefer: Array<{ kind: ImgKind; file: string }> = [
    { kind: "opensea-collection", file: `${id}-opensea-collection-orig.png` },
    { kind: "opensea-token", file: `${id}-opensea-token-orig.png` },
    { kind: "miniapp", file: `${id}-miniapp-orig.png` }
  ]
  for (const p of prefer) {
    const full = path.join(OUT_PUBLIC_THUMBS, p.file)
    if (await pathExists(full)) return { kind: p.kind, srcPath: full }
  }
  return null
}

// ---------- collections.ts updater (match by id field) ----------

function updateThumbInBlock(block: string, thumbPath: string): string {
  const re = /\bthumbnail\s*:\s*([^,\n]+)(,?)/m
  if (!re.test(block)) return block
  return block.replace(re, `thumbnail: "${thumbPath}"$2`)
}

function findEnclosingObjectStart(text: string, fromIndex: number): number {
  let i = fromIndex
  while (i >= 0) {
    if (text[i] === "{") return i
    i--
  }
  return -1
}

function findMatchingBrace(text: string, startBraceIndex: number): number {
  let depth = 0
  let inStr: '"' | "'" | null = null
  let esc = false

  for (let i = startBraceIndex; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === "\\") esc = true
      else if (ch === inStr) inStr = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = ch
      continue
    }
    if (ch === "{") depth++
    if (ch === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function updateCollectionsByIdViaIdField(srcText: string, idToThumbPath: Map<string, string>): string {
  let out = srcText

  for (const [id, thumbPath] of idToThumbPath.entries()) {
    const idRe = new RegExp(`\\bid\\s*:\\s*["']${escapeRegExp(id)}["']`, "m")
    const m = idRe.exec(out)
    if (!m || m.index == null) continue

    const start = findEnclosingObjectStart(out, m.index)
    if (start === -1) continue
    const end = findMatchingBrace(out, start)
    if (end === -1) continue

    const block = out.slice(start, end + 1)
    const updated = updateThumbInBlock(block, thumbPath)
    if (updated !== block) out = out.slice(0, start) + updated + out.slice(end + 1)
  }

  return out
}

// ---------- concurrency helper ----------

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, concurrency: number): Promise<void> {
  const q = items.slice()
  const runners: Promise<void>[] = []
  const runOne = async () => {
    while (q.length) {
      const item = q.shift()
      if (!item) return
      await worker(item)
    }
  }
  for (let i = 0; i < Math.max(1, concurrency); i++) runners.push(runOne())
  await Promise.all(runners)
}

// ---------- main ----------

async function main(): Promise<void> {
  await ensureDir(OUT_PUBLIC_THUMBS)
  await ensureDir(path.dirname(OUT_TMP_UPDATED))
  await ensureDir(CACHE_DIR)

  const mod = await import(pathToFileURL(SRC_COLLECTIONS).toString())
  const collectionsById = (mod.collectionsById ?? mod.default?.collectionsById) as Record<string, any>
  if (!collectionsById || typeof collectionsById !== "object") throw new Error(`Could not import collectionsById from ${SRC_COLLECTIONS}`)

  const ids = Object.keys(collectionsById)
  console.log(`==> Found ${ids.length} collections`)
  console.log(
    `==> Concurrency: ${CONCURRENCY}, HTML: ${HTML_CONCURRENCY}, OpenSea: ${OPENSEA_CONCURRENCY}, Timeout: ${FETCH_TIMEOUT_MS}ms, Force: ${
      FORCE ? "yes" : "no"
    }`
  )

  const skippedNonOpensea: Array<{ id: string; url: string }> = []
  const missingFinal: string[] = []

  await runPool(
    ids,
    async id => {
      const c = collectionsById[id]
      if (!c) return

      const openseaUrl = typeof c.opensea === "string" ? c.opensea.trim() : ""
      const miniappUrl = typeof c.miniapp === "string" ? c.miniapp.trim() : ""

      // 1) Miniapp first (cheap, often enough)
      if (miniappUrl) {
        try {
          const { imgUrl, reason } = await resolveMiniappImageViaOg(miniappUrl)
          if (imgUrl) {
            const outPath = path.join(OUT_PUBLIC_THUMBS, `${id}-miniapp-orig.png`)
            const wrote = await downloadIfNeeded(imgUrl, outPath, {
              ...HTML_HEADERS,
              Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
            })
            if (wrote) console.log(`DL miniapp OG image:  ${id} -> ${path.basename(outPath)}`)
          } else {
            // optional fallback to manifest
            try {
              const manifestUrl = await resolveMiniappManifestUrl(miniappUrl)
              if (!manifestUrl) throw new Error("could not resolve manifest url")
              const manifest = await cachedGetJson(manifestUrl, {}, 2)
              const img2 = pickMiniappImageFromManifest(manifest)
              if (img2) {
                const outPath = path.join(OUT_PUBLIC_THUMBS, `${id}-miniapp-orig.png`)
                const wrote = await downloadIfNeeded(img2, outPath)
                if (wrote) console.log(`DL miniapp manifest:  ${id} -> ${path.basename(outPath)}`)
              } else {
                console.log(`MISS miniapp image: ${id} (${reason}; and no icon/splash/image in manifest)`)
              }
            } catch (e) {
              console.log(`ERR miniapp manifest: ${id} (${(e as Error).message})`)
            }
          }
        } catch (e) {
          console.log(`ERR miniapp OG: ${id} (${(e as Error).message})`)
        }
      } else {
        console.log(`SKIP miniapp: ${id} (no miniapp field)`)
      }

      // 2) OpenSea
      if (!openseaUrl) {
        console.log(`SKIP opensea: ${id} (no opensea field)`)
      } else if (!openseaUrlIsRealOpensea(openseaUrl)) {
        skippedNonOpensea.push({ id, url: openseaUrl })
        console.log(`SKIP opensea: ${id} (non-opensea URL)`)
      } else if (!OPENSEA_API_KEY) {
        console.log(`SKIP opensea: ${id} (missing OPENSEA_API_KEY)`)
      } else {
        const parsed = parseOpenseaUrl(openseaUrl)
        if (parsed.kind !== "collection") {
          console.log(`SKIP opensea: ${id} (unsupported opensea URL shape)`)
        } else {
          // collection image
          try {
            const colImg = await openseaFetchCollectionImage(parsed.slug)
            if (colImg) {
              const outPath = path.join(OUT_PUBLIC_THUMBS, `${id}-opensea-collection-orig.png`)
              const wrote = await downloadIfNeeded(colImg, outPath)
              if (wrote) console.log(`DL opensea collection: ${id} -> ${path.basename(outPath)}`)
            } else {
              console.log(`MISS opensea collection image: ${id}`)
            }
          } catch (e) {
            console.log(`ERR opensea collection: ${id} (${(e as Error).message})`)
          }

          // token image
          try {
            const tokImg = await openseaFetchTokenImageFromCollection(parsed.slug)
            if (tokImg) {
              const outPath = path.join(OUT_PUBLIC_THUMBS, `${id}-opensea-token-orig.png`)
              const wrote = await downloadIfNeeded(tokImg, outPath)
              if (wrote) console.log(`DL opensea token:      ${id} -> ${path.basename(outPath)}`)
            } else {
              console.log(`MISS opensea token image: ${id}`)
            }
          } catch (e) {
            console.log(`ERR opensea token: ${id} (${(e as Error).message})`)
          }
        }
      }

      // 3) Final thumb
      const best = await pickBestSourceAsync(id)
      const finalPath = path.join(OUT_PUBLIC_THUMBS, `${id}.png`)

      if (!best) {
        console.log(
          `THUMB ${id}: MISSING (no ${id}-opensea-collection-orig.png, no ${id}-opensea-token-orig.png, and no ${id}-miniapp-orig.png)`
        )
        missingFinal.push(id)
        return
      }

      if (!FORCE && (await pathExists(finalPath))) return
      await writePngResized(best.srcPath, finalPath, 128)
      console.log(`THUMB ${id}: using ${best.kind} -> ${path.basename(finalPath)}`)
    },
    CONCURRENCY
  )

  if (skippedNonOpensea.length) {
    console.log(`\n==> Skipped due to non-opensea URLs (${skippedNonOpensea.length}):`)
    for (const s of skippedNonOpensea) console.log(`  - ${s.id}: ${s.url}`)
  }

  // Update collections.ts
  const srcText = await fs.readFile(SRC_COLLECTIONS, "utf-8")
  const idToThumbPath = new Map<string, string>()

  for (const id of ids) {
    const finalPath = path.join(OUT_PUBLIC_THUMBS, `${id}.png`)
    if (await pathExists(finalPath)) idToThumbPath.set(id, `/thumbs/${id}.png`)
  }

  const updatedText = updateCollectionsByIdViaIdField(srcText, idToThumbPath)
  await fs.writeFile(OUT_TMP_UPDATED, updatedText, "utf-8")

  console.log(`\n==> Wrote: ${path.relative(REPO_ROOT, OUT_TMP_UPDATED)}`)
  console.log(`==> Final thumbs present: ${idToThumbPath.size}`)
  console.log(`==> Final thumbs missing: ${missingFinal.length}`)

  if (missingFinal.length) {
    console.log(`\n==> Missing final thumbs (no usable source):`)
    for (const id of missingFinal) console.log(`  - ${id}`)
  }

  console.log(`\nNext step:`)
  console.log(`  cp ${path.relative(REPO_ROOT, OUT_TMP_UPDATED)} ${path.relative(REPO_ROOT, SRC_COLLECTIONS)}`)
}

main().catch(err => {
  console.error(String(err?.stack || err?.message || err))
  process.exit(1)
})
