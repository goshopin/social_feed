import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import FeedPage from './pages/FeedPage'
import SchedulePage from './pages/SchedulePage'
import ConnectionsPage from './pages/ConnectionsPage'
import Navbar from './components/Navbar'
import './index.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('feed')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!session) return <AuthPage />

  return (
    <div className="app-layout">
      <Navbar session={session} page={page} onNavigate={setPage} />
      {page === 'feed' && <FeedPage session={session} />}
      {page === 'schedule' && <SchedulePage session={session} />}
      {page === 'connections' && <ConnectionsPage session={session} />}
    </div>
  )
}
