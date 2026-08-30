export const KOTORE_CONTENT_TYPES = Object.freeze({
  NOTICE: 'notice',
  GUIDE: 'guide',
  MENU_GUIDE: 'menu-guide',
})

export const KOTORE_CONTENT_TYPE_LABELS = Object.freeze({
  notice: 'お知らせ',
  guide: '個トレの仕方',
  'menu-guide': 'メニューの使い方',
})

export const KOTORE_IMPORTANCE_OPTIONS = Object.freeze([
  { value: 'normal', label: '通常' },
  { value: 'important', label: '重要' },
])

const MODEL_ANSWER_SUBJECTS = [
  ['英語', /英語/],
  ['数学', /数学/],
  ['国語', /国語/],
  ['理科', /理科/],
  ['社会', /社会/],
]

export function inferModelAnswerSubject(title) {
  return MODEL_ANSWER_SUBJECTS.find(([, pattern]) => pattern.test(String(title || '')))?.[0] || 'その他'
}

export function filterModelAnswerBooks(books, filters) {
  const query = String(filters.query || '').trim().toLocaleLowerCase('ja')
  return books.filter(book => {
    const subject = inferModelAnswerSubject(book.title)
    return (!filters.grade || book.grade === filters.grade)
      && (!filters.subject || subject === filters.subject)
      && (!query || String(book.title || '').toLocaleLowerCase('ja').includes(query))
  })
}

export function normalizeKotoreContentResponse(data) {
  return {
    notices: Array.isArray(data?.notices) ? data.notices : [],
    guide: data?.guide || null,
    menuGuide: data?.menuGuide || null,
    serverTime: data?.serverTime || '',
  }
}

export function isAuthorizationResponse(data) {
  return data?.code === 'AUTHORIZATION_ERROR'
}

export function createEmptyKotoreContent(contentType) {
  return {
    contentId: '',
    contentType,
    title: KOTORE_CONTENT_TYPE_LABELS[contentType] || '',
    draftMarkdown: '',
    publishedMarkdown: '',
    importance: 'normal',
    status: 'draft',
    publishStart: '',
    publishEnd: '',
    updatedAt: '',
    createdAt: '',
    createdBy: '',
    updatedBy: '',
    publishedAt: '',
    publishedBy: '',
  }
}

export function toDatetimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function toIsoOrEmpty(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function insertMarkdownAtSelection(value, start, end, before, after = '', placeholder = '') {
  const selected = value.slice(start, end) || placeholder
  const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
  return {
    value: nextValue,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  }
}
