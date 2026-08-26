import { useMemo, useState } from 'react';
import axios from 'axios';
import FilterButtonGroup from './FilterButtonGroup.jsx';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { ONE_TO_ONE_SUBJECTS } from '../utils/oneToOneSubjects.js';
import { formatSchoolUnit, SOCIAL_FIELDS } from '../utils/schoolUnits.js';
import { formatLessonDateJa, getChapterSegments, isConsecutiveUnits } from '../utils/oneToOneProgressDisplay.js';

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const makeRequestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function ProgressLine({ axis, currentUnitId, label, onUnitClick }) {
  const currentUnit = axis.find(unit => unit.unitId === currentUnitId);
  const currentOrder = currentUnit?.unitOrder || 0;
  const chapterSegments = getChapterSegments(axis);
  const position = order => `${((order - 1) / Math.max(1, axis.length - 1)) * 100}%`;
  const color = label === '学校' ? '#2563eb' : '#16a34a';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '58px minmax(720px, 1fr)', alignItems: 'start', gap: 10, margin: '12px 0' }}>
      <strong style={{ fontSize: 14, paddingTop: 31 }}>{label}</strong>
      <div>
        <div style={{ position: 'relative', height: 66, padding: '30px 8px 0' }} aria-label={`${label}の進捗`}>
          {chapterSegments.map(segment => {
            const width = ((segment.endIndex - segment.startIndex + 1) / Math.max(1, axis.length)) * 100;
            return <span key={`${segment.chapter}:${segment.startOrder}`} title={segment.chapter} style={{ position: 'absolute', left: position(segment.startOrder), top: 0, width: `${width}%`, minWidth: 72, padding: '2px 5px 5px', borderLeft: '2px solid #64748b', color: '#334155', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{segment.chapter}</span>;
          })}
          <div style={{ position: 'absolute', left: 8, right: 8, top: 39, height: 8, borderRadius: 5, background: '#e2e8f0' }} />
          <div style={{ position: 'absolute', left: 8, top: 39, height: 8, borderRadius: 5, width: `${axis.length ? ((Math.max(1, currentOrder) - 1) / Math.max(1, axis.length - 1)) * 100 : 0}%`, maxWidth: 'calc(100% - 16px)', background: currentOrder ? color : 'transparent' }} />
          {chapterSegments.map(segment => <span key={`boundary:${segment.startOrder}`} aria-hidden="true" style={{ position: 'absolute', left: position(segment.startOrder), top: 33, height: 21, borderLeft: '2px solid #64748b' }} />)}
        {axis.map(unit => (
            <button key={unit.unitId} type="button" onClick={() => onUnitClick?.(unit)} title={`単元${unit.unitOrder} ${formatSchoolUnit(unit)}`} aria-label={`単元${unit.unitOrder} ${formatSchoolUnit(unit)}`} style={{ position: 'absolute', left: position(unit.unitOrder), top: unit.unitOrder === currentOrder ? 33 : 36, width: unit.unitOrder === currentOrder ? 20 : 10, height: unit.unitOrder === currentOrder ? 20 : 10, padding: 0, borderRadius: '50%', border: unit.unitOrder === currentOrder ? '3px solid #fff' : '1px solid #fff', boxShadow: unit.unitOrder === currentOrder ? `0 0 0 2px ${color}` : 'none', background: unit.unitOrder === currentOrder ? color : unit.unitOrder <= currentOrder ? `${color}80` : '#cbd5e1', transform: 'translateX(-50%)', cursor: 'pointer' }} />
        ))}
        </div>
        <div style={{ minHeight: 39, padding: '3px 8px 0', color: currentOrder ? '#1e293b' : '#64748b' }}>
          <span style={{ fontSize: 11 }}>{currentOrder ? `単元${currentOrder}` : '未登録'}</span>
          {currentUnit && <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{currentUnit.unitName}</div>}
        </div>
      </div>
    </div>
  );
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
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [data, setData] = useState({ axis: [], students: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [mode, setMode] = useState('');
  const [lessonDate, setLessonDate] = useState(today());
  const [schoolTarget, setSchoolTarget] = useState('');
  const [netzUnits, setNetzUnits] = useState([]);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [correctionEvent, setCorrectionEvent] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const subjectLabels = useMemo(() => ONE_TO_ONE_SUBJECTS.map(subject => subject.label), []);

  const request = async (action, payload = {}) => {
    const response = await axios.post(GAS_URL, JSON.stringify({ action, apiKey: API_KEY, sessionToken, ...payload }), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000 });
    if (response.data?.code === 'AUTHORIZATION_ERROR') onSessionExpired?.();
    if (response.data?.result !== 'success') throw new Error(response.data?.message || '処理に失敗しました');
    return response.data;
  };

  const fetchMatrix = async () => {
    if (!school || !grade || !subjectId) return setNotice('校舎・学年・科目を選択してください。');
    setLoading(true); setNotice('');
    try { setData(await request('getOneToOneProgressMatrix', { school, grade, subjectId })); }
    catch (error) { setNotice(error.message); }
    finally { setLoading(false); }
  };

  const openStudent = async (student, nextMode, fieldId = '') => {
    const effectiveFieldId = subjectId === 'social' ? (fieldId || 'history') : '';
    setSelected(student); setMode(nextMode); setLessonDate(today()); setSchoolTarget(''); setNetzUnits([]); setRangeStart(''); setRangeEnd(''); setNotice(''); setCorrectionEvent(null);
    setSelectedFieldId(effectiveFieldId);
    try {
      const result = await request('getOneToOneProgressDetail', { userId: student.userId, subjectId, fieldId: effectiveFieldId });
      setDetail(result);
      if (nextMode === 'school') {
        const currentOrder = result.axis.find(unit => unit.unitId === result.schoolCurrentUnitId)?.unitOrder || 0;
        setSchoolTarget(result.axis.find(unit => unit.unitOrder === currentOrder + 1)?.unitId || '');
      }
    } catch (error) { setNotice(error.message); setDetail(null); }
  };

  const save = async () => {
    if (!selected || !detail || saving) return;
    setSaving(true); setNotice('');
    try {
      const correctionStart = correctionEvent?.units?.[0]?.unitOrder || 1;
      const replacement = mode === 'school'
        ? { lessonDate, toUnitId: schoolTarget, unitIds: correctionEvent ? detail.axis.filter(unit => unit.unitOrder >= correctionStart && unit.unitOrder <= schoolTargetOrder).map(unit => unit.unitId) : undefined, isCorrection: Boolean(correctionEvent), requestId: makeRequestId() }
        : { lessonDate, unitIds: netzUnits, requestId: makeRequestId() };
      if (correctionEvent) {
        const correctionReason = window.prompt('訂正理由を入力してください。');
        if (!correctionReason) return;
        await request('correctOneToOneProgressEvent', { userId: selected.userId, subjectId, fieldId: selectedFieldId, eventId: correctionEvent.eventId, correctionReason, replacement: { ...replacement, fieldId: selectedFieldId } });
      } else if (mode === 'school') await request('addOneToOneSchoolProgress', { userId: selected.userId, subjectId, fieldId: selectedFieldId, ...replacement });
      else await request('addOneToOneNetzProgress', { userId: selected.userId, subjectId, fieldId: selectedFieldId, ...replacement });
      setNotice('進捗を登録しました。');
      await fetchMatrix();
      await openStudent(selected, 'history', selectedFieldId);
    } catch (error) { setNotice(error.message); }
    finally { setSaving(false); }
  };

  const addRange = () => {
    const start = detail.axis.find(unit => unit.unitId === rangeStart)?.unitOrder;
    const end = detail.axis.find(unit => unit.unitId === rangeEnd)?.unitOrder;
    if (!start || !end) return;
    const [low, high] = start <= end ? [start, end] : [end, start];
    setNetzUnits(current => Array.from(new Set([...current, ...detail.axis.filter(unit => unit.unitOrder >= low && unit.unitOrder <= high).map(unit => unit.unitId)])));
  };

  const voidEvent = async event => {
    const correctionReason = window.prompt('無効化理由を入力してください。');
    if (!correctionReason) return;
    try { await request('voidOneToOneProgressEvent', { userId: selected.userId, subjectId, fieldId: selectedFieldId, eventId: event.eventId, correctionReason }); await openStudent(selected, 'history', selectedFieldId); await fetchMatrix(); }
    catch (error) { setNotice(error.message); }
  };

  const currentSchoolOrder = detail?.axis.find(unit => unit.unitId === detail.schoolCurrentUnitId)?.unitOrder || 0;
  const schoolTargetOrder = detail?.axis.find(unit => unit.unitId === schoolTarget)?.unitOrder || 0;
  const selectedNetz = detail?.axis.filter(unit => netzUnits.includes(unit.unitId)) || [];
  const history = detail ? [...detail.schoolHistory, ...detail.netzHistory].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)) : [];
  const socialFieldAxes = subjectId === 'social' ? SOCIAL_FIELDS.map(field => data.fieldAxes?.find(item => item.fieldId === field.fieldId)).filter(Boolean) : [];
  const getOrder = (axis, unitId) => axis.find(unit => unit.unitId === unitId)?.unitOrder || 0;
  const toggleGroup = (studentId, fieldId) => setExpandedGroups(current => ({ ...current, [`${studentId}:${fieldId}`]: !current[`${studentId}:${fieldId}`] }));

  return (
    <div style={{ padding: 10 }}>
      <h2 style={styles.contentTitle}>🤝 1対1進捗チェック</h2>
      <div style={{ background: '#fff', padding: 18, borderRadius: 8, boxShadow: '0 1px 3px #0002', marginBottom: 18 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <SchoolSelect style={styles.select} value={school} onChange={event => setSchool(event.target.value)} assignedSchools={assignedSchools} />
          <GradeSelect style={styles.select} value={grade} onChange={values => setGrade(values[0] || '')} includeGroups={false} />
          <FilterButtonGroup label="科目" options={subjectLabels} selected={ONE_TO_ONE_SUBJECTS.find(subject => subject.subjectId === subjectId)?.label || ''} onSelect={label => setSubjectId(ONE_TO_ONE_SUBJECTS.find(subject => subject.label === label)?.subjectId || '')} isMultiple={false} />
          <button type="button" style={{ ...styles.doneBtn, background: '#0f766e', color: '#fff' }} onClick={fetchMatrix} disabled={loading}>{loading ? '読込中...' : '表示更新'}</button>
        </div>
      </div>
      {notice && <p role="status" style={{ padding: 10, background: '#f1f5f9', borderRadius: 6 }}>{notice}</p>}
      <div style={{ display: 'grid', gap: 14 }}>
        {data.students.map(student => (
          <section key={student.userId} style={{ background: '#fff', border: '1px solid #dbe3ea', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => openStudent(student, 'history', subjectId === 'social' ? 'history' : '')} style={{ border: 0, background: 'none', color: '#0f4c81', fontWeight: 700, cursor: 'pointer', padding: 4 }}>{student.name} / {student.grade}</button>
              {subjectId !== 'social' && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><button type="button" onClick={() => openStudent(student, 'school')}>学校進捗入力</button><button type="button" onClick={() => openStudent(student, 'netz')}>ネッツ進捗入力</button><button type="button" onClick={() => openStudent(student, 'history')}>履歴</button></div>}
            </div>
            {subjectId !== 'social' && <div aria-label="学校とネッツの共通単元軸" style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}><ProgressLine axis={data.axis} currentUnitId={student.schoolCurrentUnitId} label="学校" onUnitClick={unit => setNotice(`単元${unit.unitOrder}: ${formatSchoolUnit(unit)}`)} /><ProgressLine axis={data.axis} currentUnitId={student.netzCurrentUnitId} label="ネッツ" onUnitClick={unit => setNotice(`単元${unit.unitOrder}: ${formatSchoolUnit(unit)}`)} /></div>}
            {subjectId === 'social' && <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>{socialFieldAxes.map(field => {
              const key = `${student.userId}:${field.fieldId}`;
              const expanded = Boolean(expandedGroups[key]);
              const progress = student.progressByField?.[field.fieldId] || {};
              const schoolOrder = getOrder(field.axis, progress.schoolCurrentUnitId);
              const netzOrder = getOrder(field.axis, progress.netzCurrentUnitId);
              return <div key={field.fieldId} style={{ border: '1px solid #cbd5e1', borderRadius: 7, overflow: 'hidden' }}>
                <button type="button" aria-expanded={expanded} onClick={() => toggleGroup(student.userId, field.fieldId)} style={{ width: '100%', border: 0, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, background: '#f8fafc', textAlign: 'left', cursor: 'pointer' }}><strong>{expanded ? '▼' : '▶'} {field.label}</strong><span style={{ fontSize: 12, color: '#475569' }}>{schoolOrder || netzOrder ? `学校：${schoolOrder ? `単元${schoolOrder}` : '未登録'} / ネッツ：${netzOrder ? `単元${netzOrder}` : '未登録'}` : '未登録'}</span></button>
                {expanded && <div style={{ padding: 10 }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}><button type="button" onClick={() => openStudent(student, 'school', field.fieldId)}>学校進捗入力</button><button type="button" onClick={() => openStudent(student, 'netz', field.fieldId)}>ネッツ進捗入力</button><button type="button" onClick={() => openStudent(student, 'history', field.fieldId)}>履歴</button></div><div aria-label={`${field.label}の学校とネッツの共通単元軸`} style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}><ProgressLine axis={field.axis} currentUnitId={progress.schoolCurrentUnitId} label="学校" onUnitClick={unit => setNotice(`${field.label} 単元${unit.unitOrder}: ${formatSchoolUnit(unit)}`)} /><ProgressLine axis={field.axis} currentUnitId={progress.netzCurrentUnitId} label="ネッツ" onUnitClick={unit => setNotice(`${field.label} 単元${unit.unitOrder}: ${formatSchoolUnit(unit)}`)} /></div></div>}
              </div>;
            })}</div>}
          </section>
        ))}
        {!loading && (data.axis.length > 0 || socialFieldAxes.length > 0) && data.students.length === 0 && <p>この条件で1対1受講科目が登録された生徒はいません。</p>}
      </div>
      {selected && detail && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0008', display: 'grid', placeItems: 'center', padding: 12 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', width: 'min(900px, 100%)', maxHeight: '92vh', overflow: 'auto', borderRadius: 12, padding: 18 }} onClick={event => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{selected.name} / {selected.grade}</h3><button type="button" onClick={() => setSelected(null)}>閉じる</button></div>
            {subjectId === 'social' && <FilterButtonGroup label="社会分野" options={SOCIAL_FIELDS.map(field => field.label)} selected={SOCIAL_FIELDS.find(field => field.fieldId === selectedFieldId)?.label || ''} onSelect={label => openStudent(selected, mode, SOCIAL_FIELDS.find(field => field.label === label)?.fieldId || 'history')} isMultiple={false} />}
            {correctionEvent && <p style={{ color: '#b45309' }}>履歴を訂正中です。登録時に元履歴をVOID化します。</p>}
            {mode !== 'history' && <label>授業日 <input type="date" value={lessonDate} onChange={event => setLessonDate(event.target.value)} /></label>}
            {mode === 'school' && <div style={{ display: 'grid', gap: 12, marginTop: 14 }}><p>現在：{currentSchoolOrder ? `単元${currentSchoolOrder}` : '未登録'}</p><label>今回の最終到達位置<select value={schoolTarget} onChange={event => setSchoolTarget(event.target.value)}><option value="">選択</option>{detail.axis.filter(unit => correctionEvent || unit.unitOrder > currentSchoolOrder).map(unit => <option key={unit.unitId} value={unit.unitId}>{unit.unitOrder}. {formatSchoolUnit(unit)}</option>)}</select></label><p>今回追加：{correctionEvent ? `訂正後：単元${schoolTargetOrder || '-'}` : schoolTargetOrder > currentSchoolOrder ? `単元${currentSchoolOrder + 1}～単元${schoolTargetOrder}` : '未選択'}</p><button type="button" onClick={save} disabled={!schoolTarget || saving}>{saving ? '登録中...' : '登録'}</button></div>}
            {mode === 'netz' && <div style={{ display: 'grid', gap: 12, marginTop: 14 }}><label>単元を追加<select defaultValue="" onChange={event => { if (event.target.value) setNetzUnits(current => Array.from(new Set([...current, event.target.value]))); event.target.value = ''; }}><option value="">選択</option>{detail.axis.map(unit => <option key={unit.unitId} value={unit.unitId}>{unit.unitOrder}. {formatSchoolUnit(unit)}</option>)}</select></label><div><select value={rangeStart} onChange={event => setRangeStart(event.target.value)}><option value="">範囲開始</option>{detail.axis.map(unit => <option key={unit.unitId} value={unit.unitId}>単元{unit.unitOrder}</option>)}</select><select value={rangeEnd} onChange={event => setRangeEnd(event.target.value)}><option value="">範囲終了</option>{detail.axis.map(unit => <option key={unit.unitId} value={unit.unitId}>単元{unit.unitOrder}</option>)}</select><button type="button" onClick={addRange}>範囲追加</button></div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{selectedNetz.map(unit => <button key={unit.unitId} type="button" onClick={() => setNetzUnits(current => current.filter(id => id !== unit.unitId))}>単元{unit.unitOrder} ×</button>)}</div><p>登録後最大到達：単元{Math.max(detail.axis.find(unit => unit.unitId === detail.netzCurrentUnitId)?.unitOrder || 0, ...selectedNetz.map(unit => unit.unitOrder), 0) || '未登録'}</p><button type="button" onClick={save} disabled={!netzUnits.length || saving}>{saving ? '登録中...' : '登録'}</button></div>}
            {mode === 'history' && <div style={{ display: 'grid', gap: 10 }}>{history.map(event => <article key={event.eventId} style={{ border: event.status === 'VOID' ? '1px solid #cbd5e1' : '1px solid #dbe3ea', borderLeft: `5px solid ${event.status === 'VOID' ? '#94a3b8' : event.progressType === 'school' ? '#2563eb' : '#16a34a'}`, padding: 12, borderRadius: 8, background: event.status === 'VOID' ? '#f8fafc' : '#fff', color: event.status === 'VOID' ? '#64748b' : '#1e293b' }}><header style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}><strong>{formatLessonDateJa(event.lessonDate)}</strong><strong>{event.progressType === 'school' ? '学校' : 'ネッツ'}</strong>{event.status === 'VOID' && <span style={{ padding: '2px 7px', borderRadius: 999, background: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>無効化済み</span>}</header><HistoryUnits event={event} />{event.correctionReason && <p style={{ margin: '8px 0 0', fontSize: 12 }}><strong>理由：</strong>{event.correctionReason}</p>}{role === 'admin' && event.status === 'ACTIVE' && <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}><button type="button" onClick={() => voidEvent(event)} style={{ fontSize: 12 }}>無効化</button><button type="button" onClick={() => { setCorrectionEvent(event); setMode(event.progressType); setLessonDate(String(event.lessonDate).slice(0, 10)); if (event.progressType === 'school') setSchoolTarget(event.units.at(-1)?.unitId || ''); else setNetzUnits(event.units.map(unit => unit.unitId)); }} style={{ fontSize: 12 }}>修正</button></div>}</article>)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
