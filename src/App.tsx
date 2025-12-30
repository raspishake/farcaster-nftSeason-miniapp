// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { collectionsById, groups, type Collection, type Group } from "./data/collections"
import { openMiniAppOrUrl, safeOpenUrl } from "./lib/urls"
import { viewProfileByHandle } from "./lib/farcaster"
import { RichText } from "./components/RichText"
import { Tabs } from "./components/Tabs"
import { FeaturedCard } from "./components/FeaturedCard"
import { CollectionRow } from "./components/CollectionRow"
import { BUILD_DATE } from "./buildInfo"

type TabKey = string
type LinkSource = "miniapp" | "opensea"

function normUrl(u?: string | null): string {
  return (u ?? "").trim().replace(/\/+$/, "")
}

function defaultPrimaryLabel(groupTitle: string, source: LinkSource): string {
  if (source === "opensea") return "OpenSea"
  if (groupTitle === "Be Early") return "Allow List"
  return "Mint"
}

function defaultSecondaryLabel(source: LinkSource): string {
  return source === "opensea" ? "OpenSea" : "Open"
}

function primaryLabelForCollection(c: Collection, groupTitle: string, source: LinkSource): string {
  const override =
    source === "miniapp" ? c.primaryActionLabelOverride?.miniapp : c.primaryActionLabelOverride?.opensea
  if (override && override.trim()) return override.trim()
  return defaultPrimaryLabel(groupTitle, source)
}

function secondaryLabelForCollection(c: Collection, source: LinkSource): string {
  const override =
    source === "miniapp" ? c.secondaryActionLabelOverride?.miniapp : c.secondaryActionLabelOverride?.opensea
  if (override && override.trim()) return override.trim()
  return defaultSecondaryLabel(source)
}

function collectionPrimaryUrl(c: Collection, groupTitle: string): string | null {
  if (groupTitle === "You missed the Boat") {
    if (c.opensea && c.opensea.trim() && c.opensea !== "N/A") return c.opensea
    return null
  }

  if (c.miniapp && c.miniapp.trim() && c.miniapp !== "N/A" && c.miniapp !== "TBA") return c.miniapp
  if (c.opensea && c.opensea.trim() && c.opensea !== "N/A") return c.opensea
  return null
}

function collectionSecondaryUrl(c: Collection, groupTitle: string): string | null {
  if (groupTitle === "You missed the Boat") return null
  if (c.miniapp && c.opensea && c.opensea !== "N/A") return c.opensea
  return null
}

function primarySourceFor(c: Collection, primaryUrl: string | null): LinkSource {
  const p = normUrl(primaryUrl)
  if (!p) return "miniapp"
  if (normUrl(c.miniapp) && p === normUrl(c.miniapp)) return "miniapp"
  if (normUrl(c.opensea) && p === normUrl(c.opensea)) return "opensea"
  return "miniapp"
}

function secondarySourceFor(c: Collection, secondaryUrl: string | null): LinkSource {
  const s = normUrl(secondaryUrl)
  if (!s) return "opensea"
  if (normUrl(c.opensea) && s === normUrl(c.opensea)) return "opensea"
  if (normUrl(c.miniapp) && s === normUrl(c.miniapp)) return "miniapp"
  return "opensea"
}

