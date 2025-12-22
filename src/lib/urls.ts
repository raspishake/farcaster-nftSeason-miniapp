// src/lib/urls.ts

export type MiniappSdkLike = {
  actions: {
    openUrl: (url: string) => Promise<void>
    openMiniApp: (args: { url: string }) => Promise<void>
  }
}

export function toMiniAppOpenUrl(raw: string): string {
  const s = raw.trim()
  if (!s) return s

  // Remove hash fragments (can break deep links in some shells)
  const noHash = (s.split("#")[0] ?? s).trim()

  // Ensure https://
  const withProtocol = /^https?:\/\//i.test(noHash) ? noHash : `https://${noHash}`

  // Collapse accidental double slashes in the path (keep "https://")
  try {
    const u = new URL(withProtocol)
    u.pathname = u.pathname.replace(/\/{2,}/g, "/")
    return u.toString()
  } catch {
    return withProtocol.replace(/([^:]\/)\/+/g, "$1")
  }
}

export async function safeOpenUrl(sdk: MiniappSdkLike, url: string): Promise<void> {
  const finalUrl = toMiniAppOpenUrl(url)
  if (!finalUrl) return

  try {
    await sdk.actions.openUrl(finalUrl)
  } catch {
    window.location.href = finalUrl
  }
}

export async function openMiniAppOrUrl(sdk: MiniappSdkLike, url: string): Promise<void> {
  const openMiniAppUrl = toMiniAppOpenUrl(url)
  if (!openMiniAppUrl) return

  try {
    await sdk.actions.openMiniApp({ url: openMiniAppUrl })
  } catch {
    await safeOpenUrl(sdk, openMiniAppUrl)
  }
}
