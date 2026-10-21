/**
 * The no-third-party-requests check (§3.13 quality).
 *
 * Scans the build output. The site must load and call nothing outside its own
 * origin: no analytics, trackers, CDN fonts or third-party scripts, ever.
 *
 * ponytail: this is a static scan of dist/, not a headless browser. It catches
 * every realistic mistake in this repo (an added <script src>, a webfont link, an
 * absolute fetch). Swap in Playwright + a request listener when the operator wants
 * the stronger guarantee; it costs a dependency and a browser download.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DIST = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const files = walk(DIST)
const offenders = []
const ALL = ['.js', '.mjs', '.html', '.css']

const checks = [
  // A third-party script, stylesheet, image or iframe in the HTML.
  { ext: ['.html'], re: /<(?:script|link|img|iframe|source)[^>]*\s(?:src|href)\s*=\s*["'](?:https?:)?\/\//gi, why: 'an external asset in the HTML' },
  // A third-party font or background in the CSS.
  { ext: ['.css'], re: /url\(\s*["']?(?:https?:)?\/\//gi, why: 'an external url() in the CSS' },
  { ext: ['.css'], re: /@import\s+(?:url\()?["']?(?:https?:)?\/\//gi, why: 'a remote @import in the CSS' },
  // A request to an absolute origin from the JS.
  { ext: ['.js', '.mjs'], re: /(?:fetch|importScripts)\s*\(\s*["'`](?:https?:)?\/\//g, why: 'an absolute fetch or importScripts in the JS' },
  { ext: ['.js', '.mjs'], re: /\.open\s*\(\s*["'`](?:GET|POST|PUT|DELETE)["'`]\s*,\s*["'`](?:https?:)?\/\//g, why: 'an absolute XHR in the JS' },
  { ext: ALL, re: /<(?:script|iframe)[^>]*\ssrc\s*=\s*["'](?:https?:)?\/\//gi, why: 'an injected script or iframe tag' },
]

// Known trackers and CDNs, by their real network destination (a dotted host) or
// their initialiser call. Bare words are deliberately not matched: React's own
// `onDoubleClick` event name would otherwise trip the DoubleClick rule.
const TRACKER_HOSTS = [
  'google-analytics.com', 'analytics.google.com', 'googletagmanager.com',
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'plausible.io', 'matomo.cloud', 'mixpanel.com', 'segment.io', 'segment.com',
  'sentry.io', 'hotjar.com', 'hotjar.io', 'fullstory.com', 'amplitude.com',
  'facebook.net', 'connect.facebook.net', 'bat.bing.com', 'static.hotjar.com',
  'fonts.googleapis.com', 'fonts.gstatic.com', 'use.typekit.net',
  'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'code.jquery.com',
]

const TRACKER_CALLS = [
  { name: 'Google Analytics gtag', re: /(?:^|[^\w$])gtag\s*\(/g },
  { name: 'Google Analytics _gaq', re: /(?:^|[^\w$])_gaq\b/g },
  { name: 'Meta Pixel fbq', re: /(?:^|[^\w$])fbq\s*\(/g },
  { name: 'Mixpanel init', re: /(?:^|[^\w$])mixpanel\.init\s*\(/g },
  { name: 'Sentry init', re: /(?:^|[^\w$])Sentry\.init\s*\(/g },
  { name: 'Hotjar hj', re: /(?:^|[^\w$])hj\s*\(/g },
]

for (const file of files) {
  const ext = file.slice(file.lastIndexOf('.'))
  const text = readFileSync(file, 'utf8')
  const at = relative(DIST, file)

  for (const { ext: exts, re, why } of checks) {
    if (!exts.includes(ext)) continue
    for (const m of text.matchAll(re)) {
      offenders.push(`${at}: ${why} — ${JSON.stringify(m[0].slice(0, 80))}`)
    }
  }

  if (!ALL.includes(ext)) continue

  for (const host of TRACKER_HOSTS) {
    // A dotted host is unambiguous, with or without a scheme.
    const re = new RegExp(`(?:^|[^\\w.-])(?:https?:)?(?:\\/\\/)?${host.replace(/\./g, '\\.')}(?![\\w.-])`, 'g')
    for (const m of text.matchAll(re)) {
      offenders.push(`${at}: a known tracker or CDN host — ${JSON.stringify(m[0].trim().slice(0, 80))}`)
    }
  }

  for (const { name, re } of TRACKER_CALLS) {
    for (const m of text.matchAll(re)) {
      offenders.push(`${at}: a known tracker call (${name}) — ${JSON.stringify(m[0].slice(0, 80))}`)
    }
  }
}

// Sanity: the app really does talk to its own origin, so the scan above is not
// silently passing an empty build. The base is emitted as a template literal.
const js = files.filter((f) => /\.m?js$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('')
if (!/['"`]\/v1['"`]/.test(js)) {
  offenders.push('no /v1 API base found in the build — the scan may be looking at the wrong output')
}
if (!js.includes('library.json')) {
  offenders.push('no /data/library.json read found in the build — Home would show no counter')
}

if (offenders.length) {
  console.error('No-third-party-requests check FAILED:')
  for (const o of offenders) console.error('  ' + o)
  process.exit(1)
}

console.log(`No-third-party-requests check passed (${files.length} built files scanned).`)
