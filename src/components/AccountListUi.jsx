import { ACCOUNT_PAGE_SIZES } from '../utils/accountManagement.js';

export function AccountStatusBadge({ status }) {
  const labels = { enabled: '有効', disabled: '無効', deleted: '削除済み' };
  return <span className={`account-status account-status--${status}`}>{labels[status]}</span>;
}

export function AccountPagination({ result, onPageChange, onPageSizeChange }) {
  const pages = Array.from({ length: result.totalPages }, (_, index) => index + 1)
    .filter(page => page === 1 || page === result.totalPages || Math.abs(page - result.page) <= 1);
  return <div className="account-pagination">
    <p>全{result.totalItems}件中 {result.start}～{result.end}件を表示</p>
    <div className="account-pagination__pages" aria-label="ページ切り替え">
      <button type="button" aria-label="前のページ" disabled={result.page <= 1} onClick={() => onPageChange(result.page - 1)}>‹</button>
      {pages.map((page, index) => <span key={page}>
        {index > 0 && page - pages[index - 1] > 1 ? <span aria-hidden="true">…</span> : null}
        <button type="button" aria-label={`${page}ページ`} aria-current={page === result.page ? 'page' : undefined} onClick={() => onPageChange(page)}>{page}</button>
      </span>)}
      <button type="button" aria-label="次のページ" disabled={result.page >= result.totalPages} onClick={() => onPageChange(result.page + 1)}>›</button>
    </div>
    <label className="account-pagination__size">表示件数
      <select className="account-control" value={result.pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>
        {ACCOUNT_PAGE_SIZES.map(size => <option key={size} value={size}>{size}件</option>)}
      </select>
    </label>
  </div>;
}
