import React, { useEffect, useMemo, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { groups, type Group, type Collection } from "./data/collections"

const UPDATED_TEXT = "Updated Dec 18, 2025"

function inMiniApp(): boolean {
  try {
    return !!sdk?.actions
  } catch {
    return false
  }
}

async function openUrl(url: string) {
  if (!url) return
  if (inMiniApp()) {
    await sdk.actions.openUrl(url)
    return
  }
  window.open(url, "_blank", "noopener,noreferrer")
}

async function openFarcasterProfile(handle: string) {
  const h = handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`
  const uri = `farcaster://${h}`
  if (inMiniApp()) {
    await sdk.actions.openUrl(uri)
    return
  }
  await openUrl(`https://warpcast.com/${h.replace(/^@/, "")}`)
}

function normalize(s: string) {
  return (s || "").toLowerCase().trim()
}

function normalizeHandles(creators: string[] | undefined): string[] {
  const list = creators ?? []
  return list
    .map(x => (x || "").trim())
    .filter(Boolean)
    .map(x => (x.startsWith("@") ? x : `@${x}`))
}

function primaryLabel(groupTitle: string) {
  return groupTitle === "Be Early" ? "Allow List" : "Mint"
}

function actionLabel(groupTitle: string) {
  return groupTitle === "You missed the Boat" ? "OpenSea" : primaryLabel(groupTitle)
}

function bestPrimaryUrl(c: Collection, groupTitle: string) {
  if (groupTitle === "You missed the Boat") {
    if (c.opensea && normalize(c.opensea) !== "n/a") return c.opensea
    return ""
  }
  if (c.miniapp && normalize(c.miniapp) !== "tba" && normalize(c.miniapp) !== "n/a") return c.miniapp
  if (c.opensea && normalize(c.opensea) !== "n/a") return c.opensea
  return ""
}

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.14)"
      }}
    >
      {text}
    </span>
  )
}

function FeaturedBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.26)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06)"
      }}
    >
      ✨ Featured
    </span>
  )
}

