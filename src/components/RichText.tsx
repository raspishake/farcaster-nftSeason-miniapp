// src/components/RichText.tsx
import React, { useMemo } from "react"

function isProbablyHandleToken(token: string): boolean {
  return /^@[a-z0-9][a-z0-9\-_.]{0,63}$/i.test(token)
}

function normalizeHandle(handle: string): string {
  const h = handle.trim()
  return h.startsWith("@") ? h.slice(1) : h
}

export function RichText({
  text,
  onHandleClick,
  linkColor = "#8ab4ff"
}: {
  text: string
  onHandleClick: (handle: string) => void
  linkColor?: string
}) {
  const parts = useMemo(() => text.split(/(\s+)/), [text])

  return (
    <>
      {parts.map((p, idx) => {
        if (!p.trim()) return <React.Fragment key={idx}>{p}</React.Fragment>

        const stripped = p.replace(/[),.;:!?]+$/g, "")
        if (isProbablyHandleToken(stripped)) {
          return (
            <button
              key={idx}
              onClick={() => onHandleClick(stripped)}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                margin: 0,
                color: linkColor,
                cursor: "pointer",
                fontWeight: 800,
                pointerEvents: "auto"
              }}
              title={`Open @${normalizeHandle(stripped)} on Farcaster`}
              type="button"
            >
              {p}
            </button>
          )
        }

        return <React.Fragment key={idx}>{p}</React.Fragment>
      })}
    </>
  )
}
