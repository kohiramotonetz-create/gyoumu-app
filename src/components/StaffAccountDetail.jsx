import { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import { isValidNameKana, normalizeNameKana } from '../utils/nameKana.js';

const REQUEST_TIMEOUT_MS = 15000;
const isDeleted = account => account.deletedAt != null && String(account.deletedAt).trim() !== '';
const formatDate = value => {
  if (value == null || String(value).trim() === '') return '－';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ja-JP');
};

export default function StaffAccountDetail({ account, GAS_URL, API_KEY, sessionToken, styles, onBack, onSaved }) {
  const initialForm = useMemo(() => ({
    name: String(account.name || ''), nameKana: String(account.nameKana || ''), role: String(account.role || 'teacher'), enabled: account.enabled === true,
    assignedSchools: (Array.isArray(account.assignedSchools) ? account.assignedSchools : []).map(school => ({ school, isPrimary: school === account.primarySchool })),
  }), [account]);
  const [form, setForm] = useState(initialForm);
  const [schoolToAdd, setSchoolToAdd] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const deleted = isDeleted(account);
  const readOnly = deleted;
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const fieldStyle = { ...styles.select, width: '100%', boxSizing: 'border-box' };

  const addSchool = () => {
    if (!schoolToAdd) return setFieldErrors(value => ({ ...value, assignedSchools: '担当校舎を選択してください。' }));
    if (form.assignedSchools.some(item => item.school === schoolToAdd)) return setFieldErrors(value => ({ ...value, assignedSchools: '同じ校舎は追加できません。' }));
    setForm(value => ({ ...value, assignedSchools: [...value.assignedSchools, { school: schoolToAdd, isPrimary: value.assignedSchools.length === 0 }] }));
    setSchoolToAdd('');
    setFieldErrors(value => ({ ...value, assignedSchools: '' }));
  };
  const removeSchool = school => setForm(value => ({ ...value, assignedSchools: value.assignedSchools.filter(item => item.school !== school) }));
  const setPrimary = school => setForm(value => ({ ...value, assignedSchools: value.assignedSchools.map(item => ({ ...item, isPrimary: item.school === school })) }));
  const returnToList = () => {
    if (dirty && !window.confirm('変更内容が保存されていません。一覧へ戻りますか？')) return;
    onBack();
  };

  const save = async event => {
    event.preventDefault();
    if (savingRef.current || readOnly || !dirty) return;
    const normalizedName = form.name.trim();
    const normalizedKana = normalizeNameKana(form.nameKana);
    const errors = {};
    if (!normalizedName) errors.name = '氏名を入力してください。';
    if (!normalizedKana || !isValidNameKana(normalizedKana)) errors.nameKana = 'フリガナを全角カタカナで入力してください。';
    if (!['teacher', 'head-teacher', 'admin'].includes(form.role)) errors.role = 'roleが不正です。';
    if (form.assignedSchools.length === 0 || form.assignedSchools.filter(item => item.isPrimary).length !== 1) errors.assignedSchools = '担当校舎を1校以上設定し、主担当を1校選択してください。';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    savingRef.current = true;
    setSaving(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'updateStaffAccount', apiKey: API_KEY, sessionToken, userId: account.userId, name: normalizedName, nameKana: normalizedKana, role: form.role, assignedSchools: form.assignedSchools, enabled: form.enabled }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') {
        const sessionExpired = response.data?.code === 'AUTHORIZATION_ERROR';
        throw new Error(sessionExpired ? '管理セッションが切れています。再ログインしてください。' : response.data?.message || '保存に失敗しました。');
      }
      const primary = form.assignedSchools.find(item => item.isPrimary)?.school || '';
      const updated = { ...account, name: normalizedName, nameKana: normalizedKana, role: form.role, assignedSchools: form.assignedSchools.map(item => item.school), primarySchool: primary, enabled: form.enabled };
      setForm({ name: updated.name, nameKana: updated.nameKana, role: updated.role, assignedSchools: form.assignedSchools.map(item => ({ ...item })), enabled: updated.enabled });
      onSaved(updated);
      setStatus({ type: 'success', message: '保存しました。' });
    } catch (error) {
      const message = error?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。' : error?.message === 'Network Error' ? '通信エラーが発生しました。' : error?.message || '保存に失敗しました。';
      setStatus({ type: 'error', message });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return <section style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}><h2 style={{ ...styles.contentTitle, margin: 0 }}>講師詳細</h2><button type="button" onClick={returnToList}>一覧へ戻る</button></div>
    {deleted && <div role="status" style={{ padding: 12, marginBottom: 16, color: '#991b1b', background: '#fef2f2' }}>削除済みアカウントのため編集できません。</div>}
    {status.message && <div role={status.type === 'error' ? 'alert' : 'status'} style={{ padding: 12, marginBottom: 16, color: status.type === 'error' ? '#991b1b' : '#166534', background: status.type === 'error' ? '#fef2f2' : '#f0fdf4' }}>{status.message}</div>}
    <form onSubmit={save} style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
      <div><strong>ID</strong><div style={{ padding: '10px 0' }}>{account.userId}</div></div>
      <label>氏名<input value={form.name} disabled={readOnly} onChange={event => { setForm(value => ({ ...value, name: event.target.value })); setFieldErrors(value => ({ ...value, name: '' })); }} style={fieldStyle} />{fieldErrors.name && <div style={{ color: '#b91c1c' }}>{fieldErrors.name}</div>}</label>
      <label>フリガナ<input value={form.nameKana} disabled={readOnly} onChange={event => { setForm(value => ({ ...value, nameKana: event.target.value })); setFieldErrors(value => ({ ...value, nameKana: '' })); }} onBlur={() => setForm(value => ({ ...value, nameKana: normalizeNameKana(value.nameKana) }))} style={fieldStyle} />{fieldErrors.nameKana && <div style={{ color: '#b91c1c' }}>{fieldErrors.nameKana}</div>}</label>
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0 }}><legend>role</legend>{['teacher', 'head-teacher', 'admin'].map(item => <label key={item} style={{ marginRight: 20 }}><input type="radio" checked={form.role === item} onChange={() => setForm(value => ({ ...value, role: item }))} /> {item}</label>)}{fieldErrors.role && <div style={{ color: '#b91c1c' }}>{fieldErrors.role}</div>}</fieldset>
      <div><strong>担当校舎</strong>{!readOnly && <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><SchoolSelect value={schoolToAdd} onChange={event => setSchoolToAdd(event.target.value)} showAssignedOptions={false} style={fieldStyle} /><button type="button" onClick={addSchool}>追加</button></div>}{form.assignedSchools.map(item => <div key={item.school} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderBottom: '1px solid #e5e7eb' }}><span style={{ flex: 1 }}>{item.school}</span><label><input type="radio" name="staffPrimarySchool" checked={item.isPrimary} disabled={readOnly} onChange={() => setPrimary(item.school)} /> 主担当</label>{!readOnly && <button type="button" onClick={() => removeSchool(item.school)}>削除</button>}</div>)}{fieldErrors.assignedSchools && <div style={{ color: '#b91c1c' }}>{fieldErrors.assignedSchools}</div>}</div>
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0 }}><legend>状態</legend><label style={{ marginRight: 20 }}><input type="radio" checked={form.enabled} onChange={() => setForm(value => ({ ...value, enabled: true }))} /> 有効</label><label><input type="radio" checked={!form.enabled} onChange={() => setForm(value => ({ ...value, enabled: false }))} /> 無効</label>{deleted && <div style={{ marginTop: 8, color: '#991b1b' }}>🔴 削除済み</div>}</fieldset>
      <div><strong>作成日時</strong><div>{formatDate(account.createdAt)}</div></div><div><strong>更新日時</strong><div>{formatDate(account.updatedAt)}</div></div>
      <button type="submit" disabled={readOnly || !dirty || saving} style={{ ...styles.doneBtn, opacity: readOnly || !dirty || saving ? 0.6 : 1 }}>{saving ? '保存中...' : '保存する'}</button>
    </form>
  </section>;
}
