import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen,
  Check, ChevronDown, Globe2, Languages, LockKeyhole, LogOut, Menu,
  PenLine, Plus, Search, Settings2, ShieldCheck, Trash2, X
} from 'lucide-react'

type Locale = 'en' | 'hi'
type Article = {
  id: string; slug: string; category: string; title_en: string; title_hi: string | null;
  excerpt_en: string | null; excerpt_hi: string | null; body_en: string | null; body_hi: string | null;
  image_url: string | null; published_at: string | null; status: 'draft' | 'published';
}
const copy = {
  en: {
    nav: ['Home', 'India', 'World', 'Business', 'Technology', 'Culture'],
    kicker: 'INDEPENDENT JOURNALISM',
    headline: 'A clearer view of the world.',
    sub: 'Stories that matter, told with care. A quieter place to understand what is happening around us.',
    latest: 'Latest stories', view: 'View all', emptyTitle: 'The newsroom is getting ready.',
    emptyText: 'There are no published stories yet. When our editors publish an article, it will appear here.',
    emptyTag: 'A NEW PUBLICATION', about: 'Journalism with perspective.',
    aboutText: 'We believe good journalism should inform without overwhelming. Thoughtful reporting, clear language, and context that helps you make sense of the day.',
    footer: 'Independent in spirit. Thoughtful by design.', search: 'Search stories', admin: 'Admin', noResults: 'No stories found.',
    signIn: 'Admin sign in', email: 'Username', password: 'Password', signInBtn: 'Sign in',
    dashboard: 'Newsroom', drafts: 'Drafts', published: 'Published', newArticle: 'New article',
    titleEn: 'Headline (English)', titleHi: 'Headline (Hindi)', excerptEn: 'Short summary (English)',
    excerptHi: 'Short summary (Hindi)', bodyEn: 'Article body (English)', bodyHi: 'Article body (Hindi)',
    category: 'Category', image: 'Cover image URL (optional)', saveDraft: 'Save draft', publish: 'Publish',
    update: 'Save changes', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', signOut: 'Sign out',
    needConfig: 'Admin API is unavailable. Start the website with npm run dev.',
    needFields: 'Add at least an English or Hindi headline before saving.',
    saved: 'Article saved.', deleted: 'Article deleted.', loginError: 'Sign-in failed. Check your credentials.',
    emptyAdmin: 'No articles yet. Create the first story when you are ready.',
    adminOnly: 'Publishing is restricted to authorized administrators.',
    read: 'Read story', back: 'Back to home', status: 'Status', draft: 'Draft',
    live: 'Published', languageNote: 'Each story can have English and Hindi versions.',
    missingTranslation: 'This story is not available in this language yet.',
    categories: ['India', 'World', 'Business', 'Technology', 'Culture', 'Sports', 'Opinion']
  },
  hi: {
    nav: ['होम', 'भारत', 'दुनिया', 'व्यापार', 'टेक्नोलॉजी', 'संस्कृति'],
    kicker: 'स्वतंत्र पत्रकारिता',
    headline: 'दुनिया को समझने का एक स्पष्ट नज़रिया।',
    sub: 'ज़रूरी खबरें, संवेदनशीलता और संदर्भ के साथ। दुनिया में क्या हो रहा है, उसे समझने की एक शांत जगह।',
    latest: 'ताज़ा खबरें', view: 'सभी देखें', emptyTitle: 'हमारी न्यूज़रूम तैयारी कर रही है।',
    emptyText: 'अभी कोई प्रकाशित खबर नहीं है। संपादकों द्वारा खबर प्रकाशित होते ही वह यहाँ दिखाई देगी।',
    emptyTag: 'एक नया प्रकाशन', about: 'नज़रिए के साथ पत्रकारिता।',
    aboutText: 'हम मानते हैं कि अच्छी पत्रकारिता जानकारी दे, बोझ न बने। तथ्यपूर्ण रिपोर्टिंग, सरल भाषा और दिन की घटनाओं को समझने में मदद करने वाला संदर्भ।',
    footer: 'सोच में स्वतंत्र। प्रस्तुति में सहज।', search: 'खबरें खोजें', admin: 'एडमिन', noResults: 'कोई खबर नहीं मिली।',
    signIn: 'एडमिन लॉगिन', email: 'यूज़रनेम', password: 'पासवर्ड', signInBtn: 'लॉगिन करें',
    dashboard: 'न्यूज़रूम', drafts: 'ड्राफ्ट', published: 'प्रकाशित', newArticle: 'नई खबर',
    titleEn: 'शीर्षक (अंग्रेज़ी)', titleHi: 'शीर्षक (हिंदी)', excerptEn: 'संक्षिप्त परिचय (अंग्रेज़ी)',
    excerptHi: 'संक्षिप्त परिचय (हिंदी)', bodyEn: 'खबर (अंग्रेज़ी)', bodyHi: 'खबर (हिंदी)',
    category: 'श्रेणी', image: 'कवर इमेज URL (वैकल्पिक)', saveDraft: 'ड्राफ्ट सेव करें', publish: 'प्रकाशित करें',
    update: 'बदलाव सेव करें', cancel: 'रद्द करें', edit: 'एडिट', delete: 'डिलीट', signOut: 'लॉगआउट',
    needConfig: 'एडमिन API उपलब्ध नहीं है। वेबसाइट npm run dev से शुरू करें।',
    needFields: 'सेव करने से पहले अंग्रेज़ी या हिंदी में शीर्षक जोड़ें।',
    saved: 'खबर सेव हो गई।', deleted: 'खबर डिलीट हो गई।', loginError: 'लॉगिन नहीं हुआ। अपनी जानकारी जाँचें।',
    emptyAdmin: 'अभी कोई खबर नहीं है। तैयार होने पर पहली खबर बनाएँ।',
    adminOnly: 'खबर प्रकाशित करने का अधिकार केवल अधिकृत एडमिन के पास है।',
    read: 'खबर पढ़ें', back: 'होम पर जाएँ', status: 'स्थिति', draft: 'ड्राफ्ट',
    live: 'प्रकाशित', languageNote: 'हर खबर का अंग्रेज़ी और हिंदी संस्करण जोड़ा जा सकता है।',
    missingTranslation: 'यह खबर अभी इस भाषा में उपलब्ध नहीं है।',
    categories: ['भारत', 'दुनिया', 'व्यापार', 'टेक्नोलॉजी', 'संस्कृति', 'खेल', 'विचार']
  }
}

