import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PLATFORMS = [
  {
    id: 'twitter',
    name: 'Twitter / X',
    color: '#000',
    fields: [
      { key: 'access_token', label: 'OAuth 2.0 User Access Token', type: 'password' },
    ],
    extra: [],
    note: 'Go to developer.twitter.com → your App → Keys & Tokens → generate a User Access Token with tweet:write scope.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    fields: [
      { key: 'access_token', label: 'Page Access Token (long-lived)', type: 'password' },
    ],
    extra: [{ key: 'page_id', label: 'Facebook Page ID', type: 'text' }],
    note: 'Use Meta Graph Explorer (developers.facebook.com/tools/explorer) with pages_manage_posts permission. Exchange for a long-lived token.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    fields: [
      { key: 'access_token', label: 'Facebook Page Access Token', type: 'password' },
    ],
    extra: [{ key: 'ig_user_id', label: 'Instagram Business Account ID', type: 'text' }],
    note: 'Requires an Instagram Business or Creator account connected to a Facebook Page. Use the same Page Access Token as Facebook. Find your IG Business Account ID in Meta Graph Explorer.',
  },
  {
    id: 'threads',
    name: 'Threads',
    color: '#333',
    fields: [
      { key: 'access_token', label: 'Threads Access Token', type: 'password' },
    ],
    extra: [{ key: 'threads_user_id', label: 'Threads User ID', type: 'text' }],
    note: 'Apply for Threads API access at developers.facebook.com. Use the Threads Publishing API with threads_content_publish scope.',
  },
]

export default function ConnectionsPage({ session }) {
  const [tokens, setTokens] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [error, setError] = useState({})
  const userId = session.user.id

  useEffect(() => {
    supabase
      .from('social_tokens')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        const map = {}
        for (const row of data || []) {
          map[row.platform] = {
            access_token: row.access_token,
            ...(row.token_data || {}),
          }
        }
        setTokens(map)
      })
  }, [userId])

  function updateField(platform, key, value) {
    setTokens(prev => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [key]: value },
    }))
    setSaved(prev => ({ ...prev, [platform]: false }))
    setError(prev => ({ ...prev, [platform]: null }))
  }

  async function saveToken(platform) {
    const data = tokens[platform] || {}
    const { access_token, ...rest } = data
    if (!access_token?.trim()) {
      setError(prev => ({ ...prev, [platform]: 'Access token is required' }))
      return
    }
    setSaving(prev => ({ ...prev, [platform]: true }))

    const { error: err } = await supabase.from('social_tokens').upsert(
      { user_id: userId, platform, access_token: access_token.trim(), token_data: rest },
      { onConflict: 'user_id,platform' },
    )

    setSaving(prev => ({ ...prev, [platform]: false }))
    if (err) setError(prev => ({ ...prev, [platform]: err.message }))
    else setSaved(prev => ({ ...prev, [platform]: true }))
  }

  async function removeToken(platform) {
    if (!confirm(`Disconnect ${platform}?`)) return
    await supabase.from('social_tokens').delete().eq('user_id', userId).eq('platform', platform)
    setTokens(prev => { const n = { ...prev }; delete n[platform]; return n })
    setSaved(prev => ({ ...prev, [platform]: false }))
  }

  const isConnected = (id) => !!tokens[id]?.access_token

  return (
    <main className="feed-main">
      <div className="card" style={{ marginBottom: 0 }}>
        <h2 className="section-title">Social Accounts</h2>
        <p className="section-sub">Add your API credentials to enable automated posting to each platform.</p>
      </div>

      {PLATFORMS.map(p => {
        const connected = isConnected(p.id)
        const allFields = [...p.fields, ...p.extra]

        return (
          <div key={p.id} className="card connection-card">
            <div className="connection-header">
              <div className="connection-title">
                <span className="platform-dot" style={{ background: p.color }} />
                <span className="connection-name">{p.name}</span>
              </div>
              <span className={`badge ${connected ? 'badge-green' : 'badge-gray'}`}>
                {connected ? 'Connected' : 'Not connected'}
              </span>
            </div>

            <div className="connection-fields">
              {allFields.map(f => (
                <div key={f.key} className="field-group">
                  <label className="field-label">{f.label}</label>
                  <input
                    type={f.type}
                    className="input"
                    placeholder={f.type === 'password' ? '••••••••••••' : 'Enter ID'}
                    value={tokens[p.id]?.[f.key] || ''}
                    onChange={e => updateField(p.id, f.key, e.target.value)}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            {error[p.id] && <p className="form-error">{error[p.id]}</p>}
            {saved[p.id] && <p className="form-success">Credentials saved!</p>}

            <p className="connection-note">{p.note}</p>

            <div className="connection-footer">
              {connected && (
                <button className="btn-ghost btn-danger" onClick={() => removeToken(p.id)}>
                  Disconnect
                </button>
              )}
              <button
                className="btn-primary"
                style={{ background: p.color }}
                onClick={() => saveToken(p.id)}
                disabled={saving[p.id]}
              >
                {saving[p.id] ? 'Saving…' : connected ? 'Update' : 'Connect'}
              </button>
            </div>
          </div>
        )
      })}
    </main>
  )
}