function Tile({
  c,
  groupTitle,
  featured
}: {
  c: Collection
  groupTitle: string
  featured: boolean
}) {
  const handles = normalizeHandles(c.creators)
  const primaryUrl = bestPrimaryUrl(c, groupTitle)

  const hasOpenSea = Boolean(c.opensea && normalize(c.opensea) !== "n/a")
  const hasMiniapp = Boolean(c.miniapp && normalize(c.miniapp) !== "n/a" && normalize(c.miniapp) !== "tba")

  const tileStyle: React.CSSProperties = featured
    ? {
        border: "1px solid rgba(255,255,255,0.36)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 18px 50px rgba(0,0,0,0.60)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))"
      }
    : {
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.04)",
        background: "rgba(255,255,255,0.05)"
      }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr auto",
        gap: 14,
        padding: featured ? 16 : 14,
        borderRadius: 16,
        ...tileStyle
      }}
    >
      <img
        src={c.thumbnail}
        alt={`${c.name} thumbnail`}
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          objectFit: "cover",
          border: featured ? "1px solid rgba(255,255,255,0.30)" : "1px solid rgba(255,255,255,0.18)"
        }}
      />

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10
          }}
        >
          <div
            style={{
              fontSize: featured ? 17 : 16,
              fontWeight: 900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0
            }}
            title={c.name}
          >
            {c.name}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {c.featured ? <FeaturedBadge /> : null}
            <Badge text={c.network} />
          </div>
        </div>

        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {handles.length ? (
            <>
              <span style={{ opacity: 0.75, fontSize: 13 }}>by</span>
              {handles.map(h => (
                <button
                  key={h}
                  onClick={() => openFarcasterProfile(h)}
                  style={{
                    appearance: "none",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.92)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                  title={`Open ${h} on Farcaster`}
                >
                  {h}
                </button>
              ))}
            </>
          ) : (
            <span style={{ opacity: 0.70, fontSize: 13 }}>by N/A</span>
          )}
        </div>

        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {hasMiniapp ? (
            <button
              onClick={() => openUrl(c.miniapp!)}
              style={{
                appearance: "none",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent",
                color: "rgba(255,255,255,0.80)",
                borderRadius: 12,
                padding: "8px 10px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer"
              }}
              title={c.miniapp}
            >
              Mini App ↗
            </button>
          ) : null}

          {hasOpenSea ? (
            <button
              onClick={() => openUrl(c.opensea!)}
              style={{
                appearance: "none",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent",
                color: "rgba(255,255,255,0.80)",
                borderRadius: 12,
                padding: "8px 10px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer"
              }}
              title={c.opensea}
            >
              OpenSea ↗
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          disabled={!primaryUrl}
          onClick={() => primaryUrl && openUrl(primaryUrl)}
          style={{
            appearance: "none",
            border: "1px solid rgba(255,255,255,0.18)",
            background: primaryUrl ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
            color: primaryUrl ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.35)",
            borderRadius: 14,
            padding: featured ? "12px 14px" : "10px 12px",
            fontSize: 13,
            fontWeight: 900,
            cursor: primaryUrl ? "pointer" : "not-allowed",
            minWidth: 110
          }}
          title={primaryUrl || "No link set"}
        >
          {actionLabel(groupTitle)}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [query, setQuery] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        if (inMiniApp()) await sdk.actions.ready()
      } catch {
        // ignore
      }
    })()
  }, [])

  const activeGroup: Group = groups[Math.min(Math.max(activeIdx, 0), groups.length - 1)]
  const featured = useMemo(() => activeGroup.items.find(i => i.featured) ?? null, [activeGroup])

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return activeGroup.items
    return activeGroup.items.filter(c => {
      const creators = normalizeHandles(c.creators).join(" ")
      const hay = [c.name, c.network, creators, c.miniapp ?? "", c.opensea ?? ""].join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [activeGroup, query])

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% 0%, rgba(255,255,255,0.08), transparent 55%), #0b0d12",
        color: "rgba(255,255,255,0.92)",
        padding: 18,
        boxSizing: "border-box"
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 0.4 }}>NFT Season</div>
            <div style={{ marginTop: 8, opacity: 0.78, fontSize: 14, lineHeight: 1.35 }}>
              IT IS NFT SEASON ON FC! @opensea is either late to the party or completely MIA but we are minting the
              collections that define this cycle.
            </div>
            <div style={{ marginTop: 8, opacity: 0.70, fontSize: 13 }}>
              What NFTs are we minting? What upcoming projects are we excited about? This miniapp is your one-stop-shop
              for new and ongoing mints in the space.
            </div>
            <div style={{ marginTop: 8, opacity: 0.70, fontSize: 13 }}>
              What are we missing? Tag @raspishake with your NFT mint miniapp. You are not minting via a miniapp on
              Farcaster? We are not interested, Get in here!
            </div>
          </div>

          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <div style={{ opacity: 0.70, fontSize: 13 }}>{UPDATED_TEXT}</div>
            <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
              miniapp created by @raspishake (Raspberry Shake, S.A.,{" "}
              <button
                onClick={() => openUrl("https://raspberryshake.org")}
                style={{
                  appearance: "none",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  margin: 0,
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: 900,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 3
                }}
                title="Open raspberryshake.org"
              >
                https://raspberryshake.org
              </button>
              )
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)"
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {groups.map((g, idx) => {
              const active = idx === activeIdx
              return (
                <button
                  key={g.title}
                  onClick={() => setActiveIdx(idx)}
                  style={{
                    appearance: "none",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: active ? "rgba(255,255,255,0.12)" : "transparent",
                    color: "rgba(255,255,255,0.92)",
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: "pointer"
                  }}
                >
                  {g.title}
                </button>
              )
            })}
          </div>

          <div style={{ flex: 1, minWidth: 0 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ opacity: 0.70, fontSize: 13, fontWeight: 900 }}>Search</div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="collection, creator, network..."
              style={{
                width: "min(520px, 100%)",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(255,255,255,0.92)",
                padding: "10px 12px",
                outline: "none",
                fontSize: 14
              }}
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                style={{
                  appearance: "none",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.80)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{activeGroup.title}</div>
          <div style={{ marginTop: 6, opacity: 0.72, fontSize: 14 }}>{activeGroup.description}</div>
        </div>

        {featured ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <FeaturedBadge />
              <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 13 }}>highlighted in {activeGroup.title}</div>
            </div>
            <Tile c={featured} groupTitle={activeGroup.title} featured={true} />
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {filtered.map(c => (
            <Tile key={`${activeGroup.title}:${c.name}`} c={c} groupTitle={activeGroup.title} featured={false} />
          ))}
        </div>

        <div style={{ height: 18 }} />
      </div>
    </div>
  )
}
