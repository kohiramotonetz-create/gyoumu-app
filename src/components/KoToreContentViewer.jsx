import { MarkdownRenderer } from './common/KotoreMarkdown.jsx'
import './KoToreMenu.css'

export default function KoToreContentViewer({ type, content, GAS_URL, API_KEY, sessionToken, onSessionExpired }) {
  const title = type === 'notice' ? 'お知らせ' : '個トレの仕方'
  if (type === 'notice') {
    const notices = Array.isArray(content) ? content : []
    return <section className="kotore-subpage"><header className="kotore-subpage__header"><div><h2>{title}</h2><p>個トレ運営に関する公開中のお知らせです。</p></div></header>{notices.length === 0 ? <div className="kotore-message">現在、公開中のお知らせはありません。</div> : <div className="kotore-notice-list">{notices.map(notice => <article key={notice.contentId} className={`kotore-content-card ${notice.importance === 'important' ? 'is-important' : ''}`}><header><h3>{notice.title}</h3>{notice.importance === 'important' && <span>重要</span>}</header><MarkdownRenderer markdown={notice.publishedMarkdown} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} /></article>)}</div>}</section>
  }
  return <section className="kotore-subpage"><header className="kotore-subpage__header"><div><h2>{content?.title || title}</h2><p>個トレの進め方と運営上のポイントを確認できます。</p></div></header>{content ? <article className="kotore-content-card"><MarkdownRenderer markdown={content.publishedMarkdown} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} /></article> : <div className="kotore-message">公開中の「個トレの仕方」はありません。</div>}</section>
}
