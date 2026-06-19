import { supabase } from '../lib/supabase'

const NAV = [
  { id: 'feed', label: 'Feed' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'connections', label: 'Connections' },
]

export default function Navbar({ session, page, onNavigate }) {
  const name = session.user.user_metadata?.full_name || session.user.email

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366f1" />
            <path d="M8 22L14 10L20 18L24 14L28 22H8Z" fill="white" fillOpacity="0.9" />
          </svg>
          <span>SocialFeed</span>
        </div>
        <div className="nav-tabs">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-tab ${page === n.id ? 'active' : ''}`}
              onClick={() => onNavigate(n.id)}
            >
              {n.label}
            </button>
          ))}
        </div>
        <div className="navbar-right">
          <span className="navbar-user">{name}</span>
          <button className="btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  )
}
