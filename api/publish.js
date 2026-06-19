import { supabase } from './lib/supabase.js'
import { publishPost } from './lib/publishers.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { post_id } = req.body
  if (!post_id) return res.status(400).json({ error: 'post_id required' })

  const { data: post, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('id', post_id)
    .single()

  if (error || !post) return res.status(404).json({ error: 'Post not found' })

  const result = await publishPost(supabase, post)
  res.json(result)
}
