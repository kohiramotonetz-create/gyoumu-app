import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import StaffAccountDetail from './StaffAccountDetail.jsx';
import { ALL_SCHOOLS } from '../constants/organization.js';
import { normalizeNameKana } from '../utils/nameKana.js';

const REQUEST_TIMEOUT_MS = 15000;
const SCHOOL_ORDER = new Map(ALL_SCHOOLS.map((school, index) => [school, index]));
const ROLE_ORDER = { teacher: 0, 'head-teacher': 1, admin: 2 };
const hasDeletedAt = account => account.deletedAt != null && String(account.deletedAt).trim() !== '';
const getAccountStatus = account => hasDeletedAt(account) ? 'deleted' : account.enabled === true ? 'enabled' : 'disabled';
const statusLabels = {
  enabled: { label: '🟢 有効', color: '#166534', background: '#f0fdf4' },
  disabled: { label: '🟡 無効', color: '#854d0e', background: '#fefce8' },
  deleted: { label: '🔴 削除済み', color: '#991b1b', background: '#fef2f2' },
};

export default function StaffAccountList({ GAS_URL, API_KEY, sessionToken, styles }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [school, setSchool] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [nameQuery, setNameQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const fetchAccounts = useCallback(async signal => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'getStaffAccounts', apiKey: API_KEY, sessionToken }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS, signal });
      if (response.data?.result !== 'success' || !Array.isArray(response.data.accounts)) {
        const sessionExpired = response.data?.code === 'AUTHORIZATION_ERROR';
        setError({ sessionExpired, message: sessionExpired ? '管理セッションが切れています。再ログインしてください。' : response.data?.message || '講師一覧を取得できませんでした。' });
        return;
      }
      setAccounts(response.data.accounts);
    } catch (requestError) {
      if (requestError?.code === 'ERR_CANCELED') return;
      setError({ sessionExpired: false, message: requestError?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。再度お試しください。' : '通信に失敗しました。再度お試しください。' });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [GAS_URL, API_KEY, sessionToken]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAccounts(controller.signal);
    return () => controller.abort();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    const query = nameQuery.trim().toLocaleLowerCase('ja');
    return accounts
      .filter(account => showDeleted || !hasDeletedAt(account))
      .filter(account => !school || account.primarySchool === school)
      .filter(account => roleFilter === 'all' || account.role === roleFilter)
      .filter(account => !query || String(account.name || '').toLocaleLowerCase('ja').includes(query))
      .filter(account => status === 'all' || getAccountStatus(account) === status)
      .sort((left, right) => {
        const schoolDifference = (SCHOOL_ORDER.get(left.primarySchool) ?? Number.MAX_SAFE_INTEGER) - (SCHOOL_ORDER.get(right.primarySchool) ?? Number.MAX_SAFE_INTEGER);
        if (schoolDifference) return schoolDifference;
        const leftKana = normalizeNameKana(left.nameKana);
        const rightKana = normalizeNameKana(right.nameKana);
        if (!leftKana && rightKana) return 1;
        if (leftKana && !rightKana) return -1;
        const kanaDifference = leftKana.localeCompare(rightKana, 'ja');
        if (kanaDifference) return kanaDifference;
        const roleDifference = (ROLE_ORDER[left.role] ?? 99) - (ROLE_ORDER[right.role] ?? 99);
        if (roleDifference) return roleDifference;
        return String(left.name || '').localeCompare(String(right.name || ''), 'ja');
      });
  }, [accounts, nameQuery, roleFilter, school, showDeleted, status]);

  const fieldStyle = { ...styles.select, width: '100%', boxSizing: 'border-box' };
  if (selectedAccount) return <StaffAccountDetail account={selectedAccount} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} styles={styles} onBack={() => { setSelectedAccount(null); fetchAccounts(); }} onSaved={updated => { setSelectedAccount(updated); setAccounts(items => items.map(item => item.userId === updated.userId ? updated : item)); }} />;

  return <section style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
    <h2 style={styles.contentTitle}>講師一覧</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
      <label>主担当校舎<SchoolSelect value={school} onChange={event => setSchool(event.target.value)} showAssignedOptions={false} style={fieldStyle} /></label>
      <label>role<select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} style={fieldStyle}><option value="all">すべて</option><option value="teacher">teacher</option><option value="head-teacher">head-teacher</option><option value="admin">admin</option></select></label>
      <label>氏名<input value={nameQuery} onChange={event => setNameQuery(event.target.value)} placeholder="氏名で検索" style={fieldStyle} /></label>
      <label>状態<select value={status} onChange={event => setStatus(event.target.value)} style={fieldStyle}><option value="all">すべて</option><option value="enabled">有効</option><option value="disabled">無効</option><option value="deleted">削除済み</option></select></label>
    </div>
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><input type="checkbox" checked={showDeleted} onChange={event => setShowDeleted(event.target.checked)} />削除済みも表示</label>
    {loading && <div role="status" style={{ padding: 20, textAlign: 'center' }}>取得中...</div>}
    {!loading && error && <div role="alert" style={{ padding: 16, color: '#991b1b', background: '#fef2f2', borderRadius: 6 }}>{error.message}{!error.sessionExpired && <button type="button" onClick={() => fetchAccounts()} style={{ ...styles.doneBtn, marginLeft: 12 }}>再試行</button>}</div>}
    {!loading && !error && filteredAccounts.length === 0 && <div style={{ padding: 20, textAlign: 'center' }}>該当する講師がいません。</div>}
    {!loading && !error && filteredAccounts.length > 0 && <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}><table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}><thead><tr style={{ background: '#f8fafc' }}>{['ID', '氏名', 'フリガナ', 'role', '主担当校舎', '状態', '詳細'].map(label => <th key={label} style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #d1d5db', whiteSpace: 'nowrap' }}>{label}</th>)}</tr></thead><tbody>{filteredAccounts.map(account => {
      const accountStatus = statusLabels[getAccountStatus(account)];
      return <tr key={account.userId}><td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{account.userId}</td><td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{account.name}</td><td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{account.nameKana}</td><td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{account.role}</td><td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>{account.primarySchool || '未設定'}</td><td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}><span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 999, color: accountStatus.color, background: accountStatus.background, whiteSpace: 'nowrap' }}>{accountStatus.label}</span></td><td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}><button type="button" onClick={() => setSelectedAccount(account)}>詳細</button></td></tr>;
    })}</tbody></table></div>}
  </section>;
}
