import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { isValidNameKana, normalizeNameKana } from '../utils/nameKana.js';
import { ONE_TO_ONE_SUBJECTS, areSameOneToOneSubjects, normalizeOneToOneSubjectIds, toggleOneToOneSubject } from '../utils/oneToOneSubjects.js';

const REQUEST_TIMEOUT_MS = 15000;
const isDeleted = account => account.deletedAt != null && String(account.deletedAt).trim() !== '';
const formatDate = value => {
  if (value == null || String(value).trim() === '') return '－';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ja-JP');
};

export default function StudentAccountDetail({ account, GAS_URL, API_KEY, sessionToken, styles, onBack, onSaved }) {
  const initialForm = useMemo(() => ({ name: String(account.name || ''), nameKana: String(account.nameKana || ''), school: String(account.school || ''), grades: account.grade ? [String(account.grade)] : [], enabled: account.enabled === true }), [account]);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [savedSubjectIds, setSavedSubjectIds] = useState([]);
  const [subjectIds, setSubjectIds] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsLoadFailed, setSubjectsLoadFailed] = useState(false);
  const [subjectsSaving, setSubjectsSaving] = useState(false);
  const savingRef = useRef(false);
  const deleted = isDeleted(account);
  const accountDirty = form.name !== initialForm.name || form.nameKana !== initialForm.nameKana || form.school !== initialForm.school || (form.grades[0] || '') !== (initialForm.grades[0] || '') || form.enabled !== initialForm.enabled;
  const subjectsDirty = !areSameOneToOneSubjects(subjectIds, savedSubjectIds);
  const dirty = accountDirty || subjectsDirty;
  const fieldStyle = { ...styles.select, width: '100%', boxSizing: 'border-box' };

  useEffect(() => {
    let active = true;
    if (deleted) {
      setSubjectsLoading(false);
      return () => { active = false; };
    }
    setSubjectsLoading(true);
    setSubjectsLoadFailed(false);
    axios.post(GAS_URL, JSON.stringify({ action: 'getOneToOneSubjects', apiKey: API_KEY, sessionToken, userId: account.userId }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS })
      .then(response => {
        if (!active) return;
        if (response.data?.result !== 'success') throw new Error(response.data?.message || '受講科目を取得できませんでした。');
        const normalized = normalizeOneToOneSubjectIds(response.data.subjectIds);
        setSavedSubjectIds(normalized);
        setSubjectIds(normalized);
      })
      .catch(error => { if (active) { setSubjectsLoadFailed(true); setStatus({ type: 'error', message: error?.message || '受講科目を取得できませんでした。' }); } })
      .finally(() => { if (active) setSubjectsLoading(false); });
    return () => { active = false; };
  }, [API_KEY, GAS_URL, account.userId, deleted, sessionToken]);

  const returnToList = () => {
    if (dirty && !window.confirm('変更内容が保存されていません。一覧へ戻りますか？')) return;
    onBack();
  };

  const save = async event => {
    event.preventDefault();
    if (savingRef.current || deleted || !accountDirty) return;
    const normalizedName = form.name.trim();
    const normalizedKana = normalizeNameKana(form.nameKana);
    const errors = {};
    if (!normalizedName) errors.name = '氏名を入力してください。';
    if (!normalizedKana || !isValidNameKana(normalizedKana)) errors.nameKana = 'フリガナを全角カタカナで入力してください。';
    if (!form.school) errors.school = '所属校舎を選択してください。';
    if (form.grades.length !== 1) errors.grade = '学年を選択してください。';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    savingRef.current = true;
    setSaving(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'updateStudentAccount', apiKey: API_KEY, sessionToken, userId: account.userId, school: form.school, grade: form.grades[0], name: normalizedName, nameKana: normalizedKana, enabled: form.enabled }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') {
        const sessionExpired = response.data?.code === 'AUTHORIZATION_ERROR';
        throw new Error(sessionExpired ? '管理セッションが切れています。再ログインしてください。' : response.data?.message || '保存に失敗しました。');
      }
      const updated = { ...account, name: normalizedName, nameKana: normalizedKana, school: form.school, grade: form.grades[0], enabled: form.enabled };
      setForm({ name: updated.name, nameKana: updated.nameKana, school: updated.school, grades: [updated.grade], enabled: updated.enabled });
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

  const saveSubjects = async () => {
    if (subjectsSaving || subjectsLoading || subjectsLoadFailed || deleted || !subjectsDirty) return;
    setSubjectsSaving(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'updateOneToOneSubjects', apiKey: API_KEY, sessionToken, userId: account.userId, subjectIds }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(response.data?.message || '受講科目の保存に失敗しました。');
      const normalized = normalizeOneToOneSubjectIds(response.data.subjectIds);
      setSavedSubjectIds(normalized);
      setSubjectIds(normalized);
      setStatus({ type: 'success', message: '1対1受講科目を保存しました。' });
    } catch (error) {
      setStatus({ type: 'error', message: error?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。' : error?.message || '受講科目の保存に失敗しました。' });
    } finally { setSubjectsSaving(false); }
  };

  return <section style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}><h2 style={{ ...styles.contentTitle, margin: 0 }}>生徒詳細</h2><button type="button" onClick={returnToList}>一覧へ戻る</button></div>
    {deleted && <div role="status" style={{ padding: 12, marginBottom: 16, color: '#991b1b', background: '#fef2f2' }}>削除済みアカウントのため編集できません。</div>}
    {status.message && <div role={status.type === 'error' ? 'alert' : 'status'} style={{ padding: 12, marginBottom: 16, color: status.type === 'error' ? '#991b1b' : '#166534', background: status.type === 'error' ? '#fef2f2' : '#f0fdf4' }}>{status.message}</div>}
    <form onSubmit={save} style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
      <div><strong>ID</strong><div style={{ padding: '10px 0' }}>{account.userId}</div></div>
      <label>氏名<input value={form.name} disabled={deleted} onChange={event => { setForm(value => ({ ...value, name: event.target.value })); setFieldErrors(value => ({ ...value, name: '' })); }} style={fieldStyle} />{fieldErrors.name && <div style={{ color: '#b91c1c' }}>{fieldErrors.name}</div>}</label>
      <label>フリガナ<input value={form.nameKana} disabled={deleted} onChange={event => { setForm(value => ({ ...value, nameKana: event.target.value })); setFieldErrors(value => ({ ...value, nameKana: '' })); }} onBlur={() => setForm(value => ({ ...value, nameKana: normalizeNameKana(value.nameKana) }))} style={fieldStyle} />{fieldErrors.nameKana && <div style={{ color: '#b91c1c' }}>{fieldErrors.nameKana}</div>}</label>
      <label>所属校舎<SchoolSelect value={form.school} disabled={deleted} onChange={event => { setForm(value => ({ ...value, school: event.target.value })); setFieldErrors(value => ({ ...value, school: '' })); }} showAssignedOptions={false} style={fieldStyle} />{fieldErrors.school && <div style={{ color: '#b91c1c' }}>{fieldErrors.school}</div>}</label>
      <label>学年<GradeSelect value={form.grades} disabled={deleted} onChange={grades => { setForm(value => ({ ...value, grades })); setFieldErrors(value => ({ ...value, grade: '' })); }} includeGroups={false} style={fieldStyle} />{fieldErrors.grade && <div style={{ color: '#b91c1c' }}>{fieldErrors.grade}</div>}</label>
      <fieldset disabled={deleted || subjectsLoading || subjectsLoadFailed || subjectsSaving} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16, margin: 0 }}>
        <legend style={{ padding: '0 6px', fontWeight: 'bold' }}>1対1受講科目</legend>
        {subjectsLoading ? <div role="status">読込中...</div> : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
          {ONE_TO_ONE_SUBJECTS.map(subject => <label key={subject.subjectId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={subjectIds.includes(subject.subjectId)} onChange={() => setSubjectIds(current => toggleOneToOneSubject(current, subject.subjectId))} />{subject.label}</label>)}
        </div>}
        <button type="button" onClick={saveSubjects} disabled={deleted || subjectsLoading || subjectsLoadFailed || subjectsSaving || !subjectsDirty} style={{ ...styles.doneBtn, marginTop: 14, opacity: deleted || subjectsLoading || subjectsLoadFailed || subjectsSaving || !subjectsDirty ? 0.6 : 1 }}>{subjectsSaving ? '保存中...' : '受講科目を保存'}</button>
        {subjectsDirty && !subjectsSaving && <div style={{ marginTop: 8, color: '#b45309', fontSize: 12 }}>未保存の変更があります。</div>}
      </fieldset>
      <fieldset disabled={deleted} style={{ border: 0, padding: 0, margin: 0 }}><legend>状態</legend><label style={{ marginRight: 20 }}><input type="radio" checked={form.enabled} onChange={() => setForm(value => ({ ...value, enabled: true }))} /> 有効</label><label><input type="radio" checked={!form.enabled} onChange={() => setForm(value => ({ ...value, enabled: false }))} /> 無効</label>{deleted && <div style={{ marginTop: 8, color: '#991b1b' }}>🔴 削除済み</div>}</fieldset>
      <div><strong>作成日時</strong><div>{formatDate(account.createdAt)}</div></div>
      <div><strong>更新日時</strong><div>{formatDate(account.updatedAt)}</div></div>
      <button type="submit" disabled={deleted || !accountDirty || saving} style={{ ...styles.doneBtn, opacity: deleted || !accountDirty || saving ? 0.6 : 1 }}>{saving ? '保存中...' : '基本情報を保存'}</button>
    </form>
  </section>;
}
