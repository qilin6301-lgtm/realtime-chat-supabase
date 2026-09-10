import { createContext, useContext, useState, useEffect, useMemo } from 'react'

/** Telegram-inspired themes */
export const THEMES = [
  { id: 'day', labelKey: 'theme_day', icon: '☀️' },
  { id: 'night', labelKey: 'theme_night', icon: '🌙' },
  { id: 'nightAccent', labelKey: 'theme_night_accent', icon: '🌌' }
]

const ThemeContext = createContext(null)

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'day' : 'night'
}

function detectDefaultTheme() {
  const saved = localStorage.getItem('app_theme')
  if (saved === 'system') return systemTheme()
  if (saved && ['day', 'night', 'nightAccent'].includes(saved)) return saved
  return systemTheme()
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(detectDefaultTheme)
  const [followSystem, setFollowSystem] = useState(
    () => localStorage.getItem('app_theme') === 'system' || !localStorage.getItem('app_theme')
  )

  const setTheme = (id) => {
    if (id === 'system') {
      localStorage.setItem('app_theme', 'system')
      setFollowSystem(true)
      setThemeState(systemTheme())
      return
    }
    if (!['day', 'night', 'nightAccent'].includes(id)) return
    localStorage.setItem('app_theme', id)
    setFollowSystem(false)
    setThemeState(id)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // 跟随系统
  useEffect(() => {
    if (!followSystem) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => setThemeState(systemTheme())
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [followSystem])

  const value = useMemo(
    () => ({ theme, setTheme, THEMES, followSystem }),
    [theme, followSystem]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
