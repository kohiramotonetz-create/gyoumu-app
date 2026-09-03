import { useState } from 'react'
import VersionLabel from './common/VersionLabel.jsx'
import StudentProfileLink from './common/StudentProfileLink.jsx'
import { MarkdownRenderer } from './common/KotoreMarkdown.jsx'
import { buildTeacherHomeProgressDonut, formatTeacherHomeProgressDifference, formatTeacherHomeProgressUnit, TEACHER_HOME_PROGRESS_STATUSES } from '../utils/teacherHomeProgress.js'
import { isStaffRole } from '../utils/roles.js'

const Icon = ({ name, size = 24, strokeWidth = 2 }) => {
  const paths = {
    alert: <><path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    chart: <><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V7"/><path d="M17 16v-8"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="m9 13 2 2 4-4"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.3 2.4c-.7.3-1 .8-1 1.6"/><path d="M12 17h.01"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    megaphone: <><path d="m3 11 18-5v12L3 14z"/><path d="M11.6 16.4 13 21H7l-1.5-6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const variants = {
  danger: { icon: 'message', label: 'サマリー項目', unit: '件' },
  warning: { icon: 'users', label: 'サマリー項目', unit: '名' },
  success: { icon: 'clipboard', label: 'サマリー項目', unit: '名' },
  info: { icon: 'clipboard', label: 'サマリー項目', unit: '名' },
}

function SummaryCard({ variant }) {
  const item = variants[variant]
  return <article className={`home-summary home-summary--${variant}`}>
    <div className="home-summary__body">
      <div className="home-summary__icon"><Icon name={item.icon} size={38} /></div>
      <div className="home-summary__content">
        <div className="home-summary__title"><span>{item.label}</span><Icon name="help" size={19} /></div>
        <div className="home-summary__metric"><strong>--</strong><span>{item.unit}</span></div>
        <p>表示する情報は未設定です</p>
      </div>
    </div>
    <div className="home-card-link" aria-disabled="true"><Icon name="arrow" size={18} /> 詳細は未設定です</div>
  </article>
}

function ProgressLoading() {
  return <div className="home-progress-state" role="status">進捗状況を読み込み中…</div>
}

function ProgressError({ onRetry }) {
  return <div className="home-progress-state home-progress-state--error" role="alert"><p>進捗状況を取得できませんでした</p><button type="button" onClick={onRetry}>再試行</button></div>
}

function ProgressPanel({ progressState, onRetry, onOpenProgressStatus }) {
  if (progressState.loading) return <ProgressLoading />
  if (progressState.error && !progressState.data) return <ProgressError onRetry={onRetry} />
  const data = progressState.data
  const summary = data?.summary
  if (!summary || summary.targetEntryCount === 0) return <div className="home-progress-state">対象となる1対1進捗がありません</div>
  if (summary.comparableEntryCount === 0) return <div className="home-progress-state"><strong>比較可能な進捗がありません</strong><span>比較不能：{summary.excludedEntryCount}件</span></div>
  return <>
    <div className="home-progress__scope"><span>対象：{data.scope?.label || '担当校舎'}</span><span>比較可能：{summary.comparableEntryCount}件 / 比較不能：{summary.excludedEntryCount}件</span></div>
    <div className="home-progress__content">
      <div className="home-donut" style={{ background: buildTeacherHomeProgressDonut(summary.percentages) }}><div><span>比較対象</span><strong>{summary.comparableEntryCount}<small>件</small></strong></div></div>
      <div className="home-legend">
        {Object.entries(TEACHER_HOME_PROGRESS_STATUSES).map(([status, config]) => <button type="button" key={status} onClick={() => onOpenProgressStatus(status, data)}>
          <span className={`home-legend__dot home-legend__dot--${config.colorKey}`} /><b>{config.label}</b><strong>{summary.counts[status]}人</strong><span>（{summary.percentages[status]}%）</span>
        </button>)}
      </div>
    </div>
    <p className="home-progress__count-note">※複数科目を受講している生徒は、科目ごとに集計しています</p>
  </>
}

function ActionItems({ progressState, onOpenProgressStatus }) {
  if (progressState.loading) return <div className="home-actions__state" role="status">対応項目を読み込み中…</div>
  if (progressState.error && !progressState.data) return <div className="home-actions__state">進捗遅れ件数を取得できませんでした</div>
  const behind = progressState.data?.summary?.counts?.behind || 0
  return <div className="home-actions__list">
    <button type="button" className="home-action-row" onClick={() => onOpenProgressStatus('behind', progressState.data)}>
      <span className="home-status-dot home-status-dot--1" /><span>進捗遅れ生徒対応</span><strong>{behind}人</strong><Icon name="chevron" size={20} />
    </button>
    {[2, 3].map(index => <button type="button" className="home-action-row home-action-row--disabled" key={index} disabled>
      <span className={`home-status-dot home-status-dot--${index}`} /><span>未設定</span><strong>--</strong><Icon name="chevron" size={20} />
    </button>)}
  </div>
}

function HomeAnnouncements({ noticeState, GAS_URL, API_KEY, sessionToken, onSessionExpired }) {
  const [expanded, setExpanded] = useState(false)
  const homeNotice = noticeState?.homeNotice
  const markdown = String(homeNotice?.publishedMarkdown || '')
  const isLong = markdown.length > 800 || markdown.split('\n').length > 18
  return <section className="home-panel home-announcements home-teacher-section">
    <header><div><Icon name="megaphone" size={29} /><h2>お知らせ</h2></div></header>
    {noticeState?.loading ? <div className="home-teacher-empty" role="status">お知らせを読み込み中…</div>
      : noticeState?.error ? <div className="home-teacher-empty home-teacher-empty--error" role="alert">お知らせを取得できませんでした</div>
        : !markdown.trim() ? <div className="home-teacher-empty">現在お知らせはありません。</div>
          : <><div className={`home-notice-markdown ${isLong && !expanded ? 'is-collapsed' : ''}`}><MarkdownRenderer markdown={markdown} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} /></div>{isLong && <div className="home-notice-toggle"><button type="button" onClick={() => setExpanded(value => !value)}>{expanded ? '閉じる' : 'もっと見る'}</button></div>}</>}
  </section>
}

