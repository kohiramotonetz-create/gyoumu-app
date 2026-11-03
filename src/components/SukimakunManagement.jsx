import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import SukimakunPermissionManager from './SukimakunPermissionManager.jsx';
import { canAccessSukimakunMissionSchool } from '../utils/sukimakunMissionAccess.js';
import { formatSukimakunMissionGrade, readSukimakunMissionResponse } from '../utils/sukimakunMissionResponse.js';
import { isPrivilegedStaffRole } from '../utils/roles.js';
import { buildSukimakunRegistrationHash, parseSukimakunHash } from '../utils/sukimakunNavigation.js';
import './AppUsageTracker.css';
import './KotoreAdmin.css';
import './SukimakunManagement.css';

const PREPARATION_NOTICE = '現在は学校・学年別の対象確認のみ利用できます。ミッションの登録・保存・配信機能は準備中です。';

const navigate = path => { window.location.hash = path; };

function MissionRegistrationFrame({ route, GAS_URL, API_KEY, sessionToken, onSessionExpired }) {
  const [state, setState] = useState({ loading: true, error: '', group: null, requiresReauthentication: false });
  useEffect(() => {
    const controller = new AbortController();
    axios.post(GAS_URL, JSON.stringify({ action: 'getSukimakunMissionGroups', apiKey: API_KEY, sessionToken, school: route.school, grades: [route.grade] }), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        readSukimakunMissionResponse(data);
        const group = data.groups?.find(item => item.attendingSchoolName === route.attendingSchoolName && item.grade.normalize('NFKC') === route.grade.normalize('NFKC'));
        if (!group) throw new Error('選択した校舎内に対象の学校・学年がありません。');
        setState({ loading: false, error: '', group, requiresReauthentication: false });
      }).catch(error => { if (!controller.signal.aborted) setState({ loading: false, error: error.message || '対象を確認できませんでした。', group: null, requiresReauthentication: Boolean(error.requiresReauthentication) }); });
    return () => controller.abort();
  }, [API_KEY, GAS_URL, route.attendingSchoolName, route.grade, route.school, sessionToken]);
  return <section className="sukimakun-registration">
    <button type="button" className="kotore-back-button" onClick={() => navigate('/sukimakun/missions')}>← ミッション管理へ戻る</button>
    <h1>ミッション登録・確認</h1>
    <p className="sukimakun-preparation">{PREPARATION_NOTICE}</p>
    {state.loading && <p role="status">対象の学校・学年を確認しています。</p>}
    {state.error && <div className="app-usage-error" role="alert">{state.error}{state.requiresReauthentication && <button type="button" onClick={onSessionExpired}>再ログイン</button>}</div>}
    {state.group && <div className="sukimakun-registration__panel"><h2>{state.group.attendingSchoolName}{'　'}{formatSukimakunMissionGrade(state.group.grade)}</h2><p>対象校舎：{state.group.schools.join('、')}</p><p>対象生徒：{state.group.studentCount}名</p><p>最終登録日：未登録</p></div>}
  </section>;
}

