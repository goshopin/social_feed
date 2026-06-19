import { useState } from 'react'
import { supabase } from '../lib/supabase'
import CommentSection from './CommentSection'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function PostCard({ post, userId, onUpdate }) {
  const [showComments, setShowComments] = useState(false)
  const [liking, setLiking] = useState(false)

  const likes = post.likes || []
  const commentCount = post.comments?.[0]?.count ?? 0
  const isLiked = likes.some(l => l.user_id === userId)
  const likeCount = likes.length

  const profile = post.profiles
  const authorName = profile?.name || 'Unknown'
  const initials = authorName.slice(0, 2).toUpperCase()

  async function toggleLike() {
    if (liking) return
    setLiking(true)
    if (isLiked) {
      const myLike = likes.find(l => l.user_id === userId)
      await supabase.from('likes').delete().eq('id', myLike.id)
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: userId })
    }
    await onUpdate()
    setLiking(false)
  }

  async function deletePost() {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', post.id)
    onUpdate()
  }

  return (
    <div className="card post-card">
      <div className="post-header">
        <div className="post-author">
          {profile?.picture ? (
            <img src={profile.picture} alt={authorName} className="avatar avatar-sm" />
          ) : (
            <div className="avatar avatar-sm">{initials}</div>
          )}
          <div>
            <p className="post-author-name">{authorName}</p>
            <p className="post-time">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {post.user_id === userId && (
          <button className="btn-ghost btn-danger" onClick={deletePost} title="Delete post">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        )}
      </div>

      {post.content && <p className="post-content">{post.content}</p>}

      {post.image_url && (
        <img src={post.image_url} alt="Post" className="post-image" />
      )}

      <div className="post-actions">
        <button
          className={`action-btn ${isLiked ? 'liked' : ''}`}
          onClick={toggleLike}
          disabled={liking}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{likeCount > 0 ? likeCount : ''} {likeCount === 1 ? 'Like' : 'Likes'}</span>
        </button>

        <button
          className={`action-btn ${showComments ? 'active' : ''}`}
          onClick={() => setShowComments(v => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{commentCount > 0 ? commentCount : ''} {commentCount === 1 ? 'Comment' : 'Comments'}</span>
        </button>
      </div>

      {showComments && (
        <CommentSection postId={post.id} userId={userId} onCommented={onUpdate} />
      )}
    </div>
  )
}