const blankArticle = (): Partial<Article> => ({
  slug: '', category: 'India', title_en: '', title_hi: '', excerpt_en: '', excerpt_hi: '',
  body_en: '', body_hi: '', image_url: '', status: 'draft'
})

function App() {
  const [locale, setLocale] = useState<Locale>('en')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [adminMode, setAdminMode] = useState(window.location.pathname.startsWith('/admin'))
  const [session, setSession] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('admin')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Article> | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeArticle, setActiveArticle] = useState<Article | null>(null)
  const t = copy[locale]

  const api = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
    return data
  }

  const loadArticles = async (includeDrafts = false) => {
    setLoading(true)
    try {
      const data = await api(`/api/articles${includeDrafts ? '?all=1' : ''}`)
      setArticles(data as Article[])
    } catch (error) {
      setArticles([])
      setNotice(error instanceof Error ? error.message : t.needConfig)
    } finally {
      setLoading(false)
    }
  }

  const checkSession = async () => {
    try {
      const data = await api('/api/session')
      setSession(data.authenticated ? { username: data.username } : null)
      setIsAdmin(Boolean(data.authenticated))
      await loadArticles(Boolean(data.authenticated))
    } catch {
      setSession(null)
      setIsAdmin(false)
      await loadArticles(false)
    }
  }

  useEffect(() => {
    void checkSession()
  }, [])

  useEffect(() => {
    const onPop = () => { setAdminMode(window.location.pathname.startsWith('/admin')); setActiveArticle(null) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const visibleArticles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return articles.filter(a => {
      const title = locale === 'hi' ? (a.title_hi || a.title_en) : a.title_en
      const excerpt = locale === 'hi' ? (a.excerpt_hi || a.excerpt_en || '') : (a.excerpt_en || '')
      const categoryMatches = activeCategory === 'All' || a.category === activeCategory
      const searchMatches = !q || `${title} ${excerpt} ${a.category}`.toLowerCase().includes(q)
      return categoryMatches && searchMatches
    })
  }, [articles, search, locale, activeCategory])

  const navigateAdmin = (value: boolean) => {
    const url = value ? '/admin' : '/'
    window.history.pushState({}, '', url)
    setAdminMode(value); setActiveArticle(null); setNotice('')
  }

  const signIn = async (e: FormEvent) => {
    e.preventDefault(); setLoginError('')
    try {
      await api('/api/login', { method: 'POST', body: JSON.stringify({ username: loginEmail, password: loginPassword }) })
      await checkSession()
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : t.loginError)
    }
  }

  const signOut = async () => {
    try { await api('/api/logout', { method: 'POST', body: '{}' }) } catch {}
    setSession(null); setIsAdmin(false); setEditorOpen(false)
    await loadArticles(false)
  }

  const openEditor = (article?: Article) => {
    setEditing(article ? { ...article } : blankArticle())
    setEditorOpen(true)
  }

  const saveArticle = async (status: 'draft' | 'published') => {
    if (!isAdmin || !editing) return
    if (!editing.title_en?.trim() && !editing.title_hi?.trim()) { setNotice(t.needFields); return }
    setBusy(true); setNotice('')
    const payload = {
      ...editing,
      category: editing.category || 'India',
      status,
      published_at: status === 'published' ? (editing.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString()
    }
    try {
      await api(editing.id ? '/api/articles' : '/api/articles', {
        method: editing.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      })
      setEditorOpen(false); setEditing(null); setNotice(t.saved)
      await loadArticles(true)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save article.')
    } finally {
      setBusy(false)
    }
  }

  const deleteArticle = async (id: string) => {
    if (!isAdmin || !window.confirm(locale === 'hi' ? 'क्या आप इस खबर को हटाना चाहते हैं?' : 'Delete this article?')) return
    try {
      await api('/api/articles', { method: 'DELETE', body: JSON.stringify({ id }) })
      setNotice(t.deleted)
      await loadArticles(true)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete article.')
    }
  }

  const goHome = () => { setActiveArticle(null); navigateAdmin(false); setSearch(''); setActiveCategory('All') }
  const titleOf = (a: Article) => locale === 'hi' ? (a.title_hi || a.title_en || '') : (a.title_en || a.title_hi || '')
  const excerptOf = (a: Article) => locale === 'hi' ? (a.excerpt_hi || a.excerpt_en || '') : (a.excerpt_en || a.excerpt_hi || '')
  const bodyOf = (a: Article) => locale === 'hi' ? (a.body_hi || a.body_en || '') : (a.body_en || a.body_hi || '')
  const categoryLabel = (value: string) => {
    const map: Record<string, string> = { India: 'भारत', World: 'दुनिया', Business: 'व्यापार', Technology: 'टेक्नोलॉजी', Culture: 'संस्कृति', Sports: 'खेल', Opinion: 'विचार' }
    return locale === 'hi' ? (map[value] || value) : value
  }

  return <div className={locale === 'hi' ? 'app hindi' : 'app'}>
    <header className="topbar">
      <button className="wordmark" onClick={goHome} aria-label="AURA home">aura<span>.</span></button>
      <nav className="desktop-nav">{t.nav.map((item, i) => <button key={item} className={(i === 0 && activeCategory === 'All') || (i > 0 && activeCategory === ['India','World','Business','Technology','Culture'][i-1]) ? 'nav-active' : ''} onClick={() => { setActiveArticle(null); setSearch(''); setActiveCategory(i === 0 ? 'All' : ['India','World','Business','Technology','Culture'][i-1] || 'All'); document.getElementById('latest')?.scrollIntoView({behavior:'smooth'}); }}>{item}</button>)}</nav>
      <div className="top-actions">
        <button className="icon-btn" aria-label={t.search} onClick={() => setSearchOpen(v => !v)}><Search size={18}/></button>
        <button className="language-toggle" onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}><Languages size={16}/><span>{locale === 'en' ? 'हिंदी' : 'English'}</span></button>
        <button className="icon-btn admin-shortcut" aria-label={t.admin} onClick={() => navigateAdmin(true)}><LockKeyhole size={17}/></button>
      </div>
    </header>

    {searchOpen && <div className="search-strip"><Search size={17}/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}/><button onClick={() => { setSearchOpen(false); setSearch('') }}><X size={16}/></button></div>}

    {adminMode ? <main className="admin-wrap">
      {!session || !isAdmin ? <section className="admin-card login-card"><div className="eyebrow"><ShieldCheck size={15}/> SECURE NEWSROOM</div><h1>{t.signIn}</h1><p className="muted">{t.adminOnly}</p><form onSubmit={signIn} className="login-form"><label>{t.email}<input type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required autoComplete="username"/></label><label>{t.password}<input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required autoComplete="current-password"/></label>{loginError && <p className="form-error">{loginError}</p>}<button className="dark-button" type="submit">{t.signInBtn}<ArrowRight size={16}/></button></form></section>
      : <section className="dashboard">
        <div className="dashboard-heading"><div><div className="eyebrow"><ShieldCheck size={15}/> ADMIN WORKSPACE</div><h1>{t.dashboard}</h1><p className="muted">{t.languageNote}</p></div><button className="outline-button" onClick={signOut}><LogOut size={15}/>{t.signOut}</button></div>
        {notice && <div className="notice">{notice}</div>}
        <div className="dashboard-toolbar"><span>{articles.length} {t.published.toLowerCase()}</span><button className="dark-button" onClick={() => openEditor()}><Plus size={16}/>{t.newArticle}</button></div>
        {editorOpen && editing && <div className="editor-card">
          <div className="editor-heading"><h2>{editing.id ? t.edit : t.newArticle}</h2><button className="icon-btn" onClick={() => setEditorOpen(false)}><X size={18}/></button></div>
          <div className="editor-grid">
            <label>{t.titleEn}<input value={editing.title_en || ''} onChange={e => setEditing({...editing, title_en:e.target.value})}/></label>
            <label>{t.titleHi}<input value={editing.title_hi || ''} onChange={e => setEditing({...editing, title_hi:e.target.value})}/></label>
            <label>{t.excerptEn}<textarea rows={3} value={editing.excerpt_en || ''} onChange={e => setEditing({...editing, excerpt_en:e.target.value})}/></label>
            <label>{t.excerptHi}<textarea rows={3} value={editing.excerpt_hi || ''} onChange={e => setEditing({...editing, excerpt_hi:e.target.value})}/></label>
            <label>{t.bodyEn}<textarea rows={7} value={editing.body_en || ''} onChange={e => setEditing({...editing, body_en:e.target.value})}/></label>
            <label>{t.bodyHi}<textarea rows={7} value={editing.body_hi || ''} onChange={e => setEditing({...editing, body_hi:e.target.value})}/></label>
            <label>{t.category}<select value={editing.category || 'India'} onChange={e => setEditing({...editing, category:e.target.value})}>{['India','World','Business','Technology','Culture','Sports','Opinion'].map(c=><option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>
            <label>{t.image}<input type="url" value={editing.image_url || ''} onChange={e => setEditing({...editing, image_url:e.target.value})} placeholder="https://…"/></label>
          </div>
          <div className="editor-actions"><button className="outline-button" onClick={() => setEditorOpen(false)}>{t.cancel}</button><button className="outline-button" disabled={busy} onClick={() => void saveArticle('draft')}>{t.saveDraft}</button><button className="dark-button" disabled={busy} onClick={() => void saveArticle('published')}>{busy ? '…' : t.publish}<ArrowUpRight size={15}/></button></div>
        </div>}
        {articles.length === 0 ? <div className="admin-empty"><BookOpen size={25}/><h3>{t.emptyAdmin}</h3></div> : <div className="admin-list">{articles.map(a=><div className="admin-row" key={a.id}><div className="admin-article-copy"><span className="small-label">{categoryLabel(a.category)} · {t.live}</span><strong>{titleOf(a)}</strong><small>{a.status === 'draft' ? t.draft : t.live} · {a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}</small></div><div className="row-actions"><button className="outline-button" onClick={() => openEditor(a)}><PenLine size={14}/>{t.edit}</button><button className="icon-btn danger" aria-label={t.delete} onClick={() => void deleteArticle(a.id)}><Trash2 size={16}/></button></div></div>)}</div>}
      </section>}
    </main> : activeArticle ? <main className="article-page">
      <button className="back-link" onClick={() => setActiveArticle(null)}><ArrowLeft size={16}/>{t.back}</button>
      <div className="article-topline"><span className="category-pill">{categoryLabel(activeArticle.category)}</span><span>{activeArticle.published_at ? new Date(activeArticle.published_at).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {day:'numeric', month:'short', year:'numeric'}) : ''}</span></div>
      <h1>{titleOf(activeArticle)}</h1><p className="article-deck">{excerptOf(activeArticle)}</p>
      {activeArticle.image_url && <img className="article-cover" src={activeArticle.image_url} alt="" />}
      <article className="article-body">{bodyOf(activeArticle).split(/\n+/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</article>
      {locale === 'hi' && !activeArticle.title_hi && <p className="muted">{t.missingTranslation}</p>}
    </main> : <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> {t.kicker}</div><h1>{t.headline}</h1><p>{t.sub}</p><a href="#latest" className="text-link">{t.latest}<ArrowDownRight size={17}/></a></div>
        <div className="hero-art" aria-hidden="true"><div className="orb orb-one"/><div className="orb orb-two"/><div className="art-line line-one"/><div className="art-line line-two"/><div className="art-caption">A / 01</div></div>
        <div className="hero-index"><span>01</span><span className="index-line"/><span>07</span></div>
      </section>

      <section className="latest-section" id="latest">
        <div className="section-heading"><div><div className="eyebrow">{locale === 'en' ? 'THE NEWSROOM' : 'न्यूज़रूम'}</div><h2>{t.latest}</h2></div><div className="result-count">{articles.length.toString().padStart(2,'0')} <span>{locale === 'en' ? 'STORIES' : 'खबरें'}</span></div></div>
        {loading ? <div className="loading-line"/> : visibleArticles.length === 0 ? <div className="empty-state"><div className="empty-mark"><span/><span/><span/></div><div className="eyebrow">{t.emptyTag}</div><h3>{search ? t.noResults : t.emptyTitle}</h3><p>{search ? t.noResults : t.emptyText}</p>{search && <button className="text-link" onClick={() => setSearch('')}>{locale === 'en' ? 'Clear search' : 'खोज हटाएँ'} <X size={15}/></button>}</div>
        : <div className="story-grid">{visibleArticles.map((a,i)=><button className={`story-card ${i===0?'featured':''}`} key={a.id} onClick={() => setActiveArticle(a)}>
          {a.image_url ? <img src={a.image_url} alt="" loading="lazy"/> : <div className="story-placeholder"><span>AURA / {String(i+1).padStart(2,'0')}</span></div>}
          <div className="story-meta"><span>{categoryLabel(a.category)}</span><span>{a.published_at ? new Date(a.published_at).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN',{day:'numeric',month:'short'}) : ''}</span></div>
          <h3>{titleOf(a)}</h3><p>{excerptOf(a)}</p><span className="card-arrow"><ArrowUpRight size={17}/></span>
        </button>)}</div>}
      </section>

      <section className="manifesto"><div className="manifesto-symbol">a.</div><div><div className="eyebrow">{locale === 'en' ? 'OUR APPROACH' : 'हमारा नज़रिया'}</div><h2>{t.about}</h2><p>{t.aboutText}</p></div><ArrowUpRight className="manifesto-arrow" size={24}/></section>
    </main>}

    <footer className="footer"><button className="wordmark" onClick={goHome}>aura<span>.</span></button><span>{t.footer}</span><div className="footer-links"><button onClick={() => setLocale('en')}>EN</button><span>/</span><button onClick={() => setLocale('hi')}>हिंदी</button><button className="footer-admin" onClick={() => navigateAdmin(true)}>{t.admin}</button></div></footer>
  </div>
}
export default App
