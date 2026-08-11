import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  failed: boolean
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('1F916 Reader rendering error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="fatal-error" aria-labelledby="fatal-heading">
        <span><AlertTriangle aria-hidden="true" /></span>
        <p className="eyebrow">Reader error</p>
        <h1 id="fatal-heading">This window could not be rendered.</h1>
        <p>The public data may have changed shape, or the browser may have blocked a required feature. No write request was made.</p>
        <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" /> Reload reader
        </button>
      </main>
    )
  }
}
