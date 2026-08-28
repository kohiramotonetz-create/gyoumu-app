import { useRef, useState } from 'react';
import StudentProfileLink from './common/StudentProfileLink.jsx';
import { SOCIAL_FIELDS } from '../utils/schoolUnits.js';
import { getChapterSegments } from '../utils/oneToOneProgressDisplay.js';
import {
  ONE_TO_ONE_AXIS_LEADING,
  ONE_TO_ONE_UNIT_STEP,
  formatOneToOneCurrentUnit,
  getOneToOneAxisCanvasWidth,
  getOneToOneProgressDifference,
  getOneToOneUnitOrder,
  paginateOneToOneStudents,
} from '../utils/oneToOneProgressResults.js';
import './OneToOneProgressResults.css';

const PAGE_SIZES = [20, 50, 100];

function unitAccessibleName(unit) {
  return [unit.textName, unit.chapter, unit.section, unit.unitName, unit.page ? `p.${unit.page}` : '', `単元${unit.unitOrder}`]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' / ');
}

function AxisGuide({ axis, canvasWidth }) {
  const segments = getChapterSegments(axis);
  return <div className="one-to-one-axis-canvas one-to-one-axis-canvas--guide" style={{ width: canvasWidth }}>
    <strong className="one-to-one-axis-guide__title">単元（進度の目安）</strong>
    <div className="one-to-one-chapter-guide">
      {segments.map(segment => {
        const left = ONE_TO_ONE_AXIS_LEADING + (segment.startOrder - 1) * ONE_TO_ONE_UNIT_STEP;
        const width = Math.max(ONE_TO_ONE_UNIT_STEP, (segment.endOrder - segment.startOrder + 1) * ONE_TO_ONE_UNIT_STEP);
        return <span key={`${segment.chapter}:${segment.startOrder}`} title={segment.chapter} style={{ left, width }}>{segment.chapter}</span>;
      })}
    </div>
    <div className="one-to-one-unit-guide" aria-label="単元位置ガイド">
      {axis.map(unit => <span key={unit.unitId} title={unitAccessibleName(unit)} style={{ left: ONE_TO_ONE_AXIS_LEADING + (unit.unitOrder - 1) * ONE_TO_ONE_UNIT_STEP }}>{unit.section || unit.unitOrder}</span>)}
    </div>
  </div>;
}

function ProgressLane({ axis, currentUnitId, type, subjectLabel }) {
  const currentOrder = getOneToOneUnitOrder(axis, currentUnitId);
  const currentUnit = axis.find(unit => unit.unitOrder === currentOrder);
  const currentParts = formatOneToOneCurrentUnit(currentUnit);
  const laneLabel = type === 'school' ? '学校進捗' : 'ネッツ進捗';
  return <div className={`one-to-one-progress-lane one-to-one-progress-lane--${type}`} aria-label={`${subjectLabel} ${laneLabel}`}>
    <div className="one-to-one-progress-lane__identity"><strong><span aria-hidden="true">{type === 'school' ? '▥' : 'N'}</span> {laneLabel}</strong></div>
    <div className="one-to-one-progress-track" style={{ width: Math.max(1, (axis.length - 1) * ONE_TO_ONE_UNIT_STEP + 1) }} aria-label={`${laneLabel}の全単元`}>
      <span className="one-to-one-progress-track__base" />
      {currentOrder > 0 && <span className="one-to-one-progress-track__completed" style={{ width: Math.max(0, (currentOrder - 1) * ONE_TO_ONE_UNIT_STEP) }} />}
      {axis.map(unit => {
        const isCurrent = unit.unitOrder === currentOrder;
        const state = isCurrent ? 'current' : unit.unitOrder < currentOrder ? 'completed' : 'pending';
        return <span
          key={unit.unitId}
          role="img"
          tabIndex="0"
          className={`one-to-one-progress-point is-${state}`}
          style={{ left: (unit.unitOrder - 1) * ONE_TO_ONE_UNIT_STEP }}
          title={unitAccessibleName(unit)}
          aria-label={`${laneLabel} ${unitAccessibleName(unit)} ${state === 'current' ? '現在位置' : state === 'completed' ? '完了' : '未到達'}`}
          aria-current={isCurrent ? 'step' : undefined}
        />;
      })}
    </div>
    <div className="one-to-one-current-unit"><strong>現在：</strong>{currentParts.map((part, index) => <span key={`${part}:${index}`}>{part}</span>)}</div>
  </div>;
}

