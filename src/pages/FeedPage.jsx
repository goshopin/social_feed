import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import CreatePost from '../components/CreatePost'
import PostCard from '../components/PostCard'

export default function FeedPage({ session }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const userId = session.user.id

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, name, picture),
        likes (id, user_id),
        comments (count)
      `)
      .order('created_at', { ascending: false })

    if (!error) setPosts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts()
    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchPosts)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchPosts])

  return (
    <main className="feed-main">
      <CreatePost session={session} onCreated={fetchPosts} />
      {loading ? (
        <div className="feed-loading"><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="empty-state"><p>No posts yet. Be the first to share something!</p></div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} userId={userId} onUpdate={fetchPosts} />
        ))
      )}
    </main>
  )
}
