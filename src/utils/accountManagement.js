export const ACCOUNT_PAGE_SIZES = [20, 50, 100];

export function getAccountStatus(account) {
  const deleted = account?.deletedAt != null && String(account.deletedAt).trim() !== '';
  if (deleted) return 'deleted';
  return account?.enabled === true ? 'enabled' : 'disabled';
}

export function matchesAccountQuery(account, query) {
  const normalized = String(query || '').trim().normalize('NFKC').toLocaleLowerCase('ja');
  if (!normalized) return true;
  return [account?.name, account?.nameKana, account?.userId].some(value => (
    String(value || '').normalize('NFKC').toLocaleLowerCase('ja').includes(normalized)
  ));
}

export function paginateAccounts(items, requestedPage, requestedPageSize) {
  const source = Array.isArray(items) ? items : [];
  const pageSize = ACCOUNT_PAGE_SIZES.includes(Number(requestedPageSize)) ? Number(requestedPageSize) : ACCOUNT_PAGE_SIZES[0];
  const totalPages = Math.max(1, Math.ceil(source.length / pageSize));
  const page = Math.min(Math.max(1, Number(requestedPage) || 1), totalPages);
  const startIndex = (page - 1) * pageSize;
  return {
    items: source.slice(startIndex, startIndex + pageSize),
    page,
    pageSize,
    totalItems: source.length,
    totalPages,
    start: source.length === 0 ? 0 : startIndex + 1,
    end: Math.min(source.length, startIndex + pageSize),
  };
}

export function formatAccountDate(value) {
  if (value == null || String(value).trim() === '') return '－';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ja-JP');
}
