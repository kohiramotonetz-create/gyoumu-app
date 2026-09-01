import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { AccountStatusBadge } from './AccountListUi.jsx';
import { formatAccountDate, getAccountStatus } from '../utils/accountManagement.js';
import { isValidNameKana, normalizeNameKana } from '../utils/nameKana.js';
import { getManagementErrorMessage } from '../utils/managementApi.js';
import { ONE_TO_ONE_SUBJECTS, areSameOneToOneSubjects, normalizeOneToOneSubjectIds, toggleOneToOneSubject } from '../utils/oneToOneSubjects.js';

const REQUEST_TIMEOUT_MS = 15000;

export default function StudentAccountDetail({ account, GAS_URL, API_KEY, sessionToken, onBack, onSaved, onDeleted, onDirtyChange }) {
  const initialForm = useMemo(() => ({ name: String(account.name || ''), nameKana: String(account.nameKana || ''), school: String(account.school || ''), grades: account.grade ? [String(account.grade)] : [], enabled: account.enabled === true }), [account]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [savedSubjectIds, setSavedSubjectIds] = useState([]);
  const [subjectIds, setSubjectIds] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsLoadFailed, setSubjectsLoadFailed] = useState(false);
  const [subjectsSaving, setSubjectsSaving] = useState(false);
  const savingRef = useRef(false);
  const deleted = getAccountStatus(account) === 'deleted';
  const accountDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const subjectsDirty = !areSameOneToOneSubjects(subjectIds, savedSubjectIds);
  const dirty = accountDirty || subjectsDirty;

  const loadSubjects = useCallback(async () => {
    if (deleted) { setSubjectsLoading(false); return; }
    setSubjectsLoading(true);
    setSubjectsLoadFailed(false);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'getOneToOneSubjects', apiKey: API_KEY, sessionToken, userId: account.userId }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(response.data?.message || '受講科目を取得できませんでした。');
      const normalized = normalizeOneToOneSubjectIds(response.data.subjectIds);
      setSavedSubjectIds(normalized);
      setSubjectIds(normalized);
    } catch (requestError) {
      setSubjectsLoadFailed(true);
      setStatus({ type: 'error', message: requestError?.message || '受講科目を取得できませんでした。' });
    } finally { setSubjectsLoading(false); }
  }, [API_KEY, GAS_URL, account.userId, deleted, sessionToken]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key !== 'Escape') return;
      if (dirty && !window.confirm('変更内容が保存されていません。詳細を閉じますか？')) return;
      onDirtyChange?.(false); onBack();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [dirty, onBack, onDirtyChange]);

  const closePanel = () => {
    if (dirty && !window.confirm('変更内容が保存されていません。詳細を閉じますか？')) return;
    onDirtyChange?.(false);
    onBack();
  };
  const cancelEditing = () => {
    if (dirty && !window.confirm('未保存の変更を破棄しますか？')) return;
    setForm(initialForm); setSubjectIds(savedSubjectIds); setFieldErrors({}); setStatus({ type: '', message: '' }); setEditing(false);
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
    savingRef.current = true; setSaving(true); setStatus({ type: '', message: '' });
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'updateStudentAccount', apiKey: API_KEY, sessionToken, userId: account.userId, school: form.school, grade: form.grades[0], name: normalizedName, nameKana: normalizedKana, enabled: form.enabled }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(getManagementErrorMessage(response.data, '保存に失敗しました。'));
      const updated = { ...account, name: normalizedName, nameKana: normalizedKana, school: form.school, grade: form.grades[0], enabled: form.enabled };
      setForm({ name: updated.name, nameKana: updated.nameKana, school: updated.school, grades: [updated.grade], enabled: updated.enabled });
      onSaved(updated); setStatus({ type: 'success', message: '基本情報を保存しました。' });
    } catch (requestError) {
      setStatus({ type: 'error', message: requestError?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。' : requestError?.message || '保存に失敗しました。' });
    } finally { savingRef.current = false; setSaving(false); }
  };

  const saveSubjects = async () => {
    if (subjectsSaving || subjectsLoading || subjectsLoadFailed || deleted || !subjectsDirty) return;
    setSubjectsSaving(true); setStatus({ type: '', message: '' });
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'updateOneToOneSubjects', apiKey: API_KEY, sessionToken, userId: account.userId, subjectIds }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(response.data?.message || '受講科目の保存に失敗しました。');
      const normalized = normalizeOneToOneSubjectIds(response.data.subjectIds);
      setSavedSubjectIds(normalized); setSubjectIds(normalized); setStatus({ type: 'success', message: '1対1受講科目を保存しました。' });
    } catch (requestError) {
      setStatus({ type: 'error', message: requestError?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。' : requestError?.message || '受講科目の保存に失敗しました。' });
    } finally { setSubjectsSaving(false); }
  };
  const deleteAccount = async () => {
    if (saving || !window.confirm('この生徒アカウントを削除しますか？')) return;
    setSaving(true); setStatus({ type: '', message: '' });
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'deleteStudentAccount', apiKey: API_KEY, sessionToken, userId: account.userId }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(response.data?.message || '削除に失敗しました。');
      onDeleted?.({ ...account, enabled: false, deletedAt: new Date().toISOString() });
    } catch (requestError) { setStatus({ type: 'error', message: requestError?.message || '削除に失敗しました。' }); }
    finally { setSaving(false); }
  };

  return <aside className="account-detail-panel" aria-label={`${account.name}のアカウント詳細`}>
    <header className="account-detail-header"><div><h2>{account.name}</h2><p>ID: {account.userId}</p></div><button type="button" className="account-icon-button" aria-label="詳細を閉じる" onClick={closePanel}>×</button></header>
    {deleted ? <div className="account-inline-message account-inline-message--error" role="status">削除済みアカウントのため編集できません。</div> : null}
    {status.message ? <div className={`account-inline-message account-inline-message--${status.type === 'error' ? 'error' : 'success'}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message}</div> : null}
    {!editing ? <>
      <section className="account-detail-section"><h3>基本情報</h3><dl className="account-detail-list"><div><dt>所属校舎</dt><dd>{account.school}</dd></div><div><dt>学年</dt><dd>{account.grade}</dd></div><div><dt>氏名</dt><dd>{account.name}</dd></div><div><dt>フリガナ</dt><dd>{account.nameKana || '－'}</dd></div></dl></section>
      <section className="account-detail-section"><h3>アカウント状態</h3><AccountStatusBadge status={getAccountStatus(account)} /></section>
      <section className="account-detail-section"><h3>1対1受講科目</h3>{subjectsLoading ? <div role="status">取得中です。</div> : subjectsLoadFailed ? <button type="button" className="account-secondary-button" onClick={loadSubjects}>再試行</button> : <p>{ONE_TO_ONE_SUBJECTS.filter(subject => subjectIds.includes(subject.subjectId)).map(subject => subject.label).join('、') || '登録なし'}</p>}</section>
      <section className="account-detail-section"><h3>管理情報</h3><dl className="account-detail-list"><div><dt>登録日時</dt><dd>{formatAccountDate(account.createdAt)}</dd></div><div><dt>更新日時</dt><dd>{formatAccountDate(account.updatedAt)}</dd></div></dl></section>
      {!deleted ? <div className="account-detail-actions"><button type="button" className="account-secondary-button" onClick={() => setEditing(true)}>編集する</button><button type="button" className="account-secondary-button" onClick={deleteAccount} disabled={saving}>削除する</button></div> : null}
    </> : <form className="account-detail-form" onSubmit={save}>
      <label className="account-form-field">氏名<input className="account-control" value={form.name} aria-invalid={Boolean(fieldErrors.name)} onChange={event => { setForm(value => ({ ...value, name: event.target.value })); setFieldErrors(value => ({ ...value, name: '' })); }}/>{fieldErrors.name ? <span className="account-field-error">{fieldErrors.name}</span> : null}</label>
      <label className="account-form-field">フリガナ<input className="account-control" value={form.nameKana} aria-invalid={Boolean(fieldErrors.nameKana)} onChange={event => { setForm(value => ({ ...value, nameKana: event.target.value })); setFieldErrors(value => ({ ...value, nameKana: '' })); }} onBlur={() => setForm(value => ({ ...value, nameKana: normalizeNameKana(value.nameKana) }))}/>{fieldErrors.nameKana ? <span className="account-field-error">{fieldErrors.nameKana}</span> : null}</label>
      <label className="account-form-field">所属校舎<SchoolSelect className="account-control" value={form.school} showAssignedOptions={false} onChange={event => { setForm(value => ({ ...value, school: event.target.value })); setFieldErrors(value => ({ ...value, school: '' })); }}/>{fieldErrors.school ? <span className="account-field-error">{fieldErrors.school}</span> : null}</label>
      <label className="account-form-field">学年<GradeSelect className="account-control" value={form.grades} includeGroups={false} onChange={grades => { setForm(value => ({ ...value, grades })); setFieldErrors(value => ({ ...value, grade: '' })); }}/>{fieldErrors.grade ? <span className="account-field-error">{fieldErrors.grade}</span> : null}</label>
      <fieldset className="account-detail-section"><legend>アカウント状態</legend><label className="account-check-row"><input type="radio" checked={form.enabled} onChange={() => setForm(value => ({ ...value, enabled: true }))}/>有効</label><label className="account-check-row"><input type="radio" checked={!form.enabled} onChange={() => setForm(value => ({ ...value, enabled: false }))}/>無効</label></fieldset>
      <fieldset className="account-detail-section" disabled={subjectsLoading || subjectsLoadFailed || subjectsSaving}><legend>1対1受講科目</legend><div className="account-subject-grid">{ONE_TO_ONE_SUBJECTS.map(subject => <label className="account-check-row" key={subject.subjectId}><input type="checkbox" checked={subjectIds.includes(subject.subjectId)} onChange={() => setSubjectIds(current => toggleOneToOneSubject(current, subject.subjectId))}/>{subject.label}</label>)}</div><button type="button" className="account-secondary-button" onClick={saveSubjects} disabled={!subjectsDirty || subjectsSaving}>{subjectsSaving ? '保存中…' : '受講科目を保存'}</button></fieldset>
      <div className="account-detail-actions"><button type="submit" className="account-primary-button" disabled={!accountDirty || saving}>{saving ? '保存中…' : '基本情報を保存'}</button><button type="button" className="account-secondary-button" onClick={cancelEditing}>編集を終了</button></div>
    </form>}
  </aside>;
}
