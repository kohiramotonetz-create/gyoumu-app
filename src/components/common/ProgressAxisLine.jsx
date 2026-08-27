import { getChapterSegments } from '../../utils/oneToOneProgressDisplay.js';

export default function ProgressAxisLine({ axis = [], currentOrder = 0, label, color, formatUnit, renderCurrent, onUnitClick }) {
  const currentUnit = axis.find(unit => unit.unitOrder === currentOrder);
  const segments = getChapterSegments(axis);
  const position = order => `${((order - 1) / Math.max(1, axis.length - 1)) * 100}%`;
  return <div style={{ display: 'grid', gridTemplateColumns: label ? '58px minmax(720px, 1fr)' : 'minmax(720px, 1fr)', gap: 10, margin: '12px 0' }}>
    {label && <strong style={{ fontSize: 14, paddingTop: 31 }}>{label}</strong>}
    <div><div style={{ position: 'relative', height: 66, padding: '30px 8px 0' }} aria-label={`${label || '教材'}の進捗`}>
      {segments.map(segment => <span key={`${segment.chapter}:${segment.startOrder}`} title={segment.chapter} style={{ position: 'absolute', left: position(segment.startOrder), top: 0, width: `${((segment.endIndex - segment.startIndex + 1) / Math.max(1, axis.length)) * 100}%`, minWidth: 72, padding: '2px 5px 5px', borderLeft: '2px solid #94a3b8', color: '#64748b', fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{segment.chapter}</span>)}
      <div style={{ position: 'absolute', left: 8, right: 8, top: 39, height: 8, borderRadius: 5, background: '#e2e8f0' }} />
      <div style={{ position: 'absolute', left: 8, top: 39, height: 8, borderRadius: 5, width: `${axis.length ? ((Math.max(1, currentOrder) - 1) / Math.max(1, axis.length - 1)) * 100 : 0}%`, maxWidth: 'calc(100% - 16px)', background: currentOrder ? color : 'transparent' }} />
      {segments.map(segment => <span key={`boundary:${segment.startOrder}`} aria-hidden="true" style={{ position: 'absolute', left: position(segment.startOrder), top: 33, height: 21, borderLeft: '2px solid #64748b' }} />)}
      {axis.map(unit => <button key={unit.unitId || unit.unitOrder} type="button" onClick={() => onUnitClick?.(unit)} title={formatUnit(unit)} aria-label={formatUnit(unit)} style={{ position: 'absolute', left: position(unit.unitOrder), top: unit.unitOrder === currentOrder ? 33 : 36, width: unit.unitOrder === currentOrder ? 20 : 10, height: unit.unitOrder === currentOrder ? 20 : 10, padding: 0, borderRadius: '50%', border: unit.unitOrder === currentOrder ? '3px solid #fff' : '1px solid #fff', boxShadow: unit.unitOrder === currentOrder ? `0 0 0 2px ${color}` : 'none', background: unit.unitOrder === currentOrder ? color : unit.unitOrder <= currentOrder ? `${color}80` : '#cbd5e1', transform: 'translateX(-50%)', cursor: 'pointer' }} />)}
    </div><div style={{ minHeight: 24, padding: '3px 8px 0', color: currentOrder ? '#1e293b' : '#64748b', display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 13 }}><strong>現在：</strong>{currentUnit ? renderCurrent(currentUnit) : <span>未登録</span>}</div></div>
  </div>;
}
