// src/components/CollectionRow.tsx
import type { Collection } from "../data/collections"
import { RichText } from "./RichText"

type Props = {
  collection: Collection
  primaryLabel: string
  primaryUrl: string | null
  secondaryUrl: string | null
  onOpenPrimary: (c: Collection) => void
  onOpenSecondary: (c: Collection) => void
  onHandleClick: (handle: string) => void
}

const ANIM_CSS = `
@keyframes newPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(90,160,255,0.0);
    background-color: rgba(90,160,255,0.04);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(90,160,255,0.40);
    background-color: rgba(90,160,255,0.12);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(90,160,255,0.0);
    background-color: rgba(90,160,255,0.04);
  }
}

@keyframes newBadgePulse {
  0%, 100% { opacity: 0.65; transform: translateY(0px); }
  50% { opacity: 1; transform: translateY(-0.5px); }
}
`

export function CollectionRow({
  collection,
  primaryLabel,
  primaryUrl,
  secondaryUrl,
  onOpenPrimary,
  onOpenSecondary,
  onHandleClick
}: Props) {
  const canPrimary = Boolean(primaryUrl && primaryUrl.trim())
  const canSecondary = Boolean(secondaryUrl && secondaryUrl.trim())

  const isNew = Boolean((collection as any).highlight)

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 12,
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        ...(isNew
          ? {
              borderColor: "rgba(90,160,255,0.85)",
              animation: "newPulse 1.6s ease-in-out infinite"
            }
          : null)
      }}
    >
      <style>{ANIM_CSS}</style>

      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
        <img
          src={collection.thumbnail}
          alt=""
          width={44}
          height={44}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            objectFit: "cover",
            border: "1px solid rgba(255,255,255,0.10)",
            flex: "0 0 auto"
          }}
        />

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 14.5,
                color: "rgba(255,255,255,0.92)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
              title={collection.name}
            >
              {collection.name}
            </div>

            {isNew ? (
              <div
                style={{
                  background: "#5aa0ff",
                  color: "#0b0f14",
                  fontSize: 10,
                  fontWeight: 950,
                  padding: "2px 7px",
                  borderRadius: 7,
                  letterSpacing: 0.2,
                  animation: "newBadgePulse 1.1s ease-in-out infinite",
                  flex: "0 0 auto"
                }}
                title="New addition"
              >
                NEW
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 3, fontSize: 12.25, color: "rgba(255,255,255,0.70)" }}>
            <RichText text={`${collection.network}`} onHandleClick={onHandleClick} />
          </div>

          <div style={{ marginTop: 5, fontSize: 12.25, color: "rgba(255,255,255,0.70)" }}>
            <RichText text={collection.creators.join(", ")} onHandleClick={onHandleClick} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
        <button
          type="button"
          onClick={() => onOpenPrimary(collection)}
          disabled={!canPrimary}
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            padding: "10px 12px",
            background: canPrimary ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
            color: canPrimary ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
            cursor: canPrimary ? "pointer" : "not-allowed",
            fontWeight: 900,
            fontSize: 12.5
          }}
          title={canPrimary ? primaryUrl ?? "" : "No link available"}
        >
          {primaryLabel}
        </button>

        {canSecondary ? (
          <button
            type="button"
            onClick={() => onOpenSecondary(collection)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.90)",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12.5
            }}
            title={secondaryUrl ?? ""}
          >
            OpenSea
          </button>
        ) : null}
      </div>
    </div>
  )
}
