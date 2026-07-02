import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginPage from './components/LoginPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Flowline from './pages/Flowline'
import Monitoring from './pages/Monitoring'
import Kebocoran from './pages/Kebocoran'
import CBA from './pages/CBA'
import Matrix from './pages/Matrix'
import ImportExcel from './pages/ImportExcel'
import UserManagement from './pages/UserManagement'

const PAGES = {
  dashboard: Dashboard,
  flowline: Flowline,
  monitoring: Monitoring,
  kebocoran: Kebocoran,
  cba: CBA,
  matrix: Matrix,
  users: UserManagement,
  import: ImportExcel,
}

export default function App() {
  const { user, profile, loading, signIn, signOut } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginPage onLogin={signIn} />

  const Page = PAGES[page] || Dashboard

  return (
    <Layout page={page} onNav={setPage} onSignOut={signOut} profile={profile}>
      <Page />
    </Layout>
  )
}