function BellIcon({ checked }: { checked: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: 20,
        height: 20,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      aria-hidden="true"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22Z" fill="currentColor" opacity="0.9" />
        <path
          d="M18.4 16.2c-.9-1-1.4-1.9-1.4-4.7 0-3.4-2-5.5-5-6.1V4a1 1 0 1 0-2 0v1.4c-3 .6-5 2.7-5 6.1 0 2.8-.5 3.7-1.4 4.7-.3.3-.4.7-.2 1.1.2.4.6.6 1 .6h15.2c.4 0 .8-.2 1-.6.2-.4.1-.8-.2-1.1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {checked ? (
        <div
          style={{
            position: "absolute",
            right: -2,
            top: -2,
            width: 11,
            height: 11,
            borderRadius: 999,
            background: "rgba(59, 130, 246, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 2px rgba(0,0,0,0.55)"
          }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : null}
    </div>
  )
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <path
        d="M12 10.8v6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <path
        d="M12 7.6h.01"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(groups[0]?.title ?? "NFTs")
  // const [query, setQuery] = useState("")
  const [readyCalled, setReadyCalled] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [bellToast, setBellToast] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  const fidCacheRef = useRef<Map<string, number>>(new Map())
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        await sdk.actions.ready({ disableNativeGestures: true })
      } finally {
        setReadyCalled(true)
      }
    })()
  }, [])

  const refreshNotificationState = async (): Promise<void> => {
    try {
      const ctx = await sdk.context
      const nd = (ctx as any)?.client?.notificationDetails
      const enabled = Boolean(nd?.token) && Boolean(nd?.url)
      setNotificationsEnabled(enabled)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void refreshNotificationState()

    const onVis = () => {
      if (document.visibilityState === "visible") void refreshNotificationState()
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      document.removeEventListener("visibilitychange", onVis)
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [])

  const groupsByTitle = useMemo(() => {
    const m = new Map<string, Group>()
    for (const g of groups) m.set(g.title, g)
    return m
  }, [])

  const activeGroup = groupsByTitle.get(activeTab) ?? groups[0]

  const featured: Collection | null = useMemo(() => {
    if (!activeGroup.featuredId) return null
    return collectionsById[activeGroup.featuredId] ?? null
  }, [activeGroup])

  const resolvedItems: Collection[] = useMemo(() => {
    const ids = activeGroup.itemIds ?? []
    const list: Collection[] = []
    for (const id of ids) {
      const c = collectionsById[id]
      if (c) list.push(c)
    }
    return list
  }, [activeGroup])

  const filteredItems: Collection[] = useMemo(() => {
    const base = resolvedItems.filter((c: Collection) => c.id !== activeGroup.featuredId)

    base.sort((a: Collection, b: Collection) => {
      const aNew = Boolean(a.highlight)
      const bNew = Boolean(b.highlight)
      if (aNew !== bNew) return aNew ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    })

    return base
  }, [resolvedItems, activeGroup.featuredId])

  async function onOpenPrimary(c: Collection): Promise<void> {
    const url = collectionPrimaryUrl(c, activeGroup.title)
    if (!url) return
    await openMiniAppOrUrl(sdk, url)
  }

  async function onOpenSecondary(c: Collection): Promise<void> {
    const url = collectionSecondaryUrl(c, activeGroup.title)
    if (!url) return
    await openMiniAppOrUrl(sdk, url)
  }

  function onHandleClick(handle: string): void {
    void viewProfileByHandle(sdk as any, handle, fidCacheRef.current)
  }

  const featuredPrimaryUrl = featured ? collectionPrimaryUrl(featured, activeGroup.title) : null
  const featuredSecondaryUrl = featured ? collectionSecondaryUrl(featured, activeGroup.title) : null
  const featuredPrimarySource: LinkSource = featured ? primarySourceFor(featured, featuredPrimaryUrl) : "miniapp"
  const featuredSecondarySource: LinkSource = featured ? secondarySourceFor(featured, featuredSecondaryUrl) : "opensea"

  const featuredPrimaryLabel = featured
    ? primaryLabelForCollection(featured, activeGroup.title, featuredPrimarySource)
    : ""
  const featuredSecondaryLabel = featured ? secondaryLabelForCollection(featured, featuredSecondarySource) : ""

  const showBellToast = (msg: string) => {
    setBellToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setBellToast(null), 3200)
  }

  const onBellClick = async (): Promise<void> => {
    showBellToast(
      "Never miss another NFT mint or allowlist on Farcaster! Tap the 3 dots menu to toggle Notifications ON/ OFF."
    )
    try {
      await sdk.actions.addMiniApp()
    } catch {
      // ignore
    } finally {
      window.setTimeout(() => {
        void refreshNotificationState()
      }, 600)
    }
  }

  const shareText =
    `Never miss another mint/ allowlist on Farcaster\n\n` +
    `It is NFT PFP PVP SZN on Farcaster!\n\n` +
    `We are minting the NFT collections that define this cycle\n\n` +
    `Check out "NFT Season" by @raspishake\n\n` +
    `https://farcaster.xyz/miniapps/T9_FCE1BpAkv/nft-season`

  const onShareClick = async (): Promise<void> => {
    try {
      await sdk.actions.composeCast({
        text: shareText,
        embeds: ["https://farcaster.xyz/miniapps/T9_FCE1BpAkv/nft-season"]
      } as any)
    } catch {
      void safeOpenUrl(sdk, "https://farcaster.xyz/miniapps/T9_FCE1BpAkv/nft-season")
    }
  }

  const closeInfo = (): void => setInfoOpen(false)

  const bannerLine1 = "It's NFT PFP PVP SZN on FC!"
  const bannerLine2 = "We are minting the NFTs that define this cycle"

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        overflowX: "hidden",
        background: "#0b0f14",
        color: "rgba(255,255,255,0.92)",
        display: "flex",
        justifyContent: "center",
        padding: 14
      }}
    >
      <style>
        {`
          @keyframes featuredPulseGlow {
            0%   { box-shadow: 0 0 0 0 rgba(138,180,255,0.65); }
            70%  { box-shadow: 0 0 0 10px rgba(138,180,255,0); }
            100% { box-shadow: 0 0 0 0 rgba(138,180,255,0); }
          }
        `}
      </style>

      <div
        style={{
          width: "100%",
          maxWidth: 720,
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 18,
          background: "rgba(255,255,255,0.03)",
          boxShadow: "0 18px 55px rgba(0,0,0,0.55)",
          overflow: "hidden",
          maxHeight: "calc(100vh - 28px)"
        }}
      >
        {/* Scroll container (sticky works within this) */}
        <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {/* Sticky top area: header + tabs */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              background: "#0b0f14",
              borderBottom: "1px solid rgba(255,255,255,0.10)"
            }}
          >
            <div style={{ padding: 14 }}>
              {/* Thumbnail left, icons + banner right */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                <img
                  src="/thumbs/miniapp.png"
                  alt="NFT Season"
                  width={100}
                  height={100}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 18,
                    objectFit: "cover",
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.25)",
                    flex: "0 0 auto"
                  }}
                />

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Right-justified icons, order: info, bell, share */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                    <button
                      onClick={() => setInfoOpen(true)}
                      type="button"
                      aria-label="Info"
                      style={{
                        width: 36,
                        height: 30,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.22)",
                        color: "rgba(255,255,255,0.92)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}
                    >
                      <InfoIcon />
                    </button>

                    <button
                      onClick={() => void onBellClick()}
                      type="button"
                      aria-label={notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
                      style={{
                        width: 36,
                        height: 30,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.22)",
                        color: "rgba(255,255,255,0.92)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}
                    >
                      <BellIcon checked={notificationsEnabled} />
                    </button>

                    <button
                      onClick={() => void onShareClick()}
                      type="button"
                      aria-label="Share"
                      style={{
                        height: 30,
                        borderRadius: 12,
                        border: "1px solid rgba(59,130,246,0.55)",
                        background: "rgba(59,130,246,0.95)",
                        color: "rgba(255,255,255,0.96)",
                        padding: "0 12px",
                        fontWeight: 950,
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Share
                    </button>
                  </div>

                  {/* Banner, centered, larger, 2 lines, line 2 not bold */}
                  <div style={{ textAlign: "center", lineHeight: 1.25, paddingTop: 2 }}>
                    <div style={{ fontSize: 15.75, fontWeight: 950, color: "rgba(255,255,255,0.92)" }}>
                      <RichText text={bannerLine1} onHandleClick={onHandleClick} />
                    </div>

                    <div style={{ marginTop: 4, fontSize: 14.25, fontWeight: 500, color: "rgba(255,255,255,0.84)" }}>
                      <RichText text={bannerLine2} onHandleClick={onHandleClick} />
                    </div>
                  </div>
                </div>
              </div>

              <Tabs groups={groups} activeTitle={activeTab} onSelect={setActiveTab} />

              {/* Search (commented out intentionally) */}
              {/*
              <div style={{ marginTop: 12 }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={`Search ${activeGroup.title}...`}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.30)",
                    color: "rgba(255,255,255,0.92)",
                    padding: "10px 12px",
                    outline: "none"
                  }}
                />
              </div>
              */}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.35 }}>
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{activeGroup.title}</div>
              <div style={{ marginTop: 3 }}>
                <RichText text={activeGroup.description} onHandleClick={onHandleClick} />
              </div>
            </div>

            {featured ? (
              <FeaturedCard
                collection={featured}
                primaryLabel={featuredPrimaryLabel}
                primaryUrl={featuredPrimaryUrl}
                secondaryLabel={featuredSecondaryLabel}
                secondaryUrl={featuredSecondaryUrl}
                onOpenPrimary={(c) => void onOpenPrimary(c)}
                onOpenSecondary={(c) => void onOpenSecondary(c)}
                onHandleClick={onHandleClick}
              />
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredItems.map((c: Collection) => {
                const primaryUrl = collectionPrimaryUrl(c, activeGroup.title)
                const secondaryUrl = collectionSecondaryUrl(c, activeGroup.title)

                const primarySource = primarySourceFor(c, primaryUrl)
                const secondarySource = secondarySourceFor(c, secondaryUrl)

                const primaryLabel = primaryLabelForCollection(c, activeGroup.title, primarySource)
                const secondaryLabel = secondaryLabelForCollection(c, secondarySource)

                return (
                  <CollectionRow
                    key={`${activeGroup.title}-${c.id}`}
                    collection={c}
                    primaryLabel={primaryLabel}
                    primaryUrl={primaryUrl}
                    secondaryLabel={secondaryLabel}
                    secondaryUrl={secondaryUrl}
                    onOpenPrimary={(cc) => void onOpenPrimary(cc)}
                    onOpenSecondary={(cc) => void onOpenSecondary(cc)}
                    onHandleClick={onHandleClick}
                  />
                )
              })}
            </div>
          </div>

          {/* Footer (minimal, info moved to modal) */}
          <div
            style={{
              padding: 14,
              borderTop: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.72)",
              fontSize: 12.75,
              lineHeight: 1.35
            }}
          >
            <div style={{ marginTop: 2, fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
              {readyCalled ? "" : "Loading..."}
            </div>
          </div>
        </div>
      </div>

      {/* Phone-first in-app toast */}
      {bellToast ? (
        <div
          onClick={() => setBellToast(null)}
          style={{
            position: "fixed",
            left: 14,
            right: 14,
            bottom: 16,
            zIndex: 9999,
            padding: "12px 12px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.82)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.92)",
            textAlign: "center",
            fontSize: 13.5,
            lineHeight: 1.25,
            boxShadow: "0 18px 55px rgba(0,0,0,0.55)",
            cursor: "pointer"
          }}
          role="status"
          aria-live="polite"
        >
          {bellToast}
        </div>
      ) : null}

      {/* Info modal */}
      {infoOpen ? (
        <div
          onClick={closeInfo}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(0,0,0,0.62)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 14
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Info"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 720,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(11,15,20,0.98)",
              boxShadow: "0 18px 55px rgba(0,0,0,0.65)",
              overflow: "hidden"
            }}
          >
            <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 950, fontSize: 14.5, color: "rgba(255,255,255,0.92)" }}>About</div>
                <button
                  onClick={closeInfo}
                  type="button"
                  aria-label="Close"
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.92)",
                    padding: "8px 10px",
                    fontWeight: 900,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12.75, color: "rgba(255,255,255,0.78)", lineHeight: 1.4 }}>
                <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>
                  miniapp created by{" "}
                  <button
                    onClick={() => onHandleClick("@raspishake")}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      color: "#8ab4ff",
                      cursor: "pointer",
                      fontWeight: 950
                    }}
                    type="button"
                  >
                    @raspishake
                  </button>
                </div>

                <div style={{ marginTop: 4 }}>
                  (Raspberry Shake, S.A.,{" "}
                  <button
                    onClick={() => void safeOpenUrl(sdk, "https://raspberryshake.org")}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      color: "#8ab4ff",
                      cursor: "pointer",
                      fontWeight: 800
                    }}
                    type="button"
                  >
                    https://raspberryshake.org
                  </button>
                  )
                </div>

                <div style={{ marginTop: 8, color: "rgba(255,255,255,0.65)" }}>Updated {BUILD_DATE}</div>
              </div>

              <div style={{ marginTop: 2, fontSize: 12.75, color: "rgba(255,255,255,0.78)", lineHeight: 1.4 }}>
                <div>
                  What NFTs are we minting on Farcaster? What upcoming projects are we excited about? This miniapp is your
                  one-stop-shop for new and ongoing mints in the space.
                </div>

                <div style={{ marginTop: 10 }}>
                  <RichText text="Want to see your FC NFT collection featured here? DM @raspishake." onHandleClick={onHandleClick} />
                </div>

                <div style={{ marginTop: 10, fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>
                  <RichText text="Support the Developer: send an NFT to our Warplet. Ty" onHandleClick={onHandleClick} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => void onShareClick()}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(59,130,246,0.55)",
                    background: "rgba(59,130,246,0.95)",
                    color: "rgba(255,255,255,0.96)",
                    padding: "10px 12px",
                    fontWeight: 950,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
