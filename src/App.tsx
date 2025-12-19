import React, { useEffect, useMemo, useRef, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { groups, type Collection, type Group } from "./data/collections"

type TabKey = string

function normalizeHandle(handle: string): string {
  const h = handle.trim()
  return h.startsWith("@") ? h.slice(1) : h
}

function isProbablyHandleToken(token: string): boolean {
  return /^@[a-z0-9][a-z0-9\-_.]{0,63}$/i.test(token)
}

async function openUrl(url: string): Promise<void> {
  await sdk.actions.openUrl(url)
}

async function resolveFidByUsername(username: string): Promise<number | null> {
  const u = normalizeHandle(username)
  const endpoint = `https://api.warpcast.com/v2/user-by-username?username=${encodeURIComponent(u)}`
  const res = await fetch(endpoint, { method: "GET" })
  if (!res.ok) return null
  const data = (await res.json()) as any
  const fid = data?.result?.user?.fid ?? data?.user?.fid ?? data?.result?.fid ?? null
  return typeof fid === "number" ? fid : null
}

async function viewProfileByHandle(handle: string, fidCache: Map<string, number>): Promise<void> {
  const h = normalizeHandle(handle).toLowerCase()

  const cached = fidCache.get(h)
  if (typeof cached === "number") {
    await sdk.actions.viewProfile({ fid: cached })
    return
  }

  const fid = await resolveFidByUsername(h)
  if (typeof fid === "number") {
    fidCache.set(h, fid)
    await sdk.actions.viewProfile({ fid })
    return
  }

  await openUrl(`https://warpcast.com/${encodeURIComponent(h)}`)
}

function RichText({
  text,
  onHandleClick,
  linkColor = "#8ab4ff"
}: {
  text: string
  onHandleClick: (handle: string) => void
  linkColor?: string
}) {
  const parts = useMemo(() => text.split(/(\s+)/), [text])

  return (
    <>
      {parts.map((p, idx) => {
        if (!p.trim()) return <React.Fragment key={idx}>{p}</React.Fragment>

        const stripped = p.replace(/[),.;:!?]+$/g, "")
        if (isProbablyHandleToken(stripped)) {
          return (
            <button
              key={idx}
              onClick={() => onHandleClick(stripped)}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                margin: 0,
                color: linkColor,
                cursor: "pointer",
                fontWeight: 700
              }}
              title={`Open @${normalizeHandle(stripped)} on Farcaster`}
            >
              {p}
            </button>
          )
        }

        return <React.Fragment key={idx}>{p}</React.Fragment>
      })}
    </>
  )
}

function primaryActionLabel(groupTitle: string): string {
  return groupTitle === "Be Early" ? "Allow List" : "Mint"
}

