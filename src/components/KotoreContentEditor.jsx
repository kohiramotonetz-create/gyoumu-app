import { useCallback, useEffect, useRef, useState } from 'react'
import { MarkdownEditor, MarkdownRenderer } from './common/KotoreMarkdown.jsx'
import KotoreImageManager from './KotoreImageManager.jsx'
import { createEmptyKotoreContent, KOTORE_CONTENT_TYPE_LABELS, KOTORE_IMPORTANCE_OPTIONS, toDatetimeLocalValue, toIsoOrEmpty } from '../utils/kotoreContent.js'
import { getKotoreManagementErrorMessage, postManagementAction } from '../utils/managementApi.js'
import './KotoreAdmin.css'
import './KotoreContentEditor.css'

function normalizeEditorContent(content, contentType) {
  const source = content || createEmptyKotoreContent(contentType)
  return { ...source, publishStart: toDatetimeLocalValue(source.publishStart), publishEnd: toDatetimeLocalValue(source.publishEnd) }
}

export default function KotoreContentEditor({ contentType, GAS_URL, API_KEY, sessionToken, onBack, onSessionExpired }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(() => normalizeEditorContent(null, contentType))
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [status, setStatus] = useState({ loading: true, saving: false, error: '', message: '' })
  const textareaRef = useRef(null)
  const isNotice = contentType === 'notice'
  const dirty = savedSnapshot && JSON.stringify(form) !== savedSnapshot

  const load = useCallback(async preferredId => {
    setStatus(previous => ({ ...previous, loading: true, error: '', message: '' }))
    try {
      const data = await postManagementAction(GAS_URL, { action: 'listKotoreContentsAdmin', apiKey: API_KEY, sessionToken, contentType })
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getKotoreManagementErrorMessage(data, 'コンテンツを取得できませんでした'))
      }
      const nextItems = data.contents || []
      const nextContent = nextItems.find(item => item.contentId === preferredId) || nextItems[0] || null
      const nextForm = normalizeEditorContent(nextContent, contentType)
      setItems(nextItems)
      setForm(nextForm)
      setSavedSnapshot(JSON.stringify(nextForm))
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })) }
    finally { setStatus(previous => ({ ...previous, loading: false })) }
  }, [GAS_URL, API_KEY, sessionToken, contentType, onSessionExpired])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const warn = event => { if (!dirty) return; event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const selectItem = item => {
    if (dirty && !window.confirm('未保存の変更を破棄して別のコンテンツを開きますか？')) return
    const next = normalizeEditorContent(item, contentType)
    setForm(next); setSavedSnapshot(JSON.stringify(next)); setStatus(previous => ({ ...previous, error: '', message: '' }))
  }
  const createNew = () => {
    if (dirty && !window.confirm('未保存の変更を破棄して新規作成しますか？')) return
    const next = normalizeEditorContent(null, contentType)
    setForm(next); setSavedSnapshot(JSON.stringify(next))
  }
  const update = (field, value) => setForm(previous => ({ ...previous, [field]: value }))
  const save = async publish => {
    if (!form.title.trim()) return setStatus(previous => ({ ...previous, error: 'タイトルを入力してください。' }))
    if (publish && !window.confirm('現在の下書きを講師向けに公開しますか？')) return
    setStatus(previous => ({ ...previous, saving: true, error: '', message: '' }))
    try {
      const payload = { action: publish ? 'publishKotoreContent' : 'saveKotoreContentDraft', apiKey: API_KEY, sessionToken, contentId: form.contentId, contentType, title: form.title, draftMarkdown: form.draftMarkdown, importance: form.importance, publishStart: toIsoOrEmpty(form.publishStart), publishEnd: toIsoOrEmpty(form.publishEnd), expectedUpdatedAt: form.updatedAt || '' }
      const data = await postManagementAction(GAS_URL, payload)
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getKotoreManagementErrorMessage(data, publish ? '公開できませんでした' : '下書きを保存できませんでした'))
      }
      await load(data.content?.contentId || form.contentId)
      setStatus(previous => ({ ...previous, message: publish ? '公開しました。' : '下書きを保存しました。' }))
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })) }
    finally { setStatus(previous => ({ ...previous, saving: false })) }
  }
  const remove = async () => {
    if (!isNotice || !form.contentId || !window.confirm(`「${form.title}」を削除しますか？`)) return
    setStatus(previous => ({ ...previous, saving: true, error: '', message: '' }))
    try {
      const data = await postManagementAction(GAS_URL, { action: 'deleteKotoreNotice', apiKey: API_KEY, sessionToken, contentId: form.contentId, expectedUpdatedAt: form.updatedAt })
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getKotoreManagementErrorMessage(data, 'お知らせを削除できませんでした'))
      }
      await load()
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })) }
    finally { setStatus(previous => ({ ...previous, saving: false })) }
  }
  const insertImage = markdown => {
    const textarea = textareaRef.current
    const at = textarea?.selectionStart
    setForm(previous => {
      const position = at ?? previous.draftMarkdown.length
      return { ...previous, draftMarkdown: `${previous.draftMarkdown.slice(0, position)}\n${markdown}\n${previous.draftMarkdown.slice(position)}` }
    })
    requestAnimationFrame(() => textarea?.focus())
  }
  const metadata = [{ label: '作成日時', value: form.createdAt }, { label: '更新日時', value: form.updatedAt }, { label: '公開日時', value: form.publishedAt }].filter(item => item.value)

  const safeBack = () => { if (!dirty || window.confirm('未保存の変更を破棄して一覧へ戻りますか？')) onBack() }
  return <section className="kotore-admin-editor" aria-busy={status.saving}><header className="kotore-admin-editor__top"><div><button type="button" className="kotore-back-button" onClick={safeBack}>← 管理者メニューへ</button><h2>{KOTORE_CONTENT_TYPE_LABELS[contentType]}編集</h2></div><div><button type="button" className="kotore-secondary-button" disabled={status.saving || status.loading} onClick={() => save(false)}>下書き保存</button><button type="button" className="kotore-primary-button" disabled={status.saving || status.loading} onClick={() => save(true)}>公開する</button></div></header>{status.error && <div className="admin-inline-error" role="alert">{status.error}</div>}{status.message && <div className="admin-inline-success" role="status">{status.message}</div>}{status.loading ? <div className="kotore-message" role="status">編集データを取得中…</div> : <><div className="kotore-admin-editor__selector">{isNotice && <button type="button" className="kotore-create-notice-button" onClick={createNew}>＋ 新しいお知らせ</button>}{items.map(item => <button type="button" key={item.contentId} className={form.contentId === item.contentId ? 'is-selected' : ''} onClick={() => selectItem(item)}>{item.title}<small>{item.status === 'published' ? '公開中' : '下書き'}</small></button>)}</div><div className="kotore-admin-editor__layout"><div className="kotore-admin-panel"><h3>Markdownエディタ</h3><MarkdownEditor value={form.draftMarkdown} onChange={value => update('draftMarkdown', value)} textareaRef={textareaRef} describedBy="kotore-markdown-count"/><KotoreImageManager GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onInsert={insertImage} onSessionExpired={onSessionExpired}/></div><div className="kotore-admin-panel"><h3>プレビュー（講師側の表示イメージ）</h3><div className="kotore-preview"><MarkdownRenderer markdown={form.draftMarkdown} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired}/></div></div><aside className="kotore-admin-settings"><section><h3>基本設定</h3><label>タイトル<input value={form.title} maxLength="120" onChange={event => update('title', event.target.value)} /></label><label>重要度<select value={form.importance} onChange={event => update('importance', event.target.value)}>{KOTORE_IMPORTANCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><p>状態：<strong>{form.status === 'published' ? '公開中' : '下書き'}</strong></p></section><section><h3>公開期間（任意）</h3><label>公開開始<input type="datetime-local" value={form.publishStart} onChange={event => update('publishStart', event.target.value)} /></label><label>公開終了<input type="datetime-local" value={form.publishEnd} onChange={event => update('publishEnd', event.target.value)} /></label></section>{metadata.length > 0 && <section><h3>更新情報</h3>{metadata.map(item => <p key={item.label}>{item.label}<br/><span>{new Date(item.value).toLocaleString('ja-JP')}</span></p>)}</section>}{isNotice && form.contentId && <button type="button" className="kotore-danger-button" onClick={remove}>お知らせを削除</button>}</aside></div></>}</section>
}
