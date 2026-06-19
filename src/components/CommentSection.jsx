import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function CommentSection({ postId, userId, onCommented }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [postId])

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id (name, picture)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    await supabase.from('comments').insert({ post_id: postId, user_id: userId, content: text.trim() })
    setText('')
    await fetchComments()
    onCommented()
    setLoading(false)
  }

  async function deleteComment(id) {
    await supabase.from('comments').delete().eq('id', id)
    await fetchComments()
    onCommented()
  }

  return (
    <div className="comment-section">
      {comments.length > 0 && (
        <div className="comment-list">
          {comments.map(c => {
            const name = c.profiles?.name || 'User'
            const initials = name.slice(0, 2).toUpperCase()
            return (
              <div key={c.id} className="comment">
                {c.profiles?.picture ? (
                  <img src={c.profiles.picture} alt={name} className="avatar avatar-xs" />
                ) : (
                  <div className="avatar avatar-xs">{initials}</div>
                )}
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-author">{name}</span>
                    <span className="comment-time">{timeAgo(c.created_at)}</span>
                    {c.user_id === userId && (
                      <button className="comment-delete" onClick={() => deleteComment(c.id)} title="Delete">×</button>
                    )}
                  </div>
                  <p className="comment-text">{c.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <form className="comment-form" onSubmit={handleSubmit}>
        <input
          className="input input-sm"
          placeholder="Write a comment…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button className="btn-primary btn-sm" type="submit" disabled={loading || !text.trim()}>
          {loading ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
