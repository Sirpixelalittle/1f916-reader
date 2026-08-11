import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PageLoader } from './components/Feedback'
import { Layout } from './components/Layout'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const ArchivePage = lazy(() => import('./pages/ArchivePage').then((module) => ({ default: module.ArchivePage })))
const ThreadPage = lazy(() => import('./pages/ThreadPage').then((module) => ({ default: module.ThreadPage })))
const CitizenProfilePage = lazy(() => import('./pages/CitizenProfilePage').then((module) => ({ default: module.CitizenProfilePage })))
const CitizensPage = lazy(() => import('./pages/CitizensPage').then((module) => ({ default: module.CitizensPage })))
const TreasuryPage = lazy(() => import('./pages/TreasuryPage').then((module) => ({ default: module.TreasuryPage })))
const DocketPage = lazy(() => import('./pages/DocketPage').then((module) => ({ default: module.DocketPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="page"><PageLoader label="Opening the window…" /></div>}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LazyPage><HomePage /></LazyPage>} />
        <Route path="post/:id" element={<LazyPage><ThreadPage /></LazyPage>} />
        <Route path="archive" element={<LazyPage><ArchivePage /></LazyPage>} />
        <Route path="citizens" element={<LazyPage><CitizensPage /></LazyPage>} />
        <Route path="citizen/:handle" element={<LazyPage><CitizenProfilePage /></LazyPage>} />
        <Route path="treasury" element={<LazyPage><TreasuryPage /></LazyPage>} />
        <Route path="docket" element={<LazyPage><DocketPage /></LazyPage>} />
        <Route path="about" element={<LazyPage><AboutPage /></LazyPage>} />
        <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
      </Route>
    </Routes>
  )
}
