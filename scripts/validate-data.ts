// scripts/validate-data.ts
import { collectionsById, groups } from "../src/data/collections"

type Problem = { level: "error" | "warn"; msg: string }

function die(problems: Problem[]): never {
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

function main() {
  const problems: Problem[] = []

  const ids = new Set(Object.keys(collectionsById))

  if (ids.size === 0) {
    problems.push({ level: "error", msg: "collectionsById is empty." })
  }

  // sanity: key === collection.id
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

  // groups reference existing IDs
  const groupTitles = new Set<string>()
  for (const g of groups) {
    if (groupTitles.has(g.title)) {
      problems.push({ level: "error", msg: `Duplicate group title "${g.title}". Titles must be unique.` })
    }
    groupTitles.add(g.title)

    // featuredId exists
    if (g.featuredId) {
      if (!ids.has(g.featuredId)) {
        problems.push({
          level: "error",
          msg: `Group "${g.title}" featuredId "${g.featuredId}" does not exist in collectionsById.`
        })
      }
    }

    // itemIds exist + no duplicates
    const seen = new Set<string>()
    for (const id of g.itemIds) {
      if (seen.has(id)) {
        problems.push({ level: "error", msg: `Group "${g.title}" contains duplicate itemId "${id}".` })
      }
      seen.add(id)

      if (!ids.has(id)) {
        problems.push({ level: "error", msg: `Group "${g.title}" references missing collection id "${id}".` })
      }
    }

    // featured should be in itemIds (recommended invariant)
    if (g.featuredId && !seen.has(g.featuredId)) {
      problems.push({
        level: "warn",
        msg: `Group "${g.title}" has featuredId "${g.featuredId}" but it's not in itemIds. Add it to itemIds for consistency.`
      })
    }
  }

  die(problems)
}

main()
