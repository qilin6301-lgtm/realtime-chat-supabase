import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import zh from './locales/zh'
import en from './locales/en'
import ja from './locales/ja'
import ko from './locales/ko'
import es from './locales/es'
import fr from './locales/fr'
import de from './locales/de'
import pt from './locales/pt'
import ru from './locales/ru'
import ar from './locales/ar'
import th from './locales/th'
import vi from './locales/vi'
import id from './locales/id'
import tr from './locales/tr'
import it from './locales/it'
import hi from './locales/hi'

export const locales = {
  zh, en, ja, ko, es, fr, de, pt, ru, ar, th, vi, id, tr, it, hi
}

export const LANG_LIST = [
  { code: 'zh', name: '中文', native: '中文' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' }
]

export const COUNTRIES = [
  { code: 'CN', name: { zh: '中国', en: 'China' } },
  { code: 'US', name: { zh: '美国', en: 'United States' } },
  { code: 'JP', name: { zh: '日本', en: 'Japan' } },
  { code: 'KR', name: { zh: '韩国', en: 'South Korea' } },
  { code: 'GB', name: { zh: '英国', en: 'United Kingdom' } },
  { code: 'FR', name: { zh: '法国', en: 'France' } },
  { code: 'DE', name: { zh: '德国', en: 'Germany' } },
  { code: 'ES', name: { zh: '西班牙', en: 'Spain' } },
  { code: 'IT', name: { zh: '意大利', en: 'Italy' } },
  { code: 'PT', name: { zh: '葡萄牙', en: 'Portugal' } },
  { code: 'BR', name: { zh: '巴西', en: 'Brazil' } },
  { code: 'RU', name: { zh: '俄罗斯', en: 'Russia' } },
  { code: 'IN', name: { zh: '印度', en: 'India' } },
  { code: 'TH', name: { zh: '泰国', en: 'Thailand' } },
  { code: 'VN', name: { zh: '越南', en: 'Vietnam' } },
  { code: 'ID', name: { zh: '印度尼西亚', en: 'Indonesia' } },
  { code: 'MY', name: { zh: '马来西亚', en: 'Malaysia' } },
  { code: 'SG', name: { zh: '新加坡', en: 'Singapore' } },
  { code: 'PH', name: { zh: '菲律宾', en: 'Philippines' } },
  { code: 'AU', name: { zh: '澳大利亚', en: 'Australia' } },
  { code: 'CA', name: { zh: '加拿大', en: 'Canada' } },
  { code: 'MX', name: { zh: '墨西哥', en: 'Mexico' } },
  { code: 'AR', name: { zh: '阿根廷', en: 'Argentina' } },
  { code: 'TR', name: { zh: '土耳其', en: 'Turkey' } },
  { code: 'SA', name: { zh: '沙特阿拉伯', en: 'Saudi Arabia' } },
  { code: 'AE', name: { zh: '阿联酋', en: 'UAE' } },
  { code: 'EG', name: { zh: '埃及', en: 'Egypt' } },
  { code: 'NG', name: { zh: '尼日利亚', en: 'Nigeria' } },
  { code: 'ZA', name: { zh: '南非', en: 'South Africa' } },
  { code: 'PL', name: { zh: '波兰', en: 'Poland' } },
  { code: 'NL', name: { zh: '荷兰', en: 'Netherlands' } },
  { code: 'SE', name: { zh: '瑞典', en: 'Sweden' } },
  { code: 'CH', name: { zh: '瑞士', en: 'Switzerland' } },
  { code: 'TW', name: { zh: '中国台湾', en: 'Taiwan' } },
  { code: 'HK', name: { zh: '中国香港', en: 'Hong Kong' } },
  { code: 'MO', name: { zh: '中国澳门', en: 'Macau' } },
  { code: 'OTHER', name: { zh: '其他', en: 'Other' } }
]

function detectLang() {
  const saved = localStorage.getItem('app_lang')
  if (saved && locales[saved]) return saved
  const nav = (navigator.language || 'en').toLowerCase()
  if (nav.startsWith('zh')) return 'zh'
  if (nav.startsWith('ja')) return 'ja'
  if (nav.startsWith('ko')) return 'ko'
  if (nav.startsWith('es')) return 'es'
  if (nav.startsWith('fr')) return 'fr'
  if (nav.startsWith('de')) return 'de'
  if (nav.startsWith('pt')) return 'pt'
  if (nav.startsWith('ru')) return 'ru'
  if (nav.startsWith('ar')) return 'ar'
  if (nav.startsWith('th')) return 'th'
  if (nav.startsWith('vi')) return 'vi'
  if (nav.startsWith('id')) return 'id'
  if (nav.startsWith('tr')) return 'tr'
  if (nav.startsWith('it')) return 'it'
  if (nav.startsWith('hi')) return 'hi'
  return 'en'
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang)

  const setLang = (code) => {
    if (!locales[code]) return
    localStorage.setItem('app_lang', code)
    setLangState(code)
    document.documentElement.lang = code
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
  }

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const t = useMemo(() => {
    const dict = locales[lang] || locales.en
    return (key, params = {}) => {
      let str = dict[key] ?? locales.en[key] ?? key
      Object.keys(params).forEach(k => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k])
      })
      return str
    }
  }, [lang])

  const countryName = (code) => {
    const c = COUNTRIES.find(x => x.code === code)
    if (!c) return code || ''
    return c.name[lang] || c.name.en || code
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t, countryName, LANG_LIST, COUNTRIES }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
