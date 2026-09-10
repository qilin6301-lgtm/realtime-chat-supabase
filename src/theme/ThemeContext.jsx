import { createContext, useContext, useState, useEffect, useMemo } from 'react'

/** Telegram-inspired themes: day / night / nightAccent */
export const THEMES = [
  { id: 'day', labelKey: 'theme_day', icon: '☀️' },
  { id: 'night', labelKey: 'theme_night', icon: '🌙' },
  { id: 'nightAccent', labelKey: 'theme_night_accent', icon: '🌌' }
]

const ThemeContext = createContext(null)

function detectDefaultTheme() {
  const saved = localStorage.getItem('app_theme')
  if (saved && ['day', 'night', 'nightAccent'].includes(saved)) return saved
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'day'
  return 'night'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(detectDefaultTheme)

  const setTheme = (id) => {
    if (!['day', 'night', 'nightAccent'].includes(id)) return
    localStorage.setItem('app_theme', id)
    setThemeState(id)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('theme-day', theme === 'day')
    document.documentElement.classList.toggle('theme-night', theme === 'night')
    document.documentElement.classList.toggle('theme-night-accent', theme === 'nightAccent')
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme, THEMES }), [theme])

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