function TimelineViewport({ axis, schoolCurrentUnitId, netzCurrentUnitId, subjectLabel, canvasWidth, scrollGroup, onScroll }) {
  return <div className="one-to-one-axis-viewport" data-timeline-viewport data-scroll-group={scrollGroup} tabIndex="0" onScroll={onScroll} aria-label={`${subjectLabel}の学校・ネッツ進捗タイムライン`}>
    <div className="one-to-one-axis-canvas" style={{ width: canvasWidth }}>
      <ProgressLane axis={axis} currentUnitId={schoolCurrentUnitId} type="school" subjectLabel={subjectLabel} />
      <ProgressLane axis={axis} currentUnitId={netzCurrentUnitId} type="netz" subjectLabel={subjectLabel} />
    </div>
  </div>;
}

function ActionCell({ axis, student, subjectId, fieldId = '', onOpenStudent }) {
  const state = fieldId ? student.progressByField?.[fieldId] || {} : student;
  const difference = getOneToOneProgressDifference(axis, state.schoolCurrentUnitId, state.netzCurrentUnitId);
  const differenceIcon = difference.status === 'same' ? '✓' : difference.status === 'school-ahead' ? '↓' : difference.status === 'netz-ahead' ? '↑' : '—';
  return <aside className="one-to-one-actions-cell">
    <div className="one-to-one-actions-cell__row"><button type="button" className="one-to-one-action-button one-to-one-action-button--school" onClick={() => onOpenStudent(student, 'school', subjectId, fieldId)}>学校進捗を入力</button><button type="button" className="one-to-one-action-button one-to-one-action-button--history" onClick={() => onOpenStudent(student, 'history', subjectId, fieldId)}>履歴</button></div>
    <div className="one-to-one-actions-cell__row"><button type="button" className="one-to-one-action-button one-to-one-action-button--netz" onClick={() => onOpenStudent(student, 'netz', subjectId, fieldId)}>ネッツ進捗を入力</button><button type="button" className="one-to-one-action-button one-to-one-action-button--history" onClick={() => onOpenStudent(student, 'history', subjectId, fieldId)}>履歴</button></div>
    <div className={`one-to-one-progress-difference is-${difference.status}`}><span aria-hidden="true">{differenceIcon}</span>{difference.label}</div>
  </aside>;
}

function StudentCell({ student }) {
  return <aside className="one-to-one-student-cell">
    <StudentProfileLink userId={student.userId} source="one-to-one-progress"><strong>{student.name}</strong></StudentProfileLink>
    <span className="one-to-one-grade-badge">{student.grade}</span>
    <StudentProfileLink userId={student.userId} source="one-to-one-progress">生徒詳細</StudentProfileLink>
  </aside>;
}

function StandardStudentRow({ axis, student, subjectId, subjectLabel, canvasWidth, onOpenStudent, onScroll }) {
  return <article className="one-to-one-student-row">
    <StudentCell student={student} />
    <TimelineViewport axis={axis} schoolCurrentUnitId={student.schoolCurrentUnitId} netzCurrentUnitId={student.netzCurrentUnitId} subjectLabel={subjectLabel} canvasWidth={canvasWidth} scrollGroup={subjectId} onScroll={onScroll} />
    <ActionCell axis={axis} student={student} subjectId={subjectId} onOpenStudent={onOpenStudent} />
  </article>;
}

function SocialStudentRow({ student, subjectId, subjectLabel, fieldAxes, onOpenStudent, onScroll }) {
  const [expanded, setExpanded] = useState({});
  return <article className="one-to-one-student-row one-to-one-student-row--social">
    <StudentCell student={student} />
    <div className="one-to-one-social-fields">
      {fieldAxes.map(field => {
        const isOpen = Boolean(expanded[field.fieldId]);
        const state = student.progressByField?.[field.fieldId] || {};
        const canvasWidth = getOneToOneAxisCanvasWidth(field.axis.length);
        return <section key={field.fieldId} className="one-to-one-social-field">
          <button type="button" className="one-to-one-social-field__toggle" aria-expanded={isOpen} onClick={() => setExpanded(current => ({ ...current, [field.fieldId]: !isOpen }))}><strong>{isOpen ? '▼' : '▶'} {field.label}</strong><span>学校：{getOneToOneUnitOrder(field.axis, state.schoolCurrentUnitId) || '未登録'} / ネッツ：{getOneToOneUnitOrder(field.axis, state.netzCurrentUnitId) || '未登録'}</span></button>
          {isOpen && <div className="one-to-one-social-field__body">
            <div className="one-to-one-axis-viewport" data-timeline-viewport data-scroll-group={field.fieldId} tabIndex="0" onScroll={onScroll} aria-label={`${subjectLabel} ${field.label}の進捗タイムライン`}><div className="one-to-one-axis-canvas" style={{ width: canvasWidth }}><AxisGuide axis={field.axis} canvasWidth={canvasWidth} /><ProgressLane axis={field.axis} currentUnitId={state.schoolCurrentUnitId} type="school" subjectLabel={`${subjectLabel} ${field.label}`} /><ProgressLane axis={field.axis} currentUnitId={state.netzCurrentUnitId} type="netz" subjectLabel={`${subjectLabel} ${field.label}`} /></div></div>
            <ActionCell axis={field.axis} student={student} subjectId={subjectId} fieldId={field.fieldId} onOpenStudent={onOpenStudent} />
          </div>}
        </section>;
      })}
    </div>
  </article>;
}

