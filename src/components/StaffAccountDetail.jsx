import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import { AccountStatusBadge } from './AccountListUi.jsx';
import { formatAccountDate, getAccountStatus } from '../utils/accountManagement.js';
import { isValidNameKana, normalizeNameKana } from '../utils/nameKana.js';
import { getManagementErrorMessage } from '../utils/managementApi.js';

const REQUEST_TIMEOUT_MS = 15000;

export default function StaffAccountDetail({ account, GAS_URL, API_KEY, sessionToken, actorRole, onBack, onSaved, onDeleted, onDirtyChange }) {
  const isAdmin = actorRole === 'admin';
  const initialForm = useMemo(() => ({
    name: String(account.name || ''), nameKana: String(account.nameKana || ''), role: String(account.role || 'teacher'), enabled: account.enabled === true,
    assignedSchools: (Array.isArray(account.assignedSchools) ? account.assignedSchools : []).map(school => ({ school, isPrimary: school === account.primarySchool })),
  }), [account]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(false);
  const [schoolToAdd, setSchoolToAdd] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const deleted = getAccountStatus(account) === 'deleted';
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

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
    onDirtyChange?.(false); onBack();
  };
  const cancelEditing = () => {
    if (dirty && !window.confirm('未保存の変更を破棄しますか？')) return;
    setForm(initialForm); setSchoolToAdd(''); setFieldErrors({}); setStatus({ type: '', message: '' }); setEditing(false);
  };
  const addSchool = () => {
    if (!schoolToAdd) return setFieldErrors(value => ({ ...value, assignedSchools: '担当校舎を選択してください。' }));
    if (form.assignedSchools.some(item => item.school === schoolToAdd)) return setFieldErrors(value => ({ ...value, assignedSchools: '同じ校舎は追加できません。' }));
    setForm(value => ({ ...value, assignedSchools: [...value.assignedSchools, { school: schoolToAdd, isPrimary: value.assignedSchools.length === 0 }] }));
    setSchoolToAdd(''); setFieldErrors(value => ({ ...value, assignedSchools: '' }));
  };
  const removeSchool = school => setForm(value => {
    const remaining = value.assignedSchools.filter(item => item.school !== school);
    if (remaining.length > 0 && !remaining.some(item => item.isPrimary)) remaining[0] = { ...remaining[0], isPrimary: true };
    return { ...value, assignedSchools: remaining };
  });
  const setPrimary = school => setForm(value => ({ ...value, assignedSchools: value.assignedSchools.map(item => ({ ...item, isPrimary: item.school === school })) }));

  const save = async event => {
    event.preventDefault();
    if (savingRef.current || deleted || !dirty) return;
    const normalizedName = form.name.trim();
    const normalizedKana = normalizeNameKana(form.nameKana);
    const errors = {};
    if (!normalizedName) errors.name = '氏名を入力してください。';
    if (!normalizedKana || !isValidNameKana(normalizedKana)) errors.nameKana = 'フリガナを全角カタカナで入力してください。';
    if (!['teacher', 'head-teacher', 'general', 'admin'].includes(form.role)) errors.role = 'roleが不正です。';
    if (form.assignedSchools.length === 0 || form.assignedSchools.filter(item => item.isPrimary).length !== 1) errors.assignedSchools = '担当校舎を1校以上設定し、主担当を1校選択してください。';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    savingRef.current = true; setSaving(true); setStatus({ type: '', message: '' });
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'updateStaffAccount', apiKey: API_KEY, sessionToken, userId: account.userId, name: normalizedName, nameKana: normalizedKana, role: form.role, assignedSchools: form.assignedSchools, enabled: form.enabled }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(getManagementErrorMessage(response.data, '保存に失敗しました。'));
      const primarySchool = form.assignedSchools.find(item => item.isPrimary)?.school || '';
      const updated = { ...account, name: normalizedName, nameKana: normalizedKana, role: form.role, assignedSchools: form.assignedSchools.map(item => item.school), primarySchool, enabled: form.enabled };
      setForm({ name: updated.name, nameKana: updated.nameKana, role: updated.role, assignedSchools: form.assignedSchools.map(item => ({ ...item })), enabled: updated.enabled });
      onSaved(updated); setStatus({ type: 'success', message: '保存しました。' });
    } catch (requestError) {
      setStatus({ type: 'error', message: requestError?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。' : requestError?.message || '保存に失敗しました。' });
    } finally { savingRef.current = false; setSaving(false); }
  };
  const deleteAccount = async () => {
    if (saving || !window.confirm('この講師アカウントを削除しますか？')) return;
    setSaving(true); setStatus({ type: '', message: '' });
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'deleteStaffAccount', apiKey: API_KEY, sessionToken, userId: account.userId }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS });
      if (response.data?.result !== 'success') throw new Error(getManagementErrorMessage(response.data, '削除に失敗しました。'));
      onDeleted?.({ ...account, enabled: false, deletedAt: new Date().toISOString() });
    } catch (requestError) { setStatus({ type: 'error', message: requestError?.message || '削除に失敗しました。' }); }
    finally { setSaving(false); }
  };

  const secondarySchools = (account.assignedSchools || []).filter(school => school !== account.primarySchool);
  return <aside className="account-detail-panel" aria-label={`${account.name}のアカウント詳細`}>
    <header className="account-detail-header"><div><h2>{account.name}</h2><p>ID: {account.userId}</p></div><button type="button" className="account-icon-button" aria-label="詳細を閉じる" onClick={closePanel}>×</button></header>
    {deleted ? <div className="account-inline-message account-inline-message--error" role="status">削除済みアカウントのため編集できません。</div> : null}
    {status.message ? <div className={`account-inline-message account-inline-message--${status.type === 'error' ? 'error' : 'success'}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message}</div> : null}
    {!editing ? <>
      <section className="account-detail-section"><h3>基本情報</h3><dl className="account-detail-list"><div><dt>氏名</dt><dd>{account.name}</dd></div><div><dt>フリガナ</dt><dd>{account.nameKana || '－'}</dd></div>{isAdmin ? <div><dt>role</dt><dd>{account.role}</dd></div> : null}<div><dt>主担当校舎</dt><dd>{account.primarySchool || '未設定'}</dd></div></dl></section>
      <section className="account-detail-section"><h3>担当校舎</h3><dl className="account-detail-list"><div><dt>主担当</dt><dd>{account.primarySchool || '未設定'}</dd></div><div><dt>その他</dt><dd>{secondarySchools.join('、') || 'なし'}</dd></div></dl></section>
      <section className="account-detail-section"><h3>アカウント状態</h3><AccountStatusBadge status={getAccountStatus(account)}/></section>
      <section className="account-detail-section"><h3>管理情報</h3><dl className="account-detail-list"><div><dt>登録日時</dt><dd>{formatAccountDate(account.createdAt)}</dd></div><div><dt>更新日時</dt><dd>{formatAccountDate(account.updatedAt)}</dd></div></dl></section>
      {!deleted ? <div className="account-detail-actions"><button type="button" className="account-secondary-button" onClick={() => setEditing(true)}>編集する</button><button type="button" className="account-secondary-button" onClick={deleteAccount} disabled={saving}>削除する</button></div> : null}
    </> : <form className="account-detail-form" onSubmit={save}>
      <label className="account-form-field">氏名<input className="account-control" value={form.name} aria-invalid={Boolean(fieldErrors.name)} onChange={event => { setForm(value => ({ ...value, name: event.target.value })); setFieldErrors(value => ({ ...value, name: '' })); }}/>{fieldErrors.name ? <span className="account-field-error">{fieldErrors.name}</span> : null}</label>
      <label className="account-form-field">フリガナ<input className="account-control" value={form.nameKana} aria-invalid={Boolean(fieldErrors.nameKana)} onChange={event => { setForm(value => ({ ...value, nameKana: event.target.value })); setFieldErrors(value => ({ ...value, nameKana: '' })); }} onBlur={() => setForm(value => ({ ...value, nameKana: normalizeNameKana(value.nameKana) }))}/>{fieldErrors.nameKana ? <span className="account-field-error">{fieldErrors.nameKana}</span> : null}</label>
      {isAdmin ? <label className="account-form-field">アカウント種別<select className="account-control" value={form.role} onChange={event => setForm(value => ({ ...value, role: event.target.value }))}><option value="teacher">講師</option><option value="head-teacher">特別スタッフ</option><option value="general">社員・スタッフ</option><option value="admin">管理者</option></select>{fieldErrors.role ? <span className="account-field-error">{fieldErrors.role}</span> : null}</label> : null}
      <div className="account-form-field">担当校舎<div className="account-school-editor"><div className="account-school-editor__add"><SchoolSelect className="account-control" value={schoolToAdd} onChange={event => setSchoolToAdd(event.target.value)} showAssignedOptions={false}/><button type="button" className="account-secondary-button" onClick={addSchool}>追加</button></div>{form.assignedSchools.map(item => <div className="account-school-editor__row" key={item.school}><span>{item.school}</span><label><input type="radio" name="staffPrimarySchool" checked={item.isPrimary} onChange={() => setPrimary(item.school)}/>主担当</label><button type="button" className="account-icon-button" aria-label={`${item.school}を削除`} onClick={() => removeSchool(item.school)}>×</button></div>)}</div>{fieldErrors.assignedSchools ? <span className="account-field-error">{fieldErrors.assignedSchools}</span> : null}</div>
      <fieldset className="account-detail-section"><legend>アカウント状態</legend><label className="account-check-row"><input type="radio" checked={form.enabled} onChange={() => setForm(value => ({ ...value, enabled: true }))}/>有効</label><label className="account-check-row"><input type="radio" checked={!form.enabled} onChange={() => setForm(value => ({ ...value, enabled: false }))}/>無効</label></fieldset>
      <div className="account-detail-actions"><button type="submit" className="account-primary-button" disabled={!dirty || saving}>{saving ? '保存中…' : '保存する'}</button><button type="button" className="account-secondary-button" onClick={cancelEditing}>編集を終了</button></div>
    </form>}
  </aside>;
}
