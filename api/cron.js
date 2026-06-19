import { supabase } from './lib/supabase.js'
import { publishPost } from './lib/publishers.js'

// Allow up to 5 minutes for this function (Vercel Pro/Enterprise)
export const config = { maxDuration: 300 }

export default async function handler(req, res) {
  // Vercel sends Authorization: Bearer <CRON_SECRET> for cron calls
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date().toISOString()
  const { data: duePosts, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (error) return res.status(500).json({ error: error.message })
  if (!duePosts?.length) return res.json({ processed: 0, results: [] })

  const results = []
  for (const post of duePosts) {
    const result = await publishPost(supabase, post)
    results.push({ post_id: post.id, ...result })
  }

  res.json({ processed: duePosts.length, results })
}
