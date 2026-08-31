import { useMemo, useState } from 'react';
import StudentProfileLink from './common/StudentProfileLink.jsx';
import {
  TEACHER_HOME_PROGRESS_STATUSES,
  formatTeacherHomeProgressDifference,
  formatTeacherHomeProgressUnit,
  paginateTeacherHomeProgressItems,
} from '../utils/teacherHomeProgress.js';
import './TeacherHomeProgressStudentList.css';

function CurrentUnit({ label, unit }) {
  return <div className="home-progress-list__unit"><strong>{label}</strong><span>{formatTeacherHomeProgressUnit(unit)}</span></div>;
}

function SocialBreakdown({ comparisons }) {
  if (!Array.isArray(comparisons) || comparisons.length < 2) return null;
  return <details className="home-progress-list__social"><summary>社会3分野の判定根拠</summary><div>
    {comparisons.map(comparison => <article key={comparison.fieldId}>
      <strong>{comparison.fieldLabel}</strong>
      <span>{TEACHER_HOME_PROGRESS_STATUSES[comparison.status]?.label || comparison.status}</span>
      <small>{formatTeacherHomeProgressDifference(comparison.difference)}</small>
      <small>学校：{formatTeacherHomeProgressUnit(comparison.schoolCurrent)}</small>
      <small>ネッツ：{formatTeacherHomeProgressUnit(comparison.netzCurrent)}</small>
    </article>)}
  </div></details>;
}

export default function TeacherHomeProgressStudentList({ data, statusFilter, onBack }) {
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const status = TEACHER_HOME_PROGRESS_STATUSES[statusFilter] || TEACHER_HOME_PROGRESS_STATUSES.behind;
  const filteredItems = useMemo(() => (Array.isArray(data?.items) ? data.items : []).filter(item => item.status === statusFilter), [data, statusFilter]);
  const pagination = paginateTeacherHomeProgressItems(filteredItems, page, pageSize);

  return <section className="home-progress-list">
    <button type="button" className="home-progress-list__back" onClick={onBack}>← 講師ホームへ戻る</button>
    <header>
      <div><span className={`home-legend__dot home-legend__dot--${status.colorKey}`} /><h1>{status.label}の進捗一覧</h1></div>
      <p>対象：{data?.scope?.label || '担当校舎'} / {filteredItems.length}件</p>
    </header>
    <p className="home-progress-list__note">複数科目を受講している生徒は、科目ごとに表示しています。</p>
    <div className="home-progress-list__controls">
      <span>{pagination.start}–{pagination.end}件 / 全{pagination.total}件</span>
      <label>表示件数<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[20, 50, 100].map(size => <option key={size} value={size}>{size}件</option>)}</select></label>
    </div>
    {filteredItems.length === 0 ? <div className="home-progress-list__empty">該当する進捗はありません。</div> : <div className="home-progress-list__table-wrap">
      <table><thead><tr><th>生徒</th><th>学年</th><th>校舎</th><th>科目</th><th>現在単元</th><th>差</th><th>状態</th></tr></thead><tbody>
        {pagination.items.map(item => <tr key={`${item.userId}-${item.subjectId}`}>
          <td><StudentProfileLink userId={item.userId} source="home-progress-list">{item.name}</StudentProfileLink></td>
          <td>{item.grade}</td><td>{item.school}</td>
          <td><strong>{item.subjectLabel}</strong>{item.subjectId === 'social' && <SocialBreakdown comparisons={item.comparisons} />}</td>
          <td><CurrentUnit label="学校" unit={item.schoolCurrent} /><CurrentUnit label="ネッツ" unit={item.netzCurrent} /></td>
          <td className="home-progress-list__difference">{formatTeacherHomeProgressDifference(item.difference)}</td>
          <td><span className={`home-progress-list__status home-progress-list__status--${item.status}`}>{TEACHER_HOME_PROGRESS_STATUSES[item.status]?.label || item.status}</span></td>
        </tr>)}
      </tbody></table>
    </div>}
    {pagination.totalPages > 1 && <nav className="home-progress-list__pagination" aria-label="進捗一覧ページ">
      <button type="button" disabled={pagination.page <= 1} onClick={() => setPage(value => value - 1)}>前へ</button>
      <span>{pagination.page} / {pagination.totalPages}</span>
      <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(value => value + 1)}>次へ</button>
    </nav>}
  </section>;
}
