import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BoardIcon, HomeIcon, LogoMark, PostingIcon, ProfileIcon, SettingsIcon } from './components/icons'
import { NextStepBanner } from './components/NextStepBanner'
import { ThemeSwitch } from './components/ThemeSwitch'
import { db } from './db/db'
import { followSystemTheme } from './lib/theme'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { HomePage } from './pages/HomePage'
import { PostingsPage } from './pages/PostingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'

// Plain state-based navigation: a few screens do not justify a router dependency yet.
type PageId = 'home' | 'applications' | 'postings' | 'profile' | 'settings'

/** The main sections. Settings is reached from the gear icon, so it does not compete with them. */
const MAIN_PAGES: { id: PageId; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'home', label: 'Prehľad', icon: HomeIcon },
  { id: 'applications', label: 'Žiadosti', icon: BoardIcon },
  { id: 'postings', label: 'Inzeráty', icon: PostingIcon },
  { id: 'profile', label: 'Profil', icon: ProfileIcon },
]

/** A page, optionally with the id of an item to open on it. */
interface Route {
  page: PageId
  id?: string
}

function App() {
  const [route, setRoute] = useState<Route>({ page: 'home' })
  const go = (page: PageId, id?: string) => {
    setRoute({ page, id })
    window.scrollTo({ top: 0 })
  }

  const [storageBlocked, setStorageBlocked] = useState(false)

  useEffect(followSystemTheme, [])

  // Some private browsing modes block IndexedDB; say so instead of failing silently later.
  useEffect(() => {
    db.open().catch(() => setStorageBlocked(true))
  }, [])

  return (
    <div className="min-h-screen">
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
      <main key={`${route.page}:${route.id ?? ''}`} className="mx-auto max-w-6xl px-4 pt-8 pb-28 md:pt-12 md:pb-16">
        <ErrorBoundary>
          {route.page === 'home' && <HomePage onNavigate={go} />}
          {route.page === 'applications' && (
            <ApplicationsPage initialId={route.id} onOpenPosting={(id) => go('postings', id)} />
          )}
          {route.page === 'postings' && (
            <PostingsPage
              initialId={route.id}
              onOpenProfile={() => go('profile')}
              onOpenSettings={() => go('settings')}
              onOpenApplication={(id) => go('applications', id)}
            />
          )}
          {route.page === 'profile' && <ProfilePage onOpenSettings={() => go('settings')} />}
          {route.page === 'settings' && <SettingsPage />}
        </ErrorBoundary>
      </main>

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
