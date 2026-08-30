import axios from 'axios'

export async function postManagementAction(GAS_URL, payload, timeout = 30000) {
  const response = await axios.post(GAS_URL, JSON.stringify(payload), {
    headers: { 'Content-Type': 'text/plain' }, timeout,
  })
  return response.data
}

export function getManagementErrorMessage(data, fallback) {
  if (data?.code === 'AUTHORIZATION_ERROR') return '管理セッションが無効または期限切れです'
  if (data?.code === 'CONFLICT') return '別の更新が反映されています。再読み込みしてから編集してください。'
  return data?.message || fallback
}

export function getKotoreManagementErrorMessage(data, fallback) {
  if (/unknown action/i.test(String(data?.message || ''))) {
    return 'コンテンツ管理APIがまだ利用できません。GASの更新が必要です。'
  }
  return getManagementErrorMessage(data, fallback)
}
