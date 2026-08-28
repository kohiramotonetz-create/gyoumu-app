import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import StaffAccountDetail from './StaffAccountDetail.jsx';
import { AccountPagination, AccountStatusBadge } from './AccountListUi.jsx';
import { ALL_SCHOOLS } from '../constants/organization.js';
import { normalizeNameKana } from '../utils/nameKana.js';
import { formatAccountDate, getAccountStatus, matchesAccountQuery, paginateAccounts } from '../utils/accountManagement.js';

const REQUEST_TIMEOUT_MS = 15000;
const SCHOOL_ORDER = new Map(ALL_SCHOOLS.map((school, index) => [school, index]));
const ROLE_ORDER = { teacher: 0, 'head-teacher': 1, admin: 2 };

function compareStaffAccounts(left, right) {
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
  return String(left.name || '').localeCompare(String(right.name || ''), 'ja') || String(left.userId || '').localeCompare(String(right.userId || ''), 'ja');
}

export default function StaffAccountList({ GAS_URL, API_KEY, sessionToken, onCreate, onDirtyChange }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [school, setSchool] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [detailDirty, setDetailDirty] = useState(false);

  const fetchAccounts = useCallback(async signal => {
    setLoading(true); setError(null);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'getStaffAccounts', apiKey: API_KEY, sessionToken }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS, signal });
      if (response.data?.result !== 'success' || !Array.isArray(response.data.accounts)) {
        const sessionExpired = response.data?.code === 'AUTHORIZATION_ERROR';
        setError({ sessionExpired, message: sessionExpired ? '管理セッションが切れています。再ログインしてください。' : response.data?.message || '講師情報を取得できませんでした。' });
        return;
      }
      setAccounts(response.data.accounts);
    } catch (requestError) {
      if (requestError?.code === 'ERR_CANCELED') return;
      setError({ sessionExpired: false, message: requestError?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。再度お試しください。' : '通信に失敗しました。再度お試しください。' });
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [API_KEY, GAS_URL, sessionToken]);

  useEffect(() => { const controller = new AbortController(); fetchAccounts(controller.signal); return () => controller.abort(); }, [fetchAccounts]);
  const filteredAccounts = useMemo(() => accounts
    .filter(account => status === 'deleted' ? getAccountStatus(account) === 'deleted' : getAccountStatus(account) !== 'deleted')
    .filter(account => !school || account.primarySchool === school)
    .filter(account => roleFilter === 'all' || account.role === roleFilter)
    .filter(account => matchesAccountQuery(account, query))
    .filter(account => status === 'all' || status === 'deleted' || getAccountStatus(account) === status)
    .sort(compareStaffAccounts), [accounts, query, roleFilter, school, status]);
  const result = paginateAccounts(filteredAccounts, page, pageSize);
  const selectedAccount = accounts.find(account => account.userId === selectedAccountId) || null;
  const resetPage = () => setPage(1);
  const setDirty = value => { setDetailDirty(value); onDirtyChange?.(value); };
  const selectAccount = accountId => {
    if (detailDirty && accountId !== selectedAccountId && !window.confirm('保存されていない変更があります。別の講師を選択しますか？')) return;
    setDirty(false); setSelectedAccountId(accountId);
  };
  const closeDetail = () => { setDirty(false); setSelectedAccountId(null); };
  const saveAccount = updated => setAccounts(items => items.map(item => item.userId === updated.userId ? updated : item));

  return <div className={`account-list-layout ${selectedAccount ? 'account-list-layout--detail' : ''}`}>
    <section className="account-list-panel" aria-label="講師情報一覧">
      <div className="account-filter-toolbar">
        <label>主担当校舎<SchoolSelect className="account-control" value={school} onChange={event => { setSchool(event.target.value); resetPage(); }} showAssignedOptions={false} placeholder="すべて"/></label>
        <label>role<select className="account-control" value={roleFilter} onChange={event => { setRoleFilter(event.target.value); resetPage(); }}><option value="all">すべて</option><option value="teacher">teacher</option><option value="head-teacher">head-teacher</option><option value="admin">admin</option></select></label>
        <label>状態<select className="account-control" value={status} onChange={event => { setStatus(event.target.value); resetPage(); }}><option value="all">すべて</option><option value="enabled">有効</option><option value="disabled">無効</option><option value="deleted">削除済み</option></select></label>
        <label className="account-filter-toolbar__search">講師名・ID検索<input className="account-control" value={query} onChange={event => { setQuery(event.target.value); resetPage(); }} placeholder="氏名・フリガナ・IDで検索"/><span aria-hidden="true">⌕</span></label>
      </div>
      <div className="account-list-actions"><button type="button" className="account-primary-button" onClick={onCreate}>＋ 講師を追加</button></div>
      {loading ? <div className="account-loading" role="status">講師情報を取得中です。</div> : null}
      {!loading && error ? <div className="account-inline-message account-inline-message--error" role="alert">{error.message}{!error.sessionExpired ? <button type="button" className="account-secondary-button" onClick={() => fetchAccounts()}>再試行</button> : null}</div> : null}
      {!loading && !error && accounts.length === 0 ? <div className="account-empty">登録済みの講師アカウントがありません。</div> : null}
      {!loading && !error && accounts.length > 0 && result.totalItems === 0 ? <div className="account-empty">条件に一致する講師がいません。条件を変更してください。</div> : null}
      {!loading && !error && result.totalItems > 0 ? <>
        <div className="account-table-scroll"><table className="account-table"><thead><tr><th scope="col">講師名</th><th scope="col">ID</th><th scope="col">主担当校舎</th><th scope="col">role</th><th scope="col">状態</th><th scope="col">更新日時</th><th scope="col">操作</th></tr></thead>
          <tbody>{result.items.map(account => <tr key={account.userId} className={selectedAccountId === account.userId ? 'account-table__row--selected' : ''}><td className="account-table__name">{account.name}</td><td>{account.userId}</td><td>{account.primarySchool || '未設定'}</td><td>{account.role}</td><td><AccountStatusBadge status={getAccountStatus(account)}/></td><td>{formatAccountDate(account.updatedAt)}</td><td><button type="button" className="account-row-button" aria-label={`${account.name}の詳細を開く`} onClick={() => selectAccount(account.userId)}>›</button></td></tr>)}</tbody>
        </table></div><AccountPagination result={result} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }}/>
      </> : null}
    </section>
    {selectedAccount ? <StaffAccountDetail key={selectedAccount.userId} account={selectedAccount} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onBack={closeDetail} onSaved={saveAccount} onDirtyChange={setDirty}/> : null}
  </div>;
}
