import { useEffect, useState } from 'react'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { HomePage } from './pages/HomePage'
import { PostingsPage } from './pages/PostingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { followSystemTheme } from './lib/theme'

// Plain state-based navigation: a few screens do not justify a router dependency yet.
const PAGES = [
  { id: 'home', label: 'Prehľad' },
  { id: 'applications', label: 'Žiadosti' },
  { id: 'postings', label: 'Inzeráty' },
  { id: 'profile', label: 'Profil' },
  { id: 'settings', label: 'Nastavenia' },
] as const

type PageId = (typeof PAGES)[number]['id']

/** A page, optionally with the id of an item to open on it. */
interface Route {
  page: PageId
  id?: string
}

function App() {
  const [route, setRoute] = useState<Route>({ page: 'home' })
  const go = (page: PageId, id?: string) => setRoute({ page, id })

  useEffect(followSystemTheme, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-3">
          <span className="mr-3 shrink-0 text-lg font-bold">JobFit</span>
          {PAGES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={route.page === id ? 'page' : undefined}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 aria-[current=page]:bg-slate-100 aria-[current=page]:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:aria-[current=page]:bg-slate-800 dark:aria-[current=page]:text-slate-100"
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* The key remounts a page on every navigation, so it starts fresh and opens the requested item. */}
      <main key={`${route.page}:${route.id ?? ''}`} className="mx-auto max-w-5xl px-4 py-6">
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
      </main>
    </div>
  )
}

export default App
