/** The build-size budget: under 5 MB (§3.13 quality). */
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const LIMIT = 5 * 1024 * 1024
const DIST = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const bytes = walk(DIST).reduce((sum, f) => sum + statSync(f).size, 0)
const mb = (bytes / 1024 / 1024).toFixed(2)

if (bytes > LIMIT) {
  console.error(`Build-size check FAILED: ${mb} MB is over the 5 MB budget.`)
  process.exit(1)
}

console.log(`Build-size check passed: ${mb} MB of 5.00 MB.`)
