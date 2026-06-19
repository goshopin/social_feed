import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PLATFORMS = [
  { id: 'twitter',   label: 'Twitter / X',  color: '#000' },
  { id: 'instagram', label: 'Instagram',     color: '#E1306C' },
  { id: 'facebook',  label: 'Facebook',      color: '#1877F2' },
  { id: 'threads',   label: 'Threads',       color: '#333' },
]

function statusBadge(status) {
  const map = {
    scheduled:  { label: 'Scheduled', cls: 'badge-blue' },
    published:  { label: 'Published', cls: 'badge-green' },
    failed:     { label: 'Failed',    cls: 'badge-red' },
  }
  return map[status] || { label: status, cls: 'badge-gray' }
}

function fmtDate(d) {
  return new Date(d).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SchedulePage({ session }) {
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [platforms, setPlatforms] = useState(['twitter'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const fileRef = useRef()
  const userId = session.user.id

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    const { data } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true })
    setPosts(data || [])
  }

  function togglePlatform(id) {
    setPlatforms(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    fileRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return setError('Post content is required')
    if (platforms.length === 0) return setError('Select at least one platform')
    if (!scheduledAt) return setError('Pick a scheduled date & time')
    setError(null)
    setLoading(true)

    let imageUrl = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { data, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, imageFile)
      if (uploadError) {
        setError('Image upload failed: ' + uploadError.message)
        setLoading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(data.path)
      imageUrl = publicUrl
    }

    const { error: insertError } = await supabase.from('scheduled_posts').insert({
      user_id: userId,
      content: content.trim(),
      image_url: imageUrl,
      platforms,
      scheduled_at: new Date(scheduledAt).toISOString(),
      status: 'scheduled',
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setContent('')
      removeImage()
      setScheduledAt('')
      setPlatforms(['twitter'])
      await fetchPosts()
    }
    setLoading(false)
  }

  async function deletePost(id) {
    if (!confirm('Delete this scheduled post?')) return
    await supabase.from('scheduled_posts').delete().eq('id', id)
    fetchPosts()
  }

  async function publishNow(post) {
    if (!confirm('Publish this post now?')) return
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: post.id }),
    })
    const data = await res.json()
    if (data.error) alert('Error: ' + data.error)
    else alert(`Published! Status: ${data.status}`)
    fetchPosts()
  }

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)
  const upcoming = posts.filter(p => p.status === 'scheduled')
  const history = posts.filter(p => p.status !== 'scheduled')

  return (
    <main className="feed-main">
      {/* ── Create form ── */}
      <div className="card schedule-form">
        <h2 className="section-title">Schedule a Post</h2>
        <textarea
          className="create-post-input schedule-textarea"
          placeholder="What would you like to post?"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
        />

        {imagePreview && (
          <div className="image-preview-wrap">
            <img src={imagePreview} alt="Preview" className="image-preview" />
            <button className="remove-image" onClick={removeImage}>×</button>
          </div>
        )}

        <div className="schedule-meta">
          <div className="platform-picker">
            <span className="field-label">Platforms</span>
            <div className="platform-toggles">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`platform-toggle ${platforms.includes(p.id) ? 'selected' : ''}`}
                  style={platforms.includes(p.id) ? { borderColor: p.color, color: p.color } : {}}
                  onClick={() => togglePlatform(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="datetime-field">
            <label className="field-label" htmlFor="sched-time">Publish at</label>
            <input
              id="sched-time"
              type="datetime-local"
              className="input"
              min={minDateTime}
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="schedule-footer">
          <button className="btn-icon" type="button" onClick={() => fileRef.current.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Scheduling…' : 'Schedule Post'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="list-tabs">
        <button className={`list-tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
          Upcoming ({upcoming.length})
        </button>
        <button className={`list-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          History ({history.length})
        </button>
      </div>

      {/* ── Post list ── */}
      {(tab === 'upcoming' ? upcoming : history).length === 0 ? (
        <div className="empty-state">
          <p>{tab === 'upcoming' ? 'No upcoming scheduled posts.' : 'No published posts yet.'}</p>
        </div>
      ) : (
        (tab === 'upcoming' ? upcoming : history).map(post => {
          const { label, cls } = statusBadge(post.status)
          return (
            <div key={post.id} className="card scheduled-post-card">
              <div className="sp-header">
                <div className="sp-meta">
                  <span className={`badge ${cls}`}>{label}</span>
                  <span className="sp-time">{fmtDate(post.scheduled_at)}</span>
                </div>
                <div className="sp-platforms">
                  {post.platforms.map(pid => {
                    const p = PLATFORMS.find(x => x.id === pid)
                    return (
                      <span key={pid} className="platform-pill" style={{ background: p?.color + '18', color: p?.color }}>
                        {p?.label || pid}
                      </span>
                    )
                  })}
                </div>
              </div>
              <p className="sp-content">{post.content}</p>
              {post.image_url && (
                <img src={post.image_url} alt="" className="sp-image" />
              )}
              {post.results && Object.keys(post.results).length > 0 && (
                <div className="sp-results">
                  {Object.entries(post.results).map(([platform, result]) => (
                    <span key={platform} className={`result-pill ${result.error ? 'result-error' : 'result-ok'}`}>
                      {platform}: {result.error || '✓ posted'}
                    </span>
                  ))}
                </div>
              )}
              {post.status === 'scheduled' && (
                <div className="sp-actions">
                  <button className="btn-ghost btn-sm" onClick={() => publishNow(post)}>Publish Now</button>
                  <button className="btn-ghost btn-danger btn-sm" onClick={() => deletePost(post.id)}>Delete</button>
                </div>
              )}
            </div>
          )
        })
      )}
    </main>
  )
}
