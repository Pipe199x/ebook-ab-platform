// Typst conf for pandoc's typst writer, used via: -V template=/render/plan-conf.typ
// Signature mirrors pandoc's default `conf` so every template variable still binds.

#let accent = rgb("#1f4e79")
#let muted = luma(105)

#let conf(
  title: none,
  subtitle: none,
  authors: (),
  keywords: (),
  date: none,
  abstract-title: none,
  abstract: none,
  thanks: none,
  cols: 1,
  margin: (x: 16mm, top: 20mm, bottom: 18mm),
  paper: "a4",
  lang: "en",
  region: "US",
  font: none,
  fontsize: 9.5pt,
  mathfont: none,
  codefont: none,
  linestretch: 1,
  sectionnumbering: none,
  linkcolor: none,
  citecolor: none,
  filecolor: none,
  pagenumbering: "1",
  doc,
) = {
  set document(title: title, keywords: keywords)
  set page(
    paper: paper,
    margin: (x: 16mm, top: 20mm, bottom: 18mm),
    header: context {
      if counter(page).get().first() > 1 {
        set text(size: 7.5pt, fill: muted)
        [#title · Plan v3.0 · draft for review]
        h(1fr)
        [#date]
      }
    },
    footer: context {
      if counter(page).get().first() > 1 {
        set text(size: 7.5pt, fill: muted)
        h(1fr)
        counter(page).display("1 / 1", both: true)
      }
    },
  )
  set text(lang: lang, region: region, size: fontsize, font: ("Noto Sans", "DejaVu Sans"))
  set par(justify: false, leading: 0.62em, spacing: 0.95em)
  set list(indent: 0.6em, body-indent: 0.5em, spacing: 0.55em)
  set enum(indent: 0.6em, body-indent: 0.5em, spacing: 0.55em)

  // Typst renders raw at 0.8em by default; 1.1em brings inline code back to ~body size.
  show raw: set text(font: ("DejaVu Sans Mono",))
  show raw.where(block: false): set text(size: 1.1em)
  // Allow long identifiers (snake_case, paths, dotted names) to wrap inside narrow table cells.
  show raw.where(block: false): it => {
    show regex("[_./:=,]"): m => m + sym.zws
    it
  }
  show raw.where(block: true): it => block(
    fill: luma(246), stroke: 0.4pt + luma(222), radius: 3pt,
    inset: (x: 7pt, y: 6pt), width: 100%, it,
  )
  show link: set text(fill: rgb("#1a5fb4"))

  // Callout boxes (pandoc block quotes): tinted panel with an accent rule.
  show quote.where(block: true): it => block(
    fill: rgb("#eef4fb"), stroke: (left: 2.5pt + accent), radius: (right: 3pt),
    inset: (x: 10pt, y: 8pt), width: 100%, above: 1em, below: 1.1em,
    it.body,
  )

  set heading(numbering: none)
  show heading.where(level: 1): it => {
    if it.supplement == [Part] {
      // Part divider: a page of its own, title low and large.
      pagebreak(weak: true)
      v(62mm)
      line(length: 30mm, stroke: 2pt + accent)
      v(4mm)
      block(below: 1.4em, text(size: 26pt, weight: "bold", fill: accent, it.body))
    } else {
      pagebreak(weak: true)
      block(below: 0.9em, text(size: 15pt, weight: "bold", fill: accent, it.body))
    }
  }
  show heading.where(level: 2): it => block(
    above: 1.3em, below: 0.7em, text(size: 11.5pt, weight: "bold", fill: accent, it.body),
  )
  show heading.where(level: 3): it => block(
    above: 1.1em, below: 0.6em, text(size: 10pt, weight: "bold", it.body),
  )

  // Tables: compact, striped, header row tinted; long tables may break across pages.
  set table(
    stroke: 0.4pt + luma(205),
    inset: (x: 4pt, y: 3.5pt),
    fill: (_, y) => if y == 0 { rgb("#e3ebf5") } else if calc.even(y) { luma(249) },
  )
  show table: set text(size: 7.6pt)
  show table: set par(leading: 0.48em, spacing: 0.6em)
  show table.cell.where(y: 0): set text(weight: "bold")
  // pandoc wraps tables in align(center); keep cell text left-aligned and top-aligned.
  show table.cell: set align(left + top)
  // Tables (figures of kind table) may break across pages; images stay together with their captions.
  show figure: set block(breakable: true)
  show figure.where(kind: image): set block(breakable: false)
  show figure.caption: set text(size: 8pt, style: "italic", fill: muted)

  // Cover page.
  page(header: none, footer: none)[
    #v(28mm)
    #text(size: 9pt, fill: muted, tracking: 0.6pt)[PROJECT PLAN · DRAFT FOR YOUR REVIEW · NOT YET APPROVED]
    #v(5mm)
    #text(size: 30pt, weight: "bold", fill: accent)[#title]
    #v(2mm)
    #text(size: 13pt)[#subtitle]
    #v(4mm)
    #text(size: 10.5pt, fill: muted)[Antes de decidir · Before You Decide: free tools where writers ask real readers before they decide. A Duel between two covers or titles, an Ad Doctor for ad reports, and Real or luck? for sales. Behind them, a \$0 data platform: real votes and a simulated store → files and Kafka → Databricks Lakehouse (Bronze / Silver / 20 Gold views) → honest verdicts and a public site.]
    #v(8mm)
    #line(length: 100%, stroke: 0.7pt + accent)
    #v(5mm)
    #grid(
      columns: (34mm, 1fr),
      row-gutter: 3.2mm,
      text(fill: muted)[Date], [#date],
      text(fill: muted)[Prepared for], [Pipe199x (github.com/Pipe199x)],
      text(fill: muted)[Prepared by], [Claude Code (Claude Opus 5.5), acting as technical lead],
      text(fill: muted)[Status], [Draft v3.0 for review: the only current version. Nothing gets built until you approve. Then Phase 0 starts only when you say so.],
      text(fill: muted)[Evidence], [Every free-tier and platform claim cites an official page, checked on 2026-10-15.],
      text(fill: muted)[Start here], [`docs/plan/README.md`: what to read, what to try, and what is old.],
      text(fill: muted)[Demo], [`docs/plan/DEMO.html`: a clickable demo of the final product, with the For nerds map (works offline).],
    )
    #v(8mm)
    #block(fill: luma(246), stroke: 0.4pt + luma(222), radius: 3pt, inset: 10pt, width: 100%)[
      #text(weight: "bold")[How to read this plan]
      #v(1mm)
      - *Part 1 · The story in pictures* (sections A–G, about 10 minutes): what we build, what you'll have at the end,
        where the numbers come from, the journey of one purchase, why small sellers struggle, who does what, and the cost.
      - *Part 2 · Technical plan* (sections 1–9): the nine contents of the original brief.
        (1) summary and scope · (2) decisions log · (3) architecture · (4) zero-cost bill of materials ·
        (5) phases · (6) risk register · (7) the 20 Gold views · (8) pre-registration drafts · (9) assumptions and open questions.
      - _Context_ and _Section 0_ explain what is new in v3.0 and what leaving plan mode authorizes.
      - `DEMO.html` lets you use the final product: start a Duel, vote as a reader, see the reveal, read an ad report with the Ad Doctor, try Real or luck?, and follow the For nerds map.
    ]
  ]

  doc
}
