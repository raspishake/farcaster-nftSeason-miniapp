// scripts/write-build-info.ts
import { writeFileSync } from "fs"
import { resolve } from "path"

const now = new Date()

const formatted = now.toLocaleDateString("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit"
})

const content = `// AUTO-GENERATED AT BUILD TIME
// DO NOT EDIT MANUALLY

export const BUILD_DATE = "${formatted}"
`

const outPath = resolve(process.cwd(), "src/buildInfo.ts")
writeFileSync(outPath, content, "utf8")

console.log(`✓ Build date written: ${formatted}`)
