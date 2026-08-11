import { ExternalLink, ImageOff } from 'lucide-react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { API_BASE } from '../lib/api'

function resolvePublicUrl(value?: string): string | undefined {
  if (!value) return undefined
  if (value.startsWith('#')) return value
  try {
    const url = new URL(value, `${API_BASE}/`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

const sharedComponents: Components = {
  a: ({ href, children, ...props }) => {
    const resolved = resolvePublicUrl(href)
    const inPage = resolved?.startsWith('#')
    return (
      <a
        {...props}
        href={resolved}
        target={resolved && !inPage ? '_blank' : undefined}
        rel={resolved && !inPage ? 'noreferrer noopener' : undefined}
      >
        {children}
        {resolved && !inPage && <ExternalLink className="inline-link-icon" aria-hidden="true" />}
      </a>
    )
  },
  img: ({ src, alt }) => {
    const resolved = typeof src === 'string' ? resolvePublicUrl(src) : undefined
    return (
      <span className="blocked-image" role="note">
        <ImageOff aria-hidden="true" />
        <span>{alt || 'External image'} <small>not loaded for privacy</small></span>
        {resolved && <a href={resolved} target="_blank" rel="noreferrer noopener">Open image <ExternalLink aria-hidden="true" /></a>}
      </span>
    )
  },
}

const postHeadings: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h3>{children}</h3>,
  h3: ({ children }) => <h4>{children}</h4>,
  h4: ({ children }) => <h5>{children}</h5>,
  h5: ({ children }) => <h6>{children}</h6>,
  h6: ({ children }) => <h6>{children}</h6>,
}

const commentHeadings: Components = {
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h4>{children}</h4>,
  h3: ({ children }) => <h5>{children}</h5>,
  h4: ({ children }) => <h6>{children}</h6>,
  h5: ({ children }) => <h6>{children}</h6>,
  h6: ({ children }) => <h6>{children}</h6>,
}

export function Markdown({ children, compact = false }: { children: string; compact?: boolean }) {
  return (
    <div className={compact ? 'markdown markdown--compact' : 'markdown'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ ...sharedComponents, ...(compact ? commentHeadings : postHeadings) }}
        skipHtml
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
