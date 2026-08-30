import { useMemo, useState } from 'react'
import { modelAnswerBooks } from '../constants/data.js'
import { filterModelAnswerBooks, inferModelAnswerSubject } from '../utils/kotoreContent.js'
import './KoToreMenu.css'

const GRADES = ['中1', '中2', '中3']
const SUBJECTS = ['英語', '数学', '国語', '理科', '社会']

export default function ModelAnswerShelf() {
  const [grade, setGrade] = useState('中1')
  const [subject, setSubject] = useState('')
  const [query, setQuery] = useState('')
  const books = useMemo(() => filterModelAnswerBooks(modelAnswerBooks, { grade, subject, query }), [grade, subject, query])
  const [selectedId, setSelectedId] = useState(null)
  const [coverFailures, setCoverFailures] = useState(() => new Set())
  const [pdfState, setPdfState] = useState({ pdf: '', loaded: false, failed: false })
  const selectedBook = books.find(book => book.id === selectedId) || books[0] || null
  const selectedPdfState = selectedBook?.pdf === pdfState.pdf ? pdfState : { pdf: selectedBook?.pdf || '', loaded: false, failed: false }

  return <section className="model-answer-page" aria-labelledby="model-answer-title">
    <header className="kotore-subpage__header"><div><h2 id="model-answer-title">模範解答</h2><p>学年・科目・教材を選択して、既存の模範解答PDFを確認できます。</p></div></header>
    <div className="model-answer-layout">
      <aside className="model-answer-filter"><h3>検索・絞り込み</h3><label>学年<select value={grade} onChange={event => { setGrade(event.target.value); setSelectedId(null) }}>{GRADES.map(item => <option key={item}>{item}</option>)}</select></label><label>科目<select value={subject} onChange={event => { setSubject(event.target.value); setSelectedId(null) }}><option value="">すべて</option>{SUBJECTS.map(item => <option key={item}>{item}</option>)}</select></label><label>教材名<input value={query} onChange={event => { setQuery(event.target.value); setSelectedId(null) }} placeholder="教材名で検索" /></label><button type="button" className="kotore-secondary-button" onClick={() => { setSubject(''); setQuery(''); setSelectedId(null) }}>条件をクリア</button></aside>
      <div className="model-answer-list"><div className="model-answer-list__title"><h3>教材一覧</h3><span>全{books.length}件</span></div>{books.length === 0 ? <div className="kotore-message">条件に該当する教材はありません。</div> : books.map(book => <button type="button" key={book.id} className={`model-answer-book ${selectedBook?.id === book.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(book.id)}>{coverFailures.has(book.id) ? <span className="model-answer-book__fallback" aria-hidden="true">PDF</span> : <img src={book.cover} alt="" onError={() => setCoverFailures(previous => new Set(previous).add(book.id))} />}<span><strong>{book.title}</strong><small>{book.grade}・{inferModelAnswerSubject(book.title)}</small></span><span aria-hidden="true">›</span></button>)}</div>
      <div className="model-answer-viewer"><div className="model-answer-viewer__title"><div><h3>模範解答</h3>{selectedBook && <p>{selectedBook.title}</p>}</div>{selectedBook && <button type="button" onClick={() => window.open(selectedBook.pdf, '_blank', 'noopener,noreferrer')}>別ウィンドウで開く</button>}</div>{selectedBook ? <>{!selectedPdfState.loaded && !selectedPdfState.failed && <div className="kotore-message" role="status">PDFを読み込み中…</div>}{selectedPdfState.failed ? <div className="kotore-message kotore-message--error" role="alert">PDFを読み込めませんでした。別ウィンドウ表示をお試しください。</div> : <iframe key={selectedBook.pdf} src={selectedBook.pdf} title={`${selectedBook.title} 模範解答`} onLoad={() => setPdfState({ pdf: selectedBook.pdf, loaded: true, failed: false })} onError={() => setPdfState({ pdf: selectedBook.pdf, loaded: false, failed: true })} />}</> : <div className="kotore-message">表示する教材を選択してください。</div>}</div>
    </div>
  </section>
}
