import { Component, type ReactNode } from 'react'

/** Shows the crash message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <main>
        <h1>Something broke</h1>
        <pre className="error">{error.message}{'\n\n'}{error.stack?.split('\n').slice(0, 6).join('\n')}</pre>
        <button onClick={() => location.reload()}>Reload</button>
      </main>
    )
  }
}
