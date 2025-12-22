// src/components/FeaturedCard.tsx
import type { Collection } from "../data/collections"
import { RichText } from "./RichText"

type Props = {
  collection: Collection

  primaryLabel: string
  primaryUrl: string | null

  secondaryLabel?: string
  secondaryUrl: string | null

  onOpenPrimary: (c: Collection) => void
  onOpenSecondary: (c: Collection) => void
  onHandleClick: (handle: string) => void
}

export function FeaturedCard({
  collection,
  primaryLabel,
  primaryUrl,
  secondaryLabel,
  secondaryUrl,
  onOpenPrimary,
  onOpenSecondary,
  onHandleClick
}: Props) {
  const showPrimary = Boolean(primaryUrl)
  const showSecondary = Boolean(secondaryUrl)

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(138,180,255,0.35)",
        background: "rgba(138,180,255,0.08)",
        padding: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src={collection.thumbnail}
          alt={collection.name}
          width={56}
          height={56}
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            objectFit: "cover",
            border: "1px solid rgba(255,255,255,0.14)",
            flex: "0 0 auto"
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {collection.name}
            </div>

            <span
              style={{
                fontSize: 10.5,
                fontWeight: 950,
                color: "#8ab4ff",
                border: "1px solid rgba(138,180,255,0.55)",
                padding: "2px 8px",
                borderRadius: 999,
                animation: "featuredPulseGlow 1.1s infinite"
              }}
              title="Featured"
            >
              FEATURED
            </span>
          </div>

          <div style={{ marginTop: 4, fontSize: 12.25, color: "rgba(255,255,255,0.78)" }}>
            <RichText text={collection.creators.join(" ")} onHandleClick={onHandleClick} />
          </div>

          <div style={{ marginTop: 4, fontSize: 11.5, color: "rgba(255,255,255,0.58)" }}>{collection.network}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          {showSecondary ? (
            <button
              type="button"
              onClick={() => onOpenSecondary(collection)}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.22)",
                color: "rgba(255,255,255,0.92)",
                padding: "10px 10px",
                fontWeight: 900,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
              title={secondaryUrl ?? undefined}
            >
              {secondaryLabel && secondaryLabel.trim() ? secondaryLabel.trim() : "Open"}
            </button>
          ) : null}

          {showPrimary ? (
            <button
              type="button"
              onClick={() => onOpenPrimary(collection)}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(138,180,255,0.55)",
                background: "rgba(138,180,255,0.22)",
                color: "rgba(255,255,255,0.96)",
                padding: "10px 12px",
                fontWeight: 950,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
              title={primaryUrl ?? undefined}
            >
              {primaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
