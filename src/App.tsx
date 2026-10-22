import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BoardIcon, HomeIcon, LogoMark, PostingIcon, ProfileIcon, SettingsIcon } from './components/icons'
import { NextStepBanner } from './components/NextStepBanner'
import { ThemeSwitch } from './components/ThemeSwitch'
import { db } from './db/db'
import { currentRoute, navigate, type PageId, type Route } from './lib/router'
import { loadCustomSynonyms } from './lib/synonyms'
import { followSystemTheme } from './lib/theme'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { HomePage } from './pages/HomePage'
import { PostingsPage } from './pages/PostingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'

/** The main sections. Settings is reached from the gear icon, so it does not compete with them. */
const MAIN_PAGES: { id: PageId; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'home', label: 'Prehľad', icon: HomeIcon },
  { id: 'applications', label: 'Žiadosti', icon: BoardIcon },
  { id: 'postings', label: 'Inzeráty', icon: PostingIcon },
  { id: 'profile', label: 'Profil', icon: ProfileIcon },
]

const YEAR = new Date().getFullYear()

function App() {
  // The address bar is the source of truth: links, Back/Forward and bookmarks all go through it.
  const [route, setRoute] = useState<Route>(currentRoute)
  const go = (page: PageId, id?: string, options?: { replace?: boolean }) => navigate({ page, id }, options)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(currentRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const [storageBlocked, setStorageBlocked] = useState(false)
  // Pages wait for the user's skill synonyms, so the first scores they show already use them.
  const [ready, setReady] = useState(false)

  useEffect(followSystemTheme, [])

  // Some private browsing modes block IndexedDB; say so instead of failing silently later.
  useEffect(() => {
    db.open()
      .then(() => loadCustomSynonyms())
      .catch(() => setStorageBlocked(true))
      .finally(() => setReady(true))
  }, [])

  // A column as tall as the window in which main grows, so the footer sits at the bottom even on short pages.
  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop: logo left, sections centred, preferences right. Phones: sections move to a bottom bar. */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr]">
          <button type="button" onClick={() => go('home')} className="flex w-fit items-center gap-2.5 rounded-lg">
            <LogoMark className="size-8" />
            <span className="font-display text-xl font-bold tracking-tight">JobFit</span>
          </button>

          <nav aria-label="Hlavná navigácia" className="hidden md:block">
            <ul className="flex gap-1 rounded-full bg-sunken p-1">
              {MAIN_PAGES.map(({ id, label }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => go(id)}
                    aria-current={route.page === id ? 'page' : undefined}
                    className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-accent aria-[current=page]:shadow-sm"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center justify-end gap-2">
            <ThemeSwitch />
            <button
              type="button"
              onClick={() => go('settings')}
              aria-label="Nastavenia"
              title="Nastavenia"
              aria-current={route.page === 'settings' ? 'page' : undefined}
              className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Keyed by route so it re-checks progress after each navigation. */}
      <NextStepBanner key={route.page} page={route.page} onNavigate={go} />

      {storageBlocked && (
        <p role="alert" className="bg-peach px-4 py-3 text-center text-sm text-peach-ink">
          Prehliadač nepovolil ukladanie dát (napríklad v súkromnom okne). Aplikácia bez neho nebude fungovať
          správne. Otvor ju v bežnom okne.
        </p>
      )}

      {/* The key remounts a page on every navigation, so it starts fresh and opens the requested item.
          It also resets the error boundary, so an error on one page does not block the others. */}
      <main key={`${route.page}:${route.id ?? ''}`} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-12 md:pt-12 md:pb-16">
        <ErrorBoundary>
          {ready && route.page === 'home' && <HomePage onNavigate={go} />}
          {ready && route.page === 'applications' && (
            <ApplicationsPage
              id={route.id}
              onNavigate={(id, options) => go('applications', id, options)}
              onOpenPosting={(id) => go('postings', id)}
            />
          )}
          {ready && route.page === 'postings' && (
            <PostingsPage
              id={route.id}
              onNavigate={(id, options) => go('postings', id, options)}
              onOpenProfile={() => go('profile')}
              onOpenSettings={() => go('settings')}
              onOpenApplication={(id) => go('applications', id)}
            />
          )}
          {ready && route.page === 'profile' && <ProfilePage onOpenSettings={() => go('settings')} />}
          {ready && route.page === 'settings' && <SettingsPage />}
        </ErrorBoundary>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-28 text-sm text-muted md:pb-10">
        <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-6">
          <p>© {YEAR} Jakub Albert</p>
          <p>Dáta zostávajú v tvojom prehliadači.</p>
        </div>
      </footer>

      {/* Phones: thumb-reachable tab bar with icons, like a native app. */}
      <nav
        aria-label="Hlavná navigácia"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {MAIN_PAGES.map(({ id, label, icon: PageIcon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => go(id)}
                aria-current={route.page === id ? 'page' : undefined}
                className="group flex w-full flex-col items-center gap-1 py-2.5 text-xs font-semibold text-muted aria-[current=page]:text-accent"
              >
                <span className="grid h-7 w-12 place-items-center rounded-full transition-colors group-aria-[current=page]:bg-accent-soft">
                  <PageIcon width={20} height={20} />
                </span>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default App
