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

type TabKey = string
type LinkKind = "miniapp" | "opensea"
type ResolvedLink = { url: string | null; kind: LinkKind | null }

function pickPrimaryLink(c: Collection, groupTitle: string): ResolvedLink {
  const miniappOk = Boolean(c.miniapp && c.miniapp.trim() && c.miniapp !== "N/A" && c.miniapp !== "TBA")
  const openseaOk = Boolean(c.opensea && c.opensea.trim() && c.opensea !== "N/A")

  if (groupTitle === "You missed the Boat") {
    return openseaOk ? { url: c.opensea!, kind: "opensea" } : { url: null, kind: null }
  }

  if (miniappOk) return { url: c.miniapp!, kind: "miniapp" }
  if (openseaOk) return { url: c.opensea!, kind: "opensea" }
  return { url: null, kind: null }
}

function pickSecondaryLink(c: Collection, groupTitle: string): ResolvedLink {
  const miniappOk = Boolean(c.miniapp && c.miniapp.trim() && c.miniapp !== "N/A" && c.miniapp !== "TBA")
  const openseaOk = Boolean(c.opensea && c.opensea.trim() && c.opensea !== "N/A")

  if (groupTitle === "You missed the Boat") return { url: null, kind: null }
  if (miniappOk && openseaOk) return { url: c.opensea!, kind: "opensea" }

  return { url: null, kind: null }
}

function defaultPrimaryLabel(groupTitle: string, kind: LinkKind | null, url: string | null): string {
  if (!url || !kind) return "Mint"
  if (groupTitle === "Be Early") return "Allow List"
  if (kind === "opensea") return "OpenSea"
  return "Mint"
}

function defaultSecondaryLabel(kind: LinkKind | null, url: string | null): string {
  if (!url || !kind) return ""
  if (kind === "opensea") return "OpenSea"
  return "Open"
}

function primaryLabelForCollection(c: Collection, groupTitle: string, primary: ResolvedLink): string {
  if (!primary.url || !primary.kind) return defaultPrimaryLabel(groupTitle, primary.kind, primary.url)

  const override =
    primary.kind === "miniapp"
      ? c.primaryActionLabelOverride?.miniapp
      : c.primaryActionLabelOverride?.opensea

  if (override && override.trim()) return override.trim()
  return defaultPrimaryLabel(groupTitle, primary.kind, primary.url)
}

