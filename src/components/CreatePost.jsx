import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function CreatePost({ session, onCreated }) {
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()
  const userId = session.user.id

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
    if (!content.trim() && !imageFile) return
    setLoading(true)
    setError(null)

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

    const { error: insertError } = await supabase
      .from('posts')
      .insert({ user_id: userId, content: content.trim(), image_url: imageUrl })

    if (insertError) {
      setError(insertError.message)
    } else {
      setContent('')
      removeImage()
      onCreated()
    }
    setLoading(false)
  }

  const name = session.user.user_metadata?.full_name || session.user.email
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="create-post card">
      <div className="create-post-top">
        <div className="avatar avatar-sm">{initials}</div>
        <textarea
          className="create-post-input"
          placeholder="What's on your mind?"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
        />
      </div>
      {imagePreview && (
        <div className="image-preview-wrap">
          <img src={imagePreview} alt="Preview" className="image-preview" />
          <button className="remove-image" onClick={removeImage} title="Remove image">×</button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="create-post-footer">
        <button className="btn-icon" type="button" onClick={() => fileRef.current.click()} title="Add image">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          disabled={loading || (!content.trim() && !imageFile)}
        >
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
