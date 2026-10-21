import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError, api, uploadCover } from '../api'
import { shrinkCover } from '../shrink'
import { rememberOwner } from '../visitor'
import type { Arm, CreateDuelResponse, Kind } from '../types'

const KINDS: Kind[] = ['cover', 'title', 'blurb', 'idea']
const GENRES = ['Fantasy', 'Romance', 'Thriller', 'Science fiction', 'Literary', 'Non-fiction', 'Young adult']
const BOOK_LANGS = ['English', 'Spanish', 'Portuguese', 'French', 'German']

interface Version {
  title: string
  blurb: string
  file: File | null
}

const EMPTY: Version = { title: '', blurb: '', file: null }

export default function DuelCreate() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const initial = params.get('kind') as Kind | null

  const [kind, setKind] = useState<Kind>(initial && KINDS.includes(initial) ? initial : 'cover')
  const [a, setA] = useState<Version>(EMPTY)
  const [b, setB] = useState<Version>(EMPTY)
  const [genre, setGenre] = useState('')
  const [bookLanguage, setBookLanguage] = useState('')
  const [firstPage, setFirstPage] = useState('')
  const [writerLink, setWriterLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreateDuelResponse | null>(null)

  const pairs: [Arm, Version][] = [
    ['A', a],
    ['B', b],
  ]

  /** Returns a translated message, or null when the form is good. */
  function validate(): string | null {
    const bad = (key: string) => t(`duel.errors.${key}`)
    if (kind === 'cover') {
      if (!a.file || !b.file) return bad('needVersions')
    } else if (kind === 'blurb') {
      if (!a.blurb.trim() || !b.blurb.trim()) return bad('needVersions')
    } else if (!a.title.trim() || !b.title.trim()) return bad('needVersions')

    if (!genre) return bad('needGenre')
    if (!bookLanguage) return bad('needLanguage')
    if (writerLink && !/^https?:\/\//.test(writerLink)) return bad('badLink')
    return null
  }

  function message(e: unknown): string {
    if (e instanceof ApiError) return e.message
    const key = e instanceof Error ? e.message : ''
    if (key === 'badImage' || key === 'tooBig') return t(`duel.errors.${key}`)
    return t('duel.errors.generic')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const bad = validate()
    if (bad) return setError(bad)
    setError(null)
    setBusy(true)
    try {
      // Covers shrink on the device first; only the result is uploaded (D35, D49).
      const shrunk =
        kind === 'cover'
          ? await Promise.all(
              pairs.map(async ([arm, v]) => ({ arm, ...(await shrinkCover(v.file!)) })),
            )
          : []

      const res = await api.createDuel({
        kind,
        genre,
        bookLanguage,
        versions: pairs.map(([arm, v]) => ({
          arm,
          title: v.title.trim() || undefined,
          blurb: v.blurb.trim() || undefined,
        })),
        coverTypes: shrunk.map((s) => ({ arm: s.arm, contentType: s.contentType })),
        firstPage: firstPage.trim() || undefined,
        writerLink: writerLink.trim() || undefined,
      })

      rememberOwner(res.id, res.ownerKey)

      // Straight to S3 with the presigned POST, never through our API.
      await Promise.all(
        shrunk.map((s) => {
          const form = res.covers.find((c) => c.arm === s.arm)
          return form ? uploadCover(form.url, form.fields, s.blob) : Promise.resolve()
        }),
      )

      setCreated(res)
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }

  if (created) return <Share created={created} />

  return (
    <section className="card">
      <h1>{t('duel.create')}</h1>

      <h2>{t('duel.choosing')}</h2>
      <div className="chips" role="group" aria-label={t('duel.choosing')}>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className="chip"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {t(`duel.kinds.${k}`)}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate>
        {pairs.map(([arm, v]) => (
          <fieldset key={arm} className="card">
            <legend>{t(arm === 'A' ? 'duel.versionA' : 'duel.versionB')}</legend>

            {kind === 'cover' && (
              <label className="field">
                <span>{t('duel.kinds.cover')}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) =>
                    (arm === 'A' ? setA : setB)({ ...v, file: e.target.files?.[0] ?? null })
                  }
                />
                <span className="note">{t('duel.coverHelp')}</span>
              </label>
            )}

            {kind !== 'blurb' && (
              <label className="field">
                <span>{t('duel.kinds.title')}</span>
                <input
                  type="text"
                  value={v.title}
                  placeholder={t('duel.titlePlaceholder')}
                  onChange={(e) => (arm === 'A' ? setA : setB)({ ...v, title: e.target.value })}
                />
              </label>
            )}

            {(kind === 'blurb' || kind === 'idea') && (
              <label className="field">
                <span>{t('duel.kinds.blurb')}</span>
                <textarea
                  value={v.blurb}
                  placeholder={t('duel.blurbPlaceholder')}
                  onChange={(e) => (arm === 'A' ? setA : setB)({ ...v, blurb: e.target.value })}
                />
              </label>
            )}
          </fieldset>
        ))}

        <label className="field">
          <span>{t('duel.genre')}</span>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="" />
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t('duel.bookLanguage')}</span>
          <select value={bookLanguage} onChange={(e) => setBookLanguage(e.target.value)}>
            <option value="" />
            {BOOK_LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t('duel.reward')}</span>
          <textarea
            value={firstPage}
            placeholder={t('duel.rewardPlaceholder')}
            onChange={(e) => setFirstPage(e.target.value)}
          />
        </label>

        <label className="field">
          <span>{t('duel.link')}</span>
          <input
            type="url"
            value={writerLink}
            placeholder={t('duel.linkPlaceholder')}
            onChange={(e) => setWriterLink(e.target.value)}
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="pill" type="submit" disabled={busy}>
          {busy ? t('duel.submitting') : t('duel.submit')}
        </button>
      </form>
    </section>
  )
}

function Share({ created }: { created: CreateDuelResponse }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const shareUrl = `${location.origin}${created.shareUrl}`
  const ownerUrl = `${location.origin}${created.ownerUrl}`

  async function copy() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
  }

  return (
    <section className="card">
      <h1>{t('duel.share.heading')}</h1>
      <p>{t('duel.share.body')}</p>

      <p className="field">
        <span>{t('duel.share.linkLabel')}</span>
        <span className="mono" data-testid="share-url">
          {shareUrl}
        </span>
      </p>
      <button className="pill" type="button" onClick={copy}>
        {copied ? t('duel.share.copied') : t('duel.share.copy')}
      </button>

      <p className="field">
        <span>{t('duel.share.ownerLabel')}</span>
        <span className="mono">{ownerUrl}</span>
      </p>
      <p className="note">{t('duel.share.ownerNote')}</p>
      <p className="note">{t('duel.share.target')}</p>
    </section>
  )
}
