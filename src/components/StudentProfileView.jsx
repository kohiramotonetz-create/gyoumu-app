import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ONE_TO_ONE_SUBJECTS } from '../utils/oneToOneSubjects.js';
import { OneToOneSubjectProgress } from './common/OneToOneProgressDisplay.jsx';
import ProgressAxisLine from './common/ProgressAxisLine.jsx';
import { parseKoToreUnitsCsv } from '../utils/kotoreProfile.js';
import { ACADEMIC_PROFILE_SUBJECTS, buildAcademicChartData } from '../utils/academicProfile.js';

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
      const data = await request(actions[key], payload);
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

  const section = (key, title, render) => <section style={card}><h2 style={{ marginTop: 0, fontSize: 18 }}>{title}</h2>{sections[key].loading ? <p role="status">読み込み中...</p> : sections[key].error ? <div role="alert"><p>{sections[key].error}</p><button type="button" onClick={() => loadSection(key)}>再試行</button></div> : render(sections[key].data)}</section>;
  if (summaryState.loading) return <div style={{ padding: 24 }}>基本情報を読み込み中...</div>;
  if (summaryState.error) return <div role="alert" style={{ ...card, margin: 20 }}><p>{summaryState.error}</p><button type="button" onClick={onBack}>元の一覧へ</button></div>;
  const student = summary.student;
  return <div style={{ padding: 10, display: 'grid', gap: 16 }}>
    <button type="button" onClick={onBack} style={{ justifySelf: 'start' }}>← 元の一覧へ</button>
    <header style={{ ...card, background: '#f8fafc' }}><h1 style={{ margin: 0 }}>{student.name}</h1><p style={{ margin: '6px 0' }}>{student.nameKana}</p><p style={{ margin: 0 }}>{student.grade} / {student.school}</p><small>ID: {student.userId}</small><h2 style={{ fontSize: 15 }}>1対1受講科目</h2><p>{summary.oneToOneSubjectIds.length ? summary.oneToOneSubjectIds.map(id => labels[id] || id).join(' / ') : '未登録'}</p></header>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 16 }}>
      {section('kotore', '個トレ進捗', data => data.items?.length ? data.items.map(item => <KoToreProgress key={`${item.subject}:${item.textName}`} item={item} />) : <p>進捗は未登録です。</p>)}
      {section('sukimakun', 'スキマ君進捗', data => <ContentList items={data.currentContents} />)}
    </div>
    {section('oneToOne', '1対1進捗', data => data.subjects?.length ? data.subjects.map(item => <article key={item.subjectId} style={{ marginBottom: 18 }}><h3>{labels[item.subjectId] || item.subjectId}</h3><OneToOneSubjectProgress subjectId={item.subjectId} state={item.state} /></article>) : <p>受講科目は未登録です。</p>)}
    {section('academic', '学校成績', data => data.schoolYears?.length ? data.schoolYears.map(year => <section key={year.schoolYear}><h3>{year.schoolYear}年度</h3>{year.tests.map(test => <AcademicTestResult key={test.testId} test={test} />)}</section>) : <p>成績は未登録です。</p>)}
  </div>;
}

function KoToreProgress({ item }) {
  return <article style={{ padding: '8px 0 14px', borderBottom: '1px solid #e5e7eb' }}><strong>{item.subject}</strong><div>{item.textName}</div><div style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}><ProgressAxisLine axis={item.axis} currentOrder={item.unitOrder} color="#7c3aed" formatUnit={unit => `${unit.page} ${unit.unitName}`} renderCurrent={unit => <><span>{unit.page}</span><strong>{unit.unitName}</strong></>} /></div><small>最終登録：{item.lastRecordedAt || '-'}</small></article>;
}

function AcademicTestResult({ test }) {
  return <article style={{ marginBottom: 22 }}><strong>{test.testName}</strong><div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', minWidth: 720, width: '100%', marginTop: 8 }}><tbody><tr>{ACADEMIC_PROFILE_SUBJECTS.map(([key, label]) => <th key={key} style={{ padding: 6, border: '1px solid #ddd' }}>{label}</th>)}<th style={{ border: '1px solid #ddd' }}>合計</th></tr><tr>{ACADEMIC_PROFILE_SUBJECTS.map(([key]) => <td key={key} style={{ padding: 6, textAlign: 'center', border: '1px solid #ddd' }}>{test.scores[key] === '' ? '－' : test.scores[key]}</td>)}<td style={{ textAlign: 'center', border: '1px solid #ddd' }}>{test.total == null ? '－' : `${test.total} / ${test.maxScore * 9}`}</td></tr></tbody></table></div><AcademicScoreChart test={test} /></article>;
}

function AcademicScoreChart({ test }) {
  const items = buildAcademicChartData(test);
  return <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', marginTop: 12 }}><div role="img" aria-label={`${test.testName}の科目別得点。満点${test.maxScore}点`} style={{ minWidth: 620, height: 230, display: 'grid', gridTemplateColumns: '42px repeat(9, 1fr)', gap: 8, alignItems: 'end', borderBottom: '1px solid #94a3b8', padding: '12px 8px 0' }}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#64748b', fontSize: 11 }}><span>{test.maxScore}</span><span>0</span></div>{items.map(item => <div key={item.key} style={{ height: '100%', display: 'grid', gridTemplateRows: '1fr 24px', textAlign: 'center' }}><div style={{ display: 'flex', alignItems: 'end', justifyContent: 'center' }}>{item.score == null ? <span style={{ alignSelf: 'end', color: '#94a3b8', fontSize: 11, paddingBottom: 4 }}>未入力</span> : <div title={`${item.label} ${item.score}点`} style={{ width: '70%', minWidth: 28, height: `${Math.max(0, Math.min(100, item.score / item.maxScore * 100))}%`, minHeight: item.score === 0 ? 2 : undefined, borderRadius: '5px 5px 0 0', background: '#93c5fd', border: '1px solid #60a5fa', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: '#1e3a8a', fontSize: 11, fontWeight: 600 }}><span style={{ transform: 'translateY(-17px)' }}>{item.score}</span></div>}</div><strong style={{ fontSize: 11 }}>{item.label}</strong></div>)}</div></div>;
}

function ContentList({ title, items = [] }) {
  return <div>{title && <h3 style={{ fontSize: 15 }}>{title}</h3>}{items.length ? items.map(item => <article key={item.contentId} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}><strong>{item.displayName}</strong>{item.attemptCount > 0 ? <><div>最終利用：{item.lastUsedAt || '-'}</div><div>直近：{item.latestScore} / {item.latestTotal}（{item.latestRate ?? '-'}%）</div><div>実施：{item.attemptCount}回</div><div>累計：{item.cumulativeScore} / {item.cumulativeTotal}（{item.cumulativeRate ?? '-'}%）</div><small>最終モード：{item.latestMode || '-'}</small></> : <div>利用履歴はありません。</div>}</article>) : <p>対象コンテンツはありません。</p>}</div>;
}
