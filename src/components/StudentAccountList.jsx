import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import StudentAccountDetail from './StudentAccountDetail.jsx';
import StudentProfileLink from './common/StudentProfileLink.jsx';
import { AccountPagination, AccountStatusBadge } from './AccountListUi.jsx';
import { compareStudentAccounts } from '../utils/studentAccountOrdering.js';
import { formatAccountDate, getAccountStatus, matchesAccountQuery, paginateAccounts } from '../utils/accountManagement.js';
import { getManagementErrorMessage, isManagementSessionExpired } from '../utils/managementApi.js';

const REQUEST_TIMEOUT_MS = 15000;

export default function StudentAccountList({ GAS_URL, API_KEY, sessionToken, onCreate, onDirtyChange }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [school, setSchool] = useState('');
  const [grades, setGrades] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [detailDirty, setDetailDirty] = useState(false);

  const fetchAccounts = useCallback(async signal => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'getStudentAccounts', apiKey: API_KEY, sessionToken }), { headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS, signal });
      if (response.data?.result !== 'success' || !Array.isArray(response.data.accounts)) {
        const sessionExpired = isManagementSessionExpired(response.data);
        setError({ sessionExpired, message: getManagementErrorMessage(response.data, '生徒情報を取得できませんでした。') });
        return;
      }
      setAccounts(response.data.accounts);
    } catch (requestError) {
      if (requestError?.code === 'ERR_CANCELED') return;
      setError({ sessionExpired: false, message: requestError?.code === 'ECONNABORTED' ? '通信がタイムアウトしました。再度お試しください。' : '通信に失敗しました。再度お試しください。' });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [API_KEY, GAS_URL, sessionToken]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAccounts(controller.signal);
    return () => controller.abort();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => accounts
    .filter(account => status === 'deleted' ? getAccountStatus(account) === 'deleted' : getAccountStatus(account) !== 'deleted')
    .filter(account => !school || account.school === school)
    .filter(account => grades.length === 0 || grades.includes(account.grade))
    .filter(account => matchesAccountQuery(account, query))
    .filter(account => status === 'all' || status === 'deleted' || getAccountStatus(account) === status)
    .sort(compareStudentAccounts), [accounts, grades, query, school, status]);
  const result = paginateAccounts(filteredAccounts, page, pageSize);
  const selectedAccount = accounts.find(account => account.userId === selectedAccountId) || null;

  const resetPage = () => setPage(1);
  const setDirty = value => { setDetailDirty(value); onDirtyChange?.(value); };
  const selectAccount = accountId => {
    if (detailDirty && accountId !== selectedAccountId && !window.confirm('保存されていない変更があります。別の生徒を選択しますか？')) return;
    setDirty(false);
    setSelectedAccountId(accountId);
  };
  const closeDetail = () => { setDirty(false); setSelectedAccountId(null); };
  const saveAccount = updated => setAccounts(items => items.map(item => item.userId === updated.userId ? updated : item));
  const deleteAccount = updated => { saveAccount(updated); setSelectedAccountId(null); };

  return <div className={`account-list-layout ${selectedAccount ? 'account-list-layout--detail' : ''}`}>
    <section className="account-list-panel" aria-label="生徒情報一覧">
      <div className="account-filter-toolbar">
        <label>校舎<SchoolSelect className="account-control" value={school} onChange={event => { setSchool(event.target.value); resetPage(); }} showAssignedOptions={false} placeholder="すべて" /></label>
        <label>学年<GradeSelect className="account-control" value={grades} onChange={value => { setGrades(value); resetPage(); }} placeholder="すべて" /></label>
        <label>状態<select className="account-control" value={status} onChange={event => { setStatus(event.target.value); resetPage(); }}><option value="all">すべて</option><option value="enabled">有効</option><option value="disabled">無効</option><option value="deleted">削除済み</option></select></label>
        <label className="account-filter-toolbar__search">生徒名・ID検索<input className="account-control" value={query} onChange={event => { setQuery(event.target.value); resetPage(); }} placeholder="氏名・フリガナ・IDで検索"/><span aria-hidden="true">⌕</span></label>
      </div>
      {onCreate ? <div className="account-list-actions"><button type="button" className="account-primary-button" onClick={onCreate}>＋ 生徒を追加</button></div> : null}
      {loading ? <div className="account-loading" role="status">生徒情報を取得中です。</div> : null}
      {!loading && error ? <div className="account-inline-message account-inline-message--error" role="alert">{error.message}{!error.sessionExpired ? <button type="button" className="account-secondary-button" onClick={() => fetchAccounts()}>再試行</button> : null}</div> : null}
      {!loading && !error && accounts.length === 0 ? <div className="account-empty">登録済みの生徒アカウントがありません。</div> : null}
      {!loading && !error && accounts.length > 0 && result.totalItems === 0 ? <div className="account-empty">条件に一致する生徒がいません。条件を変更してください。</div> : null}
      {!loading && !error && result.totalItems > 0 ? <>
        <div className="account-table-scroll"><table className="account-table">
          <thead><tr><th scope="col">生徒名</th><th scope="col">ID</th><th scope="col">所属校舎</th><th scope="col">学年</th><th scope="col">状態</th><th scope="col">更新日時</th><th scope="col">操作</th></tr></thead>
          <tbody>{result.items.map(account => <tr key={account.userId} className={selectedAccountId === account.userId ? 'account-table__row--selected' : ''}>
            <td className="account-table__name"><StudentProfileLink userId={account.userId} source="create-account">{account.name}</StudentProfileLink></td>
            <td>{account.userId}</td><td>{account.school}</td><td>{account.grade}</td><td><AccountStatusBadge status={getAccountStatus(account)} /></td><td>{formatAccountDate(account.updatedAt)}</td>
            <td><button type="button" className="account-row-button" aria-label={`${account.name}の詳細を開く`} onClick={() => selectAccount(account.userId)}>›</button></td>
          </tr>)}</tbody>
        </table></div>
        <AccountPagination result={result} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
      </> : null}
    </section>
    {selectedAccount ? <StudentAccountDetail key={selectedAccount.userId} account={selectedAccount} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onBack={closeDetail} onSaved={saveAccount} onDeleted={deleteAccount} onDirtyChange={setDirty} /> : null}
  </div>;
}
