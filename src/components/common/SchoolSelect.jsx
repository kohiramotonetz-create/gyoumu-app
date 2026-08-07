import { ORGANIZATION_GROUPS } from '../../constants/organization.js';

export default function SchoolSelect({
  value,
  onChange,
  disabled = false,
  className,
  style,
  assignedSchools = [],
  showAssignedOptions = true,
  placeholder = '選択してください',
}) {
  return (
    <select value={value} onChange={onChange} disabled={disabled} className={className} style={style}>
      <option value="">{placeholder}</option>
      {showAssignedOptions && <optgroup label="担当校舎">
        <option value={assignedSchools.length === 1 ? assignedSchools[0] : '全担当校舎'}>全担当校舎</option>
        {assignedSchools.map(school => <option key={`assigned-${school}`} value={school}>{school}</option>)}
      </optgroup>}
      {ORGANIZATION_GROUPS.map(group => (
        <optgroup key={group.label} label={group.label}>
          {group.schools.map(school => <option key={`${group.label}-${school}`} value={school}>{school}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
