import { useCallback, useEffect, useState } from 'react'
import { externalServiceAccounts, studentAccountRules } from '../constants/data.js'
import { getManagementErrorMessage, postManagementAction } from '../utils/managementApi.js'
import { buildLegacyPasswordEntries, isLegacyPasswordResponse } from '../utils/passwordEntries.js'
import './KotoreAdmin.css'

function legacyEntries() {
  return buildLegacyPasswordEntries(externalServiceAccounts, studentAccountRules)
}

const EMPTY_FORM = { passwordEntryId: '', category: 'service', serviceName: '', school: '', url: '', loginId: '', password: '', note: '', creatorRule: '', sortOrder: 1, updatedAt: '' }

export default function PasswordManager({ GAS_URL, API_KEY, sessionToken, role, onSessionExpired }) {
  const [entries, setEntries] = useState(() => legacyEntries())
  const [legacyMode, setLegacyMode] = useState(true)
  const [visible, setVisible] = useState(() => new Set())
  const [form, setForm] = useState(null)
  const [status, setStatus] = useState({ loading: true, saving: false, error: '', message: '' })
  const isAdmin = role === 'admin'

  const load = useCallback(async () => {
    setStatus(previous => ({ ...previous, loading: true, error: '', message: '' }))
    try {
      const data = await postManagementAction(GAS_URL, { action: 'getPasswordEntries', apiKey: API_KEY, sessionToken })
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        if (isLegacyPasswordResponse(data)) {
          setEntries(legacyEntries()); setLegacyMode(true); return
        }
        setEntries([]); setLegacyMode(false)
        throw new Error(getManagementErrorMessage(data, 'パスワード一覧を取得できませんでした'))
      }
      if (isLegacyPasswordResponse(data)) {
        setEntries(legacyEntries()); setLegacyMode(true); return
      }
      setEntries(data.entries || []); setLegacyMode(false)
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })) }
    finally { setStatus(previous => ({ ...previous, loading: false })) }
  }, [GAS_URL, API_KEY, sessionToken, onSessionExpired])
  useEffect(() => { load() }, [load])

  const save = async event => {
    event.preventDefault()
    setStatus(previous => ({ ...previous, saving: true, error: '', message: '' }))
    try {
      const data = await postManagementAction(GAS_URL, { action: form.passwordEntryId ? 'updatePasswordEntry' : 'createPasswordEntry', apiKey: API_KEY, sessionToken, entry: form, expectedUpdatedAt: form.updatedAt || '' })
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getManagementErrorMessage(data, '保存できませんでした'))
      }
      setForm(null); await load(); setStatus(previous => ({ ...previous, message: '保存しました。' }))
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })) }
    finally { setStatus(previous => ({ ...previous, saving: false })) }
  }
  const remove = async entry => {
    if (!window.confirm(`「${entry.serviceName || entry.school}」を削除しますか？`)) return
    setStatus(previous => ({ ...previous, saving: true, error: '', message: '' }))
    try {
      const data = await postManagementAction(GAS_URL, { action: 'deletePasswordEntry', apiKey: API_KEY, sessionToken, passwordEntryId: entry.passwordEntryId, expectedUpdatedAt: entry.updatedAt || '' })
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getManagementErrorMessage(data, '削除できませんでした'))
      }
      await load()
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })) }
    finally { setStatus(previous => ({ ...previous, saving: false })) }
  }
  const move = async (entry, direction) => {
    const index = entries.findIndex(item => item.passwordEntryId === entry.passwordEntryId)
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= entries.length) return
    const ordered = [...entries]; [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]]
    setEntries(ordered)
    setStatus(previous => ({ ...previous, saving: true, error: '', message: '' }))
    try {
      const data = await postManagementAction(GAS_URL, { action: 'reorderPasswordEntries', apiKey: API_KEY, sessionToken, passwordEntryIds: ordered.map(item => item.passwordEntryId), expectedUpdatedAtById: Object.fromEntries(entries.map(item => [item.passwordEntryId, item.updatedAt])) })
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getManagementErrorMessage(data, '並べ替えできませんでした'))
      }
      await load()
    } catch (error) {
      await load()
      setStatus(previous => ({ ...previous, error: error.message || '並べ替えできませんでした' }))
    } finally { setStatus(previous => ({ ...previous, saving: false })) }
  }

  return <section className="password-manager"><header className="kotore-subpage__header"><div><h2>各種パスワード</h2><p>外部サービス等の認証情報を確認します。</p></div>{isAdmin && !legacyMode && <button type="button" className="kotore-primary-button" onClick={() => setForm({ ...EMPTY_FORM, sortOrder: entries.length })}>＋ 追加</button>}</header><div className={legacyMode ? 'admin-inline-warning' : 'admin-inline-success'} role="status">{legacyMode ? '現在：既存データを使用中 / 移行前のため閲覧のみ可能' : '現在：各種パスワードシートを使用中'}</div>{status.error && <div className="admin-inline-error" role="alert">{status.error}</div>}{status.message && <div className="admin-inline-success" role="status">{status.message}</div>}{status.loading ? <div className="kotore-message" role="status">パスワード一覧を取得中…</div> : entries.length === 0 ? <div className="kotore-message">登録された項目はありません。</div> : <div className="password-table-wrap"><table><thead><tr><th>サービス／校舎</th><th>ログインID</th><th>パスワード</th><th>作成者・備考</th>{isAdmin && !legacyMode && <th>管理</th>}</tr></thead><tbody>{entries.map((entry, index) => <tr key={entry.passwordEntryId}><td>{entry.url ? <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.serviceName || entry.school}</a> : entry.serviceName || entry.school}</td><td>{entry.loginId || '-'}</td><td><span className="password-value">{visible.has(entry.passwordEntryId) ? entry.password || '-' : entry.password ? '••••••••' : '-'}</span>{entry.password && <button type="button" className="password-reveal" onClick={() => setVisible(previous => { const next = new Set(previous); next.has(entry.passwordEntryId) ? next.delete(entry.passwordEntryId) : next.add(entry.passwordEntryId); return next })}>{visible.has(entry.passwordEntryId) ? '隠す' : '表示'}</button>}</td><td>{[entry.creatorRule, entry.note].filter(Boolean).join('／') || '-'}</td>{isAdmin && !legacyMode && <td className="password-actions"><button type="button" onClick={() => setForm({ ...entry })}>編集</button><button type="button" disabled={index === 0} onClick={() => move(entry, -1)}>↑</button><button type="button" disabled={index === entries.length - 1} onClick={() => move(entry, 1)}>↓</button><button type="button" className="is-danger" onClick={() => remove(entry)}>削除</button></td>}</tr>)}</tbody></table></div>}{form && <div className="password-editor-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && window.confirm('入力内容を破棄しますか？')) setForm(null) }}><form className="password-editor" onSubmit={save}><h3>{form.passwordEntryId ? 'パスワード項目を編集' : 'パスワード項目を追加'}</h3><label>区分<select value={form.category} onChange={event => setForm(previous => ({ ...previous, category: event.target.value }))}><option value="service">サービス</option><option value="student-rule">生徒用作成ルール</option></select></label><label>サービス名<input required maxLength="120" value={form.serviceName} onChange={event => setForm(previous => ({ ...previous, serviceName: event.target.value }))}/></label><label>校舎<input maxLength="100" value={form.school} onChange={event => setForm(previous => ({ ...previous, school: event.target.value }))}/></label><label>URL<input type="url" value={form.url} onChange={event => setForm(previous => ({ ...previous, url: event.target.value }))}/></label><label>ログインID<input maxLength="250" value={form.loginId} onChange={event => setForm(previous => ({ ...previous, loginId: event.target.value }))}/></label><label>パスワード<input maxLength="500" value={form.password} onChange={event => setForm(previous => ({ ...previous, password: event.target.value }))}/></label><label>作成者ルール<input maxLength="250" value={form.creatorRule} onChange={event => setForm(previous => ({ ...previous, creatorRule: event.target.value }))}/></label><label>備考<textarea maxLength="1000" value={form.note} onChange={event => setForm(previous => ({ ...previous, note: event.target.value }))}/></label><div><button type="button" className="kotore-secondary-button" onClick={() => setForm(null)}>キャンセル</button><button type="submit" className="kotore-primary-button" disabled={status.saving}>保存</button></div></form></div>}</section>
}
