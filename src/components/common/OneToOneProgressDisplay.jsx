import { useState } from 'react';
import { formatSchoolUnit, SOCIAL_FIELDS } from '../../utils/schoolUnits.js';
import ProgressAxisLine from './ProgressAxisLine.jsx';

export function OneToOneProgressLine({ axis = [], currentUnitId, label, onUnitClick }) {
  const currentOrder = axis.find(unit => unit.unitId === currentUnitId)?.unitOrder || 0;
  const color = label === '学校' ? '#2563eb' : '#16a34a';
  return <ProgressAxisLine axis={axis} currentOrder={currentOrder} label={label} color={color} onUnitClick={onUnitClick} formatUnit={unit => `単元${unit.unitOrder} ${formatSchoolUnit(unit)}`} renderCurrent={unit => <><span>単元{unit.unitOrder}</span><strong>{unit.unitName}</strong></>} />;
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
