import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ONE_TO_ONE_SUBJECTS } from '../utils/oneToOneSubjects.js';
import { OneToOneSubjectProgress } from './common/OneToOneProgressDisplay.jsx';
import ProgressAxisLine from './common/ProgressAxisLine.jsx';
import { ensureKoToreProfileAxes, parseKoToreUnitsCsv } from '../utils/kotoreProfile.js';
import { ACADEMIC_PROFILE_SUBJECTS, buildAcademicChartData } from '../utils/academicProfile.js';
import './StudentProfileView.css';

const actions = {
  kotore: 'getStudentProfileKoTore',
  sukimakun: 'getStudentProfileSukimakun',
  oneToOne: 'getStudentProfileOneToOne',
  academic: 'getStudentProfileAcademicResults'
};
const labels = Object.fromEntries(ONE_TO_ONE_SUBJECTS.map(item => [item.subjectId, item.label]));
const card = { background: '#fff', border: '1px solid #dbe3ea', borderRadius: 10, padding: 18, boxShadow: '0 1px 3px #0001' };

export default function StudentProfileView({ userId, GAS_URL, API_KEY, sessionToken, onBack, onSessionExpired }) {
  const [summary, setSummary] = useState(null);
  const [summaryState, setSummaryState] = useState({ loading: true, error: '' });
  const [sections, setSections] = useState(Object.fromEntries(Object.keys(actions).map(key => [key, { loading: true, error: '', data: null }])));

  const request = useCallback(async (action, payload = {}) => {
    const response = await axios.post(GAS_URL, JSON.stringify({ action, apiKey: API_KEY, sessionToken, userId, ...payload }), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000 });
    if (response.data?.result !== 'success') {
      const error = new Error(response.data?.message || '取得できませんでした');
      error.code = response.data?.code;
      throw error;
    }
    return response.data;
  }, [API_KEY, GAS_URL, sessionToken, userId]);

  const loadSection = useCallback(async key => {
    setSections(value => ({ ...value, [key]: { loading: true, error: '', data: value[key]?.data || null } }));
    try {
      let payload = {};
      if (key === 'kotore') {
        const response = await fetch('/units.csv');
        if (!response.ok) throw new Error('個トレ単元を取得できませんでした');
        payload = { masterUnits: parseKoToreUnitsCsv(await response.text()) };
      }
      const responseData = await request(actions[key], payload);
      const data = key === 'kotore' ? ensureKoToreProfileAxes(responseData, payload.masterUnits) : responseData;
      setSections(value => ({ ...value, [key]: { loading: false, error: '', data } }));
    } catch (error) {
      if (error.code === 'AUTHORIZATION_ERROR') onSessionExpired?.();
      setSections(value => ({ ...value, [key]: { loading: false, error: error.message, data: null } }));
    }
  }, [onSessionExpired, request]);

  useEffect(() => {
    let active = true;
    setSummaryState({ loading: true, error: '' });
    request('getStudentProfileSummary').then(data => {
      if (!active) return;
      setSummary(data);
      setSummaryState({ loading: false, error: '' });
      Object.keys(actions).forEach(loadSection);
    }).catch(error => {
      if (!active) return;
      if (error.code === 'AUTHORIZATION_ERROR') onSessionExpired?.();
      setSummaryState({ loading: false, error: error.message });
    });
    return () => { active = false; };
  }, [loadSection, onSessionExpired, request]);

  const section = (key, title, render, className = '') => <section className={`student-profile__card ${className}`}><h2 className="student-profile__section-title">{title}</h2>{sections[key].loading ? <p role="status">読み込み中...</p> : sections[key].error ? <div role="alert"><p>{sections[key].error}</p><button type="button" onClick={() => loadSection(key)}>再試行</button></div> : render(sections[key].data)}</section>;
  if (summaryState.loading) return <div style={{ padding: 24 }}>基本情報を読み込み中...</div>;
  if (summaryState.error) return <div role="alert" style={{ ...card, margin: 20 }}><p>{summaryState.error}</p><button type="button" onClick={onBack}>元の一覧へ</button></div>;
  const student = summary.student;
  return <div className="student-profile">
    <button type="button" onClick={onBack} className="student-profile__back">← 元の一覧へ</button>
    <header className="student-profile__summary"><div><h1>{student.name}</h1><p>{student.nameKana}</p></div><div className="student-profile__meta"><span>{student.grade} / {student.school}</span><small>ID: {student.userId} / {student.enabled ? '有効' : '無効'}</small></div><div className="student-profile__subjects"><strong>1対1受講科目</strong><span>{summary.oneToOneSubjectIds.length ? summary.oneToOneSubjectIds.map(id => labels[id] || id).join(' / ') : '未登録'}</span></div></header>
    <div className="student-profile__learning-grid">
      {section('oneToOne', '1対1進捗', data => data.subjects?.length ? data.subjects.map(item => <article key={item.subjectId} className="student-profile__progress-item"><h3>{labels[item.subjectId] || item.subjectId}</h3><OneToOneSubjectProgress subjectId={item.subjectId} state={item.state} /></article>) : <p>受講科目は未登録です。</p>)}
      {section('kotore', '個トレ進捗', data => data.items?.length ? data.items.map(item => <KoToreProgress key={`${item.subject}:${item.textName}`} item={item} />) : <p>進捗は未登録です。</p>)}
    </div>
    {section('sukimakun', 'スキマ君進捗', data => <ContentList items={data.currentContents} />, 'student-profile__sukimakun')}
    {section('academic', '学校成績', data => data.schoolYears?.length ? <AcademicResults data={data} /> : <p>成績は未登録です。</p>, 'student-profile__academic')}
  </div>;
}

