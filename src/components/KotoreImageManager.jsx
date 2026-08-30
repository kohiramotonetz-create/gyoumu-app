import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { AuthenticatedKotoreImage } from './common/KotoreMarkdown.jsx'
import { getKotoreManagementErrorMessage, postManagementAction } from '../utils/managementApi.js'
import { extractImageBase64 } from '../utils/kotoreContent.js'
import './KotoreImageManager.css'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try { resolve(extractImageBase64(reader.result)) }
      catch (error) { reject(error) }
    }
    reader.onerror = () => reject(new Error('画像を読み込めませんでした'))
    reader.readAsDataURL(file)
  })
}

const KotoreImageManager = forwardRef(function KotoreImageManager({ GAS_URL, API_KEY, sessionToken, onInsert, onSessionExpired }, ref) {
  const [images, setImages] = useState([])
  const [status, setStatus] = useState({ loading: true, saving: false, error: '' })
  const fileInputRef = useRef(null)
  useImperativeHandle(ref, () => ({ openFilePicker: () => fileInputRef.current?.click() }), [])

  const load = useCallback(async () => {
    setStatus(previous => ({ ...previous, loading: true, error: '' }))
    try {
      const data = await postManagementAction(GAS_URL, { action: 'listKotoreContentImagesAdmin', apiKey: API_KEY, sessionToken })
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getKotoreManagementErrorMessage(data, '画像一覧を取得できませんでした'))
      }
      setImages(data.images || [])
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })) }
    finally { setStatus(previous => ({ ...previous, loading: false })) }
  }, [GAS_URL, API_KEY, sessionToken, onSessionExpired])

  useEffect(() => { load() }, [load])

  const upload = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.has(file.type)) return setStatus(previous => ({ ...previous, error: 'PNG・JPEG・GIF・WebP画像を選択してください。' }))
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return setStatus(previous => ({ ...previous, error: '画像は10MB以下で選択してください。' }))
    setStatus(previous => ({ ...previous, saving: true, error: '' }))
    try {
      const base64 = await fileToBase64(file)
      const data = await postManagementAction(GAS_URL, { action: 'uploadKotoreContentImage', apiKey: API_KEY, sessionToken, originalName: file.name, mimeType: file.type, sizeBytes: file.size, base64 }, 60000)
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getKotoreManagementErrorMessage(data, '画像をアップロードできませんでした'))
      }
      await load()
      onInsert(`![${file.name || '画像'}](kotore-image://${data.image.imageId})`)
    } catch (error) {
      const message = String(error?.message || '')
      const safeMessage = message && !/network error|timeout|status code/i.test(message) ? message : '画像のアップロードに失敗しました'
      setStatus(previous => ({ ...previous, error: safeMessage }))
    }
    finally { setStatus(previous => ({ ...previous, saving: false })) }
  }

  const remove = async image => {
    if (!window.confirm(`「${image.originalName}」を削除しますか？`)) return
    setStatus(previous => ({ ...previous, saving: true, error: '' }))
    try {
      const data = await postManagementAction(GAS_URL, { action: 'deleteKotoreContentImage', apiKey: API_KEY, sessionToken, imageId: image.imageId })
      if (data.result !== 'success') {
        if (data.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
        throw new Error(getKotoreManagementErrorMessage(data, '画像を削除できませんでした'))
      }
      await load()
    } catch (error) { setStatus(previous => ({ ...previous, error: error.message })) }
    finally { setStatus(previous => ({ ...previous, saving: false })) }
  }

  return <section className="kotore-image-manager"><div className="kotore-image-manager__header"><h3>画像管理</h3><button type="button" className="kotore-secondary-button" disabled={status.saving} onClick={() => fileInputRef.current?.click()}>画像を追加</button><input ref={fileInputRef} className="kotore-visually-hidden" type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={status.saving} onChange={upload} /></div>{status.error && <p className="admin-inline-error" role="alert">{status.error}</p>}{status.loading ? <p role="status">画像を取得中…</p> : images.length === 0 ? <p className="admin-empty">登録画像はありません。</p> : <div className="kotore-image-list">{images.map(image => <div key={image.imageId}><div className="kotore-image-list__thumbnail"><AuthenticatedKotoreImage src={`kotore-image://${image.imageId}`} alt={image.originalName} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired}/></div><strong>{image.originalName}</strong><small>{Math.ceil(image.sizeBytes / 1024)}KB</small><button type="button" onClick={() => onInsert(`![${image.originalName || '画像'}](kotore-image://${image.imageId})`)}>本文へ挿入</button><button type="button" className="is-danger" onClick={() => remove(image)}>削除</button></div>)}</div>}</section>
})

export default KotoreImageManager
