import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ALPHA, daysToSettle, rateTest } from '../stats/binomial'

interface Verdict {
  p: number
  real: boolean
  daysNeeded: number | null
}

/**
 * Real or luck? (L4, §3.13): sales and days before and after a change, an exact
 * binomial test adjusted for the days. Everything runs in this browser; nothing
 * is sent anywhere (D24).
 */
export default function RealOrLuck() {
  const { t } = useTranslation()
  const [beforeSales, setBeforeSales] = useState('')
  const [beforeDays, setBeforeDays] = useState('')
  const [afterSales, setAfterSales] = useState('')
  const [afterDays, setAfterDays] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const b = { sales: Number(beforeSales), days: Number(beforeDays) }
    const a = { sales: Number(afterSales), days: Number(afterDays) }
    const bad =
      !Number.isInteger(b.sales) || !Number.isInteger(a.sales) || b.sales < 0 || a.sales < 0
        ? 'sales'
        : b.days < 1 || a.days < 1 || !Number.isInteger(b.days) || !Number.isInteger(a.days)
          ? 'days'
          : null
    if (bad) {
      setVerdict(null)
      return setError(t(`realOrLuck.errors.${bad}`))
    }
    setError(null)
    const p = rateTest(b, a)
    setVerdict({ p, real: p < ALPHA, daysNeeded: p < ALPHA ? null : daysToSettle(b, a) })
  }

  return (
    <section className="card">
      <h1>{t('realOrLuck.heading')}</h1>
      <p className="lead">{t('realOrLuck.lead')}</p>

      <form onSubmit={submit} noValidate>
        <fieldset className="card">
          <legend>{t('realOrLuck.before')}</legend>
          <Fields
            sales={beforeSales}
            days={beforeDays}
            onSales={setBeforeSales}
            onDays={setBeforeDays}
          />
        </fieldset>

        <fieldset className="card">
          <legend>{t('realOrLuck.after')}</legend>
          <Fields sales={afterSales} days={afterDays} onSales={setAfterSales} onDays={setAfterDays} />
        </fieldset>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="pill" type="submit">
          {t('realOrLuck.submit')}
        </button>
      </form>

      {verdict && <Answer verdict={verdict} />}

      {!verdict && <p className="note">{t('realOrLuck.private')}</p>}
    </section>
  )
}

function Fields({
  sales,
  days,
  onSales,
  onDays,
}: {
  sales: string
  days: string
  onSales: (v: string) => void
  onDays: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <label className="field">
        <span>{t('realOrLuck.salesLabel')}</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={sales}
          onChange={(e) => onSales(e.target.value)}
        />
      </label>
      <label className="field">
        <span>{t('realOrLuck.daysLabel')}</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={days}
          onChange={(e) => onDays(e.target.value)}
        />
      </label>
    </>
  )
}

function Answer({ verdict }: { verdict: Verdict }) {
  const { t } = useTranslation()
  const headline = verdict.real
    ? t('realOrLuck.real')
    : verdict.daysNeeded === null
      ? t('realOrLuck.tooSlow')
      : t('realOrLuck.notYet', { n: verdict.daysNeeded })

  return (
    <>
      <div
        className={verdict.real ? 'verdict win' : 'verdict warn'}
        data-testid="verdict"
        data-real={verdict.real}
        role="status"
      >
        <p>{headline}</p>
      </div>

      <details>
        <summary>{t('realOrLuck.detail')}</summary>
        <p>
          {t('realOrLuck.pValue')}: {verdict.p < 0.001 ? '< 0.001' : verdict.p.toFixed(3)} ·{' '}
          <span className="badge">{t('realOrLuck.method')}</span>
        </p>
      </details>

      <h2>{t('realOrLuck.others.heading')}</h2>
      <ul>
        <li>{t('realOrLuck.others.season')}</li>
        <li>{t('realOrLuck.others.price')}</li>
        <li>{t('realOrLuck.others.ads')}</li>
        <li>{t('realOrLuck.others.rank')}</li>
      </ul>

      <p className="note">{t('realOrLuck.duelPointer')}</p>
      <Link className="pill ghost" to="/new?kind=cover">
        {t('realOrLuck.duelCta')}
      </Link>
    </>
  )
}