export default function SukimakunManagement({ role, GAS_URL, API_KEY, sessionToken, assignedSchools = [], styles, onSessionExpired }) {
  const [route, setRoute] = useState(() => parseSukimakunHash(window.location.hash));
  const [school, setSchool] = useState('');
  const [grades, setGrades] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const requestRef = useRef(null);
  useEffect(() => {
    const sync = () => setRoute(parseSukimakunHash(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('hashchange', sync); requestRef.current?.abort(); };
  }, []);
  if (!isPrivilegedStaffRole(role)) return <div role="alert" className="app-usage-error">スキマ君管理を利用する権限がありません。</div>;

  const fetchGroups = async () => {
    if (requestRef.current) return;
    if (!school || !grades.length) { setError('校舎と学年を選択してください。'); return; }
    if (!canAccessSukimakunMissionSchool(role, school, assignedSchools)) { setError('指定された校舎のミッション管理を利用する権限がありません。'); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true); setError(''); setResult(null); setExpired(false);
    try {
      const { data } = await axios.post(GAS_URL, JSON.stringify({ action: 'getSukimakunMissionGroups', apiKey: API_KEY, sessionToken, school, grades }), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000, signal: controller.signal });
      if (controller.signal.aborted) return;
      readSukimakunMissionResponse(data);
      setResult({ groups: data.groups, unsetSchoolCount: data.unsetSchoolCount, school });
    } catch (requestError) { if (!controller.signal.aborted) { setExpired(Boolean(requestError.requiresReauthentication)); setError(requestError.message || '通信に失敗しました。'); } }
    finally { if (!controller.signal.aborted) setLoading(false); requestRef.current = null; }
  };
  const resetResults = () => { setResult(null); setError(''); };
  if (route.view === 'permissions') return <div><button type="button" className="kotore-back-button" onClick={() => navigate('/sukimakun')}>← スキマ君管理へ戻る</button><SukimakunPermissionManager {...{ GAS_URL, API_KEY, sessionToken, assignedSchools, styles, onSessionExpired }} /></div>;
  if (route.view === 'register' && !canAccessSukimakunMissionSchool(role, route.school, assignedSchools)) return <div><p role="alert">指定された校舎のミッション管理を利用する権限がありません。</p><button type="button" onClick={() => navigate('/sukimakun/missions')}>ミッション管理へ戻る</button></div>;
  if (route.view === 'register') return <MissionRegistrationFrame key={window.location.hash} {...{ route, GAS_URL, API_KEY, sessionToken, onSessionExpired }} />;
  if (route.view === 'invalid') return <div><p role="alert">ページの指定が正しくありません。</p><button type="button" onClick={() => navigate('/sukimakun')}>スキマ君管理へ戻る</button></div>;
  if (route.view === 'home') return <section className="kotore-admin-home sukimakun-management" aria-labelledby="sukimakun-title">
    <header><h1 id="sukimakun-title">スキマ君管理</h1><p>スキマ君の利用設定と、学校・学年別の対象を確認できます。</p></header>
    <div className="kotore-admin-card-grid">
      <button type="button" className="kotore-admin-card" onClick={() => navigate('/sukimakun/permissions')}><span aria-hidden="true">⚙</span><strong>スキマ君利用設定</strong><small>設定可能</small><p>生徒ごとに利用できるコンテンツを設定します。</p><b aria-hidden="true">›</b></button>
      <button type="button" className="kotore-admin-card" onClick={() => navigate('/sukimakun/missions')}><span aria-hidden="true">◎</span><strong>スキマ君ミッション管理</strong><small>確認可能</small><p>{PREPARATION_NOTICE}</p><b aria-hidden="true">›</b></button>
    </div>
  </section>;
  return <section className="app-usage sukimakun-management" aria-busy={loading}>
    <button type="button" className="kotore-back-button" onClick={() => navigate('/sukimakun')}>← スキマ君管理へ戻る</button>
    <header className="app-usage-header"><div className="app-usage-header__title"><div><h1>スキマ君ミッション管理</h1><p>{role === 'admin' ? '全校舎' : '担当校舎'}の生徒を学校・学年ごとに表示します。</p></div></div></header>
    <p className="sukimakun-preparation">{PREPARATION_NOTICE}</p>
    <section className="app-usage-filters sukimakun-filters" aria-label="表示条件">
      <label>校舎<SchoolSelect assignedOnly={role !== 'admin'} showAssignedOptions={role !== 'admin'} showAllSchoolsOption={role === 'admin'} assignedSchools={assignedSchools} value={school} disabled={loading} onChange={event => { setSchool(event.target.value); resetResults(); }} /></label>
      <label>学年<GradeSelect value={grades} disabled={loading} onChange={value => { setGrades(value); resetResults(); }} /></label>
      <span className="sukimakun-filters__space" aria-hidden="true" />
      <button type="button" className="app-usage-filters__submit" disabled={loading} onClick={fetchGroups}>{loading ? '読み込み中…' : '表示'}</button>
    </section>
    {error && <div className="app-usage-error" role="alert">{error}{expired && <button type="button" onClick={onSessionExpired}>再ログイン</button>}</div>}
    {!result && !loading && !error && <div className="app-usage-empty">校舎と学年を選択して「表示」を押してください。</div>}
    {loading && <p role="status">学校情報を取得しています。</p>}
    {result && <><p role="status">学校未設定 {result.unsetSchoolCount}名</p><div className="app-usage-card-grid" aria-label="学校・学年別ミッション">
      {result.groups.map(group => <article className="app-usage-student-card" key={JSON.stringify([group.attendingSchoolName, group.grade])}>
        <div className="app-usage-student-card__heading"><div><h2>{group.attendingSchoolName}{'　'}{formatSukimakunMissionGrade(group.grade)}</h2><p>{group.studentCount}名</p></div></div>
        <dl><div><dt>最終登録日</dt><dd>未登録</dd></div></dl>
        <button type="button" className="app-usage-detail-link" onClick={() => { window.location.hash = buildSukimakunRegistrationHash(group, result.school); }}>ミッション登録・確認 <span aria-hidden="true">→</span></button>
      </article>)}
    </div>{result.groups.length === 0 && <div className="app-usage-empty">条件に一致する学校・学年はありません。</div>}</>}
  </section>;
}
