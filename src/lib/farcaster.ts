// src/lib/farcaster.ts
import { safeOpenUrl, type MiniappSdkLike } from "./urls"

export type ProfileSdkLike = MiniappSdkLike & {
  actions: MiniappSdkLike["actions"] & {
    viewProfile: (args: { fid: number }) => Promise<void>
  }
}

export function normalizeHandle(handle: string): string {
  const h = handle.trim()
  return h.startsWith("@") ? h.slice(1) : h
}

export async function resolveFidByUsername(username: string): Promise<number | null> {
  const u = normalizeHandle(username)
  const endpoint = `https://api.warpcast.com/v2/user-by-username?username=${encodeURIComponent(u)}`

  try {
    const res = await fetch(endpoint, { method: "GET" })
    if (!res.ok) return null
    const data = (await res.json()) as any
    const fid = data?.result?.user?.fid ?? data?.user?.fid ?? data?.result?.fid ?? null
    return typeof fid === "number" ? fid : null
  } catch {
    return null
  }
}

export async function viewProfileByHandle(
  sdk: ProfileSdkLike,
  handle: string,
  fidCache: Map<string, number>
): Promise<void> {
  const h = normalizeHandle(handle).toLowerCase()
  const fallback = async () => safeOpenUrl(sdk, `https://warpcast.com/${encodeURIComponent(h)}`)

  try {
    const cached = fidCache.get(h)
    if (typeof cached === "number") {
      try {
        await sdk.actions.viewProfile({ fid: cached })
        return
      } catch {
        await fallback()
        return
      }
    }

    const fid = await resolveFidByUsername(h)
    if (typeof fid === "number") {
      fidCache.set(h, fid)
      try {
        await sdk.actions.viewProfile({ fid })
        return
      } catch {
        await fallback()
        return
      }
    }

    await fallback()
  } catch {
    await fallback()
  }
}
