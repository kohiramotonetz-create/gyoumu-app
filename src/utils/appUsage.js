const DAY_MS = 24 * 60 * 60 * 1000;
export const ALL_ASSIGNED_SCHOOLS_VALUE = '全担当校舎';

export const APP_USAGE_PERIODS = [
  { value: '30d', label: '直近30日', days: 30 },
  { value: '60d', label: '直近60日', days: 60 },
  { value: '90d', label: '直近90日', days: 90 },
  { value: 'all', label: '全期間', days: null },
];

export const APP_USAGE_SORT_OPTIONS = [
  { value: 'latest-desc', label: '最終利用が新しい順' },
  { value: 'latest-asc', label: '最終利用が古い順' },
  { value: 'name', label: '氏名順' },
];

export function normalizeAssignedSchools(assignedSchools) {
  return Array.from(new Set(
    (Array.isArray(assignedSchools) ? assignedSchools : [])
      .map(school => String(school || '').trim())
      .filter(Boolean),
  ));
}

export function resolveAppUsageSchoolPayload(selectedSchool, assignedSchools) {
  const school = String(selectedSchool || '').trim();
  if (school !== ALL_ASSIGNED_SCHOOLS_VALUE) return school;
  const normalizedSchools = normalizeAssignedSchools(assignedSchools);
  if (normalizedSchools.length === 0) throw new Error('担当校舎情報を取得できませんでした。再ログイン後も解消しない場合は管理者へお問い合わせください。');
  return normalizedSchools.join(',');
}

export function normalizeRawDate(rawDate) {
  const timestamp = typeof rawDate === 'number' ? rawDate : Number(rawDate);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function filterLogsByPeriod(logs, period, nowMs = Date.now()) {
  const source = Array.isArray(logs) ? logs : [];
  const periodConfig = APP_USAGE_PERIODS.find(item => item.value === period);
  if (!periodConfig || periodConfig.days === null) return [...source];

  const lowerBound = nowMs - (periodConfig.days * DAY_MS);
  return source.filter(log => {
    const timestamp = normalizeRawDate(log?.rawDate);
    return timestamp !== null && timestamp >= lowerBound && timestamp <= nowMs;
  });
}

export function getLatestUsageLog(logs) {
  let latestLog = null;
  let latestTimestamp = -Infinity;
  for (const log of Array.isArray(logs) ? logs : []) {
    const timestamp = normalizeRawDate(log?.rawDate);
    if (timestamp !== null && timestamp > latestTimestamp) {
      latestLog = log;
      latestTimestamp = timestamp;
    }
  }
  return latestLog;
}

export function getUsageProgress(log) {
  if (!log || log.score === '' || log.score === undefined || log.score === null) return null;
  if (log.total === '' || log.total === undefined || log.total === null) return null;
  const score = Number(log.score);
  const total = Number(log.total);
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return null;
  return {
    score,
    total,
    percent: Math.max(0, Math.min(100, Math.round((score / total) * 100))),
  };
}

export function getStudentUsageSummary(student, apps, period, nowMs = Date.now()) {
  const appUsage = {};
  const allPeriodLogs = [];

  for (const appName of Array.isArray(apps) ? apps : []) {
    const logs = filterLogsByPeriod(student?.usageData?.[appName], period, nowMs);
    const latestLog = getLatestUsageLog(logs);
    appUsage[appName] = {
      logs,
      latestLog,
      latestTimestamp: normalizeRawDate(latestLog?.rawDate),
      progress: getUsageProgress(latestLog),
      executionCount: logs.length,
    };
    allPeriodLogs.push(...logs);
  }

  const latestLog = getLatestUsageLog(allPeriodLogs);
  return {
    student,
    appUsage,
    latestLog,
    latestTimestamp: normalizeRawDate(latestLog?.rawDate),
    executionCount: allPeriodLogs.length,
  };
}

export function matchesStudentQuery(student, query) {
  const normalizedQuery = String(query || '').trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
  if (!normalizedQuery) return true;
  return [student?.name, student?.nameKana].some(value => (
    String(value || '').normalize('NFKC').toLocaleLowerCase('ja-JP').includes(normalizedQuery)
  ));
}

export function getSelectedAppStatus(summary, appName) {
  return summary?.appUsage?.[appName]?.executionCount > 0 ? 'unclassified' : 'unused';
}

export function filterUsageSummaries(summaries, { query = '', status = 'all', appName = '' } = {}) {
  return (Array.isArray(summaries) ? summaries : []).filter(summary => {
    if (!matchesStudentQuery(summary.student, query)) return false;
    if (status === 'all') return true;
    return getSelectedAppStatus(summary, appName) === status;
  });
}

function compareNullableTimestamps(left, right, direction) {
  const leftMissing = left === null;
  const rightMissing = right === null;
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing ? 1 : -1;
  }
  return direction === 'asc' ? left - right : right - left;
}

function compareNames(left, right) {
  const leftName = String(left.student?.nameKana || left.student?.name || '').normalize('NFKC');
  const rightName = String(right.student?.nameKana || right.student?.name || '').normalize('NFKC');
  const nameOrder = leftName.localeCompare(rightName, 'ja');
  if (nameOrder !== 0) return nameOrder;
  return String(left.student?.userId || '').localeCompare(String(right.student?.userId || ''), 'ja');
}

export function sortUsageSummaries(summaries, sortOrder, appName) {
  return [...(Array.isArray(summaries) ? summaries : [])].sort((left, right) => {
    if (sortOrder === 'name') return compareNames(left, right);
    const direction = sortOrder === 'latest-asc' ? 'asc' : 'desc';
    const dateOrder = compareNullableTimestamps(
      left.appUsage?.[appName]?.latestTimestamp ?? null,
      right.appUsage?.[appName]?.latestTimestamp ?? null,
      direction,
    );
    return dateOrder !== 0 ? dateOrder : compareNames(left, right);
  });
}

export function paginateItems(items, page, pageSize) {
  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const totalItems = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const startIndex = (safePage - 1) * safePageSize;
  return {
    items: (Array.isArray(items) ? items : []).slice(startIndex, startIndex + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    start: totalItems === 0 ? 0 : startIndex + 1,
    end: Math.min(startIndex + safePageSize, totalItems),
  };
}
