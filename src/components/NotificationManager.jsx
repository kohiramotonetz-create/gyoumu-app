import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import './KoToreMenu.css'

const POLL_INTERVAL_MS = 5000

export default function NotificationManager({ GAS_URL, API_KEY, unit, schools = [], refreshResult = null }) {
  const [notifications, setNotifications] = useState([])
  const [selectedSchool, setSelectedSchool] = useState('すべて')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingKey, setPendingKey] = useState('')
  const inFlightRef = useRef(false)
  const requestVersionRef = useRef(0)

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    const requestVersion = ++requestVersionRef.current
    if (!silent) setLoading(true)
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'getNotifications', apiKey: API_KEY, unit }), {
        headers: { 'Content-Type': 'text/plain' }, timeout: 30000,
      })
      if (response.data?.result !== 'success') throw new Error(response.data?.message || '依頼を取得できませんでした')
      if (requestVersion === requestVersionRef.current) {
        setNotifications(Array.isArray(response.data.notifications) ? response.data.notifications : [])
        setError('')
      }
    } catch (requestError) {
      if (!silent && requestVersion === requestVersionRef.current) setError(requestError.message || '依頼を取得できませんでした')
    } finally {
      inFlightRef.current = false
      if (!silent) setLoading(false)
    }
  }, [GAS_URL, API_KEY, unit])

  useEffect(() => {
    fetchNotifications()
    const timer = window.setInterval(() => fetchNotifications({ silent: true }), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [fetchNotifications])

  useEffect(() => {
    if (!refreshResult) return
    requestVersionRef.current += 1
    if (Array.isArray(refreshResult.notifications)) {
      setNotifications(refreshResult.notifications)
      setError('')
      setLoading(false)
    } else if (refreshResult.error) {
      setError(refreshResult.error)
      setLoading(false)
    }
  }, [refreshResult])

  const runAction = async (action, notification) => {
    const key = `${action}:${notification.queueNumber}`
    if (pendingKey) return
    setPendingKey(key)
    setError('')
    const payload = action === 'startSupport'
      ? { action, apiKey: API_KEY, unit, queueNumber: notification.queueNumber }
      : { action, apiKey: API_KEY, unit, userId: notification.userId, userName: notification.name, queueNumber: notification.queueNumber }
    try {
      const response = await axios.post(GAS_URL, JSON.stringify(payload), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000 })
      if (response.data?.result !== 'success') throw new Error(response.data?.message || '操作を完了できませんでした')
      await fetchNotifications()
    } catch (requestError) {
      setError(requestError.message || (action === 'startSupport' ? '対応開始に失敗しました' : '対応完了に失敗しました'))
    } finally {
      setPendingKey('')
    }
  }

  const availableSchools = useMemo(() => ['すべて', ...new Set(schools.filter(Boolean))], [schools])
  const filtered = notifications.filter(item => selectedSchool === 'すべて' || item.school === selectedSchool)

  return (
    <section className="kotore-subpage" aria-labelledby="notification-title">
      <header className="kotore-subpage__header">
        <div><h2 id="notification-title">丸付け・質問待ち</h2><p>受付順に確認し、対応開始・完了を記録します。</p></div>
        <label className="kotore-queue-filter">校舎<select value={selectedSchool} onChange={event => setSelectedSchool(event.target.value)}>{availableSchools.map(school => <option key={school}>{school}</option>)}</select></label>
      </header>
      {error && <div className="kotore-message kotore-message--error" role="alert">{error}<button type="button" onClick={() => fetchNotifications()}>再試行</button></div>}
      {loading ? <div className="kotore-message" role="status">依頼を取得中…</div> : filtered.length === 0 ? <div className="kotore-message">{selectedSchool === 'すべて' ? '現在、依頼はありません。' : `${selectedSchool}校の依頼はありません。`}</div> : (
        <div className="kotore-queue-table-wrap"><table className="kotore-queue-table"><thead><tr><th>待ち順</th><th>受付時刻</th><th>生徒名</th><th>学年</th><th>校舎</th><th>ステータス</th><th>操作</th></tr></thead><tbody>{filtered.map(item => {
          const processing = String(item.status || '').includes('（対応中）')
          const action = processing ? 'deleteNotification' : 'startSupport'
          return <tr key={`${item.queueNumber}-${item.userId}`}><td><span className="kotore-queue-number">{item.queueNumber}</span></td><td>{item.time}</td><td className="kotore-queue-name">{item.name}</td><td>{item.grade}</td><td>{item.school}</td><td><span className={`kotore-status kotore-status--${String(item.status || '').includes('SOS') ? 'sos' : String(item.status || '').includes('質問') ? 'question' : 'marking'}`}>{item.status}</span></td><td><button className={processing ? 'kotore-action kotore-action--complete' : 'kotore-action'} disabled={Boolean(pendingKey)} onClick={() => runAction(action, item)}>{pendingKey === `${action}:${item.queueNumber}` ? '処理中…' : processing ? '対応完了' : '対応開始'}</button></td></tr>
        })}</tbody></table></div>
      )}
    </section>
  )
}
