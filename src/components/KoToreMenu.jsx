import { useEffect, useState } from 'react'
import axios from 'axios'
import NotificationManager from './NotificationManager.jsx'
import KoToreProgressTracker from './KoToreProgressTracker.jsx'
import ModelAnswerShelf from './ModelAnswerShelf.jsx'
import KoToreContentViewer from './KoToreContentViewer.jsx'
import { MarkdownRenderer } from './common/KotoreMarkdown.jsx'
import { isAuthorizationResponse, normalizeKotoreContentResponse } from '../utils/kotoreContent.js'
import { canViewModelAnswers } from '../utils/roles.js'
import './KoToreMenu.css'

const CARDS = [
  { id: 'waiting', icon: '✎', title: '丸付け・質問待ち', description: '丸付けや質問待ちのリストを確認し、対応を行います。', tone: 'green' },
  { id: 'progress', icon: '▥', title: '個トレ進捗管理', description: '生徒の個トレ進捗状況を確認・管理します。', tone: 'blue' },
  { id: 'answers', icon: '▤', title: '模範解答', description: '既存教材の模範解答PDFを確認できます。', tone: 'purple' },
  { id: 'notices', icon: '◁', title: 'お知らせ', description: '個トレに関する公開中のお知らせを確認します。', tone: 'orange' },
  { id: 'guide', icon: '◉', title: '個トレの仕方', description: '個トレの進め方や運営方法を確認できます。', tone: 'yellow' },
]

const getPublishedContentError = data => /unknown action/i.test(String(data?.message || ''))
  ? '個トレコンテンツを取得できませんでした。管理者へお問い合わせください。'
  : data?.message || '個トレコンテンツを取得できませんでした'

export default function KoToreMenu({ GAS_URL, API_KEY, sessionToken, unit, schools, assignedSchools, styles, notificationRefresh, onSessionExpired, role }) {
  const [view, setView] = useState('home')
  const [contentState, setContentState] = useState({ loading: true, error: '', data: normalizeKotoreContentResponse({}) })

  useEffect(() => {
    let active = true
    axios.post(GAS_URL, JSON.stringify({ action: 'getPublishedKotoreContents', apiKey: API_KEY, sessionToken, contentTypes: ['notice', 'guide', 'menu-guide'] }), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000 })
      .then(response => {
        if (!active) return
        if (response.data?.result !== 'success') {
          if (isAuthorizationResponse(response.data)) onSessionExpired?.()
          throw new Error(getPublishedContentError(response.data))
        }
        setContentState({ loading: false, error: '', data: normalizeKotoreContentResponse(response.data) })
      })
      .catch(error => { if (active) setContentState(previous => ({ ...previous, loading: false, error: error.message || '個トレコンテンツを取得できませんでした' })) })
    return () => { active = false }
  }, [GAS_URL, API_KEY, sessionToken, onSessionExpired])

  if (view !== 'home') return <div className="kotore-workspace">
    <button type="button" className="kotore-back-button" onClick={() => setView('home')}>← 個トレメニュートップへ</button>
    {view === 'waiting' && <NotificationManager GAS_URL={GAS_URL} API_KEY={API_KEY} unit={unit} schools={schools} refreshResult={notificationRefresh} />}
    {view === 'progress' && <KoToreProgressTracker styles={styles} GAS_URL={GAS_URL} API_KEY={API_KEY} assignedSchools={assignedSchools} profileSource="notifications" />}
    {view === 'answers' && canViewModelAnswers(role) && <ModelAnswerShelf role={role} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} />}
    {view === 'notices' && <KoToreContentViewer type="notice" content={contentState.data.notices} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} />}
    {view === 'guide' && <KoToreContentViewer type="guide" content={contentState.data.guide} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} />}
  </div>

  const cards = CARDS.filter(card => card.id !== 'answers' || canViewModelAnswers(role))
  return <section className="kotore-home" aria-labelledby="kotore-home-title">
    <header className="kotore-home__header"><h1 id="kotore-home-title">個トレメニュートップ</h1><p>個別ミッショントレーニング（個トレ）の運営に関する機能をまとめたメニューです。</p></header>
    <div className="kotore-home__cards">{cards.map(card => <button type="button" key={card.id} className={`kotore-home-card kotore-home-card--${card.tone}`} onClick={() => setView(card.id)}><span className="kotore-home-card__icon" aria-hidden="true">{card.icon}</span><strong>{card.title}</strong><span>{card.description}</span><span className="kotore-home-card__arrow" aria-hidden="true">›</span></button>)}</div>
    <section className="kotore-menu-guide" aria-labelledby="kotore-menu-guide-title"><h2 id="kotore-menu-guide-title">個トレメニューの使い方</h2>{contentState.loading ? <div className="kotore-message" role="status">使い方を取得中…</div> : contentState.error ? <div className="kotore-message kotore-message--error" role="alert">{contentState.error}</div> : contentState.data.menuGuide ? <MarkdownRenderer markdown={contentState.data.menuGuide.publishedMarkdown} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} /> : <div className="kotore-message">公開中の「メニューの使い方」はありません。</div>}</section>
    {contentState.data.serverTime && <p className="kotore-home__updated">最終取得：{new Date(contentState.data.serverTime).toLocaleString('ja-JP')}</p>}
  </section>
}
