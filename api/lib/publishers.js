// ── Platform publishers ────────────────────────────────────────────────────

export async function publishToTwitter(accessToken, content) {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: content.slice(0, 280) }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.title || data.detail || 'Twitter post failed')
  return { id: data.data.id }
}

export async function publishToFacebook(accessToken, pageId, content, imageUrl) {
  const params = new URLSearchParams({ message: content, access_token: accessToken })
  if (imageUrl) params.set('link', imageUrl)

  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    body: params,
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return { id: data.id }
}

export async function publishToInstagram(accessToken, igUserId, content, imageUrl) {
  if (!imageUrl) throw new Error('Instagram requires an image')

  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      method: 'POST',
      body: new URLSearchParams({ image_url: imageUrl, caption: content, access_token: accessToken }),
    },
  )
  const container = await containerRes.json()
  if (container.error) throw new Error(container.error.message)

  // Give Meta time to process the image
  await new Promise(r => setTimeout(r, 4000))

  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      body: new URLSearchParams({ creation_id: container.id, access_token: accessToken }),
    },
  )
  const publish = await publishRes.json()
  if (publish.error) throw new Error(publish.error.message)
  return { id: publish.id }
}

export async function publishToThreads(accessToken, threadsUserId, content, imageUrl) {
  const body = { text: content, media_type: imageUrl ? 'IMAGE' : 'TEXT' }
  if (imageUrl) body.image_url = imageUrl

  const containerRes = await fetch(
    `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    },
  )
  const container = await containerRes.json()
  if (container.error) throw new Error(container.error.message)

  // Threads needs processing time before publish
  await new Promise(r => setTimeout(r, 5000))

  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ creation_id: container.id }),
    },
  )
  const publish = await publishRes.json()
  if (publish.error) throw new Error(publish.error.message)
  return { id: publish.id }
}

// ── Post-level publisher (used by both /api/publish and /api/cron) ─────────

export async function publishPost(supabase, post) {
  const { data: tokens } = await supabase
    .from('social_tokens')
    .select('*')
    .eq('user_id', post.user_id)
    .in('platform', post.platforms)

  const tokenMap = Object.fromEntries((tokens || []).map(t => [t.platform, t]))
  const results = {}

  for (const platform of post.platforms) {
    const t = tokenMap[platform]
    if (!t) {
      results[platform] = { error: 'No credentials configured' }
      continue
    }
    try {
      switch (platform) {
        case 'twitter':
          results.twitter = await publishToTwitter(t.access_token, post.content)
          break
        case 'facebook':
          results.facebook = await publishToFacebook(
            t.access_token, t.token_data?.page_id, post.content, post.image_url,
          )
          break
        case 'instagram':
          results.instagram = await publishToInstagram(
            t.access_token, t.token_data?.ig_user_id, post.content, post.image_url,
          )
          break
        case 'threads':
          results.threads = await publishToThreads(
            t.access_token, t.token_data?.threads_user_id, post.content, post.image_url,
          )
          break
      }
    } catch (e) {
      results[platform] = { error: e.message }
    }
  }

  const allFailed = post.platforms.every(p => results[p]?.error)
  const status = allFailed ? 'failed' : 'published'

  await supabase.from('scheduled_posts').update({ status, results }).eq('id', post.id)
  return { status, results }
}
