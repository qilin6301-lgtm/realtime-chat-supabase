// 设备 ID 与会话管理

const DEVICE_KEY = 'dating_device_id'
const DEVICE_NAME_KEY = 'dating_device_name'

export function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function getDeviceName() {
  let name = localStorage.getItem(DEVICE_NAME_KEY)
  if (!name) {
    const ua = navigator.userAgent
    if (/Mobile|Android|iPhone/i.test(ua)) name = '手机浏览器'
    else if (/Mac/i.test(ua)) name = 'Mac'
    else if (/Windows/i.test(ua)) name = 'Windows'
    else name = '未知设备'
    localStorage.setItem(DEVICE_NAME_KEY, name)
  }
  return name
}

/**
 * 注册当前设备会话，超过 max_devices 则踢掉最旧的
 * @returns {{ ok: boolean, message?: string }}
 */
export async function registerDeviceSession(supabase, userId, maxDevices = 1) {
  const deviceId = getOrCreateDeviceId()
  const deviceName = getDeviceName()

  // 更新或插入当前设备
  const { error: upsertErr } = await supabase.from('user_sessions').upsert({
    user_id: userId,
    device_id: deviceId,
    device_name: deviceName,
    last_active: new Date().toISOString()
  }, { onConflict: 'user_id,device_id' })

  if (upsertErr) {
    console.error(upsertErr)
    return { ok: false, message: '设备注册失败' }
  }

  // 查询该用户所有会话
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('last_active', { ascending: true })

  const list = sessions || []
  if (list.length > maxDevices) {
    // 踢掉最旧的多余设备（保留当前）
    const toRemove = list
      .filter(s => s.device_id !== deviceId)
      .slice(0, list.length - maxDevices)

    for (const s of toRemove) {
      await supabase.from('user_sessions').delete().eq('id', s.id)
    }
  }

  return { ok: true, deviceId }
}

/** 检查当前设备是否仍在有效会话中 */
export async function checkDeviceValid(supabase, userId) {
  const deviceId = getOrCreateDeviceId()
  const { data } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .single()

  return !!data
}

/** 心跳更新 last_active */
export async function heartbeatDevice(supabase, userId) {
  const deviceId = getOrCreateDeviceId()
  await supabase
    .from('user_sessions')
    .update({ last_active: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('device_id', deviceId)
}
