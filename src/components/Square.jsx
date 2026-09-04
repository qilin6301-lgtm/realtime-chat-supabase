import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Square({ profile }) {
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState('all') // all | male | female
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    fetchPosts()

    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        // 需要带上用户信息，重新拉或者简单追加后刷新
        fetchPosts()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [filter])

  async function fetchPosts() {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select(`
        id, content, image_urls, created_at,
        profiles:user_id ( id, username, gender, age, avatar_url )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data, error } = await query
    if (!error) {
      let list = data || []
      if (filter === 'male') list = list.filter(p => p.profiles?.gender === 'male')
      if (filter === 'female') list = list.filter(p => p.profiles?.gender === 'female')
      setPosts(list)
    }
    setLoading(false)
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)

    const { error } = await supabase.from('posts').insert({
      user_id: profile.id,
      content: content.trim()
    })

    if (error) alert('发布失败：' + error.message)
    else {
      setContent('')
      fetchPosts()
    }
    setPosting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 筛选 */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
        {['all', 'male', 'female'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部' : f === 'male' ? '♂ 男' : '♀ 女'}
          </button>
        ))}
      </div>

      {/* 发布框 */}
      <form onSubmit={handlePost} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <textarea
          className="input"
          placeholder="分享你的动态..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={2}
          style={{ resize: 'none', marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" type="submit" disabled={posting || !content.trim()} style={{ padding: '8px 16px' }}>
            {posting ? '发布中...' : '发布动态'}
          </button>
        </div>
      </form>

      {/* 动态列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>加载中...</p>
        ) : posts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>还没有动态，来发第一条吧</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="card fade-in" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: post.profiles?.gender === 'male' ? 'var(--male)' : 'var(--female)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: '#0e0e0e', fontSize: 14
                }}>
                  {post.profiles?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{post.profiles?.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <span className={`gender-tag ${post.profiles?.gender === 'male' ? 'gender-male' : 'gender-female'}`}>
                      {post.profiles?.gender === 'male' ? '♂' : '♀'} {post.profiles?.age}岁
                    </span>
                    {' · '}
                    {new Date(post.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <p style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.content}</p>
              {post.image_urls?.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {post.image_urls.map((url, i) => (
                    <img key={i} src={url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