function pickFeatured(group: Group): Collection | null {
  const f = group.items.find((c: Collection) => c.featured)
  return f ?? null
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

const featuredPulseStyle: React.CSSProperties = {
  animation: "featuredPulseGlow 2.4s ease-in-out infinite"
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
  const featured = useMemo(() => pickFeatured(activeGroup), [activeGroup])

  // IMPORTANT: featured should appear ONLY at the top, not in the list.
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = activeGroup.items.filter((c: Collection) => !c.featured)

    if (!q) return base

    return base.filter((c: Collection) => {
      const creators = c.creators.join(" ")
      const hay = [c.name, c.network, c.miniapp ?? "", c.opensea ?? "", creators].join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [activeGroup, query])

  async function onOpenPrimary(c: Collection): Promise<void> {
    const url = collectionPrimaryUrl(c, activeGroup.title)
    if (!url) return
    await openUrl(url)
  }

  async function onOpenSecondary(c: Collection): Promise<void> {
    const url = collectionSecondaryUrl(c, activeGroup.title)
    if (!url) return
    await openUrl(url)
  }

  async function onHandleClick(handle: string): Promise<void> {
    await viewProfileByHandle(handle, fidCacheRef.current)
  }

  return (
    <div
      style={{
        width: "100vw",
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
            0%   { box-shadow: 0 0 0 0 rgba(138,180,255,0.45); }
            70%  { box-shadow: 0 0 0 6px rgba(138,180,255,0); }
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
                Updated December 18, 2037
              </div>
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", textAlign: "right" }}>
              <div style={{ fontWeight: 800 }}>miniapp created by @raspishake</div>
              <div style={{ marginTop: 2 }}>
                (Raspberry Shake, S.A.,{" "}
                <button
                  onClick={() => openUrl("https://raspberryshake.org")}
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
                >
                  https://raspberryshake.org
                </button>
                )
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ marginTop: 12 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${activeGroup.title}...`}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.30)",
                color: "rgba(255,255,255,0.92)",
                padding: "10px 12px",
                outline: "none"
              }}
            />
          </div>

          {/* Tabs */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {groups.map((g: Group) => {
              const active = g.title === activeTab
              return (
                <button
                  key={g.title}
                  onClick={() => setActiveTab(g.title)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: active ? "rgba(138,180,255,0.18)" : "rgba(255,255,255,0.06)",
                    color: active ? "#eaf1ff" : "rgba(255,255,255,0.80)",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 12.5
                  }}
                >
                  {g.title}
                </button>
              )
            })}
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

          {/* Featured (ONLY here, never in list) */}
          {featured ? (
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.25)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                borderRadius: 16,
                padding: 14,
                boxShadow: "0 0 0 1px rgba(138,180,255,0.25), 0 12px 30px rgba(0,0,0,0.45)"
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <img
                  src={featured.thumbnail}
                  alt={`${featured.name} thumbnail`}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    objectFit: "cover",
                    border: "1px solid rgba(255,255,255,0.15)",
                    flex: "0 0 auto"
                  }}
                />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.2 }}>{featured.name}</div>
                    <span
                      style={{
                        ...featuredPulseStyle,
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "rgba(138,180,255,0.18)",
                        border: "1px solid rgba(138,180,255,0.35)",
                        color: "#cfe0ff",
                        fontWeight: 900
                      }}
                    >
                      FEATURED
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.75)",
                        fontWeight: 800
                      }}
                    >
                      {featured.network}
                    </span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12.5, color: "rgba(255,255,255,0.78)" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Creators: </span>
                    {featured.creators.length ? (
                      featured.creators.map((cr: string, i: number) => (
                        <React.Fragment key={`${featured.name}-cr-${i}`}>
                          {i > 0 ? ", " : ""}
                          <button
                            onClick={() => onHandleClick(cr)}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 0,
                              margin: 0,
                              color: "#8ab4ff",
                              cursor: "pointer",
                              fontWeight: 800
                            }}
                          >
                            {cr}
                          </button>
                        </React.Fragment>
                      ))
                    ) : (
                      <span>N/A</span>
                    )}
                  </div>
                </div>

                <div style={{ marginLeft: "auto", flex: "0 0 auto", display: "flex", gap: 8 }}>
                  {collectionPrimaryUrl(featured, activeGroup.title) ? (
                    <button
                      onClick={() => onOpenPrimary(featured)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(138,180,255,0.16)",
                        color: "#eaf1ff",
                        fontWeight: 900,
                        cursor: "pointer"
                      }}
                    >
                      {primaryActionLabel(activeGroup.title)}
                    </button>
                  ) : null}

                  {collectionSecondaryUrl(featured, activeGroup.title) ? (
                    <button
                      onClick={() => onOpenSecondary(featured)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.86)",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      OpenSea
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredItems.map((c: Collection) => {
              const primaryUrl = collectionPrimaryUrl(c, activeGroup.title)
              const secondaryUrl = collectionSecondaryUrl(c, activeGroup.title)

              return (
                <div
                  key={`${activeGroup.title}-${c.name}`}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 12,
                    display: "flex",
                    gap: 12,
                    alignItems: "center"
                  }}
                >
                  <img
                    src={c.thumbnail}
                    alt={`${c.name} thumbnail`}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      objectFit: "cover",
                      border: "1px solid rgba(255,255,255,0.12)",
                      flex: "0 0 auto"
                    }}
                  />

                  <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 15.5, fontWeight: 900, letterSpacing: 0.1 }}>{c.name}</div>
                      <span
                        style={{
                          fontSize: 10.5,
                          padding: "3px 7px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          color: "rgba(255,255,255,0.70)",
                          fontWeight: 800
                        }}
                      >
                        {c.network}
                      </span>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12.25, color: "rgba(255,255,255,0.78)" }}>
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>Creators: </span>
                      {c.creators.length ? (
                        c.creators.map((cr: string, i: number) => (
                          <React.Fragment key={`${c.name}-creator-${i}`}>
                            {i > 0 ? ", " : ""}
                            <button
                              onClick={() => onHandleClick(cr)}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 0,
                                margin: 0,
                                color: "#8ab4ff",
                                cursor: "pointer",
                                fontWeight: 800
                              }}
                            >
                              {cr}
                            </button>
                          </React.Fragment>
                        ))
                      ) : (
                        <span>N/A</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                    {primaryUrl ? (
                      <button
                        onClick={() => onOpenPrimary(c)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.16)",
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.92)",
                          fontWeight: 900,
                          cursor: "pointer",
                          minWidth: 92
                        }}
                      >
                        {primaryActionLabel(activeGroup.title)}
                      </button>
                    ) : null}

                    {secondaryUrl ? (
                      <button
                        onClick={() => onOpenSecondary(c)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.84)",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        OpenSea
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer messaging */}
        <div
          style={{
            padding: 14,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 12.75,
            lineHeight: 1.35
          }}
        >
          <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>IT IS NFT SEASON ON FC!</div>
          <div style={{ marginTop: 6 }}>
            <RichText
              text="@opensea is either late to the party or completely MIA but we are minting the collections that define this cycle."
              onHandleClick={onHandleClick}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            What NFTs are we minting? What upcoming projects are we excited about? This miniapp is your one-stop-shop for
            new and ongoing mints in the space.
          </div>
          <div style={{ marginTop: 8 }}>
            <RichText
              text="What are we missing? Tag @raspishake with your NFT mint miniapp. You are not minting via a miniapp on Farcaster? We are not interested, get in here!"
              onHandleClick={onHandleClick}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
            {readyCalled ? "" : "Loading..."}
          </div>
        </div>
      </div>
    </div>
  )
}
