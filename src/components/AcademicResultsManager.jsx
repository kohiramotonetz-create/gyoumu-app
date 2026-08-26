import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { compareStudentsByKana } from '../utils/studentAccountOrdering.js';
import { ACADEMIC_SUBJECTS, TEST_TYPE_LABELS, areAcademicScoresEqual, calculateAcademicTotal, normalizeAcademicScore, parseAcademicScorePaste } from '../utils/academicResults.js';

const REQUEST_TIMEOUT_MS = 30000;
const currentSchoolYear = () => { const now = new Date(); return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear(); };
const emptyForm = () => ({ testName: '', testType: 'regular', maxScore: 100 });

export default function AcademicResultsManager({ GAS_URL, API_KEY, sessionToken, assignedSchools = [], styles, onSessionExpired }) {
  const [tab, setTab] = useState('input');
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingTestId, setEditingTestId] = useState('');
  const [year, setYear] = useState(currentSchoolYear());
  const [grade, setGrade] = useState('');
  const [testId, setTestId] = useState('');
  const [school, setSchool] = useState('');
  const [students, setStudents] = useState([]);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const postAction = async (action, payload = {}) => {
    const response = await axios.post(GAS_URL, JSON.stringify({ action, apiKey: API_KEY, sessionToken, ...payload }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
    if (response.data?.result !== 'success') {
      if (response.data?.code === 'AUTHORIZATION_ERROR') onSessionExpired?.();
      throw new Error(response.data?.message || '処理に失敗しました');
    }
    return response.data;
  };

  const loadTests = async () => {
    setLoading(true);
    try {
      const response = await postAction('getAcademicResultTests', { includeDisabled: true });
      setTests(response.tests || []);
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTests(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const years = useMemo(() => [...new Set([currentSchoolYear(), ...tests.map(test => test.schoolYear)])].sort((a, b) => b - a), [tests]);
  const availableTests = useMemo(() => tests.filter(test => test.enabled && test.schoolYear === Number(year)).sort((a, b) => a.sortOrder - b.sortOrder), [tests, year]);
  const selectedTest = tests.find(test => test.testId === testId);
  const sortedStudents = useMemo(() => [...students].sort(compareStudentsByKana), [students]);
  const dirtyStudents = useMemo(() => sortedStudents.filter(student => !areAcademicScoresEqual(editing[student.userId], student.scores)), [editing, sortedStudents]);

  const saveTest = async event => {
    event.preventDefault();
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      const payload = { ...form, schoolYear: Number(year), maxScore: Number(form.maxScore) };
      if (editingTestId) await postAction('updateAcademicResultTest', { testId: editingTestId, testName: payload.testName, testType: payload.testType, maxScore: payload.maxScore, enabled: tests.find(test => test.testId === editingTestId)?.enabled === true });
      else await postAction('createAcademicResultTest', payload);
      setForm(emptyForm()); setEditingTestId(''); await loadTests();
      setMessage({ type: 'success', text: editingTestId ? 'テストを更新しました。' : 'テストを追加しました。' });
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  const startEditTest = test => { setEditingTestId(test.testId); setYear(test.schoolYear); setForm({ testName: test.testName, testType: test.testType, maxScore: test.maxScore }); };
  const toggleTest = async test => {
    if (test.enabled && !window.confirm('このテストを無効化します。既存成績は削除されません。よろしいですか？')) return;
    setSaving(true);
    try { await postAction('updateAcademicResultTest', { testId: test.testId, testName: test.testName, testType: test.testType, maxScore: test.maxScore, enabled: !test.enabled }); await loadTests(); }
    catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  const loadMatrix = async () => {
    if (!testId || !school || !grade) return setMessage({ type: 'error', text: '年度・学年・テスト・校舎を選択してください。' });
    setLoading(true); setMessage({ type: '', text: '' });
    try {
      const response = await postAction('getAcademicResultMatrix', { testId, school, grade });
      const next = [...(response.students || [])].sort(compareStudentsByKana);
      setStudents(next); setEditing(Object.fromEntries(next.map(student => [student.userId, { ...student.scores }])));
      setMessage({ type: 'success', text: `${next.length}名の成績を取得しました。` });
    } catch (error) { setStudents([]); setEditing({}); setMessage({ type: 'error', text: error.message }); }
    finally { setLoading(false); }
  };

  const changeScore = (student, key, value) => {
    try {
      const score = normalizeAcademicScore(value, selectedTest.maxScore);
      setEditing(current => ({ ...current, [student.userId]: { ...current[student.userId], [key]: score } }));
      setMessage({ type: '', text: '' });
    } catch (error) { setMessage({ type: 'error', text: `${student.name}・${ACADEMIC_SUBJECTS.find(subject => subject.key === key).label}：${error.message}` }); }
  };

  const pasteScores = (event, startIndex, subjectKey) => {
    const text = event.clipboardData.getData('text/plain');
    if (!/[\t\r\n]/.test(text)) return;
    event.preventDefault();
    if (subjectKey !== 'japanese') return setMessage({ type: 'error', text: '複数セルの貼り付けは、対象生徒の国語セルから行ってください。' });
    const parsed = parseAcademicScorePaste(text, selectedTest.maxScore, sortedStudents.length - startIndex);
    if (parsed.errors.length) return setMessage({ type: 'error', text: parsed.errors.join('\n') });
    const next = { ...editing };
    parsed.rows.forEach((row, offset) => {
      const student = sortedStudents[startIndex + offset];
      next[student.userId] = Object.fromEntries(ACADEMIC_SUBJECTS.map((subject, index) => [subject.key, row[index]]));
    });
    setEditing(next); setMessage({ type: 'success', text: `${parsed.rows.length}名分を入力しました。内容を確認して一括保存してください。` });
  };

  const saveResults = async () => {
    if (!dirtyStudents.length) return;
    if (!window.confirm(`${dirtyStudents.length}名分の「${year}年度 ${grade} ${selectedTest.testName}」の成績を保存します。`)) return;
    setSaving(true);
    try {
      await postAction('bulkUpdateAcademicResults', { testId, grade, records: dirtyStudents.map(student => ({ userId: student.userId, scores: editing[student.userId] })) });
      await loadMatrix(); setMessage({ type: 'success', text: `${dirtyStudents.length}名分の成績を保存しました。` });
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  const panel = { background: '#fff', border: '1px solid #dbe2e8', borderRadius: 8, padding: 16 };
  const header = { position: 'sticky', top: 0, zIndex: 10, padding: 8, minWidth: 82, background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', whiteSpace: 'nowrap' };
  return <div style={{ padding: 10 }}>
    <h2 style={styles.contentTitle}>📊 学校成績管理</h2>
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}><button style={styles.doneBtn} onClick={() => setTab('input')}>成績入力</button><button style={styles.doneBtn} onClick={() => setTab('tests')}>テスト設定</button></div>
    {message.text && <div role="status" style={{ whiteSpace: 'pre-wrap', padding: 10, marginBottom: 12, borderRadius: 6, background: message.type === 'error' ? '#fee2e2' : '#dcfce7', color: message.type === 'error' ? '#991b1b' : '#166534' }}>{message.text}</div>}
    {tab === 'tests' ? <div style={{ display: 'grid', gap: 16 }}>
      <form onSubmit={saveTest} style={{ ...panel, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
        <label>年度<input type="number" value={year} disabled={Boolean(editingTestId)} onChange={e => setYear(Number(e.target.value))} required /></label>
        <label>テスト名<input value={form.testName} onChange={e => setForm(value => ({ ...value, testName: e.target.value }))} required /></label>
        <label>種別<select value={form.testType} onChange={e => setForm(value => ({ ...value, testType: e.target.value }))}>{Object.entries(TEST_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>満点<input type="number" min="1" max="1000" value={form.maxScore} onChange={e => setForm(value => ({ ...value, maxScore: e.target.value }))} required /></label>
        <button disabled={saving} style={styles.doneBtn}>{editingTestId ? '更新' : 'テスト追加'}</button>
        {editingTestId && <button type="button" onClick={() => { setEditingTestId(''); setForm(emptyForm()); }}>キャンセル</button>}
        {editingTestId && <small>年度は作成後に変更できません。</small>}
      </form>
      <div style={panel}>{loading ? '読み込み中...' : tests.map(test => <div key={test.testId} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderBottom: '1px solid #e5e7eb', opacity: test.enabled ? 1 : .6 }}><strong>{test.schoolYear}年度 {test.testName}</strong><span>{TEST_TYPE_LABELS[test.testType]}</span><span>{test.maxScore}点</span><span>{test.enabled ? '有効' : '無効'}</span><button onClick={() => startEditTest(test)}>編集</button><button disabled={saving} onClick={() => toggleTest(test)}>{test.enabled ? '無効化' : '有効化'}</button></div>)}</div>
    </div> : <>
      <div style={{ ...panel, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end', marginBottom: 14 }}>
        <label>年度<select value={year} onChange={e => { setYear(Number(e.target.value)); setTestId(''); setStudents([]); }}>{years.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>学年<GradeSelect value={grade ? [grade] : []} onChange={values => { setGrade(values[0] || ''); setTestId(''); setStudents([]); }} includeGroups={false} /></label>
        <label>テスト<select value={testId} onChange={e => { setTestId(e.target.value); setStudents([]); }}><option value="">選択してください</option>{availableTests.map(test => <option key={test.testId} value={test.testId}>{test.testName}</option>)}</select></label>
        <label>校舎<SchoolSelect value={school} onChange={e => { setSchool(e.target.value); setStudents([]); }} assignedSchools={assignedSchools} /></label>
        <button style={styles.doneBtn} disabled={loading || !testId || !school || !grade} onClick={loadMatrix}>{loading ? '読み込み中...' : '表示'}</button>
      </div>
      {students.length > 0 && <div style={{ ...panel, padding: 0, overflow: 'hidden' }}><div style={{ overflow: 'auto', maxHeight: '70vh', WebkitOverflowScrolling: 'touch' }}><table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 1080, width: '100%' }}><thead><tr><th style={{ ...header, left: 0, zIndex: 20, minWidth: 180 }}>生徒名</th>{ACADEMIC_SUBJECTS.map(subject => <th key={subject.key} style={header}>{subject.label}</th>)}<th style={header}>合計</th></tr></thead><tbody>{sortedStudents.map((student, studentIndex) => { const scores = editing[student.userId] || {}; const dirty = !areAcademicScoresEqual(scores, student.scores); const total = calculateAcademicTotal(scores); return <tr key={student.userId} style={{ background: dirty ? '#fffbeb' : '#fff' }}><td style={{ position: 'sticky', left: 0, zIndex: 5, padding: 8, background: dirty ? '#fffbeb' : '#fff', borderBottom: '1px solid #e5e7eb' }}><strong>{student.name}</strong><div style={{ fontSize: 11, color: '#64748b' }}>{student.userId}{dirty && ' ・ 未保存'}</div></td>{ACADEMIC_SUBJECTS.map(subject => <td key={subject.key} style={{ padding: 5, borderBottom: '1px solid #e5e7eb' }}><input aria-label={`${student.name} ${subject.label}`} inputMode="numeric" value={scores[subject.key] ?? ''} onChange={e => changeScore(student, subject.key, e.target.value)} onPaste={e => pasteScores(e, studentIndex, subject.key)} style={{ width: 68, padding: 7, boxSizing: 'border-box' }} /></td>)}<td style={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>{total === null ? '－' : total}</td></tr>; })}</tbody></table></div><div style={{ padding: 14, borderTop: '1px solid #e5e7eb', textAlign: 'right' }}><span style={{ marginRight: 14 }}>未保存の変更：{dirtyStudents.length}名</span><button style={styles.doneBtn} disabled={saving || dirtyStudents.length === 0} onClick={saveResults}>{saving ? '保存中...' : `一括保存（${dirtyStudents.length}名）`}</button></div></div>}
      <p style={{ color: '#64748b', fontSize: 12 }}>複数行貼り付けはPCで対象生徒の国語セルから、合計を除く9科目をコピーして行ってください。</p>
    </>}
  </div>;
}
