import { useEffect, useRef, useState } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import axios from 'axios'
import { insertMarkdownAtSelection } from '../../utils/kotoreContent.js'
import './KotoreMarkdown.css'

const imageSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src || []), 'kotore-image'],
  },
}

export function AuthenticatedKotoreImage({ src, alt, GAS_URL, API_KEY, sessionToken, onSessionExpired }) {
  const [objectUrl, setObjectUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!String(src || '').startsWith('kotore-image://')) return undefined
    let active = true
    let createdUrl = ''
    const imageId = src.slice('kotore-image://'.length)
    axios.post(GAS_URL, JSON.stringify({
      action: 'getKotoreContentImage', apiKey: API_KEY, sessionToken, imageId,
    }), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000 })
      .then(response => {
        if (!active) return
        if (response.data?.result !== 'success') {
          if (response.data?.code === 'AUTHORIZATION_ERROR') onSessionExpired?.()
          throw new Error('image unavailable')
        }
        const binary = atob(response.data.base64 || '')
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
        createdUrl = URL.createObjectURL(new Blob([bytes], { type: response.data.mimeType }))
        if (active) setObjectUrl(createdUrl)
      })
      .catch(() => { if (active) setFailed(true) })
    return () => {
      active = false
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [src, GAS_URL, API_KEY, sessionToken, onSessionExpired])

  if (failed) return <span className="kotore-markdown__image-error" role="status">画像を表示できません</span>
  if (!objectUrl) return <span className="kotore-markdown__image-loading" role="status">画像を読み込み中…</span>
  return <img src={objectUrl} alt={alt || '個トレコンテンツ画像'} loading="lazy" />
}

export function MarkdownRenderer({ markdown, GAS_URL, API_KEY, sessionToken, onSessionExpired, className = '' }) {
  return (
    <div className={`kotore-markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, imageSchema]]}
        urlTransform={url => url.startsWith('kotore-image://') ? url : defaultUrlTransform(url)}
        components={{
          a: props => <a {...props} target="_blank" rel="noopener noreferrer" />,
          img: props => <AuthenticatedKotoreImage {...props} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} />,
        }}
      >
        {markdown || ''}
      </ReactMarkdown>
    </div>
  )
}

const TOOLS = [
  ['見出し', '## ', '', '見出し'],
  ['太字', '**', '**', '太字'],
  ['斜体', '*', '*', '斜体'],
  ['箇条書き', '- ', '', '項目'],
  ['番号', '1. ', '', '項目'],
  ['引用', '> ', '', '引用'],
  ['リンク', '[', '](https://)', 'リンク'],
  ['表', '| 項目 | 内容 |\n| --- | --- |\n| ', ' |', '値'],
  ['区切り線', '\n---\n', '', ''],
]

export function MarkdownEditor({ value, onChange, textareaRef: externalRef, describedBy, onImageRequest }) {
  const internalRef = useRef(null)
  const textareaRef = externalRef || internalRef
  const applyTool = tool => {
    const textarea = textareaRef.current
    if (!textarea) return
    const [, before, after, placeholder] = tool
    const result = insertMarkdownAtSelection(value, textarea.selectionStart, textarea.selectionEnd, before, after, placeholder)
    onChange(result.value)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }
  return (
    <div className="kotore-editor">
      <div className="kotore-editor__toolbar" role="toolbar" aria-label="Markdown編集ツール">
        {TOOLS.map(tool => <button type="button" key={tool[0]} onClick={() => applyTool(tool)}>{tool[0]}</button>)}
        <button type="button" onClick={() => onImageRequest ? onImageRequest() : document.querySelector('.kotore-image-manager input[type="file"]')?.click()}>画像</button>
      </div>
      <textarea ref={textareaRef} value={value} onChange={event => onChange(event.target.value)} aria-describedby={describedBy} spellCheck="true" />
      <p id={describedBy} className="kotore-editor__count">Markdown: {value.length.toLocaleString()}文字</p>
    </div>
  )
}
