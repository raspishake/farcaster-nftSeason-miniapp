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

function looksLikeOpenSea(url: string): boolean {
  return /opensea\.io/i.test(url)
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

  // Featured overrides New
  const showNewBadge = false

  return (
    <div
      style={{
        border: "1px solid rgba(138,180,255,0.30)",
        borderRadius: 16,
        padding: 12,
        background: "rgba(138,180,255,0.06)"
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <img
          src={collection.thumbnail}
          alt={collection.name}
          width={110}
          height={110}
          style={{
            width: 110,
            height: 110,
            borderRadius: 12,
            objectFit: "cover",
            border: "1px solid rgba(255,255,255,0.14)",
            flex: "0 0 auto"
          }}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Title + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontWeight: 950,
                fontSize: 15.5,
                color: "rgba(255,255,255,0.92)"
              }}
            >
              {collection.name}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
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
              >
                FEATURED
              </span>

              {showNewBadge ? (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 950,
                    color: "#8ab4ff",
                    border: "1px solid rgba(138,180,255,0.75)",
                    background: "rgba(138,180,255,0.10)",
                    padding: "2px 7px",
                    borderRadius: 999,
                    whiteSpace: "nowrap"
                  }}
                >
                  NEW
                </span>
              ) : null}
            </div>
          </div>

          {/* Creators */}
          <div style={{ marginTop: 6, fontSize: 12.75, color: "rgba(255,255,255,0.78)" }}>
            <RichText text={collection.creators.join(" ")} onHandleClick={onHandleClick} />
          </div>

          {/* Network */}
          <div style={{ marginTop: 4, fontSize: 11.75, color: "rgba(255,255,255,0.60)" }}>
            {collection.network}
          </div>

          {/* Buttons – MATCH CollectionRow sizing */}
          {showPrimary || showSecondary ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {showSecondary ? (
                <button
                  type="button"
                  onClick={() => onOpenSecondary(collection)}
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.90)",
                    padding: "8px 10px",
                    fontWeight: 850,
                    cursor: "pointer"
                  }}
                >
                  {resolvedSecondaryLabel}
                </button>
              ) : null}

              {showPrimary ? (
                <button
                  type="button"
                  onClick={() => onOpenPrimary(collection)}
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(138,180,255,0.55)",
                    background: "rgba(138,180,255,0.20)",
                    color: "rgba(255,255,255,0.92)",
                    padding: "8px 10px",
                    fontWeight: 950,
                    cursor: "pointer"
                  }}
                >
                  {primaryLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