function Pagination({ pagination, pageSize, onPageChange, onPageSizeChange }) {
  const pages = Array.from({ length: pagination.totalPages }, (_, index) => index + 1);
  return <nav className="one-to-one-pagination" aria-label="生徒一覧ページ">
    <span>全{pagination.total}件中 {pagination.start}～{pagination.end}件を表示</span>
    <div className="one-to-one-pagination__pages"><button type="button" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} aria-label="前のページ">‹</button>{pages.map(page => <button key={page} type="button" onClick={() => onPageChange(page)} aria-current={page === pagination.page ? 'page' : undefined}>{page}</button>)}<button type="button" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} aria-label="次のページ">›</button></div>
    <label>表示件数：<select value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>{PAGE_SIZES.map(size => <option key={size} value={size}>{size}件</option>)}</select></label>
  </nav>;
}

export default function OneToOneProgressResults({ subjectId, subjectLabel, data, error, onOpenStudent }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const sectionRef = useRef(null);
  const syncingScrollRef = useRef(false);
  const students = data?.students || [];
  const pagination = paginateOneToOneStudents(students, page, pageSize);
  const axis = data?.axis || [];
  const fieldAxes = subjectId === 'social' ? SOCIAL_FIELDS.map(field => data?.fieldAxes?.find(item => item.fieldId === field.fieldId)).filter(Boolean) : [];
  const canvasWidth = getOneToOneAxisCanvasWidth(axis.length);

  const syncScroll = event => {
    if (syncingScrollRef.current) return;
    syncingScrollRef.current = true;
    const scrollLeft = event.currentTarget.scrollLeft;
    const scrollGroup = event.currentTarget.dataset.scrollGroup;
    sectionRef.current?.querySelectorAll('[data-timeline-viewport]').forEach(viewport => {
      if (viewport !== event.currentTarget && viewport.dataset.scrollGroup === scrollGroup && viewport.scrollLeft !== scrollLeft) viewport.scrollLeft = scrollLeft;
    });
    requestAnimationFrame(() => { syncingScrollRef.current = false; });
  };

  if (error) return <section className="one-to-one-subject-results"><h3>{subjectLabel}</h3><p className="one-to-one-subject-results__error" role="alert">{subjectLabel}の進捗情報を取得できませんでした。{error}</p></section>;
  if (!data) return null;
  if (subjectId !== 'social' && students.length > 0 && axis.length === 0) return <section className="one-to-one-subject-results"><h3>{subjectLabel}</h3><p className="one-to-one-subject-results__error" role="alert">{subjectLabel}の単元軸を取得できませんでした。</p></section>;
  if (subjectId === 'social' && students.length > 0 && fieldAxes.length === 0) return <section className="one-to-one-subject-results"><h3>{subjectLabel}</h3><p className="one-to-one-subject-results__error" role="alert">社会の分野別単元軸を取得できませんでした。</p></section>;

  return <section ref={sectionRef} className="one-to-one-subject-results" aria-labelledby={`one-to-one-results-${subjectId}`}>
    <h3 id={`one-to-one-results-${subjectId}`}>{subjectLabel}</h3>
    {students.length === 0 ? <p className="one-to-one-results-empty">この条件で1対1受講科目が登録された生徒はいません。</p> : <>
      {subjectId !== 'social' && <div className="one-to-one-axis-header"><span>生徒</span><div className="one-to-one-axis-viewport" data-timeline-viewport data-scroll-group={subjectId} tabIndex="0" onScroll={syncScroll} aria-label={`${subjectLabel}の単元ガイド`}><AxisGuide axis={axis} canvasWidth={canvasWidth} /></div><span>進捗入力</span></div>}
      <div className="one-to-one-student-list">
        {pagination.items.map(student => subjectId === 'social'
          ? <SocialStudentRow key={student.userId} student={student} subjectId={subjectId} subjectLabel={subjectLabel} fieldAxes={fieldAxes} onOpenStudent={onOpenStudent} onScroll={syncScroll} />
          : <StandardStudentRow key={student.userId} axis={axis} student={student} subjectId={subjectId} subjectLabel={subjectLabel} canvasWidth={canvasWidth} onOpenStudent={onOpenStudent} onScroll={syncScroll} />)}
      </div>
      <Pagination pagination={pagination} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={value => { setPageSize(value); setPage(1); }} />
    </>}
  </section>;
}
