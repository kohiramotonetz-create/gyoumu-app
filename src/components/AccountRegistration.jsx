import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { isValidNameKana, normalizeNameKana } from '../utils/nameKana.js';

const TIMEOUT_MS = 15000;
const emptyForm = () => ({ userId: '', name: '', nameKana: '', school: '', grades: [], role: 'teacher' });
const normalizeIdInput = value => String(value || '').replace(/\s+/g, '');

export default function AccountRegistration({ GAS_URL, API_KEY, sessionToken, styles }) {
  const [type, setType] = useState('student');
  const [form, setForm] = useState(emptyForm);
  const [schoolToAdd, setSchoolToAdd] = useState('');
  const [assignedSchools, setAssignedSchools] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [created, setCreated] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [idStatus, setIdStatus] = useState({ state: 'idle', message: '' });
  const [copyStatus, setCopyStatus] = useState('');
  const submittingRef = useRef(false);
  const idInputRef = useRef(null);
  const fieldStyle = { ...styles.select, width: '100%', boxSizing: 'border-box' };

  const resetForm = () => { setForm(emptyForm()); setAssignedSchools([]); setSchoolToAdd(''); setCreated(null); setStatus({ type: '', message: '' }); setFieldErrors({}); setIdStatus({ state: 'idle', message: '' }); setCopyStatus(''); };
  const switchType = next => { setType(next); resetForm(); };
  useEffect(() => {
    const userId = normalizeIdInput(form.userId);
    if (!userId) { setIdStatus({ state: 'idle', message: '' }); return undefined; }
    if (!/^\d{6}$/.test(userId)) { setIdStatus({ state: 'invalid', message: '半角数字6桁で入力してください。' }); return undefined; }
    let cancelled = false;
    setIdStatus({ state: 'checking', message: '確認中...' });
    const timer = setTimeout(async () => {
      try {
        const response = await axios.post(GAS_URL, JSON.stringify({ action: 'checkUserIdAvailable', apiKey: API_KEY, sessionToken, userId }), { headers: { 'Content-Type': 'text/plain' }, timeout: TIMEOUT_MS });
        if (cancelled) return;
        if (response.data?.result !== 'success') setIdStatus({ state: 'error', message: response.data?.message || 'IDを確認できませんでした。' });
        else setIdStatus({ state: response.data.available ? 'available' : 'duplicate', message: response.data.available ? '✓ 登録可能' : '× 既に登録されています' });
      } catch { if (!cancelled) setIdStatus({ state: 'error', message: 'IDを確認できませんでした。' }); }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [form.userId, GAS_URL, API_KEY, sessionToken]);
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape' && !submittingRef.current) { setForm(emptyForm()); setAssignedSchools([]); setSchoolToAdd(''); setCreated(null); setStatus({ type: '', message: '' }); setFieldErrors({}); setIdStatus({ state: 'idle', message: '' }); setCopyStatus(''); setTimeout(() => idInputRef.current?.focus(), 0); } };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const addSchool = () => {
    if (!schoolToAdd) return setStatus({ type: 'error', message: '担当校舎を選択してください。' });
    if (assignedSchools.some(item => item.school === schoolToAdd)) return setStatus({ type: 'error', message: '同じ校舎は追加できません。' });
    setAssignedSchools(items => [...items, { school: schoolToAdd, isPrimary: items.length === 0 }]);
    setSchoolToAdd(''); setStatus({ type: '', message: '' }); setFieldErrors(value => ({ ...value, assignedSchools: '' }));
  };
  const removeSchool = school => setAssignedSchools(items => items.filter(item => item.school !== school));
  const setPrimary = school => setAssignedSchools(items => items.map(item => ({ ...item, isPrimary: item.school === school })));

  const submit = async event => {
    event.preventDefault();
    if (submittingRef.current) return;
    const errors = {};
    if (!/^\d{6}$/.test(form.userId) || idStatus.state !== 'available') errors.userId = idStatus.state === 'duplicate' ? '既に登録されています。' : '登録可能な半角数字6桁IDを入力してください。';
    if (!form.name.trim()) errors.name = '氏名を入力してください。';
    if (!form.nameKana.trim() || !isValidNameKana(form.nameKana)) errors.nameKana = 'フリガナを全角カタカナで入力してください。';
    if (type === 'student' && !form.school) errors.school = '所属校舎を選択してください。';
    if (type === 'student' && form.grades.length !== 1) errors.grade = '学年を選択してください。';
    if (type === 'staff' && (assignedSchools.length === 0 || assignedSchools.filter(item => item.isPrimary).length !== 1)) errors.assignedSchools = '担当校舎を1校以上追加し、主担当を1校選択してください。';
    setFieldErrors(errors); if (Object.keys(errors).length) return;
    submittingRef.current = true; setSubmitting(true); setCreated(null); setCopyStatus(''); setStatus({ type: '', message: '' });
    const payload = type === 'student'
      ? { action: 'createStudentAccount', apiKey: API_KEY, sessionToken, userId: form.userId, school: form.school, grade: form.grades[0], name: form.name.trim(), nameKana: normalizeNameKana(form.nameKana) }
      : { action: 'createStaffAccount', apiKey: API_KEY, sessionToken, userId: form.userId, name: form.name.trim(), nameKana: normalizeNameKana(form.nameKana), role: form.role, assignedSchools };
    try {
      const response = await axios.post(GAS_URL, JSON.stringify(payload), { headers: { 'Content-Type': 'text/plain' }, timeout: TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(response.data?.code === 'AUTHORIZATION_ERROR' ? '管理セッションが切れたか、管理者権限がありません。' : response.data?.message || '登録に失敗しました。');
      setCreated({ userId: response.data.userId, password: response.data.password });
      setStatus({ type: 'success', message: 'アカウントを作成しました。' }); setForm(emptyForm()); setAssignedSchools([]); setIdStatus({ state: 'idle', message: '' }); setFieldErrors({}); setTimeout(() => idInputRef.current?.focus(), 0);
    } catch (error) {
      const message = error?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。' : error?.message === 'Network Error' ? '通信エラーが発生しました。' : error?.message || '登録に失敗しました。';
      setStatus({ type: 'error', message });
    } finally { submittingRef.current = false; setSubmitting(false); }
  };
  const copyValue = async value => { try { await navigator.clipboard.writeText(value); setCopyStatus('コピーしました'); } catch { setCopyStatus('コピーできませんでした'); } };
  const cannotSubmit = submitting || idStatus.state !== 'available' || !form.userId;

  return <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
    <h2 style={styles.contentTitle}>新規登録</h2>
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      {['student', 'staff'].map(item => <button key={item} type="button" onClick={() => switchType(item)} style={{ ...styles.doneBtn, background: type === item ? '#166534' : '#64748b' }}>{item === 'student' ? '生徒' : '講師'}</button>)}
    </div>
    {status.message && <div role="status" style={{ padding: 12, marginBottom: 16, color: status.type === 'error' ? '#b91c1c' : '#166534', background: status.type === 'error' ? '#fef2f2' : '#f0fdf4' }}>{status.message}</div>}
    {created && <div style={{ padding: 16, marginBottom: 20, border: '1px solid #166534', background: '#f0fdf4' }}><div>登録ID：<strong>{created.userId}</strong> <button type="button" onClick={() => copyValue(created.userId)}>コピー</button></div><div>初期パスワード：<strong>{created.password}</strong> <button type="button" onClick={() => copyValue(created.password)}>コピー</button></div>{copyStatus && <div style={{ color: '#166534' }}>{copyStatus}</div>}<small>この画面を離れる前に控えてください。</small></div>}
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
      <label>ID<input ref={idInputRef} value={form.userId} onChange={e => { setForm(v => ({ ...v, userId: normalizeIdInput(e.target.value) })); setFieldErrors(v => ({ ...v, userId: '' })); }} inputMode="numeric" maxLength={6} placeholder="037071" style={fieldStyle} /><small>ネッツメニューで発行された6桁IDを入力してください。</small>{idStatus.message && <div style={{ color: idStatus.state === 'available' ? '#166534' : idStatus.state === 'checking' ? '#64748b' : '#b91c1c' }}>{idStatus.message}</div>}{fieldErrors.userId && <div style={{ color: '#b91c1c' }}>{fieldErrors.userId}</div>}</label>
      {type === 'student' && <><label>所属校舎<SchoolSelect value={form.school} onChange={e => { setForm(v => ({ ...v, school: e.target.value })); setFieldErrors(v => ({ ...v, school: '' })); }} showAssignedOptions={false} style={fieldStyle} />{fieldErrors.school && <div style={{ color: '#b91c1c' }}>{fieldErrors.school}</div>}</label><label>学年<GradeSelect value={form.grades} onChange={grades => { setForm(v => ({ ...v, grades })); setFieldErrors(v => ({ ...v, grade: '' })); }} includeGroups={false} style={fieldStyle} />{fieldErrors.grade && <div style={{ color: '#b91c1c' }}>{fieldErrors.grade}</div>}</label></>}
      <label>氏名<input value={form.name} onChange={e => { setForm(v => ({ ...v, name: e.target.value })); setFieldErrors(v => ({ ...v, name: '' })); }} style={fieldStyle} />{fieldErrors.name && <div style={{ color: '#b91c1c' }}>{fieldErrors.name}</div>}</label>
      <label>フリガナ<input value={form.nameKana} onChange={e => { setForm(v => ({ ...v, nameKana: e.target.value })); setFieldErrors(v => ({ ...v, nameKana: '' })); }} onBlur={() => setForm(v => ({ ...v, nameKana: normalizeNameKana(v.nameKana) }))} placeholder="ヤマダ　タロウ" style={fieldStyle} />{fieldErrors.nameKana && <div style={{ color: '#b91c1c' }}>{fieldErrors.nameKana}</div>}</label>
      {type === 'staff' && <><label>role<select value={form.role} onChange={e => setForm(v => ({ ...v, role: e.target.value }))} style={fieldStyle}><option value="teacher">teacher</option><option value="head-teacher">head-teacher</option><option value="admin">admin</option></select></label><div><div>担当校舎</div><div style={{ display: 'flex', gap: 8 }}><SchoolSelect value={schoolToAdd} onChange={e => setSchoolToAdd(e.target.value)} showAssignedOptions={false} style={fieldStyle} /><button type="button" onClick={addSchool}>追加</button></div>{assignedSchools.map(item => <div key={item.school} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 8, borderBottom: '1px solid #ddd' }}><span style={{ flex: 1 }}>{item.school}</span><label><input type="radio" name="primarySchool" checked={item.isPrimary} onChange={() => setPrimary(item.school)} /> 主担当</label><button type="button" onClick={() => removeSchool(item.school)}>削除</button></div>)}</div></>}
      {fieldErrors.assignedSchools && <div style={{ color: '#b91c1c' }}>{fieldErrors.assignedSchools}</div>}
      <button type="submit" disabled={cannotSubmit} style={{ ...styles.doneBtn, background: '#166534', opacity: cannotSubmit ? 0.6 : 1 }}>{submitting ? '登録中…' : '登録する'}</button>
    </form>
  </div>;
}
