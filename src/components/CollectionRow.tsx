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
  const highlightStyle = collection.highlight
    ? {
        boxShadow: "0 0 0 1px rgba(138,180,255,0.35)",
        animation: "featuredPulseGlow 2.4s ease-in-out infinite"
      }
    : {}

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        padding: 12,
        display: "flex",
        gap: 12,
        alignItems: "center",
        ...highlightStyle
      }}
    >
      <img
        src={collection.thumbnail}
        alt={collection.name}
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          objectFit: "cover"
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>{collection.name}</div>

          {collection.highlight ? (
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(138,180,255,0.14)",
                border: "1px solid rgba(138,180,255,0.30)",
                color: "#cfe0ff",
                fontWeight: 900
              }}
            >
              NEW
            </span>
          ) : null}
        </div>

        <div style={{ fontSize: 13, opacity: 0.9 }}>
          {collection.creators.map((cr, i) => (
            <span key={cr}>
              <button
                type="button"
                onClick={() => onHandleClick(cr)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  color: "#8ab4ff",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                {cr}
              </button>
              {i < collection.creators.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {primaryUrl ? (
          <button
            type="button"
            onClick={() => onOpenPrimary(collection)}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            {primaryLabel}
          </button>
        ) : null}

        {secondaryUrl ? (
          <button
            type="button"
            onClick={() => onOpenSecondary(collection)}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.04)",
              color: "#cfd8ff",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            OpenSea
          </button>
        ) : null}
      </div>
    </div>
  )
}
