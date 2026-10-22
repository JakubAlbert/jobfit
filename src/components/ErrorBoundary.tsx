import { Component, type ReactNode } from 'react'
import { primaryButton } from './ui'

interface State {
  failed: boolean
}

/**
 * Shows a friendly message instead of a blank page when rendering throws unexpectedly.
 * Error boundaries must be class components; there is no hook equivalent in React.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    // Only to the local console: the app has no error tracking service on purpose (no tracking at all).
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="rounded-lg border border-red-300 p-6 dark:border-red-800">
        <h1 className="text-xl font-bold">Niečo sa pokazilo</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Táto obrazovka narazila na neočakávanú chybu. Tvoje dáta sú uložené v prehliadači a nič sa nestratilo.
          Skús stránku obnoviť alebo prejsť na inú časť aplikácie.
        </p>
        <button type="button" onClick={() => window.location.reload()} className={`${primaryButton} mt-4`}>
          Obnoviť stránku
        </button>
      </div>
    )
  }
}