function TeacherStatusStudents({ progressState, onOpenProgressStatus, status }) {
  const config = TEACHER_HOME_PROGRESS_STATUSES[status]
  const items = Array.isArray(progressState.data?.items) ? progressState.data.items.filter(item => item.status === status) : []
  const previewItems = items.slice(0, 5)
  return <section className={`home-attention-group home-attention-group--${status}`}>
    <header><h3>{status === 'behind' ? '進捗が遅れている生徒' : '進捗が要注意の生徒'}</h3><strong>{items.length}件</strong></header>
    {progressState.loading ? <div className="home-teacher-empty" role="status">進捗を読み込み中…</div>
      : progressState.error && !progressState.data ? <div className="home-teacher-empty home-teacher-empty--error">進捗を取得できませんでした</div>
        : previewItems.length === 0 ? <div className="home-teacher-empty">該当する生徒はいません。</div>
          : <div className="home-behind-students__table-wrap"><table><thead><tr><th>生徒</th><th>学年</th><th>校舎</th><th>科目</th><th>現在単元</th><th>差</th><th>状態</th></tr></thead><tbody>
            {previewItems.map(item => <tr key={`${item.userId}-${item.subjectId}`}>
              <td><StudentProfileLink userId={item.userId} source="home">{item.name}</StudentProfileLink></td>
              <td>{item.grade}</td><td>{item.school}</td><td>{item.subjectLabel}</td>
              <td><span><b>学校：</b>{formatTeacherHomeProgressUnit(item.schoolCurrent)}</span><span><b>ネッツ：</b>{formatTeacherHomeProgressUnit(item.netzCurrent)}</span></td>
              <td className="home-behind-students__difference">{formatTeacherHomeProgressDifference(item.difference)}</td>
              <td><span className={`home-behind-students__badge home-behind-students__badge--${status}`}>{config.label}</span></td>
            </tr>)}
          </tbody></table></div>}
    <div className="home-teacher-section__footer"><button type="button" onClick={() => onOpenProgressStatus(status, progressState.data)} disabled={!progressState.data}>すべて表示 <Icon name="arrow" size={18} /></button></div>
  </section>
}

