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
        width={46}
        height={46}
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          objectFit: "cover",
          border: "1px solid rgba(255,255,255,0.12)",
          flex: "0 0 auto"
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {collection.name}
          </div>

          {collection.highlight ? (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 900,
                color: "#8ab4ff",
                border: "1px solid rgba(138,180,255,0.55)",
                padding: "2px 6px",
                borderRadius: 999,
                animation: "featuredPulseGlow 1.2s infinite"
              }}
              title="New"
            >
              NEW
            </span>
          ) : null}
        </div>

        <div style={{ marginTop: 3, fontSize: 12.25, color: "rgba(255,255,255,0.72)" }}>
          <RichText text={collection.creators.join(" ")} onHandleClick={onHandleClick} />
        </div>

        <div style={{ marginTop: 4, fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>{collection.network}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
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
              whiteSpace: "nowrap"
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
              whiteSpace: "nowrap"
            }}
            title={primaryUrl ?? undefined}
          >
            {primaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
