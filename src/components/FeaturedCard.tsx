// src/components/FeaturedCard.tsx
import type { Collection } from "../data/collections"
import { RichText } from "./RichText"

type Props = {
  collection: Collection

  primaryLabel: string
  primaryUrl: string | null

  // Optional second button (usually OpenSea)
  secondaryLabel?: string
  secondaryUrl: string | null

  onOpenPrimary: (c: Collection) => void
  onOpenSecondary: (c: Collection) => void
  onHandleClick: (handle: string) => void
}

function looksLikeOpenSea(url: string): boolean {
  return url.toLowerCase().includes("opensea.io")
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

  const resolvedSecondaryLabel =
    (secondaryLabel && secondaryLabel.trim()) ||
    (secondaryUrl ? (looksLikeOpenSea(secondaryUrl) ? "OpenSea" : "Open") : "")

  return (
    <div
      style={{
        border: "1px solid rgba(138,180,255,0.30)",
        borderRadius: 16,
        background: "rgba(138,180,255,0.06)",
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "flex-start"
      }}
    >
      <img
        src={collection.thumbnail}
        alt={collection.name}
        width={80}
        height={80}
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          objectFit: "cover",
          border: "1px solid rgba(255,255,255,0.14)",
          flex: "0 0 auto"
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: name left, badges hard-right */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minWidth: 0 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontWeight: 950,
              fontSize: 16,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
            title={collection.name}
          >
            {collection.name}
          </div>

          <div
            style={{
              marginLeft: "auto",
              flex: "0 0 auto",
              display: "flex",
              gap: 6,
              justifyContent: "flex-end",
              alignItems: "center",
              whiteSpace: "nowrap"
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 950,
                color: "#8ab4ff",
                border: "1px solid rgba(138,180,255,0.75)",
                background: "rgba(138,180,255,0.12)",
                padding: "2px 7px",
                borderRadius: 999,
                animation: "featuredPulseGlow 3s infinite",
                whiteSpace: "nowrap"
              }}
              title="Featured"
            >
              FEATURED
            </span>

            {collection.highlight ? (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 950,
                  color: "#8ab4ff",
                  border: "1px solid rgba(138,180,255,0.75)",
                  background: "rgba(138,180,255,0.10)",
                  padding: "2px 7px",
                  borderRadius: 999,
                  animation: "featuredPulseGlow 3s infinite",
                  whiteSpace: "nowrap"
                }}
                title="New"
              >
                NEW
              </span>
            ) : null}
          </div>
        </div>

        {/* Row 2: meta left, buttons hard-right, side-by-side */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.75, color: "rgba(255,255,255,0.78)" }}>
              <RichText text={collection.creators.join(" ")} onHandleClick={onHandleClick} />
            </div>
            <div style={{ marginTop: 4, fontSize: 11.75, color: "rgba(255,255,255,0.60)" }}>{collection.network}</div>
          </div>

          <div
            style={{
              marginLeft: "auto",
              flex: "0 0 auto",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              alignItems: "center",
              whiteSpace: "nowrap"
            }}
          >
            {showPrimary ? (
              <button
                type="button"
                onClick={() => onOpenPrimary(collection)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(138,180,255,0.50)",
                  background: "rgba(138,180,255,0.18)",
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

            {showSecondary ? (
              <button
                type="button"
                onClick={() => onOpenSecondary(collection)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  padding: "10px 10px",
                  fontWeight: 850,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
                title={secondaryUrl ?? undefined}
              >
                {resolvedSecondaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
