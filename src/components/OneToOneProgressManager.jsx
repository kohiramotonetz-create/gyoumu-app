import { useRef, useState } from 'react';
import axios from 'axios';
import FilterButtonGroup from './FilterButtonGroup.jsx';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { ONE_TO_ONE_SUBJECTS, normalizeOneToOneSubjectIds, toggleOneToOneSubject } from '../utils/oneToOneSubjects.js';
import { formatSchoolUnit, SOCIAL_FIELDS } from '../utils/schoolUnits.js';
import { formatLessonDateJa, isConsecutiveUnits } from '../utils/oneToOneProgressDisplay.js';
import { collectOneToOneMatrixResults } from '../utils/oneToOneProgressRequests.js';
import {
  addOneToOneNetzUnitRange,
  applyOneToOneNetzUnitSelection,
  buildOneToOneNetzProgressReplacement,
  removeOneToOneNetzUnitSelection,
} from '../utils/oneToOneProgressInput.js';
import OneToOneProgressResults from './OneToOneProgressResults.jsx';
import { ALL_SCHOOLS } from '../constants/organization.js';
import './OneToOneProgressManager.css';

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const makeRequestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const makeMatrixDiagnosticRequestId = () => `one_to_one_matrix_${Date.now()}_${makeRequestId().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36)}`;

function FilterIcon({ type }) {
  const path = type === 'school'
    ? <><path d="M4 21h16" /><path d="M6 21V7l6-3 6 3v14" /><path d="M9 9v2M9 14v2M15 9v2M15 14v2" /></>
    : <><path d="m3 10 9-5 9 5-9 5Z" /><path d="M7 12v5c3 2 7 2 10 0v-5" /></>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="one-to-one-select-wrap__icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
}

function HistoryUnits({ event }) {
  const units = [...event.units].sort((a, b) => a.unitOrder - b.unitOrder);
  if (event.progressType === 'school' && isConsecutiveUnits(units)) {
    const first = units[0];
    const last = units.at(-1);
    return <div style={{ display: 'grid', gap: 3 }}><strong>単元{first.unitOrder} ～ 単元{last.unitOrder}</strong><span>{first.unitName}</span>{last.unitId !== first.unitId && <><span aria-hidden="true">～</span><span>{last.unitName}</span></>}</div>;
  }
  return <ul style={{ margin: '6px 0 0', paddingLeft: 22 }}>{units.map(unit => <li key={`${event.eventId}:${unit.unitId}`}>{unit.unitName} <small style={{ color: '#64748b' }}>（単元{unit.unitOrder}）</small></li>)}</ul>;
}

