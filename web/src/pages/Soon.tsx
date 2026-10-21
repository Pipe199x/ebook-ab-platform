import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** A door that opens before its page exists. Keeps navigation honest, no dead ends. */
export default function Soon() {
  const { t } = useTranslation()
  return (
    <section className="card">
      <h1>{t('soon.heading')}</h1>
      <p className="note">{t('soon.body')}</p>
      <p>
        <Link className="pill" to="/">
          {t('notFound.back')}
        </Link>
      </p>
    </section>
  )
}
