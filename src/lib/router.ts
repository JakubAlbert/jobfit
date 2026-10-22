// Minimal hash router: #/inzeraty/123 instead of a router library.
// A hash is never sent to the server, so deep links and the browser's Back button work on static
// GitHub Pages hosting, which cannot rewrite /jobfit/inzeraty/123 to index.html.

export type PageId = 'home' | 'applications' | 'postings' | 'profile' | 'settings'

/** A page, optionally with an item to open on it; NEW_ID opens an empty form. */
export interface Route {
  page: PageId
  id?: string
}

export const NEW_ID = 'new'

// Slovak URL slugs, matching the UI language.
const SLUGS: Record<PageId, string> = {
  home: '',
  applications: 'ziadosti',
  postings: 'inzeraty',
  profile: 'profil',
  settings: 'nastavenia',
}
const NEW_SLUG: Partial<Record<PageId, string>> = { applications: 'nova', postings: 'novy' }

export function parseHash(hash: string): Route {
  const [slug = '', rawId] = hash.replace(/^#\/?/, '').split('/')
  const page = (Object.keys(SLUGS) as PageId[]).find((key) => SLUGS[key] === slug) ?? 'home'
  if (page === 'home' || !rawId) return { page }
  const id = decodeURIComponent(rawId)
  return { page, id: id === NEW_SLUG[page] ? NEW_ID : id }
}

export function toHash({ page, id }: Route): string {
  const base = `#/${SLUGS[page]}`
  if (!id || page === 'home') return base
  return `${base}/${id === NEW_ID ? NEW_SLUG[page] : encodeURIComponent(id)}`
}

/** Goes to a route. `replace` swaps the current history entry, so Back skips it (e.g. a submitted form). */
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const hash = toHash(route)
  if (options.replace) window.location.replace(hash)
  else window.location.hash = hash
}
