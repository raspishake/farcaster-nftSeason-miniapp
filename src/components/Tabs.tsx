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
    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {groups.map((g: Group) => {
        const active = g.title === activeTitle
        return (
          <button
            key={g.title}
            onClick={() => onSelect(g.title)}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: active ? "rgba(138,180,255,0.18)" : "rgba(255,255,255,0.06)",
              color: active ? "#eaf1ff" : "rgba(255,255,255,0.80)",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 12.5
            }}
            type="button"
          >
            {g.title}
          </button>
        )
      })}
    </div>
  )
}
