import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { isValidNameKana, normalizeNameKana } from '../utils/nameKana.js';
import { getManagementErrorMessage } from '../utils/managementApi.js';

const TIMEOUT_MS = 15000;
const emptyForm = () => ({ userId: '', name: '', nameKana: '', school: '', grades: [], role: 'teacher' });
const normalizeIdInput = value => String(value || '').replace(/\s+/g, '');

function UserGlyph() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}

export default function AccountRegistration({ GAS_URL, API_KEY, sessionToken, onDirtyChange, role: actorRole }) {
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
  const dirty = Object.values(form).some(value => Array.isArray(value) ? value.length > 0 : value !== '' && value !== 'teacher') || assignedSchools.length > 0 || Boolean(schoolToAdd);

  const resetForm = useCallback(() => {
    setForm(emptyForm()); setAssignedSchools([]); setSchoolToAdd(''); setCreated(null); setStatus({ type: '', message: '' }); setFieldErrors({}); setIdStatus({ state: 'idle', message: '' }); setCopyStatus('');
  }, []);
  const requestReset = useCallback(() => {
    if (dirty && !window.confirm('入力中の内容を破棄しますか？')) return;
    resetForm(); setTimeout(() => idInputRef.current?.focus(), 0);
  }, [dirty, resetForm]);
  const switchType = next => {
    if (next === type || submitting) return;
    if (dirty && !window.confirm('入力中の内容を破棄してアカウント種別を変更しますか？')) return;
    setType(next); resetForm();
  };

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const userId = normalizeIdInput(form.userId);
    if (!userId) { setIdStatus({ state: 'idle', message: '' }); return undefined; }
    if (!/^\d{6}$/.test(userId)) { setIdStatus({ state: 'invalid', message: '半角数字6桁で入力してください。' }); return undefined; }
    let cancelled = false;
    setIdStatus({ state: 'checking', message: '確認中…' });
    const timer = setTimeout(async () => {
      try {
        const response = await axios.post(GAS_URL, JSON.stringify({ action: 'checkUserIdAvailable', apiKey: API_KEY, sessionToken, userId }), { headers: { 'Content-Type': 'text/plain' }, timeout: TIMEOUT_MS });
        if (cancelled) return;
        if (response.data?.result !== 'success') setIdStatus({ state: 'error', message: response.data?.message || 'IDを確認できませんでした。' });
        else setIdStatus({ state: response.data.available ? 'available' : 'duplicate', message: response.data.available ? '登録可能です' : '既に登録されています' });
      } catch { if (!cancelled) setIdStatus({ state: 'error', message: 'IDを確認できませんでした。' }); }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [API_KEY, GAS_URL, form.userId, sessionToken]);
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape' && !submittingRef.current) requestReset(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestReset]);

  const addSchool = () => {
    if (!schoolToAdd) return setFieldErrors(value => ({ ...value, assignedSchools: '担当校舎を選択してください。' }));
    if (assignedSchools.some(item => item.school === schoolToAdd)) return setFieldErrors(value => ({ ...value, assignedSchools: '同じ校舎は追加できません。' }));
    setAssignedSchools(items => [...items, { school: schoolToAdd, isPrimary: items.length === 0 }]);
    setSchoolToAdd(''); setFieldErrors(value => ({ ...value, assignedSchools: '' }));
  };
  const removeSchool = school => setAssignedSchools(items => {
    const remaining = items.filter(item => item.school !== school);
    if (remaining.length > 0 && !remaining.some(item => item.isPrimary)) remaining[0] = { ...remaining[0], isPrimary: true };
    return remaining;
  });
  const setPrimary = school => setAssignedSchools(items => items.map(item => ({ ...item, isPrimary: item.school === school })));

  const submit = async event => {
    event.preventDefault();
    if (submittingRef.current) return;
    const normalizedKana = normalizeNameKana(form.nameKana);
    const errors = {};
    if (!/^\d{6}$/.test(form.userId) || idStatus.state !== 'available') errors.userId = idStatus.state === 'duplicate' ? '既に登録されています。' : '登録可能な半角数字6桁IDを入力してください。';
    if (!form.name.trim()) errors.name = '氏名を入力してください。';
    if (!normalizedKana || !isValidNameKana(normalizedKana)) errors.nameKana = 'フリガナを全角カタカナで入力してください。';
    if (type === 'student' && !form.school) errors.school = '所属校舎を選択してください。';
    if (type === 'student' && form.grades.length !== 1) errors.grade = '学年を選択してください。';
    if (type === 'staff' && (assignedSchools.length === 0 || assignedSchools.filter(item => item.isPrimary).length !== 1)) errors.assignedSchools = '担当校舎を1校以上追加し、主担当を1校選択してください。';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    submittingRef.current = true; setSubmitting(true); setCreated(null); setCopyStatus(''); setStatus({ type: '', message: '' });
    const payload = type === 'student'
      ? { action: 'createStudentAccount', apiKey: API_KEY, sessionToken, userId: form.userId, school: form.school, grade: form.grades[0], name: form.name.trim(), nameKana: normalizedKana }
      : { action: 'createStaffAccount', apiKey: API_KEY, sessionToken, userId: form.userId, name: form.name.trim(), nameKana: normalizedKana, role: form.role, assignedSchools };
    try {
      const response = await axios.post(GAS_URL, JSON.stringify(payload), { headers: { 'Content-Type': 'text/plain' }, timeout: TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(getManagementErrorMessage(response.data, '登録に失敗しました。'));
      setCreated({ userId: response.data.userId, password: response.data.password });
      setStatus({ type: 'success', message: 'アカウントを作成しました。' }); setForm(emptyForm()); setAssignedSchools([]); setSchoolToAdd(''); setIdStatus({ state: 'idle', message: '' }); setFieldErrors({}); setTimeout(() => idInputRef.current?.focus(), 0);
    } catch (requestError) {
      setStatus({ type: 'error', message: requestError?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。' : requestError?.message || '登録に失敗しました。' });
    } finally { submittingRef.current = false; setSubmitting(false); }
  };
  const copyValue = async value => { try { await navigator.clipboard.writeText(value); setCopyStatus('コピーしました'); } catch { setCopyStatus('コピーできませんでした'); } };
  const cannotSubmit = submitting || idStatus.state !== 'available' || !form.userId;

  return <div className="account-registration">
    <aside className="account-registration__types"><h2>アカウント種別を選択</h2><div className="account-type-list">
      <button type="button" className="account-type-card" aria-pressed={type === 'student'} disabled={submitting} onClick={() => switchType('student')}><span className="account-type-card__icon"><UserGlyph /></span><span><strong>生徒アカウント</strong><small>生徒のアカウントを作成します</small></span>{type === 'student' ? <span className="account-type-card__check" aria-hidden="true">●</span> : null}</button>
      <button type="button" className="account-type-card" aria-pressed={type === 'staff'} disabled={submitting} onClick={() => switchType('staff')}><span className="account-type-card__icon"><UserGlyph /></span><span><strong>講師アカウント</strong><small>講師のアカウントを作成します</small></span>{type === 'staff' ? <span className="account-type-card__check" aria-hidden="true">●</span> : null}</button>
    </div><div className="account-info-box"><strong>ⓘ IDについて</strong>ネッツメニュー等で発行された半角数字6桁のIDを入力してください。先頭が0の場合も6桁のまま入力してください。</div><div className="account-info-box account-info-box--blue"><strong>▣ パスワードについて</strong>初期パスワードはGASが発行し、登録成功時に一度だけ表示します。{type === 'student' ? '生徒は初回パスワード変更の対象外です。' : '講師は初回ログイン時の変更対象です。'}</div></aside>
    <section className="account-registration__form"><form className="account-registration-form" onSubmit={submit} aria-busy={submitting}>
      <h2>{type === 'student' ? '生徒' : '講師'}アカウントの新規作成</h2>
      {status.message ? <div className={`account-inline-message account-inline-message--${status.type === 'error' ? 'error' : 'success'}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message}</div> : null}
      {created ? <div className="account-credentials" role="status"><strong>登録情報（この画面を離れる前に控えてください）</strong><div>登録ID：<b>{created.userId}</b><button type="button" className="account-secondary-button" onClick={() => copyValue(created.userId)}>コピー</button></div><div>初期パスワード：<b>{created.password}</b><button type="button" className="account-secondary-button" onClick={() => copyValue(created.password)}>コピー</button></div>{copyStatus ? <small>{copyStatus}</small> : null}</div> : null}
      <div className="account-form-grid">
        <label className="account-form-field">ID（6桁）<input ref={idInputRef} className="account-control" type="text" inputMode="numeric" maxLength={6} value={form.userId} aria-invalid={Boolean(fieldErrors.userId)} onChange={event => { setForm(value => ({ ...value, userId: normalizeIdInput(event.target.value) })); setFieldErrors(value => ({ ...value, userId: '' })); }} placeholder="例）037071"/><small>ネッツメニュー等で発行された6桁IDを入力してください。</small>{idStatus.message ? <span className={idStatus.state === 'available' ? '' : 'account-field-error'}>{idStatus.message}</span> : null}{fieldErrors.userId ? <span className="account-field-error">{fieldErrors.userId}</span> : null}</label>
        <label className="account-form-field">氏名<input className="account-control" value={form.name} aria-invalid={Boolean(fieldErrors.name)} onChange={event => { setForm(value => ({ ...value, name: event.target.value })); setFieldErrors(value => ({ ...value, name: '' })); }} placeholder="例）山田 太郎"/>{fieldErrors.name ? <span className="account-field-error">{fieldErrors.name}</span> : null}</label>
        {type === 'student' ? <label className="account-form-field">所属校舎<SchoolSelect className="account-control" value={form.school} showAssignedOptions={false} onChange={event => { setForm(value => ({ ...value, school: event.target.value })); setFieldErrors(value => ({ ...value, school: '' })); }}/>{fieldErrors.school ? <span className="account-field-error">{fieldErrors.school}</span> : null}</label> : null}
        <label className="account-form-field">フリガナ<input className="account-control" value={form.nameKana} aria-invalid={Boolean(fieldErrors.nameKana)} onChange={event => { setForm(value => ({ ...value, nameKana: event.target.value })); setFieldErrors(value => ({ ...value, nameKana: '' })); }} onBlur={() => setForm(value => ({ ...value, nameKana: normalizeNameKana(value.nameKana) }))} placeholder="例）ヤマダ　タロウ"/>{fieldErrors.nameKana ? <span className="account-field-error">{fieldErrors.nameKana}</span> : null}</label>
        {type === 'student' ? <label className="account-form-field">学年<GradeSelect className="account-control" value={form.grades} includeGroups={false} onChange={grades => { setForm(value => ({ ...value, grades })); setFieldErrors(value => ({ ...value, grade: '' })); }}/>{fieldErrors.grade ? <span className="account-field-error">{fieldErrors.grade}</span> : null}</label> : <>
          {actorRole === 'admin' ? <label className="account-form-field">アカウント種別<select className="account-control" value={form.role} onChange={event => setForm(value => ({ ...value, role: event.target.value }))}><option value="teacher">講師</option><option value="head-teacher">特別スタッフ</option><option value="general">社員・スタッフ</option><option value="admin">管理者</option></select></label> : null}
          <div className="account-form-field account-form-field--wide">担当校舎<div className="account-school-editor"><div className="account-school-editor__add"><SchoolSelect className="account-control" value={schoolToAdd} showAssignedOptions={false} onChange={event => setSchoolToAdd(event.target.value)}/><button type="button" className="account-secondary-button" onClick={addSchool}>追加</button></div>{assignedSchools.map(item => <div className="account-school-editor__row" key={item.school}><span>{item.school}</span><label><input type="radio" name="primarySchool" checked={item.isPrimary} onChange={() => setPrimary(item.school)}/>主担当</label><button type="button" className="account-icon-button" aria-label={`${item.school}を削除`} onClick={() => removeSchool(item.school)}>×</button></div>)}</div>{fieldErrors.assignedSchools ? <span className="account-field-error">{fieldErrors.assignedSchools}</span> : null}</div>
        </>}
      </div>
      <footer className="account-registration-footer"><button type="button" className="account-secondary-button" disabled={submitting} onClick={requestReset}>キャンセル</button><button type="submit" className="account-primary-button" disabled={cannotSubmit}>{submitting ? '登録中…' : `${type === 'student' ? '生徒' : '講師'}アカウントを登録する`}</button></footer>
    </form></section>
  </div>;
}
