import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { isOwnDuel, pickArm } from '../visitor'
import type { Answer, Arm, Duel, DuelVersion } from '../types'

export default function DuelVote() {
  const { id = '' } = useParams()
  const { t } = useTranslation()

  // The version is chosen here, from the Duel id and a local random number that
  // never leaves the device (§3.13). The server is not told which one was shown.
  const [arm] = useState<Arm>(() => pickArm(id))
  const [duel, setDuel] = useState<Duel | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .getDuel(id)
      .then((d) => alive && setDuel(d))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [id])

  async function vote(answer: Answer) {
    try {
      await api.vote(id, arm, answer)
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (error) return <section className="card"><p className="error" role="alert">{error}</p></section>
  if (!duel) return <section className="card"><p>{t('duel.vote.loading')}</p></section>

  const version: DuelVersion | undefined = duel.versions.find((v) => v.arm === arm)

  if (done || isOwnDuel(id)) return <Thanks duel={duel} />

  return (
    <section className="card">
      <h1>{t('duel.vote.heading')}</h1>
      <VersionCard version={version} />
      <p>{t('duel.vote.question')}</p>
      <div className="chips">
        <button className="pill" type="button" onClick={() => vote('yes')}>
          {t('duel.vote.yes')}
        </button>
        <button className="pill ghost" type="button" onClick={() => vote('no')}>
          {t('duel.vote.no')}
        </button>
      </div>
    </section>
  )
}

function VersionCard({ version }: { version?: DuelVersion }) {
  if (!version) return null
  return (
    <div>
      {version.coverUrl && <img className="cover" src={version.coverUrl} alt={version.title ?? ''} />}
      {version.title && <h2>{version.title}</h2>}
      {version.blurb && <p className="book">{version.blurb}</p>}
    </div>
  )
}

function Thanks({ duel }: { duel: Duel }) {
  const { t } = useTranslation()
  return (
    <section className="card">
      <h1>{t('duel.vote.thanks')}</h1>
      {duel.firstPage && <p className="book">{duel.firstPage}</p>}
      {duel.writerLink && (
        <p>
          {/* the writer's own link, given by the writer */}
          <a className="pill ghost" href={duel.writerLink} rel="noreferrer noopener" target="_blank">
            {t('duel.vote.writerLink')}
          </a>
        </p>
      )}
      <p className="note">{t('duel.vote.yourDeviceNotCounted')}</p>
      <Link className="pill" to="/new">
        {t('duel.vote.recruit')}
      </Link>
    </section>
  )
}
