import { useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';

const TIMEOUT_MS = 15000;
const emptyForm = () => ({ name: '', nameKana: '', school: '', grades: [], role: 'teacher' });
const isValidKanaInput = value => /^[ァ-ヶー・ ]+$/.test(String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').replace(/[ぁ-ゖ]/g, character => String.fromCharCode(character.charCodeAt(0) + 0x60)));

export default function AccountRegistration({ GAS_URL, API_KEY, sessionToken, styles }) {
  const [type, setType] = useState('student');
  const [form, setForm] = useState(emptyForm);
  const [schoolToAdd, setSchoolToAdd] = useState('');
  const [assignedSchools, setAssignedSchools] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [created, setCreated] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fieldStyle = { ...styles.select, width: '100%', boxSizing: 'border-box' };

  const switchType = next => { setType(next); setForm(emptyForm()); setAssignedSchools([]); setCreated(null); setStatus({ type: '', message: '' }); };
  const addSchool = () => {
    if (!schoolToAdd) return setStatus({ type: 'error', message: '担当校舎を選択してください。' });
    if (assignedSchools.some(item => item.school === schoolToAdd)) return setStatus({ type: 'error', message: '同じ校舎は追加できません。' });
    setAssignedSchools(items => [...items, { school: schoolToAdd, isPrimary: items.length === 0 }]);
    setSchoolToAdd(''); setStatus({ type: '', message: '' });
  };
  const removeSchool = school => setAssignedSchools(items => items.filter(item => item.school !== school));
  const setPrimary = school => setAssignedSchools(items => items.map(item => ({ ...item, isPrimary: item.school === school })));

  const submit = async event => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!form.name.trim() || !form.nameKana.trim()) return setStatus({ type: 'error', message: '氏名とフリガナを入力してください。' });
    if (!isValidKanaInput(form.nameKana)) return setStatus({ type: 'error', message: 'フリガナは全角カタカナで入力してください。' });
    if (type === 'student' && (!form.school || form.grades.length !== 1)) return setStatus({ type: 'error', message: '所属校舎と学年を選択してください。' });
    if (type === 'staff' && (assignedSchools.length === 0 || assignedSchools.filter(item => item.isPrimary).length !== 1)) return setStatus({ type: 'error', message: '担当校舎を1校以上追加し、主担当を1校選択してください。' });
    submittingRef.current = true; setSubmitting(true); setCreated(null); setStatus({ type: '', message: '' });
    const payload = type === 'student'
      ? { action: 'createStudentAccount', apiKey: API_KEY, sessionToken, school: form.school, grade: form.grades[0], name: form.name.trim(), nameKana: form.nameKana.trim() }
      : { action: 'createStaffAccount', apiKey: API_KEY, sessionToken, name: form.name.trim(), nameKana: form.nameKana.trim(), role: form.role, assignedSchools };
    try {
      const response = await axios.post(GAS_URL, JSON.stringify(payload), { headers: { 'Content-Type': 'text/plain' }, timeout: TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(response.data?.code === 'AUTHORIZATION_ERROR' ? '管理セッションが切れたか、管理者権限がありません。' : response.data?.message || '登録に失敗しました。');
      setCreated({ userId: response.data.userId, password: response.data.password });
      setStatus({ type: 'success', message: 'アカウントを作成しました。' }); setForm(emptyForm()); setAssignedSchools([]);
    } catch (error) {
      const message = error?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。' : error?.message === 'Network Error' ? '通信エラーが発生しました。' : error?.message || '登録に失敗しました。';
      setStatus({ type: 'error', message });
    } finally { submittingRef.current = false; setSubmitting(false); }
  };

  return <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
    <h2 style={styles.contentTitle}>新規登録</h2>
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      {['student', 'staff'].map(item => <button key={item} type="button" onClick={() => switchType(item)} style={{ ...styles.doneBtn, background: type === item ? '#166534' : '#64748b' }}>{item === 'student' ? '生徒' : '講師'}</button>)}
    </div>
    {status.message && <div role="status" style={{ padding: 12, marginBottom: 16, color: status.type === 'error' ? '#b91c1c' : '#166534', background: status.type === 'error' ? '#fef2f2' : '#f0fdf4' }}>{status.message}</div>}
    {created && <div style={{ padding: 16, marginBottom: 20, border: '1px solid #166534', background: '#f0fdf4' }}><div>ID：<strong>{created.userId}</strong></div><div>初期パスワード：<strong>{created.password}</strong></div><small>この画面を離れる前に控えてください。</small></div>}
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
      {type === 'student' && <><label>所属校舎<SchoolSelect value={form.school} onChange={e => setForm(v => ({ ...v, school: e.target.value }))} showAssignedOptions={false} style={fieldStyle} /></label><label>学年<GradeSelect value={form.grades} onChange={grades => setForm(v => ({ ...v, grades }))} includeGroups={false} style={fieldStyle} /></label></>}
      <label>氏名<input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} style={fieldStyle} /></label>
      <label>フリガナ<input value={form.nameKana} onChange={e => setForm(v => ({ ...v, nameKana: e.target.value }))} placeholder="ヤマダ タロウ" style={fieldStyle} /></label>
      {type === 'staff' && <><label>role<select value={form.role} onChange={e => setForm(v => ({ ...v, role: e.target.value }))} style={fieldStyle}><option value="teacher">teacher</option><option value="head-teacher">head-teacher</option><option value="admin">admin</option></select></label><div><div>担当校舎</div><div style={{ display: 'flex', gap: 8 }}><SchoolSelect value={schoolToAdd} onChange={e => setSchoolToAdd(e.target.value)} showAssignedOptions={false} style={fieldStyle} /><button type="button" onClick={addSchool}>追加</button></div>{assignedSchools.map(item => <div key={item.school} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 8, borderBottom: '1px solid #ddd' }}><span style={{ flex: 1 }}>{item.school}</span><label><input type="radio" name="primarySchool" checked={item.isPrimary} onChange={() => setPrimary(item.school)} /> 主担当</label><button type="button" onClick={() => removeSchool(item.school)}>削除</button></div>)}</div></>}
      <button type="submit" disabled={submitting} style={{ ...styles.doneBtn, background: '#166534' }}>{submitting ? '登録中…' : '登録する'}</button>
    </form>
  </div>;
}