function KoToreProgress({ item }) {
  return <article className="student-profile__progress-item"><div className="student-profile__material-heading"><strong>{item.subject}</strong><span>{item.textName}</span></div><div className="student-profile__axis-scroll"><ProgressAxisLine axis={item.axis} currentOrder={item.unitOrder} color="#7c3aed" maxChapterLabels={6} formatUnit={unit => `${unit.page} ${unit.unitName}`} renderCurrent={unit => <><span>{unit.page}</span><strong>{unit.unitName}</strong></>} /></div><div className="student-profile__progress-footer"><small>最終登録：{item.lastRecordedAt || '-'}</small></div></article>;
}

function AcademicResults({ data }) {
  const tests = data.schoolYears.flatMap(year => year.tests.map(test => ({ ...test, schoolYear: year.schoolYear })));
  const [selectedTestId, setSelectedTestId] = useState(tests[0]?.testId || '');
  const selectedTest = tests.find(test => test.testId === selectedTestId) || tests[0];
  return <div className="student-profile__academic-grid"><div className="student-profile__academic-table-scroll"><table className="student-profile__academic-table"><thead><tr><th>年度</th><th>テスト名</th>{ACADEMIC_PROFILE_SUBJECTS.map(([key, label]) => <th key={key}>{label}</th>)}<th>合計</th></tr></thead><tbody>{tests.map(test => <tr key={test.testId} className={test.testId === selectedTest.testId ? 'is-selected' : ''}><td>{test.schoolYear}</td><td><button type="button" aria-pressed={test.testId === selectedTest.testId} onClick={() => setSelectedTestId(test.testId)}>{test.testName}</button></td>{ACADEMIC_PROFILE_SUBJECTS.map(([key]) => <td key={key}>{test.scores[key] === '' ? '－' : test.scores[key]}</td>)}<td>{test.total == null ? '－' : `${test.total} / ${test.maxScore * 9}`}</td></tr>)}</tbody></table></div><div className="student-profile__academic-chart"><h3>{selectedTest.schoolYear}年度 {selectedTest.testName}</h3><AcademicScoreChart test={selectedTest} /></div></div>;
}

function AcademicScoreChart({ test }) {
  const items = buildAcademicChartData(test);
  return <div style={{ overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'thin', marginTop: 8 }}><div role="img" aria-label={`${test.testName}の科目別得点。満点${test.maxScore}点`} style={{ minWidth: 500, height: 190, display: 'grid', gridTemplateColumns: '36px repeat(9, 1fr)', gap: 5, alignItems: 'end', borderBottom: '1px solid #94a3b8', padding: '12px 6px 0' }}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#64748b', fontSize: 10 }}><span>{test.maxScore}</span><span>0</span></div>{items.map(item => <div key={item.key} style={{ height: '100%', display: 'grid', gridTemplateRows: '1fr 22px', textAlign: 'center' }}><div style={{ display: 'flex', alignItems: 'end', justifyContent: 'center' }}>{item.score == null ? <span style={{ alignSelf: 'end', color: '#94a3b8', fontSize: 10, paddingBottom: 4 }}>未入力</span> : <div title={`${item.label} ${item.score}点`} style={{ width: '70%', minWidth: 22, height: `${Math.max(0, Math.min(100, item.score / item.maxScore * 100))}%`, minHeight: item.score === 0 ? 2 : undefined, borderRadius: '5px 5px 0 0', background: '#93c5fd', border: '1px solid #60a5fa', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: '#1e3a8a', fontSize: 10, fontWeight: 600 }}><span style={{ transform: 'translateY(-15px)' }}>{item.score}</span></div>}</div><strong style={{ fontSize: 10 }}>{item.label}</strong></div>)}</div></div>;
}

function ContentList({ title, items = [] }) {
  const used = items.filter(item => item.attemptCount > 0);
  const unused = items.filter(item => item.attemptCount <= 0);
  return <div>{title && <h3 style={{ fontSize: 15 }}>{title}</h3>}{items.length ? <><div className="student-profile__content-group"><h3>利用履歴あり</h3>{used.length ? <div className="student-profile__content-grid">{used.map(item => <article key={item.contentId} className="student-profile__content-card"><strong>{item.displayName}</strong><div className="student-profile__content-stats"><span>最終：{item.lastUsedAt || '-'}</span><span>直近：{item.latestScore} / {item.latestTotal}（{item.latestRate ?? '-'}%）</span><span>累計：{item.cumulativeScore} / {item.cumulativeTotal}（{item.cumulativeRate ?? '-'}%）</span><span>{item.attemptCount}回</span><small>最終モード：{item.latestMode || '-'}</small></div></article>)}</div> : <p className="student-profile__muted">利用履歴のあるコンテンツはありません。</p>}</div>{unused.length > 0 && <div className="student-profile__content-group"><h3>まだ利用履歴なし</h3><div className="student-profile__unused-grid">{unused.map(item => <div key={item.contentId} className="student-profile__unused-item"><strong>{item.displayName}</strong><span title="利用履歴はありません">未利用</span></div>)}</div></div>}</> : <p>対象コンテンツはありません。</p>}</div>;
}
