const INDIVIDUAL_GRADE_OPTIONS = [
  { label: '小１', values: ['小１'] },
  { label: '小２', values: ['小２'] },
  { label: '小３', values: ['小３'] },
  { label: '小４', values: ['小４'] },
  { label: '小５', values: ['小５'] },
  { label: '小６', values: ['小６'] },
  { label: '中１', values: ['中１'] },
  { label: '中２', values: ['中２'] },
  { label: '中３', values: ['中３'] },
  { label: '高１', values: ['高１'] },
  { label: '高２', values: ['高２'] },
  { label: '高３', values: ['高３'] },
  { label: '大学受験', values: ['大学受験'] },
];

const GROUP_GRADE_OPTIONS = [
  { label: '小学生', values: ['小１', '小２', '小３', '小４', '小５', '小６'] },
  { label: '中学生', values: ['中１', '中２', '中３'] },
  { label: '高校生', values: ['高１', '高２', '高３'] },
];

const sameValues = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

export default function GradeSelect({
  value = [],
  onChange,
  disabled = false,
  className,
  style,
  includeGroups = true,
  placeholder = '選択してください',
}) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const options = includeGroups ? [...INDIVIDUAL_GRADE_OPTIONS, ...GROUP_GRADE_OPTIONS] : INDIVIDUAL_GRADE_OPTIONS;
  const selectedLabel = options.find(option => sameValues(option.values, selectedValues))?.label || '';

  const handleChange = event => {
    const option = options.find(item => item.label === event.target.value);
    onChange(option ? [...option.values] : [], event);
  };

  return (
    <select value={selectedLabel} onChange={handleChange} disabled={disabled} className={className} style={style}>
      <option value="">{placeholder}</option>
      <optgroup label="個別学年">
        {INDIVIDUAL_GRADE_OPTIONS.map(option => <option key={option.label} value={option.label}>{option.label}</option>)}
      </optgroup>
      {includeGroups && (
        <optgroup label="一括学年">
          {GROUP_GRADE_OPTIONS.map(option => <option key={option.label} value={option.label}>{option.label}</option>)}
        </optgroup>
      )}
    </select>
  );
}
