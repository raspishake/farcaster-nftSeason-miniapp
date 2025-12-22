// src/components/CollectionRow.tsx
import React from "react"
import type { Collection } from "../data/collections"

export function CollectionRow({
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
  const c = collection

  return (
    <div
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
              <React.Fragment key={`${c.id}-creator-${i}`}>
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
            type="button"
          >
            {primaryLabel}
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
            type="button"
          >
            OpenSea
          </button>
        ) : null}
      </div>
    </div>
  )
}
