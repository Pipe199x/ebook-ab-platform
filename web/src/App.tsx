import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LANGS } from './i18n'
import Home from './pages/Home'
import DuelCreate from './pages/DuelCreate'
import DuelVote from './pages/DuelVote'
import DuelOwner from './pages/DuelOwner'
import Soon from './pages/Soon'

function LangSwitcher() {
  const { i18n, t } = useTranslation()
  return (
    <label className="lang">
      <span className="sr-only">{t('langLabel')}</span>
      <select
        aria-label={t('langLabel')}
        value={i18n.language}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])
  return (
    <>
      <header className="bar">
        <Link to="/" className="brand">
          {t('brand')}
        </Link>
        <LangSwitcher />
      </header>
      <main className="page">{children}</main>
    </>
  )
}

function NotFound() {
  const { t } = useTranslation()
  return (
    <section className="card">
      <h1>{t('notFound.heading')}</h1>
      <Link className="pill" to="/">
        {t('notFound.back')}
      </Link>
    </section>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<DuelCreate />} />
          {/* the public, unlisted share link */}
          <Route path="/d/:id" element={<DuelVote />} />
          {/* the writer's private link: progress + reveal */}
          <Route path="/duel/:id" element={<DuelOwner />} />
          {/* doors that Phase 1 does not build yet (L3 is Phase 7, L4 is Phase 7) */}
          <Route path="/ad-doctor" element={<Soon />} />
          <Route path="/real-or-luck" element={<Soon />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
