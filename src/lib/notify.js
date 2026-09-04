/** Browser notifications helper */

export async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const r = await Notification.requestPermission()
  return r === 'granted'
}

export function notifyNewMessage({ title, body, onClick }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return

  try {
    const n = new Notification(title || 'New message', {
      body: body || '',
      icon: '/favicon.ico',
      tag: 'chat-msg'
    })
    n.onclick = () => {
      window.focus()
      onClick?.()
      n.close()
    }
  } catch (e) {
    console.warn('notify failed', e)
  }
}
