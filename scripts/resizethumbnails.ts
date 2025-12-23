import fs from "fs"
import path from "path"
import sharp from "sharp"

const args = process.argv.slice(2)

if (args.length < 2) {
  console.error("Usage: tsx scripts/resize-thumbnail.ts <input-image> <id> [size]")
  process.exit(1)
}

const [inputPath, id, sizeArg] = args
const SIZE = sizeArg ? Number(sizeArg) : 100

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`)
  process.exit(1)
}

if (!Number.isInteger(SIZE) || SIZE <= 0) {
  console.error("Size must be a positive integer")
  process.exit(1)
}

const outDir = path.resolve("public/thumbs")
fs.mkdirSync(outDir, { recursive: true })

const outPath = path.join(outDir, `${id}.png`)

async function run() {
  try {
    await sharp(inputPath)
      .resize(SIZE, SIZE, {
        fit: "cover",
        position: "centre"
      })
      .png({ quality: 90 })
      .toFile(outPath)

    console.log(`✓ Wrote ${outPath} (${SIZE}x${SIZE})`)
  } catch (err) {
    console.error("Resize failed:", err)
    process.exit(1)
  }
}

run()
