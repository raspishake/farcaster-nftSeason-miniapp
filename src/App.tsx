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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(groups[0]?.title ?? "NFTs")
  // const [query, setQuery] = useState("")
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

  // Search version (currently disabled)
  //
  // const filteredItems = useMemo(() => {
  //   const q = query.trim().toLowerCase()
  //
  //   const base = resolvedItems
  //     .filter((c: Collection) => c.id !== activeGroup.featuredId)
  //     .filter((c: Collection) => {
  //       if (!q) return true
  //       const creators = c.creators.join(" ")
  //       const hay = [c.name, c.network, c.miniapp ?? "", c.opensea ?? "", creators].join(" ").toLowerCase()
  //       return hay.includes(q)
  //     })
  //
  //   // ORDER: featured first (handled separately), NEW second, then alphabetical
  //   base.sort((a: Collection, b: Collection) => {
  //     const aNew = Boolean(a.highlight)
  //     const bNew = Boolean(b.highlight)
  //     if (aNew !== bNew) return aNew ? -1 : 1
  //     return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  //   })
  //
  //   return base
  // }, [resolvedItems, query, activeGroup.featuredId])

  // No-search version (active)
  const filteredItems: Collection[] = useMemo(() => {
    const base = resolvedItems.filter((c: Collection) => c.id !== activeGroup.featuredId)

    // ORDER: featured first (handled separately), NEW second, then alphabetical
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

  const featuredPrimaryLabel = featured ? primaryLabelForCollection(featured, activeGroup.title, featuredPrimarySource) : ""
  const featuredSecondaryLabel = featured ? secondaryLabelForCollection(featured, featuredSecondarySource) : ""

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
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.2 }}>NFT Season</div>
	      <div style={{ marginTop: 4, fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>
                Updated {BUILD_DATE}
              </div>
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
              onOpenPrimary={c => void onOpenPrimary(c)}
              onOpenSecondary={c => void onOpenSecondary(c)}
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
            What NFTs are we minting on Farcaster? What upcoming projects are we excited about? This miniapp is your
            one-stop-shop for new and ongoing mints in the space.
          </div>
          <div style={{ marginTop: 8 }}>
            <RichText text="Want to see your FC NFT collection featured here? DM @raspishake." onHandleClick={onHandleClick} />
          </div>
          <div style={{ marginTop: 8 }}>
	    <strong>
             <em>
               <RichText
                 text="Support the Developer: send an NFT to our Warplet. Ty"
                 onHandleClick={onHandleClick}
               />
             </em>
           </strong>
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
            {readyCalled ? "" : "Loading..."}
          </div>
        </div>
      </div>
    </div>
  )
}
