import { useMemo, useState } from 'react';
import axios from 'axios';
import UsageDetailView from './UsageDetailView.jsx';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import {
  APP_USAGE_PERIODS,
  APP_USAGE_SORT_OPTIONS,
  filterUsageSummaries,
  getSelectedAppStatus,
  getStudentUsageSummary,
  paginateItems,
  resolveAppUsageSchoolPayload,
  sortUsageSummaries,
} from '../utils/appUsage.js';
import './AppUsageTracker.css';

const LIST_PAGE_SIZES = [20, 50];
const CARD_PAGE_SIZES = [8, 16, 32];

function ClipboardIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5h6"/><path d="M9 3h6a2 2 0 0 1 2 2v1h2v15H5V6h2V5a2 2 0 0 1 2-2Z"/><path d="m9 13 2 2 4-4"/></svg>;
}

function RefreshIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66L20 8"/><path d="M20 3v5h-5"/></svg>;
}

function formatFetchedAt(timestamp) {
  if (!timestamp) return '未取得';
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(timestamp);
}

function formatLogDate(log) {
  return log?.date && log.date !== '-' ? log.date : '-';
}

function ProgressValue({ progress, compact = false }) {
  if (!progress) return <span className="app-usage-progress__empty">-</span>;
  return <div className={`app-usage-progress ${compact ? 'app-usage-progress--compact' : ''}`}>
    <span className="app-usage-progress__value">{progress.score} / {progress.total}</span>
    <span className="app-usage-progress__track" aria-hidden="true"><span style={{ width: `${progress.percent}%` }} /></span>
    {!compact && <span className="app-usage-progress__percent">{progress.percent}%</span>}
  </div>;
}