function secondaryLabelForCollection(c: Collection, secondary: ResolvedLink): string {
  if (!secondary.url || !secondary.kind) return ""
  const override =
    secondary.kind === "miniapp"
      ? c.secondaryActionLabelOverride?.miniapp
      : c.secondaryActionLabelOverride?.opensea

  if (override && override.trim()) return override.trim()
  return defaultSecondaryLabel(secondary.kind, secondary.url)
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(groups[0]?.title ?? "NFTs")
  const [query, setQuery] = useState("")
  const [readyCalled, setReadyCalled] = useState(false)

  const fidCacheRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    ;(async () => {
      try {
        await sdk.actions.ready({ disableNativeGestures: true })
      } finally {
        setReadyCalled(true)
      }
    })()
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

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()

    const base = resolvedItems
      .filter((c: Collection) => c.id !== activeGroup.featuredId)
      .filter((c: Collection) => {
        if (!q) return true
        const creators = c.creators.join(" ")
        const hay = [c.name, c.network, c.miniapp ?? "", c.opensea ?? "", creators].join(" ").toLowerCase()
        return hay.includes(q)
      })

    // ORDER: NEW first (excluding featured), then alphabetical by name.
    base.sort((a: Collection, b: Collection) => {
      const aNew = Boolean(a.highlight)
      const bNew = Boolean(b.highlight)
      if (aNew !== bNew) return aNew ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    })

    return base
  }, [resolvedItems, query, activeGroup.featuredId])

  async function onOpenPrimary(c: Collection): Promise<void> {
    const primary = pickPrimaryLink(c, activeGroup.title)
    if (!primary.url) return
    await openMiniAppOrUrl(sdk, primary.url)
  }

  async function onOpenSecondary(c: Collection): Promise<void> {
    const secondary = pickSecondaryLink(c, activeGroup.title)
    if (!secondary.url) return
    await openMiniAppOrUrl(sdk, secondary.url)
  }

  function onHandleClick(handle: string): void {
    void viewProfileByHandle(sdk as any, handle, fidCacheRef.current)
  }

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
            0%   { box-shadow: 0 0 0 0 rgba(138,180,255,0.55); }
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
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.2 }}>NFT Season</div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>Updated Dec 22, 2037</div>
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", textAlign: "right" }}>
              <div style={{ fontWeight: 800 }}>
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
                    fontWeight: 900
                  }}
                  type="button"
                  title="Open @raspishake on Farcaster"
                >
                  @raspishake
                </button>
              </div>
              <div style={{ marginTop: 2 }}>
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
                    fontWeight: 750
                  }}
                  title="Open raspberryshake.org"
                  type="button"
                >
                  https://raspberryshake.org
                </button>
                )
              </div>
            </div>
          </div>

          <Tabs groups={groups} activeTitle={activeTab} onSelect={setActiveTab} />

          {/* Search */}
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
        </div>

        {/* Body */}
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.35 }}>
            <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{activeGroup.title}</div>
            <div style={{ marginTop: 3 }}>
              <RichText text={activeGroup.description} onHandleClick={onHandleClick} />
            </div>
          </div>

          {featured ? (() => {
            const primary = pickPrimaryLink(featured, activeGroup.title)
            const secondary = pickSecondaryLink(featured, activeGroup.title)
            const primaryLabel = primaryLabelForCollection(featured, activeGroup.title, primary)
            const secondaryLabel = secondaryLabelForCollection(featured, secondary)

            return (
              <FeaturedCard
                collection={featured}
                primaryLabel={primaryLabel}
                primaryUrl={primary.url}
                secondaryLabel={secondaryLabel}
                secondaryUrl={secondary.url}
                onOpenPrimary={c => void onOpenPrimary(c)}
                onOpenSecondary={c => void onOpenSecondary(c)}
                onHandleClick={onHandleClick}
              />
            )
          })() : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredItems.map((c: Collection) => {
              const primary = pickPrimaryLink(c, activeGroup.title)
              const secondary = pickSecondaryLink(c, activeGroup.title)

              const primaryLabel = primaryLabelForCollection(c, activeGroup.title, primary)
              const secondaryLabel = secondaryLabelForCollection(c, secondary)

              return (
                <CollectionRow
                  key={`${activeGroup.title}-${c.id}`}
                  collection={c}
                  primaryLabel={primaryLabel}
                  primaryUrl={primary.url}
                  secondaryLabel={secondaryLabel}
                  secondaryUrl={secondary.url}
                  onOpenPrimary={cc => void onOpenPrimary(cc)}
                  onOpenSecondary={cc => void onOpenSecondary(cc)}
                  onHandleClick={onHandleClick}
                />
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 14,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 12.75,
            lineHeight: 1.35
          }}
        >
          <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>It is NFT PFP PVP SZN on Farcaster!</div>
          <div style={{ marginTop: 6 }}>
            <RichText text="We are minting the NFT collections that define this cycle." onHandleClick={onHandleClick} />
          </div>
          <div style={{ marginTop: 8 }}>
            What NFTs are we minting on Farcaster? What upcoming projects are we excited about? This miniapp is your one-stop-shop for
            new and ongoing mints in the space.
          </div>
          <div style={{ marginTop: 8 }}>
            <RichText text="What are we missing? Tag @raspishake with your NFT mint miniapp." onHandleClick={onHandleClick} />
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
            {readyCalled ? "" : "Loading..."}
          </div>
        </div>
      </div>
    </div>
  )
}
