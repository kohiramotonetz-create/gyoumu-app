import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { CAMP_DAYS, CAMP_SEASONS, CAMP_SUBJECTS, calculateCampTotal, getCampErrorMessage, getCampInputSignature, getCurrentFiscalYear, normalizeCampCount, shouldAutoLoadCampView } from '../utils/campTraining.js';
import { filterCampParticipants } from '../utils/studentAccountOrdering.js';

const SUBJECT_LABELS = { japanese: '国語', math: '数学', english: '英語', social: '社会', science: '理科' };
const TABLE_HEADERS = ['順位', '生徒コード', '生徒名', 'フリガナ', '教室', '前日比', '合計', '国語', '数学', '英語', '社会', '理科'];
const REQUEST_TIMEOUT_MS = 30000;

export default function CampTrainingManager({ GAS_URL, API_KEY, sessionToken, role, assignedSchools = [], styles, onSessionExpired }) {
  const currentFiscalYear = getCurrentFiscalYear();
  const [years, setYears] = useState([currentFiscalYear]);
  const [year, setYear] = useState(currentFiscalYear);
  const [yearsReady, setYearsReady] = useState(false);
  const [season, setSeason] = useState('夏');
  const [view, setView] = useState('ranking');
  const [rankingMode, setRankingMode] = useState('1');
  const [inputDay, setInputDay] = useState(1);
  const [rows, setRows] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [participantSchool, setParticipantSchool] = useState('');
  const [participantGrades, setParticipantGrades] = useState([]);
  const [participantNameQuery, setParticipantNameQuery] = useState('');
  const [displayedParticipantCondition, setDisplayedParticipantCondition] = useState(null);
  const [displayedInputCondition, setDisplayedInputCondition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loadFailed, setLoadFailed] = useState(false);
  const [inputBaseline, setInputBaseline] = useState(null);
  const [inputLoadingLabel, setInputLoadingLabel] = useState('入力データを読み込み中...');
  const requestSequence = useRef(0);
  const activeRequest = useRef(null);
  const participantSelectionContext = useRef('');
  const inputLoadedOnce = useRef(false);
  const saveInFlight = useRef(false);
  const inputDirty = displayedInputCondition !== null && inputBaseline !== null && getCampInputSignature(rows) !== inputBaseline;

  const filteredParticipants = useMemo(() => displayedParticipantCondition ? filterCampParticipants(participants, {
    ...displayedParticipantCondition,
    assignedSchools,
    nameQuery: participantNameQuery
  }) : [], [assignedSchools, displayedParticipantCondition, participantNameQuery, participants]);

  const postAction = useCallback(async (action, payload = {}, signal) => {
    const response = await axios.post(GAS_URL, JSON.stringify({ action, apiKey: API_KEY, sessionToken, ...payload }), {
      headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS, signal
    });
    if (response.data?.result !== 'success') {
      if (response.data?.code === 'AUTHORIZATION_ERROR') onSessionExpired?.();
      const error = new Error(getCampErrorMessage(response.data?.code, response.data?.message));
      error.code = response.data?.code;
      throw error;
    }
    return response.data;
  }, [API_KEY, GAS_URL, onSessionExpired, sessionToken]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setLoadFailed(false);
    setMessage({ type: '', text: '' });
    postAction('getCampAvailableYears', {}, controller.signal).then(data => {
      if (sequence !== requestSequence.current) return;
      const availableYears = Array.isArray(data.years) && data.years.length > 0 ? data.years : [currentFiscalYear];
      setYears(availableYears);
      setYear(availableYears[0]);
      setYearsReady(true);
    }).catch(error => {
      if (axios.isCancel(error) || sequence !== requestSequence.current) return;
      setLoadFailed(true);
      setMessage({ type: 'error', text: error.message });
    }).finally(() => {
      if (sequence === requestSequence.current) {
        setLoading(false);
        activeRequest.current = null;
      }
    });
    return () => controller.abort();
  }, [currentFiscalYear, postAction]);

  const loadCurrentView = useCallback(async (options = {}) => {
    if (!shouldAutoLoadCampView(view, yearsReady)) return;
    const loadingInput = view === 'input';
    const preserveInput = loadingInput && options.preserveInput === true;
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setLoadFailed(false);
    setMessage({ type: '', text: '' });
    if (loadingInput && !preserveInput) {
      setInputLoadingLabel(inputLoadedOnce.current ? '入力データを再取得中...' : '入力データを読み込み中...');
      setRows([]);
      setDisplayedInputCondition(null);
      setInputBaseline(null);
    } else if (loadingInput) {
      setInputLoadingLabel('保存済みの入力データを再取得中...');
    }
    try {
      const condition = { year, season, day: inputDay };
      const data = loadingInput
        ? await postAction('getCampTrainingInput', condition, controller.signal)
        : await postAction('getCampTrainingRanking', { year, season, mode: rankingMode }, controller.signal);
      if (sequence !== requestSequence.current) return;
      setRows(data.rows || []);
      if (loadingInput) {
        setDisplayedInputCondition(condition);
        setInputBaseline(getCampInputSignature(data.rows || []));
        inputLoadedOnce.current = true;
      }
    } catch (error) {
      if (axios.isCancel(error) || sequence !== requestSequence.current) return;
      setLoadFailed(true);
      setMessage({ type: 'error', text: error.message });
      if (!preserveInput) {
        setRows([]);
        if (loadingInput) setDisplayedInputCondition(null);
      } else {
        setMessage({ type: 'error', text: `保存済みデータを再取得できなかったため、未保存の入力を保持しています。${error.message}` });
      }
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        activeRequest.current = null;
      }
    }
  }, [inputDay, postAction, rankingMode, season, view, year, yearsReady]);

  const resetParticipantDisplay = () => {
    activeRequest.current?.abort();
    setParticipants([]);
    setDisplayedParticipantCondition(null);
    setMessage({ type: '', text: '' });
  };

  const resetInputDisplay = () => {
    activeRequest.current?.abort();
    setRows([]);
    setDisplayedInputCondition(null);
    setInputBaseline(null);
    setLoadFailed(false);
    setMessage({ type: '', text: '' });
  };

  const changeParticipantSchool = event => {
    setParticipantSchool(event.target.value);
    resetParticipantDisplay();
  };

  const changeParticipantGrades = grades => {
    setParticipantGrades(grades);
    resetParticipantDisplay();
  };

  const changeCampPeriod = update => {
    if (inputDirty || saving) return;
    update();
    participantSelectionContext.current = '';
    setSelectedIds(new Set());
    resetParticipantDisplay();
    resetInputDisplay();
  };

  const changeView = nextView => {
    if (nextView === view || inputDirty || saving) return;
    activeRequest.current?.abort();
    if (nextView === 'input') {
      setInputDay(1);
      inputLoadedOnce.current = false;
      setInputBaseline(null);
    }
    setView(nextView);
    setRows([]);
    setDisplayedInputCondition(null);
    setLoadFailed(false);
    setMessage({ type: '', text: '' });
  };

  const changeInputDay = day => {
    if (inputDirty || saving) return;
    setInputDay(day);
    resetInputDisplay();
  };

  const displayParticipants = async () => {
    if (!participantSchool || saving || loading) return;
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setLoadFailed(false);
    setMessage({ type: '', text: '' });
    try {
      const data = await postAction('getCampParticipants', { year, season }, controller.signal);
      if (sequence !== requestSequence.current) return;
      const students = data.students || [];
      const context = `${year}::${season}`;
      setParticipants(students);
      if (participantSelectionContext.current !== context) {
        setSelectedIds(new Set(students.filter(student => student.participating).map(student => student.studentId)));
        participantSelectionContext.current = context;
      }
      setDisplayedParticipantCondition({ school: participantSchool, grades: [...participantGrades] });
    } catch (error) {
      if (axios.isCancel(error) || sequence !== requestSequence.current) return;
      setLoadFailed(true);
      setParticipants([]);
      setDisplayedParticipantCondition(null);
      setMessage({ type: 'error', text: error.message });
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        activeRequest.current = null;
      }
    }
  };

  useEffect(() => {
    loadCurrentView();
    return () => activeRequest.current?.abort();
  }, [loadCurrentView]);

  const saveParticipants = async () => {
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      await postAction('updateCampParticipants', { year, season, participantIds: [...selectedIds] });
      setMessage({ type: 'success', text: '合宿参加者を保存しました。' });
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  const updateCount = (studentId, subject, value) => {
    setRows(current => current.map(row => row.studentId === studentId ? { ...row, [subject]: value } : row));
  };

  const discardInputChanges = async () => {
    if (!inputDirty || saving || loading) return;
    if (!window.confirm('未保存の入力内容を破棄して、保存済みの状態へ戻しますか？')) return;
    await loadCurrentView({ preserveInput: true });
  };

  const saveInput = async () => {
    if (saveInFlight.current || saving) return;
    saveInFlight.current = true;
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      const entries = rows.map(row => {
        const normalized = { studentId: row.studentId };
        CAMP_SUBJECTS.forEach(subject => { normalized[subject] = normalizeCampCount(row[subject]); });
        return normalized;
      });
      await postAction('saveCampTrainingInput', { year, season, day: inputDay, entries });
      setInputBaseline(getCampInputSignature(rows));
      try {
        const data = await postAction('getCampTrainingInput', { year, season, day: inputDay });
        setRows(data.rows || []);
        setDisplayedInputCondition({ year, season, day: inputDay });
        setInputBaseline(getCampInputSignature(data.rows || []));
        setLoadFailed(false);
        setMessage({ type: 'success', text: '合宿特訓データを保存しました。' });
      } catch (refreshError) {
        setLoadFailed(true);
        setMessage({ type: 'error', text: `保存は完了しましたが、保存結果を再取得できませんでした。二重保存せず「再試行」で表示を更新してください。${refreshError.message}` });
      }
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { saveInFlight.current = false; setSaving(false); }
  };

  const renderTable = editable => <div className="camp-training-table-wrap"><table className="camp-training-table">
    <thead><tr>{TABLE_HEADERS.map(header => <th key={header}>{header}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.studentId}>
      <td>{row.rank || '―'}</td><td>{row.studentId}</td><td>{row.name}</td><td>{row.nameKana}</td><td>{row.school}</td><td>{row.rankChange || '―'}</td><td>{editable ? (() => { try { return calculateCampTotal(row); } catch { return '―'; } })() : row.total}</td>
      {CAMP_SUBJECTS.map(subject => <td key={subject}>{editable ? <input className="camp-training-count" type="number" min="0" step="1" inputMode="numeric" disabled={saving} value={row[subject] ?? ''} onChange={event => updateCount(row.studentId, subject, event.target.value)} aria-label={`${row.name} ${SUBJECT_LABELS[subject]}`} /> : row[subject]}</td>)}
    </tr>)}</tbody>
  </table></div>;

  return <section className="camp-training-manager">
    <h2 style={styles.contentTitle}>🏕️ 合宿メニュー</h2>
    <div className="camp-training-controls">
      <label>年度<select value={year} disabled={saving || inputDirty} onChange={event => changeCampPeriod(() => setYear(Number(event.target.value)))}>{years.map(value => <option key={value} value={value}>{value}年度</option>)}</select></label>
      <label>季節<select value={season} disabled={saving || inputDirty} onChange={event => changeCampPeriod(() => setSeason(event.target.value))}>{CAMP_SEASONS.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    <div className="camp-training-tabs"><button disabled={saving || inputDirty} className={view === 'ranking' ? 'active' : ''} onClick={() => changeView('ranking')}>ランキング</button>{role === 'admin' && <button disabled={saving || inputDirty} className={view === 'participants' ? 'active' : ''} onClick={() => changeView('participants')}>参加者設定</button>}{role === 'admin' && <button disabled={saving || inputDirty} className={view === 'input' ? 'active' : ''} onClick={() => changeView('input')}>データ入力</button>}</div>
    {message.text && <div role={message.type === 'error' ? 'alert' : 'status'} className={`camp-training-message ${message.type}`}>{message.text}</div>}
    {view === 'ranking' && <><div className="camp-training-switches">{[...CAMP_DAYS.map(String), 'total'].map(value => <button key={value} disabled={saving} className={rankingMode === value ? 'active' : ''} onClick={() => setRankingMode(value)}>{value === 'total' ? '総合集計' : `${value}日目`}</button>)}</div>{!loading && rows.length > 0 && renderTable(false)}</>}
    {view === 'participants' && role === 'admin' && <><div className="camp-participant-filters">
      <label>校舎<SchoolSelect value={participantSchool} onChange={changeParticipantSchool} disabled={saving || loading} assignedSchools={assignedSchools} /></label>
      <label>学年<GradeSelect value={participantGrades} onChange={changeParticipantGrades} disabled={saving || loading} includeGroups={false} /></label>
      <label>氏名<input value={participantNameQuery} onChange={event => setParticipantNameQuery(event.target.value)} disabled={saving || !displayedParticipantCondition} placeholder="氏名で検索" /></label>
      <button type="button" className="camp-participant-display-button" style={{ ...styles.doneBtn, width: 'auto', padding: '9px 18px', border: '1px solid transparent', boxSizing: 'border-box' }} disabled={!participantSchool || saving || loading} onClick={displayParticipants}>{loading ? '読み込み中...' : '表示'}</button>
    </div>{!loading && displayedParticipantCondition && (filteredParticipants.length > 0 ? <div className="camp-participant-list">{filteredParticipants.map(student => <label key={student.studentId}><input type="checkbox" disabled={saving} checked={selectedIds.has(student.studentId)} onChange={() => setSelectedIds(current => { const next = new Set(current); if (next.has(student.studentId)) next.delete(student.studentId); else next.add(student.studentId); return next; })} /><span>{student.studentId}</span><span>{student.name}</span><span>{student.nameKana}</span><span>{student.school}</span><span>{student.grade}</span></label>)}</div> : <div className="camp-training-state">該当する生徒がいません。</div>)}<button style={styles.doneBtn} disabled={saving || loading || loadFailed || !displayedParticipantCondition} onClick={saveParticipants}>{saving ? '保存中...' : '参加者を保存'}</button></>}
    {view === 'input' && role === 'admin' && <><div className="camp-training-switches">{CAMP_DAYS.map(value => <button key={value} disabled={saving || inputDirty} className={inputDay === value ? 'active' : ''} onClick={() => changeInputDay(value)}>{value}日目</button>)}</div>{inputDirty && <div className="camp-training-state">未保存の入力があります。保存または変更の破棄を行ってください。</div>}{!loading && displayedInputCondition && (rows.length > 0 ? renderTable(true) : <div className="camp-training-empty"><div className="camp-training-state">この年度・季節には合宿参加者が登録されていません。<br />先に「参加者設定」で生徒を登録してください。</div><button type="button" style={styles.doneBtn} onClick={() => changeView('participants')}>参加者設定へ移動</button></div>)}{!loading && loadFailed && <button type="button" style={styles.doneBtn} onClick={() => loadCurrentView()}>再試行</button>}{displayedInputCondition && rows.length > 0 && <div className="camp-training-actions"><button style={styles.doneBtn} disabled={saving || loading || loadFailed} onClick={saveInput}>{saving ? '保存中...' : '入力データを保存'}</button>{inputDirty && <button type="button" className="camp-training-discard" disabled={saving || loading} onClick={discardInputChanges}>変更を破棄</button>}</div>}</>}
    {loading && <div className="camp-training-state">{view === 'input' ? inputLoadingLabel : '読み込み中...'}</div>}
    {!loading && view === 'ranking' && rows.length === 0 && !message.text && <div className="camp-training-state">対象データがありません。</div>}
  </section>;
}