function TeacherAttentionStudents({ progressState, onOpenProgressStatus }) {
  const scope = progressState.data?.scope
  const scopeText = scope?.assignmentBased ? scope.label : (scope?.label || '担当生徒')
  return <section className="home-panel home-teacher-section home-behind-students">
    <header><div className="home-panel__title"><Icon name="alert" size={30} /><h2>対応が必要な生徒</h2></div><div className="home-behind-students__scope">対象：{scopeText}</div></header>
    {scope?.assignmentBased && !scope.assignmentDataAvailable && <div className="home-assignment-note">今月の担当生徒データがありません</div>}
    <TeacherStatusStudents status="behind" progressState={progressState} onOpenProgressStatus={onOpenProgressStatus} />
    <TeacherStatusStudents status="warning" progressState={progressState} onOpenProgressStatus={onOpenProgressStatus} />
  </section>
}

function ProgressSection({ progressState, onRefreshProgress, onOpenProgressStatus, updatedAt, teacher = false }) {
  return <article className={`home-panel home-progress ${teacher ? 'home-teacher-section' : ''}`}>
    <header><div className="home-panel__title"><Icon name="chart" size={30} /><h2>進捗状況</h2></div><div className="home-progress__refresh"><span><Icon name="calendar" size={16} /> 最終更新：{updatedAt}</span><button type="button" onClick={onRefreshProgress} disabled={progressState.loading || progressState.refreshing}>{progressState.refreshing ? '更新中…' : 'データ更新'}</button></div></header>
    {progressState.error && progressState.data && <div className="home-progress__refresh-error" role="alert">更新できませんでした。表示中のデータを維持しています。</div>}
    <ProgressPanel progressState={progressState} onRetry={onRefreshProgress} onOpenProgressStatus={onOpenProgressStatus} />
  </article>
}

export default function HomeDashboard({ userName, role, progressState, noticeState, onRefreshProgress, onOpenProgressStatus, GAS_URL, API_KEY, sessionToken, onSessionExpired }) {
  const now = new Date()
  const dateText = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(now)
  const updatedAt = progressState.updatedAt ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'short', timeStyle: 'short' }).format(progressState.updatedAt) : '未取得'
  const greeting = <section className="home-greeting"><h1>おはようございます、{userName} 先生！ <span className="home-greeting__sun"><Icon name="sun" size={29} /></span></h1><div className="home-greeting__meta"><span>{dateText}</span></div></section>
  const announcements = isStaffRole(role) ? <HomeAnnouncements noticeState={noticeState} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={onSessionExpired} /> : null
  if (role === 'teacher') return <div className="home-dashboard home-dashboard--teacher">
    {greeting}
    {announcements}
    <TeacherAttentionStudents progressState={progressState} onOpenProgressStatus={onOpenProgressStatus} />
    <ProgressSection teacher progressState={progressState} onRefreshProgress={onRefreshProgress} onOpenProgressStatus={onOpenProgressStatus} updatedAt={updatedAt} />
    <VersionLabel />
  </div>
  return <div className="home-dashboard">
    {greeting}
    {announcements}

    <section className="home-summary-grid" aria-label="サマリー">
      {Object.keys(variants).map(variant => <SummaryCard key={variant} variant={variant} />)}
    </section>

    <section className="home-panel-grid">
      <article className="home-panel home-actions">
        <header><Icon name="alert" size={30} /><h2>対応が必要な項目</h2></header>
        <ActionItems progressState={progressState} onOpenProgressStatus={onOpenProgressStatus} />
        <div className="home-panel-link" aria-disabled="true">2件は未設定です</div>
      </article>

      <ProgressSection progressState={progressState} onRefreshProgress={onRefreshProgress} onOpenProgressStatus={onOpenProgressStatus} updatedAt={updatedAt} />
    </section>

    <section className="home-panel home-announcements">
      <header><div><Icon name="megaphone" size={29} /><h2>お知らせ</h2></div><span className="home-header-link" aria-disabled="true">すべてのお知らせを見る <Icon name="arrow" size={18} /></span></header>
      <div className="home-announcement-grid">
        {[0, 1, 2].map(index => <article className="home-announcement-card" key={index}>
          <div className="home-announcement-card__meta">{index === 0 && <span>NEW</span>}<time>--/--</time></div>
          <div className="home-announcement-card__title"><strong>お知らせはありません</strong><Icon name="chevron" size={19} /></div>
          <p>表示する情報は未設定です。</p>
        </article>)}
      </div>
    </section>
    <VersionLabel />
  </div>
}

export { Icon }
