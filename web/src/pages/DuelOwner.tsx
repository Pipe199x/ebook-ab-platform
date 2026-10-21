import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { ownerKeyFor, rememberOwner } from '../visitor'
import { revealImageBlob } from '../revealImage'
import type { Ending, Progress, Result } from '../types'

/** The writer's private page: progress without peeking, then the reveal. */
export default function DuelOwner() {
  const { id = '' } = useParams()
  const { hash } = useLocation()
  const { t } = useTranslation()

  // The owner key arrives in the private link's fragment, then lives on the device.
  const [ownerKey] = useState<string | null>(() => {
    const fromHash = new URLSearchParams(hash.replace(/^#/, '')).get('k')
    if (fromHash) {
      rememberOwner(id, fromHash)
      return fromHash
    }
    return ownerKeyFor(id)
  })

  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!ownerKey) return
    setBusy(true)
    try {
      const p = await api.progress(id, ownerKey)
      setProgress(p)
      // D34/§3.13: the answers only exist once the Duel has ended. No peeking.
      setResult(p.status === 'ended' ? await api.result(id, ownerKey) : null)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [id, ownerKey])

  useEffect(() => {
    void load()
  }, [load])

  if (!ownerKey) return <section className="card"><p className="error">{t('duel.reveal.waiting')}</p></section>
  if (error) return <section className="card"><p className="error" role="alert">{error}</p></section>
  if (!progress) return <section className="card"><p>{t('duel.vote.loading')}</p></section>

  return (
    <section className="card">
      {result?.ending ? <Reveal result={result} /> : <ProgressView progress={progress} />}
      <p>
        <button className="pill ghost" type="button" onClick={() => void load()} disabled={busy}>
          {t('duel.progress.refresh')}
        </button>
      </p>
    </section>
  )
}

function ProgressView({ progress }: { progress: Progress }) {
  const { t } = useTranslation()
  const pct = Math.min(100, Math.round((progress.readers / progress.target) * 100))
  return (
    <>
      <h1>{t('duel.progress.heading')}</h1>
      <p data-testid="readers">
        {t('duel.progress.readers')}: {progress.readers} / {progress.target} ({pct}%){' '}
        {/* D28: every number block wears a source badge. */}
        <span className="badge">{t('duel.progress.readersSource')}</span>
      </p>

      {/* The split check only. Never the answers (§3.13). */}
      <div className={progress.fairSplit ? 'verdict win' : 'verdict warn'}>
        <h2>{t('duel.progress.split')}</h2>
        <p>{progress.fairSplit ? t('duel.progress.splitOk') : t('duel.progress.splitBroken')}</p>
      </div>

      <p className="note">{t('duel.progress.noWinner')}</p>
      <p className="note">{t('duel.progress.endsAtTarget')}</p>
      <p className="note">{t('duel.progress.endsAtDate')}</p>
    </>
  )
}

function Reveal({ result }: { result: Result }) {
  const { t } = useTranslation()
  const ending = result.ending as Ending

  const headline = t(`duel.reveal.${ending === 'winner' ? 'winner' : ending === 'too_close' ? 'tooClose' : ending === 'not_sure' ? 'notSure' : 'notFair'}`, {
    arm: result.winner,
    n: result.readersNeeded,
  })

  const tone = ending === 'winner' ? 'win' : ending === 'not_fair' ? 'warn' : ''

  return (
    <>
      <h1>{t('duel.reveal.heading')}</h1>
      <div className={`verdict ${tone}`} data-testid="ending" data-ending={ending}>
        <p data-testid="headline">{headline}</p>
      </div>

      <details>
        <summary>{t('duel.reveal.detail')}</summary>
        <p>
          {t('duel.reveal.difference')}: {fmt(result.differencePct)} · {t('duel.reveal.range95')}:{' '}
          {fmt(result.ciLowPct)} — {fmt(result.ciHighPct)}
        </p>
        <p>
          {t('duel.reveal.splitCheck')}:{' '}
          {result.fairSplit ? t('duel.progress.splitOk') : t('duel.progress.splitBroken')}
        </p>
      </details>

      <ReadyImage headline={headline} />

      <p className="note">{t('duel.reveal.measure')}</p>
      <LibraryOptIn />
    </>
  )
}

function fmt(n?: number): string {
  return n === undefined ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

function ReadyImage({ headline }: { headline: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    void revealImageBlob(headline, 'ebook-ab-platform')
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => setUrl(null))
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [headline])

  if (!url) return null
  return (
    <p>
      <a className="pill ghost" href={url} download="duel-result.png">
        {t('duel.reveal.download')}
      </a>{' '}
      <span className="note">{t('duel.reveal.readyImage')}</span>
    </p>
  )
}

function LibraryOptIn() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const [done, setDone] = useState(false)

  async function add() {
    const key = ownerKeyFor(id)
    if (!key) return
    await api.addToLibrary(id, key)
    setDone(true)
  }

  return (
    <label className="field">
      <span>
        <input type="checkbox" checked={done} onChange={() => void add()} /> {t('duel.reveal.library')}
      </span>
    </label>
  )
}
