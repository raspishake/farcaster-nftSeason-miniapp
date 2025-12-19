// scripts/validate-data.ts
import { collectionsById, groups } from "../src/data/collections"

type Problem = { level: "error" | "warn"; msg: string }

function finish(problems: Problem[]): never {
  const errors = problems.filter(p => p.level === "error")
  const warns = problems.filter(p => p.level === "warn")

  for (const w of warns) console.warn(`⚠️  ${w.msg}`)
  for (const e of errors) console.error(`❌ ${e.msg}`)

  if (errors.length) {
    console.error(`\nValidation failed with ${errors.length} error(s).`)
    process.exit(1)
  }

  console.log("✅ Data validation passed.")
  process.exit(0)
}

function isSortedAscCaseInsensitive(values: string[]): boolean {
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1]!.toLowerCase()
    const b = values[i]!.toLowerCase()
    if (a > b) return false
  }
  return true
}

function main() {
  const problems: Problem[] = []

  const ids = new Set(Object.keys(collectionsById))
  if (ids.size === 0) problems.push({ level: "error", msg: "collectionsById is empty." })

  // Key must match collection.id (catches copy/paste mismatches)
  for (const [key, c] of Object.entries(collectionsById)) {
    if (!c) {
      problems.push({ level: "error", msg: `collectionsById["${key}"] is undefined/null.` })
      continue
    }
    if (c.id !== key) {
      problems.push({
        level: "error",
        msg: `collectionsById key mismatch: key="${key}" but collection.id="${c.id}". Fix so they match.`
      })
    }
  }

  const groupTitles = new Set<string>()
  const referencedIds = new Set<string>()

  for (const g of groups) {
    if (groupTitles.has(g.title)) {
      problems.push({ level: "error", msg: `Duplicate group title "${g.title}". Titles must be unique.` })
    }
    groupTitles.add(g.title)

    // Enforce exactly one featured per group
    if (!g.featuredId || !g.featuredId.trim()) {
      problems.push({
        level: "error",
        msg: `Group "${g.title}" must set featuredId (exactly one featured per group).`
      })
    } else if (!ids.has(g.featuredId)) {
      problems.push({
        level: "error",
        msg: `Group "${g.title}" featuredId "${g.featuredId}" does not exist in collectionsById.`
      })
    }

    // itemIds exist + no duplicates
    const seen = new Set<string>()
    for (const id of g.itemIds) {
      if (seen.has(id)) {
        problems.push({ level: "error", msg: `Group "${g.title}" contains duplicate itemId "${id}".` })
      }
      seen.add(id)
      referencedIds.add(id)

      if (!ids.has(id)) {
        problems.push({ level: "error", msg: `Group "${g.title}" references missing collection id "${id}".` })
      }
    }

    // Featured must be in itemIds
    if (g.featuredId && !seen.has(g.featuredId)) {
      problems.push({
        level: "error",
        msg: `Group "${g.title}" featuredId "${g.featuredId}" must also be present in itemIds.`
      })
    }

    // Warn if itemIds are not alphabetically sorted by collection.name (excluding featured)
    // This is only a warning because App.tsx will sort at render time.
    if (g.featuredId && ids.has(g.featuredId)) {
      const nonFeatured = g.itemIds.filter(id => id !== g.featuredId)
      const names = nonFeatured
        .map(id => collectionsById[id]?.name)
        .filter((n): n is string => typeof n === "string")

      // If any nonFeatured id was missing, it already errored above, but guard anyway.
      if (names.length === nonFeatured.length) {
        const sortedNames = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
        const alreadySorted = names.every((n, i) => n === sortedNames[i])
        if (!alreadySorted) {
          problems.push({
            level: "warn",
            msg: `Group "${g.title}" itemIds are not alphabetical by collection name (excluding featured). App.tsx will sort; you can optionally reorder data for readability.`
          })
        }
      }
    }
  }

  // Warn if a collection appears in zero groups
  for (const id of ids) {
    if (!referencedIds.has(id)) {
      problems.push({
        level: "warn",
        msg: `Collection "${id}" (${collectionsById[id]?.name ?? "unknown name"}) appears in zero groups.`
      })
    }
  }

  finish(problems)
}

main()