export default function OneToOneProgressManager({ GAS_URL, API_KEY, sessionToken, role, assignedSchools = [], styles, onSessionExpired }) {
  const [school, setSchool] = useState(assignedSchools[0] || '');
  const [grade, setGrade] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [dataBySubjectId, setDataBySubjectId] = useState({});
  const [errorsBySubjectId, setErrorsBySubjectId] = useState({});
  const [fieldErrors, setFieldErrors] = useState({ school: '', grade: '', subjects: '' });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mode, setMode] = useState('');
  const [lessonDate, setLessonDate] = useState(today());
  const [schoolTarget, setSchoolTarget] = useState('');
  const [netzUnits, setNetzUnits] = useState([]);
  const [selectedNetzUnitId, setSelectedNetzUnitId] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [correctionEvent, setCorrectionEvent] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const requestGenerationRef = useRef(0);
  const sessionExpiredHandledRef = useRef(false);

  const request = async (action, payload = {}) => {
    const response = await axios.post(GAS_URL, JSON.stringify({ action, apiKey: API_KEY, sessionToken, ...payload }), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000 });
    if (response.data?.code === 'AUTHORIZATION_ERROR' && !sessionExpiredHandledRef.current) {
      sessionExpiredHandledRef.current = true;
      onSessionExpired?.();
    }
    if (response.data?.result !== 'success') {
      const error = new Error(response.data?.message || '処理に失敗しました');
      error.code = response.data?.code;
      throw error;
    }
    return response.data;
  };

  const requestMatrix = async payload => {
    const diagnosticRequestId = makeMatrixDiagnosticRequestId();
    const startedAt = performance.now();
    console.info('[ONE_TO_ONE_MATRIX_CLIENT] START', { diagnosticRequestId });
    try {
      const result = await request('getOneToOneProgressMatrix', { ...payload, diagnosticRequestId });
      console.info('[ONE_TO_ONE_MATRIX_CLIENT] RESPONSE', {
        diagnosticRequestId,
        clientElapsedMs: Math.round(performance.now() - startedAt),
        serverDiagnostics: result.diagnostics,
      });
      return result;
    } catch (error) {
      const clientElapsedMs = Math.round(performance.now() - startedAt);
      const isTimeout = error?.code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''));
      console.error('[ONE_TO_ONE_MATRIX_CLIENT] ERROR', {
        diagnosticRequestId,
        clientElapsedMs,
        type: isTimeout ? 'TIMEOUT' : 'REQUEST_ERROR',
        message: error?.message,
      });
      if (isTimeout) error.message = `1対1進捗の取得に時間がかかっています。診断ID: ${diagnosticRequestId}`;
      error.diagnosticRequestId = diagnosticRequestId;
      throw error;
    }
  };

  const fetchMatrix = async () => {
    const nextFieldErrors = {
      school: school ? '' : '校舎を選択してください。',
      grade: grade ? '' : '学年を選択してください。',
      subjects: selectedSubjectIds.length ? '' : '科目を1つ以上選択してください。',
    };
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;

    const subjectIds = normalizeOneToOneSubjectIds(selectedSubjectIds);
    const schools = school === '全担当校舎' ? (role === 'admin' ? ALL_SCHOOLS : assignedSchools) : [school];
    const nextAppliedFilters = { school, schools: [...new Set(schools)], grade, subjectIds };
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    setLoading(true); setNotice('');

    const settled = await Promise.allSettled(subjectIds.map(subjectId => requestMatrix({
      school,
      schools: nextAppliedFilters.schools,
      grade,
      subjectId,
    })));
    if (generation !== requestGenerationRef.current) return;

    const { dataBySubjectId: nextData, errorsBySubjectId: nextErrors } = collectOneToOneMatrixResults(subjectIds, settled);
    setAppliedFilters(nextAppliedFilters);
    setDataBySubjectId(nextData);
    setErrorsBySubjectId(nextErrors);
    setLoading(false);
  };

  const refreshSubjectMatrix = async subjectId => {
    if (!appliedFilters || !appliedFilters.subjectIds.includes(subjectId)) return;
    try {
      const result = await requestMatrix({
        school: appliedFilters.school,
        schools: appliedFilters.schools,
        grade: appliedFilters.grade,
        subjectId,
      });
      setDataBySubjectId(current => ({ ...current, [subjectId]: result }));
      setErrorsBySubjectId(current => {
        const next = { ...current };
        delete next[subjectId];
        return next;
      });
    } catch (error) {
      setErrorsBySubjectId(current => ({ ...current, [subjectId]: error.message }));
    }
  };

  const openStudent = async (student, nextMode, subjectId, fieldId = '') => {
    const effectiveFieldId = subjectId === 'social' ? (fieldId || 'history') : '';
    setSelected(student); setMode(nextMode); setLessonDate(today()); setSchoolTarget(''); setNetzUnits([]); setSelectedNetzUnitId(''); setRangeStart(''); setRangeEnd(''); setNotice(''); setCorrectionEvent(null);
    setDetail(null);
    setDetailLoading(true);
    setSelectedSubjectId(subjectId);
    setSelectedFieldId(effectiveFieldId);
    try {
      const result = await request('getOneToOneProgressDetail', { userId: student.userId, subjectId, fieldId: effectiveFieldId });
      setDetail(result);
      if (nextMode === 'school') {
        const currentOrder = result.axis.find(unit => unit.unitId === result.schoolCurrentUnitId)?.unitOrder || 0;
        setSchoolTarget(result.axis.find(unit => unit.unitOrder === currentOrder + 1)?.unitId || '');
      }
    } catch (error) { setNotice(error.message); setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const save = async () => {
    if (!selected || !detail || saving) return;
    setSaving(true); setNotice('');
    try {
      const correctionStart = correctionEvent?.units?.[0]?.unitOrder || 1;
      const replacement = mode === 'school'
        ? { lessonDate, toUnitId: schoolTarget, unitIds: correctionEvent ? detail.axis.filter(unit => unit.unitOrder >= correctionStart && unit.unitOrder <= schoolTargetOrder).map(unit => unit.unitId) : undefined, isCorrection: Boolean(correctionEvent), requestId: makeRequestId() }
        : buildOneToOneNetzProgressReplacement({ lessonDate, unitIds: netzUnits, requestId: makeRequestId() });
      if (correctionEvent) {
        const correctionReason = window.prompt('訂正理由を入力してください。');
        if (!correctionReason) return;
        await request('correctOneToOneProgressEvent', { userId: selected.userId, subjectId: selectedSubjectId, fieldId: selectedFieldId, eventId: correctionEvent.eventId, correctionReason, replacement: { ...replacement, fieldId: selectedFieldId } });
      } else if (mode === 'school') await request('addOneToOneSchoolProgress', { userId: selected.userId, subjectId: selectedSubjectId, fieldId: selectedFieldId, ...replacement });
      else await request('addOneToOneNetzProgress', { userId: selected.userId, subjectId: selectedSubjectId, fieldId: selectedFieldId, ...replacement });
      setNotice('進捗を登録しました。');
      await refreshSubjectMatrix(selectedSubjectId);
      await openStudent(selected, 'history', selectedSubjectId, selectedFieldId);
    } catch (error) { setNotice(error.message); }
    finally { setSaving(false); }
  };

  const addRange = () => {
    setNetzUnits(current => addOneToOneNetzUnitRange(detail.axis, current, rangeStart, rangeEnd));
  };

  const voidEvent = async event => {
    const correctionReason = window.prompt('無効化理由を入力してください。');
    if (!correctionReason) return;
    try { await request('voidOneToOneProgressEvent', { userId: selected.userId, subjectId: selectedSubjectId, fieldId: selectedFieldId, eventId: event.eventId, correctionReason }); await openStudent(selected, 'history', selectedSubjectId, selectedFieldId); await refreshSubjectMatrix(selectedSubjectId); }
    catch (error) { setNotice(error.message); }
  };

  const currentSchoolOrder = detail?.axis.find(unit => unit.unitId === detail.schoolCurrentUnitId)?.unitOrder || 0;
  const schoolTargetOrder = detail?.axis.find(unit => unit.unitId === schoolTarget)?.unitOrder || 0;
  const selectedNetz = detail?.axis.filter(unit => netzUnits.includes(unit.unitId)) || [];
  const history = detail ? [...detail.schoolHistory, ...detail.netzHistory].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)) : [];

  return (
    <div className="one-to-one-page">
      <header className="one-to-one-page__header">
        <h2 style={styles.contentTitle}>🤝 1対1進捗チェック</h2>
        <p>条件を選択して進捗状況を確認します</p>
      </header>
      <div className="one-to-one-filter-card" aria-busy={loading}>
        <div className="one-to-one-filter-field">
          <label className="one-to-one-filter-field__label">校舎
            <span className="one-to-one-select-wrap">
              <FilterIcon type="school" />
              <SchoolSelect className="one-to-one-select" value={school} onChange={event => { setSchool(event.target.value); setFieldErrors(current => ({ ...current, school: '' })); }} assignedSchools={role === 'admin' ? ALL_SCHOOLS : assignedSchools} disabled={loading} />
            </span>
          </label>
          {fieldErrors.school && <p id="one-to-one-school-error" className="one-to-one-field-error" role="alert">{fieldErrors.school}</p>}
        </div>
        <div className="one-to-one-filter-card__divider" />
        <div className="one-to-one-filter-field">
          <label className="one-to-one-filter-field__label">学年
            <span className="one-to-one-select-wrap">
              <FilterIcon type="grade" />
              <GradeSelect className="one-to-one-select" value={grade ? [grade] : []} onChange={values => { setGrade(values[0] || ''); setFieldErrors(current => ({ ...current, grade: '' })); }} includeGroups={false} disabled={loading} />
            </span>
          </label>
          {fieldErrors.grade && <p id="one-to-one-grade-error" className="one-to-one-field-error" role="alert">{fieldErrors.grade}</p>}
        </div>
        <div className="one-to-one-filter-card__divider" />
        <fieldset className="one-to-one-filter-field one-to-one-subject-fieldset" disabled={loading}>
          <legend className="one-to-one-filter-field__label">科目（複数選択可）</legend>
          <div className="one-to-one-subject-grid">
            {ONE_TO_ONE_SUBJECTS.map(subject => {
              const checked = selectedSubjectIds.includes(subject.subjectId);
              return <label key={subject.subjectId} className={`one-to-one-subject-option${checked ? ' is-selected' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => { setSelectedSubjectIds(current => toggleOneToOneSubject(current, subject.subjectId)); setFieldErrors(current => ({ ...current, subjects: '' })); }} />
                <span className="one-to-one-subject-option__check" aria-hidden="true">✓</span>
                <span>{subject.label}</span>
              </label>;
            })}
          </div>
          {fieldErrors.subjects && <p id="one-to-one-subjects-error" className="one-to-one-field-error" role="alert">{fieldErrors.subjects}</p>}
        </fieldset>
        <div className="one-to-one-filter-card__divider" />
        <button type="button" className="one-to-one-refresh-button" onClick={fetchMatrix} disabled={loading} aria-busy={loading}>
          <span aria-hidden="true">⌕</span>{loading ? '読み込み中…' : '表示更新'}
        </button>
      </div>
      {notice && <p role="status" style={{ padding: 10, background: '#f1f5f9', borderRadius: 6 }}>{notice}</p>}
      <div className="one-to-one-results" aria-busy={loading}>
        {appliedFilters?.subjectIds.map(subjectId => <OneToOneProgressResults
          key={subjectId}
          subjectId={subjectId}
          subjectLabel={ONE_TO_ONE_SUBJECTS.find(subject => subject.subjectId === subjectId)?.label || subjectId}
          data={dataBySubjectId[subjectId] || null}
          error={errorsBySubjectId[subjectId] || ''}
          onOpenStudent={openStudent}
        />)}
      </div>
      {selected && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0008', display: 'grid', placeItems: 'center', padding: 12 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', width: 'min(900px, 100%)', maxHeight: '92vh', overflow: 'auto', borderRadius: 12, padding: 18 }} onClick={event => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{selected.name} / {selected.grade}</h3><button type="button" onClick={() => setSelected(null)}>閉じる</button></div>
            {detailLoading && <p role="status">進捗情報を読み込み中…</p>}
            {!detailLoading && !detail && <p role="alert">{notice || '進捗情報を取得できませんでした。'}</p>}
            {detail && <>
              {selectedSubjectId === 'social' && <FilterButtonGroup label="社会分野" options={SOCIAL_FIELDS.map(field => field.label)} selected={SOCIAL_FIELDS.find(field => field.fieldId === selectedFieldId)?.label || ''} onSelect={label => openStudent(selected, mode, selectedSubjectId, SOCIAL_FIELDS.find(field => field.label === label)?.fieldId || 'history')} isMultiple={false} />}
              {correctionEvent && <p style={{ color: '#b45309' }}>履歴を訂正中です。登録時に元履歴をVOID化します。</p>}
              {mode !== 'history' && <label>授業日 <input type="date" value={lessonDate} onChange={event => setLessonDate(event.target.value)} /></label>}
              {mode === 'school' && <div style={{ display: 'grid', gap: 12, marginTop: 14 }}><p>現在：{currentSchoolOrder ? `単元${currentSchoolOrder}` : '未登録'}</p><label>今回の最終到達位置<select value={schoolTarget} onChange={event => setSchoolTarget(event.target.value)}><option value="">選択</option>{detail.axis.filter(unit => correctionEvent || unit.unitOrder > currentSchoolOrder).map(unit => <option key={unit.unitId} value={unit.unitId}>{unit.unitOrder}. {formatSchoolUnit(unit)}</option>)}</select></label><p>今回追加：{correctionEvent ? `訂正後：単元${schoolTargetOrder || '-'}` : schoolTargetOrder > currentSchoolOrder ? `単元${currentSchoolOrder + 1}～単元${schoolTargetOrder}` : '未選択'}</p><button type="button" onClick={save} disabled={!schoolTarget || saving}>{saving ? '登録中...' : '登録'}</button></div>}
              {mode === 'netz' && <div style={{ display: 'grid', gap: 12, marginTop: 14 }}><label>単元を追加<select value={selectedNetzUnitId} onChange={event => { const next = applyOneToOneNetzUnitSelection(netzUnits, event.target.value); setSelectedNetzUnitId(next.selectedUnitId); setNetzUnits(next.unitIds); }}><option value="">選択</option>{detail.axis.map(unit => <option key={unit.unitId} value={unit.unitId}>{unit.unitOrder}. {formatSchoolUnit(unit)}</option>)}</select></label><div><select value={rangeStart} onChange={event => setRangeStart(event.target.value)}><option value="">範囲開始</option>{detail.axis.map(unit => <option key={unit.unitId} value={unit.unitId}>{unit.unitOrder}. {formatSchoolUnit(unit)}</option>)}</select><select value={rangeEnd} onChange={event => setRangeEnd(event.target.value)}><option value="">範囲終了</option>{detail.axis.map(unit => <option key={unit.unitId} value={unit.unitId}>{unit.unitOrder}. {formatSchoolUnit(unit)}</option>)}</select><button type="button" onClick={addRange}>範囲追加</button></div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{selectedNetz.map(unit => <button key={unit.unitId} type="button" onClick={() => { const next = removeOneToOneNetzUnitSelection(netzUnits, selectedNetzUnitId, unit.unitId); setSelectedNetzUnitId(next.selectedUnitId); setNetzUnits(next.unitIds); }}>単元{unit.unitOrder} ×</button>)}</div><p>登録後最大到達：単元{Math.max(detail.axis.find(unit => unit.unitId === detail.netzCurrentUnitId)?.unitOrder || 0, ...selectedNetz.map(unit => unit.unitOrder), 0) || '未登録'}</p><button type="button" onClick={save} disabled={!netzUnits.length || saving}>{saving ? '登録中...' : '登録'}</button></div>}
              {mode === 'history' && <div style={{ display: 'grid', gap: 10 }}>{history.map(event => <article key={event.eventId} style={{ border: event.status === 'VOID' ? '1px solid #cbd5e1' : '1px solid #dbe3ea', borderLeft: `5px solid ${event.status === 'VOID' ? '#94a3b8' : event.progressType === 'school' ? '#2563eb' : '#16a34a'}`, padding: 12, borderRadius: 8, background: event.status === 'VOID' ? '#f8fafc' : '#fff', color: event.status === 'VOID' ? '#64748b' : '#1e293b' }}><header style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}><strong>{formatLessonDateJa(event.lessonDate)}</strong><strong>{event.progressType === 'school' ? '学校' : 'ネッツ'}</strong>{event.status === 'VOID' && <span style={{ padding: '2px 7px', borderRadius: 999, background: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>無効化済み</span>}</header><HistoryUnits event={event} />{event.correctionReason && <p style={{ margin: '8px 0 0', fontSize: 12 }}><strong>理由：</strong>{event.correctionReason}</p>}{role === 'admin' && event.status === 'ACTIVE' && <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}><button type="button" onClick={() => voidEvent(event)} style={{ fontSize: 12 }}>無効化</button><button type="button" onClick={() => { setCorrectionEvent(event); setMode(event.progressType); setLessonDate(String(event.lessonDate).slice(0, 10)); if (event.progressType === 'school') setSchoolTarget(event.units.at(-1)?.unitId || ''); else { const unitIds = event.units.map(unit => unit.unitId); setNetzUnits(unitIds); setSelectedNetzUnitId(unitIds.at(-1) || ''); } }} style={{ fontSize: 12 }}>修正</button></div>}</article>)}</div>}
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
