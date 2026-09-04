import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Square({ profile }) {
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState('all')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    fetchPosts()
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchPosts())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [filter])

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select(`id, content, image_urls, created_at, profiles:user_id ( id, username, gender, age, avatar_url )`)
      .order('created_at', { ascending: false })
      .limit(50)

    let list = data || []
    if (filter === 'male') list = list.filter(p => p.profiles?.gender === 'male')
    if (filter === 'female') list = list.filter(p => p.profiles?.gender === 'female')
    setPosts(list)
    setLoading(false)
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('请选择图片')
    if (file.size > 5 * 1024 * 1024) return alert('图片不能超过 5MB')
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!content.trim() && !imageFile) return
    setPosting(true)

    let image_urls = []
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('posts').upload(path, imageFile)
      if (error) {
        alert('图片上传失败：' + error.message)
        setPosting(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path)
      image_urls = [publicUrl]
    }

    const { error } = await supabase.from('posts').insert({
      user_id: profile.id,
      content: content.trim() || null,
      image_urls
    })

    if (error) alert('发布失败：' + error.message)
    else {
      setContent('')
      setImageFile(null)
      setPreview(null)
      fetchPosts()
    }
    setPosting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
        {['all', 'male', 'female'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setFilter(f)}>
            {f === 'all' ? '全部' : f === 'male' ? '♂ 男' : '♀ 女'}
          </button>
        ))}
      </div>

      <form onSubmit={handlePost} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <textarea className="input" placeholder="分享你的动态..." value={content} onChange={e => setContent(e.target.value)} rows={2} style={{ resize: 'none', marginBottom: 8 }} />
        {preview && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
            <img src={preview} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
            <button type="button" onClick={() => { setImageFile(null); setPreview(null) }} style={{
              position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
              background: 'var(--danger)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer'
            }}>×</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20
          }}>🖼</button>
          <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
          <button className="btn btn-primary" type="submit" disabled={posting || (!content.trim() && !imageFile)} style={{ padding: '8px 16px' }}>
            {posting ? '发布中...' : '发布动态'}
          </button>
        </div>
      </form>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>加载中...</p>
        ) : posts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>还没有动态</p>
        ) : posts.map(post => (
          <div key={post.id} className="card fade-in" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: post.profiles?.gender === 'male' ? 'var(--male)' : 'var(--female)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0e0e0e', fontSize: 14
              }}>{post.profiles?.username?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{post.profiles?.username}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <span className={`gender-tag ${post.profiles?.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
                    {post.profiles?.gender === 'male' ? '♂' : '♀'} {post.profiles?.age}岁
                  </span>
                  {' · '}{new Date(post.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            {post.content && <p style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: post.image_urls?.length ? 10 : 0 }}>{post.content}</p>}
            {post.image_urls?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {post.image_urls.map((url, i) => (
                  <img key={i} src={url} alt="" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 10, cursor: 'pointer' }} onClick={() => window.open(url)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
