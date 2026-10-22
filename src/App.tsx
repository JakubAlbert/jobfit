import { useState } from 'react'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'

// Plain state-based navigation: a few screens do not justify a router dependency yet.
const PAGES = [
  { id: 'home', label: 'Prehľad' },
  { id: 'profile', label: 'Profil' },
  { id: 'settings', label: 'Nastavenia' },
] as const

type PageId = (typeof PAGES)[number]['id']

function App() {
  const [page, setPage] = useState<PageId>('home')

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <nav className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-3">
          <span className="mr-4 text-lg font-bold">JobFit</span>
          {PAGES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPage(id)}
              aria-current={page === id ? 'page' : undefined}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 aria-[current=page]:bg-slate-100 aria-[current=page]:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:aria-[current=page]:bg-slate-800 dark:aria-[current=page]:text-slate-100"
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {page === 'home' && (
          <div>
            <h1 className="text-2xl font-bold">Prehľad</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Asistent na hľadanie práce. Čoskoro tu pribudne porovnanie CV s inzerátom a tracker
              žiadostí. Začni zadaním API kľúča v Nastaveniach.
            </p>
          </div>
        )}
        {page === 'profile' && <ProfilePage onOpenSettings={() => setPage('settings')} />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

export default App
