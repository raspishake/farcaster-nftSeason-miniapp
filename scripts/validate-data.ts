// scripts/validate-data.ts
import { collectionsById, groups, type Collection } from "../src/data/collections"

type Issues = { errors: string[]; warnings: string[] }

function collectionName(id: string): string {
  return collectionsById[id]?.name ?? id
}

function expectedOrder(groupItemIds: string[]): string[] {
  const items: Collection[] = groupItemIds
    .map(id => collectionsById[id])
    .filter((c): c is Collection => Boolean(c))

  const newItems = items
    .filter(c => Boolean(c.highlight))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))

  const rest = items
    .filter(c => !c.highlight)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))

  return [...newItems, ...rest].map(c => c.id)
}

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id)
    else seen.add(id)
  }
  return [...dupes]
}

function main() {
  const issues: Issues = { errors: [], warnings: [] }

  const membershipCount = new Map<string, number>()
  for (const id of Object.keys(collectionsById)) membershipCount.set(id, 0)

  for (const g of groups) {
    const itemIds = g.itemIds ?? []

    // Enforce: no duplicates within itemIds for this group
    const dupes = findDuplicates(itemIds)
    if (dupes.length) {
      issues.errors.push(
        `Group "${g.title}" contains duplicate itemIds: ${dupes.map(id => `"${id}" (${collectionName(id)})`).join(", ")}.`
      )
    }

    // Enforce exactly one featured per group (must be set and valid)
    if (!g.featuredId) {
      issues.errors.push(`Group "${g.title}" is missing featuredId (must have exactly one featured).`)
    } else if (!collectionsById[g.featuredId]) {
      issues.errors.push(`Group "${g.title}" featuredId "${g.featuredId}" does not exist in collectionsById.`)
    } else {
      membershipCount.set(g.featuredId, (membershipCount.get(g.featuredId) ?? 0) + 1)
    }

    // Validate itemIds references exist
    for (const id of itemIds) {
      if (!collectionsById[id]) {
        issues.errors.push(`Group "${g.title}" references missing collection id "${id}".`)
      } else {
        membershipCount.set(id, (membershipCount.get(id) ?? 0) + 1)
      }
    }

    // Featured must NOT also appear in list
    if (g.featuredId && itemIds.includes(g.featuredId)) {
      issues.errors.push(`Group "${g.title}" includes featuredId "${g.featuredId}" inside itemIds. Remove it from itemIds.`)
    }

    // Warn if ordering is not: NEW first (excluding featured), then alphabetical
    const exp = expectedOrder(itemIds)

    const normalize = (arr: string[]) => arr.filter(id => Boolean(collectionsById[id]))
    const a = normalize(itemIds)
    const b = normalize(exp)

    const same = a.length === b.length && a.every((id, i) => id === b[i])

    if (!same) {
      issues.warnings.push(
        `Group "${g.title}" itemIds are not ordered as: NEW first (excluding featured), then alphabetical by collection name. App.tsx will sort; you can optionally reorder data for readability.\n  Current:  ${a
          .map(collectionName)
          .join(", ")}\n  Expected: ${b.map(collectionName).join(", ")}`
      )
    }
  }

  // Warn if any collection appears in zero groups
  for (const [id, count] of membershipCount.entries()) {
    if (count === 0) {
      const c = collectionsById[id]
      issues.warnings.push(`Collection "${c.name}" (${id}) appears in zero groups.`)
    }
  }

  // Print once
  for (const w of issues.warnings) console.warn(`⚠️  ${w}`)
  for (const e of issues.errors) console.error(`❌ ${e}`)

  if (issues.errors.length) process.exit(1)
  console.log("✅ Data validation passed.")
}

main()
