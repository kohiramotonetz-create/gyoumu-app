import { useState } from 'react'
import KotoreContentEditor from './KotoreContentEditor.jsx'
import PasswordManager from './PasswordManager.jsx'
import './KotoreAdmin.css'

const CONTENT_CARDS = [
  { id: 'notice', title: 'お知らせを編集する', description: '個トレメニュー内のお知らせを作成・編集・公開します。', icon: '◁' },
  { id: 'home-notice', title: 'ホーム画面のお知らせを編集する', description: 'teacherホーム最上部のお知らせを編集・公開します。', icon: '⌂' },
  { id: 'guide', title: '個トレの仕方を編集する', description: '個トレ運営ガイドを作成・編集・公開します。', icon: '▤' },
  { id: 'menu-guide', title: 'メニューの使い方を編集する', description: '個トレトップ下部の使い方案内を編集します。', icon: '◉' },
]
const PLACEHOLDERS = ['アカウント管理', 'スキマ君利用設定', '合宿メニュー管理', 'テスト振り返り確認', '学校成績確認']

export default function KotoreAdminWorkspace({ role, GAS_URL, API_KEY, sessionToken, onSessionExpired }) {
  const [view, setView] = useState('home')
  if (role !== 'admin') return <div className="kotore-message kotore-message--error" role="alert">管理者権限が必要です。</div>
  if (view === 'passwords') return <div><button type="button" className="kotore-back-button" onClick={() => setView('home')}>← 管理者メニューへ</button><PasswordManager GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} role={role} onSessionExpired={onSessionExpired}/></div>
  if (view !== 'home') return <KotoreContentEditor contentType={view} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} onBack={() => setView('home')}/>
  return <section className="kotore-admin-home" aria-labelledby="kotore-admin-title"><header><h1 id="kotore-admin-title">管理者メニュートップ</h1><p>個トレアプリの各種設定やコンテンツを管理します。</p></header><div className="kotore-admin-info">ここは管理者専用メニューです。編集・公開内容は講師画面へ反映されます。</div><h2>個トレコンテンツ管理</h2><div className="kotore-admin-card-grid">{CONTENT_CARDS.map(card => <button type="button" className="kotore-admin-card" key={card.id} onClick={() => setView(card.id)}><span aria-hidden="true">{card.icon}</span><strong>{card.title}</strong><small>編集可能</small><p>{card.description}</p><b aria-hidden="true">›</b></button>)}</div><div className="kotore-admin-lower"><section><h2>各種設定・管理メニュー</h2><div className="kotore-admin-placeholder-grid">{PLACEHOLDERS.map(label => <button type="button" disabled key={label}><strong>{label}</strong><span>未実装</span><p>現在はこの管理トップから操作できません。</p></button>)}</div></section><section><h2>パスワード管理</h2><button type="button" className="kotore-admin-card kotore-admin-card--password" onClick={() => setView('passwords')}><span aria-hidden="true">⌾</span><strong>各種パスワード管理</strong><small>編集可能</small><p>外部サービス等の認証情報を管理します。</p><b aria-hidden="true">›</b></button></section></div></section>
}
