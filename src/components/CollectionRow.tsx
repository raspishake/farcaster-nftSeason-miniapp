// src/components/CollectionRow.tsx
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

export function CollectionRow({
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
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        background: "rgba(0,0,0,0.22)",
        padding: 12,
        display: "flex",
        gap: 12,
        alignItems: "center"
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
          borderRadius: 12,
          objectFit: "cover",
          border: "1px solid rgba(255,255,255,0.12)",
          flex: "0 0 auto"
        }}
      />

      {/* Content column takes all remaining width */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Line 1: Name (left) + Labels (right), same line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontWeight: 900,
              fontSize: 14.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
            title={collection.name}
          >
            {collection.name}
          </div>

          {/* Labels are right-justified by living at the end of the flex row */}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flex: "0 0 auto" }}>
            {collection.highlight ? (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 900,
                  color: "#8ab4ff",
                  border: "1px solid rgba(138,180,255,0.55)",
                  padding: "2px 6px",
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

        {/* Line 2: creators */}
        <div style={{ marginTop: 3, fontSize: 12.25, color: "rgba(255,255,255,0.72)", minWidth: 0 }}>
          <RichText text={collection.creators.join(" ")} onHandleClick={onHandleClick} />
        </div>

        {/* Line 3: network */}
        <div style={{ marginTop: 4, fontSize: 11.5, color: "rgba(255,255,255,0.55)", minWidth: 0 }}>
          {collection.network}
        </div>

        {/* Line 4: buttons, right-justified, side-by-side, below creators/network */}
        {(showPrimary || showSecondary) ? (
          <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {showSecondary ? (
              <button
                type="button"
                onClick={() => onOpenSecondary(collection)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.90)",
                  padding: "10px 10px",
                  fontWeight: 850,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0
                }}
                title={secondaryUrl ?? undefined}
              >
                {resolvedSecondaryLabel}
              </button>
            ) : null}

            {showPrimary ? (
              <button
                type="button"
                onClick={() => onOpenPrimary(collection)}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(138,180,255,0.45)",
                  background: "rgba(138,180,255,0.16)",
                  color: "rgba(255,255,255,0.95)",
                  padding: "10px 12px",
                  fontWeight: 950,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0
                }}
                title={primaryUrl ?? undefined}
              >
                {primaryLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
