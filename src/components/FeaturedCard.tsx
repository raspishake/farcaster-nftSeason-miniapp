// src/components/FeaturedCard.tsx
import React from "react"
import type { Collection } from "../data/collections"

const featuredPulseStyle: React.CSSProperties = {
  animation: "featuredPulseGlow 2.4s ease-in-out infinite"
}

export function FeaturedCard({
  collection,
  primaryLabel,
  primaryUrl,
  secondaryUrl,
  onOpenPrimary,
  onOpenSecondary,
  onHandleClick
}: {
  collection: Collection
  primaryLabel: string
  primaryUrl: string | null
  secondaryUrl: string | null
  onOpenPrimary: (c: Collection) => void
  onOpenSecondary: (c: Collection) => void
  onHandleClick: (handle: string) => void
}) {
  const featured = collection

  return (
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
                <React.Fragment key={`${featured.id}-cr-${i}`}>
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
                    type="button"
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
          {primaryUrl ? (
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
              type="button"
            >
              {primaryLabel}
            </button>
          ) : null}

          {secondaryUrl ? (
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
              type="button"
            >
              OpenSea
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
