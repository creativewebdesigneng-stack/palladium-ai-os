import React from 'react'

export default class BlackstarRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[blackstar-route] isolated render failure', {
      route: this.props.resetKey,
      error,
      componentStack: info?.componentStack,
    })
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <section
        role="alert"
        className="mx-auto my-8 max-w-3xl rounded-[24px] border border-rose-400/15 bg-[#08070b]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur-xl"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-rose-300/75">Blackstar route isolation</p>
        <h1 className="mt-2 text-xl font-semibold text-white">This workspace could not finish rendering.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          The rest of Blackstar is still running. Reload this workspace, or return to the dashboard while the failing visual or page component is isolated.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-violet-300/20 bg-violet-300 px-4 py-2 text-sm font-semibold text-[#09070d] hover:bg-violet-200"
          >
            Reload workspace
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = '/dashboard' }}
            className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/[.07]"
          >
            Return to dashboard
          </button>
        </div>
      </section>
    )
  }
}
