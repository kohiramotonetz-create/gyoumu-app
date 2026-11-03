import { ALL_SCHOOLS, ORGANIZATION_GROUPS } from '../../constants/organization.js';

export default function SchoolSelect({
  value,
  onChange,
  disabled = false,
  className,
  style,
  assignedSchools = [],
  showAssignedOptions = true,
  assignedOnly = false,
  showAllSchoolsOption = false,
  placeholder = '選択してください',
}) {
  return (
    <select value={value} onChange={onChange} disabled={disabled} className={className} style={style}>
      <option value="">{placeholder}</option>
      {showAllSchoolsOption && <option value="全校舎">全校舎</option>}
      {showAssignedOptions && <optgroup label="担当校舎">
        <option value={assignedSchools.length === 1 ? assignedSchools[0] : '全担当校舎'}>全担当校舎</option>
        {assignedSchools.map(school => <option key={`assigned-${school}`} value={school}>{school}</option>)}
      </optgroup>}
      {!assignedOnly && (showAllSchoolsOption ? ALL_SCHOOLS.map(school => <option key={school} value={school}>{school}</option>) : ORGANIZATION_GROUPS.map(group => (
        <optgroup key={group.label} label={group.label}>
          {group.schools.map(school => <option key={`${group.label}-${school}`} value={school}>{school}</option>)}
        </optgroup>
      )))}
    </select>
  );
}
