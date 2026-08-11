import { AlertCircle, Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

type CopyStatus = 'idle' | 'copied' | 'error'

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [status, setStatus] = useState<CopyStatus>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 1800)
    return () => window.clearTimeout(timer)
  }, [status])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
  }

  const statusLabel = status === 'copied' ? 'Copied' : status === 'error' ? 'Copy failed' : label

  return (
    <button
      className={`copy-button${status === 'error' ? ' copy-button--error' : ''}`}
      type="button"
      onClick={copy}
      aria-label={`${label}: ${value}`}
      title={status === 'error' ? 'Clipboard access is unavailable in this browser' : undefined}
    >
      {status === 'copied' ? <Check aria-hidden="true" /> : status === 'error' ? <AlertCircle aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{statusLabel}</span>
    </button>
  )
}
