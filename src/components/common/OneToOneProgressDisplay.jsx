import { useState } from 'react';
import { formatSchoolUnit, SOCIAL_FIELDS } from '../../utils/schoolUnits.js';
import { getChapterSegments } from '../../utils/oneToOneProgressDisplay.js';

export function OneToOneProgressLine({ axis = [], currentUnitId, label, onUnitClick }) {
  const currentUnit = axis.find(unit => unit.unitId === currentUnitId);
  const currentOrder = currentUnit?.unitOrder || 0;
  const segments = getChapterSegments(axis);
  const position = order => `${((order - 1) / Math.max(1, axis.length - 1)) * 100}%`;
  const color = label === '学校' ? '#2563eb' : '#16a34a';
  return <div style={{ display: 'grid', gridTemplateColumns: '58px minmax(720px, 1fr)', gap: 10, margin: '12px 0' }}>
    <strong style={{ fontSize: 14, paddingTop: 31 }}>{label}</strong>
    <div><div style={{ position: 'relative', height: 66, padding: '30px 8px 0' }} aria-label={`${label}の進捗`}>
      {segments.map(segment => <span key={`${segment.chapter}:${segment.startOrder}`} title={segment.chapter} style={{ position: 'absolute', left: position(segment.startOrder), top: 0, width: `${((segment.endIndex - segment.startIndex + 1) / Math.max(1, axis.length)) * 100}%`, minWidth: 72, padding: '2px 5px 5px', borderLeft: '2px solid #94a3b8', color: '#64748b', fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{segment.chapter}</span>)}
      <div style={{ position: 'absolute', left: 8, right: 8, top: 39, height: 8, borderRadius: 5, background: '#e2e8f0' }} />
      <div style={{ position: 'absolute', left: 8, top: 39, height: 8, borderRadius: 5, width: `${axis.length ? ((Math.max(1, currentOrder) - 1) / Math.max(1, axis.length - 1)) * 100 : 0}%`, maxWidth: 'calc(100% - 16px)', background: currentOrder ? color : 'transparent' }} />
      {segments.map(segment => <span key={`boundary:${segment.startOrder}`} aria-hidden="true" style={{ position: 'absolute', left: position(segment.startOrder), top: 33, height: 21, borderLeft: '2px solid #64748b' }} />)}
      {axis.map(unit => <button key={unit.unitId} type="button" onClick={() => onUnitClick?.(unit)} title={`単元${unit.unitOrder} ${formatSchoolUnit(unit)}`} aria-label={`単元${unit.unitOrder} ${formatSchoolUnit(unit)}`} style={{ position: 'absolute', left: position(unit.unitOrder), top: unit.unitOrder === currentOrder ? 33 : 36, width: unit.unitOrder === currentOrder ? 20 : 10, height: unit.unitOrder === currentOrder ? 20 : 10, padding: 0, borderRadius: '50%', border: unit.unitOrder === currentOrder ? '3px solid #fff' : '1px solid #fff', boxShadow: unit.unitOrder === currentOrder ? `0 0 0 2px ${color}` : 'none', background: unit.unitOrder === currentOrder ? color : unit.unitOrder <= currentOrder ? `${color}80` : '#cbd5e1', transform: 'translateX(-50%)', cursor: 'pointer' }} />)}
    </div><div style={{ minHeight: 24, padding: '3px 8px 0', color: currentOrder ? '#1e293b' : '#64748b', display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 13 }}><strong>現在：</strong>{currentUnit ? <><span>単元{currentOrder}</span><strong>{currentUnit.unitName}</strong></> : <span>未登録</span>}</div></div>
  </div>;
}

export function OneToOneSubjectProgress({ subjectId, state }) {
  const [expanded, setExpanded] = useState({});
  if (subjectId !== 'social') return <div style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}><OneToOneProgressLine axis={state.axis} currentUnitId={state.schoolCurrentUnitId} label="学校" /><OneToOneProgressLine axis={state.axis} currentUnitId={state.netzCurrentUnitId} label="ネッツ" /></div>;
  return <div style={{ display: 'grid', gap: 8 }}>{SOCIAL_FIELDS.map(field => {
    const item = state.fields?.[field.fieldId] || {};
    const open = Boolean(expanded[field.fieldId]);
    const order = id => item.axis?.find(unit => unit.unitId === id)?.unitOrder || 0;
    return <section key={field.fieldId} style={{ border: '1px solid #cbd5e1', borderRadius: 7, overflow: 'hidden' }}><button type="button" aria-expanded={open} onClick={() => setExpanded(value => ({ ...value, [field.fieldId]: !open }))} style={{ width: '100%', border: 0, padding: 10, display: 'flex', justifyContent: 'space-between', background: '#f8fafc' }}><strong>{open ? '▼' : '▶'} {field.label}</strong><span>学校：{order(item.schoolCurrentUnitId) || '未登録'} / ネッツ：{order(item.netzCurrentUnitId) || '未登録'}</span></button>{open && <div style={{ overflowX: 'auto', padding: 8 }}><OneToOneProgressLine axis={item.axis} currentUnitId={item.schoolCurrentUnitId} label="学校" /><OneToOneProgressLine axis={item.axis} currentUnitId={item.netzCurrentUnitId} label="ネッツ" /></div>}</section>;
  })}</div>;
}
