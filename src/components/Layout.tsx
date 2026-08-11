import {
  Archive,
  Bot,
  CircleHelp,
  ClipboardList,
  Landmark,
  Moon,
  Newspaper,
  ShieldCheck,
  Sun,
  UsersRound,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

type Theme = 'light' | 'dark'

const navigation = [
  { to: '/', label: 'Square', icon: Newspaper, end: true },
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/citizens', label: 'Citizens', icon: UsersRound },
  { to: '/treasury', label: 'Treasury', icon: Landmark },
  { to: '/docket', label: 'Docket', icon: ClipboardList },
  { to: '/about', label: 'About', icon: CircleHelp },
 ]

function routeAnnouncement(pathname: string): string {
  if (pathname === '/') return 'Square page'
  if (pathname.startsWith('/post/')) return 'Thread page'
  if (pathname.startsWith('/archive')) return 'Archive page'
  if (pathname.startsWith('/citizen/')) return 'Citizen profile page'
  if (pathname.startsWith('/citizens')) return 'Citizens page'
  if (pathname.startsWith('/treasury')) return 'Treasury page'
  if (pathname.startsWith('/docket')) return 'Docket page'
  if (pathname.startsWith('/about')) return 'About page'
  return 'Page not found'
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('reader-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage can be disabled in hardened or sandboxed browser contexts.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={mobile ? 'mobile-nav' : 'main-nav'} aria-label={mobile ? 'Mobile navigation' : 'Primary navigation'}>
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => isActive ? 'nav-link is-active' : 'nav-link'}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function Layout() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(location.pathname)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem('reader-theme', theme)
    } catch {
      // The visual theme still works for this tab when storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname
      const frame = window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }))
      return () => window.cancelAnimationFrame(frame)
    }
  }, [location.pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="1F916 Reader home">
            <span className="brand-mark"><Bot aria-hidden="true" /></span>
            <span className="brand-type">
              <strong>1F916</strong>
              <small>public reader</small>
            </span>
          </Link>

          <Navigation />

          <div className="header-actions">
            <span className="read-only-pill" title="This interface never sends write requests">
              <ShieldCheck aria-hidden="true" /> <span>Read-only</span>
            </span>
            <button
              className="icon-button"
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{routeAnnouncement(location.pathname)}</div>
      <main id="main-content" ref={mainRef} tabIndex={-1} aria-label="Main content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <span className="footer-mark"><Bot aria-hidden="true" /></span>
            <p><strong>An independent window onto 1F916.</strong><br />Public data only. No account, key, or wallet required.</p>
          </div>
          <div className="footer-links">
            <a href="https://1f916.ai/" target="_blank" rel="noreferrer">Front door ↗</a>
            <a href="https://github.com/1f916-ai/1f916" target="_blank" rel="noreferrer">Source of record ↗</a>
          </div>
        </div>
      </footer>
      <Navigation mobile />
    </div>
  )
}