function Pagination({ result, onPageChange, pageSizeOptions, onPageSizeChange }) {
  return <div className="app-usage-pagination">
    <p>全{result.totalItems}件中 {result.start}～{result.end}件を表示</p>
    <div className="app-usage-pagination__controls" aria-label="ページ切り替え">
      <button type="button" onClick={() => onPageChange(result.page - 1)} disabled={result.page <= 1} aria-label="前のページ">‹</button>
      <span>{result.page} / {result.totalPages}</span>
      <button type="button" onClick={() => onPageChange(result.page + 1)} disabled={result.page >= result.totalPages} aria-label="次のページ">›</button>
    </div>
    <label>表示件数
      <select value={result.pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>
        {pageSizeOptions.map(size => <option key={size} value={size}>{size}件</option>)}
      </select>
    </label>
  </div>;
}

function ListUsageView({ summaries, apps, onSelectStudent, page, pageSize, onPageChange, onPageSizeChange }) {
  const result = paginateItems(summaries, page, pageSize);
  return <section className="app-usage-panel" aria-label="アプリ利用一覧">
    <div className="app-usage-table-scroll">
      <table className="app-usage-table">
        <thead>
          <tr>
            <th className="app-usage-table__student" rowSpan="2" scope="col">生徒名</th>
            <th className="app-usage-table__last" rowSpan="2" scope="col">全体の最終利用</th>
            {apps.map(appName => <th key={appName} colSpan="2" scope="colgroup">{appName}</th>)}
            <th rowSpan="2" scope="col">合計<br/><small>実施回数</small></th>
          </tr>
          <tr>
            {apps.flatMap(appName => [
              <th key={`${appName}-progress`} scope="col">最新結果</th>,
              <th key={`${appName}-date`} scope="col">最終利用</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {result.items.map(summary => <tr key={summary.student.userId || summary.student.name}>
            <th className="app-usage-table__student" scope="row">
              <button type="button" onClick={() => onSelectStudent(summary.student)}>{summary.student.name}</button>
              <span>{summary.student.school}・{summary.student.grade}</span>
            </th>
            <td className="app-usage-table__last">{formatLogDate(summary.latestLog)}</td>
            {apps.flatMap(appName => {
              const usage = summary.appUsage[appName];
              return [
                <td key={`${appName}-progress`}><ProgressValue progress={usage.progress} compact /></td>,
                <td key={`${appName}-date`}>{formatLogDate(usage.latestLog)}</td>,
              ];
            })}
            <td className="app-usage-table__count">{summary.executionCount}回</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <Pagination result={result} onPageChange={onPageChange} pageSizeOptions={LIST_PAGE_SIZES} onPageSizeChange={onPageSizeChange} />
    <div className="app-usage-legend" aria-label="表示内容の説明">
      <span><i className="app-usage-legend__dot app-usage-legend__dot--used"/>最新結果：選択期間内でrawDateが最新のscore / total</span>
      <span><i className="app-usage-legend__dot app-usage-legend__dot--unused"/>「-」：利用履歴なし、または日時・結果を確定できないログ</span>
    </div>
  </section>;
}

function CardUsageView({ summaries, selectedAppName, statusFilter, onStatusFilterChange, sortOrder, onSortOrderChange, onSelectStudent, page, pageSize, onPageChange, onPageSizeChange }) {
  const queryFiltered = filterUsageSummaries(summaries, { status: 'all', appName: selectedAppName });
  const unusedCount = queryFiltered.filter(summary => getSelectedAppStatus(summary, selectedAppName) === 'unused').length;
  const filtered = filterUsageSummaries(queryFiltered, { status: statusFilter, appName: selectedAppName });
  const sorted = sortUsageSummaries(filtered, sortOrder, selectedAppName);
  const result = paginateItems(sorted, page, pageSize);
  const statusItems = [
    { id: 'all', label: 'すべて', count: queryFiltered.length, enabled: true },
    { id: 'sufficient', label: '十分に利用している', count: null, enabled: false },
    { id: 'slightly-low', label: 'やや利用が少ない', count: null, enabled: false },
    { id: 'low', label: '利用が少ない・未利用が多い', count: null, enabled: false },
    { id: 'unused', label: '未利用', count: unusedCount, enabled: true },
  ];

  return <>
    <div className="app-usage-card-toolbar">
      <div className="app-usage-status-grid" aria-label="利用状況フィルター">
        {statusItems.map(item => <button
          key={item.id}
          type="button"
          className={`app-usage-status ${statusFilter === item.id ? 'app-usage-status--active' : ''}`}
          aria-pressed={statusFilter === item.id}
          aria-describedby={!item.enabled ? 'app-usage-status-note' : undefined}
          disabled={!item.enabled}
          onClick={() => onStatusFilterChange(item.id)}
        >
          <span>{item.label}</span>
          <strong>{item.count ?? '—'}</strong>
        </button>)}
      </div>
      <p id="app-usage-status-note" className="app-usage-status-note">十分／やや少ない／少ないの判定基準は業務仕様未確定のため集計していません。</p>
      <label className="app-usage-sort">並び替え
        <select value={sortOrder} onChange={event => onSortOrderChange(event.target.value)}>
          {APP_USAGE_SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </div>

    {queryFiltered.length > 0 && unusedCount === queryFiltered.length && <div className="app-usage-inline-message" role="status">選択期間内に利用履歴のある生徒はいません。全員を「未利用」として表示しています。</div>}

    <section className="app-usage-card-grid" aria-label={`${selectedAppName}の生徒別利用状況`}>
      {result.items.map(summary => {
        const usage = summary.appUsage[selectedAppName];
        const isUnused = usage.executionCount === 0;
        return <article className="app-usage-student-card" key={summary.student.userId || summary.student.name}>
          <div className="app-usage-student-card__heading">
            <div><h3>{summary.student.name}</h3><p>{summary.student.school}・{summary.student.grade}</p></div>
            <span className={`app-usage-badge ${isUnused ? 'app-usage-badge--unused' : 'app-usage-badge--unclassified'}`}>{isUnused ? '未利用' : '判定基準未設定'}</span>
          </div>
          <dl>
            <div><dt>最終利用</dt><dd>{formatLogDate(usage.latestLog)}</dd></div>
            <div><dt>期間内の実施回数</dt><dd>{usage.executionCount}回</dd></div>
            <div className="app-usage-student-card__progress"><dt>最新結果の達成率</dt><dd><ProgressValue progress={usage.progress} /></dd></div>
          </dl>
          <button type="button" className="app-usage-detail-link" onClick={() => onSelectStudent(summary.student)}>詳細を見る <span aria-hidden="true">→</span></button>
        </article>;
      })}
    </section>
    {result.totalItems === 0 && <div className="app-usage-empty">条件に一致する生徒はいません。</div>}
    <Pagination result={result} onPageChange={onPageChange} pageSizeOptions={CARD_PAGE_SIZES} onPageSizeChange={onPageSizeChange} />
  </>;
}

export default function AppUsageTracker({ styles, GAS_URL, API_KEY, assignedSchools = [] }) {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState([]);
  const [tableData, setTableData] = useState({ apps: [], students: [] });
  const [displayMode, setDisplayMode] = useState('list');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAppName, setSelectedAppName] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('latest-desc');
  const [listPage, setListPage] = useState(1);
  const [cardPage, setCardPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [cardPageSize, setCardPageSize] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchUsage = async () => {
    if (!selectedSchool || selectedGrade.length === 0) {
      setError('校舎と学年を選択してください。');
      return;
    }
    let schoolPayload;
    try {
      schoolPayload = resolveAppUsageSchoolPayload(selectedSchool, assignedSchools);
    } catch (schoolError) {
      setError(schoolError.message);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: 'getAppUsageMatrix',
        apiKey: API_KEY,
        school: schoolPayload,
        grade: selectedGrade.join(','),
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result !== 'success') throw new Error(response.data.message || 'データを取得できませんでした。');
      const apps = Array.isArray(response.data.apps) ? response.data.apps : [];
      const students = Array.isArray(response.data.students) ? response.data.students : [];
      setTableData({ apps, students });
      setSelectedAppName(current => apps.includes(current) ? current : (apps[0] || ''));
      setLastUpdatedAt(Date.now());
      setHasFetched(true);
      setListPage(1);
      setCardPage(1);
      setStatusFilter('all');
    } catch (requestError) {
      setError(requestError?.message || '通信エラーが発生しました。時間をおいて再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  const dataReferenceTime = lastUpdatedAt || Date.now();
  const summaries = useMemo(() => tableData.students.map(student => (
    getStudentUsageSummary(student, tableData.apps, selectedPeriod, dataReferenceTime)
  )), [tableData, selectedPeriod, dataReferenceTime]);
  const searchedSummaries = useMemo(() => filterUsageSummaries(summaries, { query: searchQuery }), [summaries, searchQuery]);
  const activeAppName = tableData.apps.includes(selectedAppName) ? selectedAppName : (tableData.apps[0] || '');

  if (selectedStudent) {
    return <UsageDetailView
      student={selectedStudent}
      apps={tableData.apps}
      onBack={() => setSelectedStudent(null)}
      styles={styles}
    />;
  }

  const resetPages = () => { setListPage(1); setCardPage(1); };
  const handleSearchChange = event => { setSearchQuery(event.target.value); resetPages(); };
  const handlePeriodChange = event => { setSelectedPeriod(event.target.value); setStatusFilter('all'); resetPages(); };
  const handleAppChange = event => { setSelectedAppName(event.target.value); setStatusFilter('all'); setCardPage(1); };

  return <div className="app-usage" aria-busy={loading}>
    <header className="app-usage-header">
      <div className="app-usage-header__title">
        <span className="app-usage-header__icon"><ClipboardIcon /></span>
        <div><h1>アプリ利用チェック</h1><p>生徒ごとのアプリ利用状況を、一覧またはカードで確認できます。</p></div>
      </div>
      <div className="app-usage-header__actions">
        <span>最終更新：{formatFetchedAt(lastUpdatedAt)}</span>
        <button type="button" onClick={fetchUsage} disabled={loading || !selectedSchool || selectedGrade.length === 0}>
          <RefreshIcon />{loading ? '更新中' : '更新'}
        </button>
      </div>
    </header>

    <section className="app-usage-filters" aria-label="表示条件">
      <label>校舎
        <SchoolSelect value={selectedSchool} onChange={event => { setSelectedSchool(event.target.value); resetPages(); }} assignedSchools={assignedSchools} />
      </label>
      <label>学年
        <GradeSelect value={selectedGrade} onChange={value => { setSelectedGrade(value); resetPages(); }} />
      </label>
      <label>期間
        <select value={selectedPeriod} onChange={handlePeriodChange}>
          {APP_USAGE_PERIODS.map(period => <option key={period.value} value={period.value}>{period.label}</option>)}
        </select>
      </label>
      <label>生徒検索
        <input type="search" value={searchQuery} onChange={handleSearchChange} placeholder="氏名・フリガナ" />
      </label>
      <button type="button" className="app-usage-filters__submit" onClick={fetchUsage} disabled={loading}>{loading ? '読み込み中' : '表示'}</button>
    </section>

    <div className="app-usage-toolbar">
      <div className="app-usage-display-switch">
        <span>表示形式</span>
        <div role="group" aria-label="表示形式">
          <button type="button" aria-pressed={displayMode === 'list'} onClick={() => setDisplayMode('list')}>一覧表示</button>
          <button type="button" aria-pressed={displayMode === 'card'} onClick={() => setDisplayMode('card')}>カード表示</button>
        </div>
      </div>
      {displayMode === 'card' && <label className="app-usage-app-select">表示アプリ
        <select value={activeAppName} onChange={handleAppChange} disabled={tableData.apps.length === 0}>
          {tableData.apps.length === 0 && <option value="">アプリなし</option>}
          {tableData.apps.map(appName => <option key={appName} value={appName}>{appName}</option>)}
        </select>
      </label>}
    </div>

    {loading && <div className="app-usage-loading" role="status" aria-live="polite"><span/>データを取得しています。</div>}
    {error && <div className="app-usage-error" role="alert"><span>{error}</span><button type="button" onClick={fetchUsage} disabled={loading || !selectedSchool || selectedGrade.length === 0}>再試行</button></div>}

    {!hasFetched && !loading && !error && <div className="app-usage-empty">校舎と学年を選択して「表示」を押してください。</div>}
    {hasFetched && tableData.students.length === 0 && <div className="app-usage-empty">選択条件に該当する生徒はいません。</div>}
    {hasFetched && tableData.students.length > 0 && tableData.apps.length === 0 && <div className="app-usage-empty">表示できるアプリがありません。</div>}
    {hasFetched && tableData.students.length > 0 && tableData.apps.length > 0 && searchedSummaries.length === 0 && <div className="app-usage-empty">検索条件に一致する生徒はいません。</div>}

    {hasFetched && tableData.apps.length > 0 && searchedSummaries.length > 0 && displayMode === 'list' && <ListUsageView
      summaries={searchedSummaries}
      apps={tableData.apps}
      onSelectStudent={setSelectedStudent}
      page={listPage}
      pageSize={listPageSize}
      onPageChange={setListPage}
      onPageSizeChange={size => { setListPageSize(size); setListPage(1); }}
    />}

    {hasFetched && tableData.apps.length > 0 && searchedSummaries.length > 0 && displayMode === 'card' && <CardUsageView
      summaries={searchedSummaries}
      selectedAppName={activeAppName}
      statusFilter={statusFilter}
      onStatusFilterChange={value => { setStatusFilter(value); setCardPage(1); }}
      sortOrder={sortOrder}
      onSortOrderChange={value => { setSortOrder(value); setCardPage(1); }}
      onSelectStudent={setSelectedStudent}
      page={cardPage}
      pageSize={cardPageSize}
      onPageChange={setCardPage}
      onPageSizeChange={size => { setCardPageSize(size); setCardPage(1); }}
    />}
  </div>;
}
