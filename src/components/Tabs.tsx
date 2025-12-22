// src/components/Tabs.tsx
import type { Group } from "../data/collections"

export function Tabs({
  groups,
  activeTitle,
  onSelect
}: {
  groups: Group[]
  activeTitle: string
  onSelect: (title: string) => void
}) {
  return (
    <div style={{ position: "relative", marginTop: 12 }}>
      {/* left fade */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 18,
          pointerEvents: "none",
          background: "linear-gradient(90deg, rgba(11,15,20,1), rgba(11,15,20,0))"
        }}
      />
      {/* right fade */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 18,
          pointerEvents: "none",
          background: "linear-gradient(270deg, rgba(11,15,20,1), rgba(11,15,20,0))"
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          overflowY: "hidden",
          whiteSpace: "nowrap",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 6,
          paddingLeft: 6,
          paddingRight: 6,
          scrollbarWidth: "none" // Firefox
        }}
      >
        <style>{`
          /* Hide scrollbar (Chrome/Safari) */
          .tabsScroller::-webkit-scrollbar { display: none; }
        `}</style>

        <div className="tabsScroller" style={{ display: "flex", gap: 8 }}>
          {groups.map(g => {
            const active = g.title === activeTitle
            return (
              <button
                key={g.title}
                type="button"
                onClick={() => onSelect(g.title)}
                style={{
                  flex: "0 0 auto",
                  borderRadius: 999,
                  border: active ? "1px solid rgba(138,180,255,0.55)" : "1px solid rgba(255,255,255,0.14)",
                  background: active ? "rgba(138,180,255,0.14)" : "rgba(255,255,255,0.06)",
                  color: active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.78)",
                  padding: "8px 12px",
                  fontWeight: 900,
                  fontSize: 12.5,
                  cursor: "pointer"
                }}
                title={g.description}
              >
                {g.title}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
