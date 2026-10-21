import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** The frozen snapshot committed in Phase 1, so the site always builds (§3.13). */
interface LibrarySnapshot {
  totalResults: number
  asOf: string
}

export default function Home() {
  const { t } = useTranslation()
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/data/library.json')
      .then((r) => (r.ok ? (r.json() as Promise<LibrarySnapshot>) : null))
      .then((d) => {
        if (alive && d) setTotal(d.totalResults)
      })
      .catch(() => {
        /* no snapshot: the counter simply stays quiet */
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <h1>{t('home.heading')}</h1>
      <p className="lead">{t('tagline')}</p>

      <div className="doors">
        <section className="card door">
          <h2>{t('home.doors.cover.title')}</h2>
          <p>{t('home.doors.cover.body')}</p>
          <Link className="pill" to="/new?kind=cover">
            {t('home.doors.cover.cta')}
          </Link>
        </section>

        <section className="card door">
          <h2>{t('home.doors.ads.title')}</h2>
          <p>{t('home.doors.ads.body')}</p>
          <Link className="pill ghost" to="/ad-doctor">
            {t('home.doors.ads.cta')}
          </Link>
        </section>

        <section className="card door">
          <h2>{t('home.doors.change.title')}</h2>
          <p>{t('home.doors.change.body')}</p>
          <Link className="pill ghost" to="/real-or-luck">
            {t('home.doors.change.cta')}
          </Link>
        </section>
      </div>

      <p className="counter" data-testid="counter">
        {total === null ? (
          ''
        ) : (
          <>
            {total === 0 ? t('home.counterZero') : t('home.counter', { count: total })}{' '}
            {/* D28: every number block wears a source badge. */}
            <span className="badge">{t('home.counterSource')}</span>
          </>
        )}
      </p>
    </>
  )
}
