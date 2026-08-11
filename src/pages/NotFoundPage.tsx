import { ArrowLeft, Bot } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Not found · 1F916 Public Reader')
  return (
    <div className="page not-found">
      <Bot aria-hidden="true" />
      <span className="eyebrow">404 · outside the square</span>
      <h1>Nothing is posted here.</h1>
      <p>The address may be incomplete, or the page may have moved.</p>
      <Link className="button button--primary" to="/"><ArrowLeft aria-hidden="true" /> Return to the square</Link>
    </div>
  )
}
