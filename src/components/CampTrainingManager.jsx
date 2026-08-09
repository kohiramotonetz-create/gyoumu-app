import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CAMP_DAYS, CAMP_SEASONS, CAMP_SUBJECTS, calculateCampTotal, normalizeCampCount } from '../utils/campTraining.js';

const SUBJECT_LABELS = { japanese: '国語', math: '数学', english: '英語', social: '社会', science: '理科' };
const TABLE_HEADERS = ['順位', '生徒コード', '生徒名', 'フリガナ', '教室', '前日比', '合計', '国語', '数学', '英語', '社会', '理科'];
const REQUEST_TIMEOUT_MS = 30000;

export default function CampTrainingManager({ GAS_URL, API_KEY, sessionToken, role, styles, onSessionExpired }) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 101 }, (_, index) => 2100 - index), []);
  const [year, setYear] = useState(currentYear);
  const [season, setSeason] = useState('夏');
  const [view, setView] = useState('ranking');
  const [rankingMode, setRankingMode] = useState('1');
  const [inputDay, setInputDay] = useState(1);
  const [rows, setRows] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loadFailed, setLoadFailed] = useState(false);
  const requestSequence = useRef(0);
  const activeRequest = useRef(null);

  const postAction = useCallback(async (action, payload = {}, signal) => {
    const response = await axios.post(GAS_URL, JSON.stringify({ action, apiKey: API_KEY, sessionToken, ...payload }), {
      headers: { 'Content-Type': 'text/plain' }, timeout: REQUEST_TIMEOUT_MS, signal
    });
    if (response.data?.result !== 'success') {
      if (response.data?.code === 'AUTHORIZATION_ERROR') onSessionExpired?.();
      throw new Error(response.data?.message || '処理に失敗しました。');
    }
    return response.data;
  }, [API_KEY, GAS_URL, onSessionExpired, sessionToken]);

  const loadCurrentView = useCallback(async () => {
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setLoadFailed(false);
    setMessage({ type: '', text: '' });
    try {
      if (view === 'participants') {
        const data = await postAction('getCampParticipants', { year, season }, controller.signal);
        if (sequence !== requestSequence.current) return;
        setParticipants(data.students || []);
        setSelectedIds(new Set((data.students || []).filter(student => student.participating).map(student => student.studentId)));
      } else if (view === 'input') {
        const data = await postAction('getCampTrainingInput', { year, season, day: inputDay }, controller.signal);
        if (sequence !== requestSequence.current) return;
        setRows(data.rows || []);
      } else {
        const data = await postAction('getCampTrainingRanking', { year, season, mode: rankingMode }, controller.signal);
        if (sequence !== requestSequence.current) return;
        setRows(data.rows || []);
      }
    } catch (error) {
      if (axios.isCancel(error) || sequence !== requestSequence.current) return;
      setLoadFailed(true);
      setMessage({ type: 'error', text: error.message });
      if (view === 'participants') {
        setParticipants([]);
        setSelectedIds(new Set());
      } else {
        setRows([]);
      }
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        activeRequest.current = null;
      }
    }
  }, [inputDay, postAction, rankingMode, season, view, year]);

  useEffect(() => {
    loadCurrentView();
    return () => activeRequest.current?.abort();
  }, [loadCurrentView]);

  const saveParticipants = async () => {
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      await postAction('updateCampParticipants', { year, season, participantIds: [...selectedIds] });
      await loadCurrentView();
      setMessage({ type: 'success', text: '合宿参加者を保存しました。' });
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  const updateCount = (studentId, subject, value) => setRows(current => current.map(row => row.studentId === studentId ? { ...row, [subject]: value } : row));

  const saveInput = async () => {
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      const entries = rows.map(row => {
        const normalized = { studentId: row.studentId };
        CAMP_SUBJECTS.forEach(subject => { normalized[subject] = normalizeCampCount(row[subject]); });
        return normalized;
      });
      await postAction('saveCampTrainingInput', { year, season, day: inputDay, entries });
      await loadCurrentView();
      setMessage({ type: 'success', text: '合宿特訓データを保存しました。' });
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  const renderTable = editable => <div className="camp-training-table-wrap"><table className="camp-training-table">
    <thead><tr>{TABLE_HEADERS.map(header => <th key={header}>{header}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.studentId}>
      <td>{row.rank || '―'}</td><td>{row.studentId}</td><td>{row.name}</td><td>{row.nameKana}</td><td>{row.school}</td><td>{row.rankChange || '―'}</td><td>{editable ? calculateCampTotal(row) : row.total}</td>
      {CAMP_SUBJECTS.map(subject => <td key={subject}>{editable ? <input className="camp-training-count" type="number" min="0" step="1" inputMode="numeric" disabled={saving} value={row[subject] ?? ''} onChange={event => updateCount(row.studentId, subject, event.target.value)} aria-label={`${row.name} ${SUBJECT_LABELS[subject]}`} /> : row[subject]}</td>)}
    </tr>)}</tbody>
  </table></div>;

  return <section className="camp-training-manager">
    <h2 style={styles.contentTitle}>🏕️ 合宿メニュー</h2>
    <div className="camp-training-controls">
      <label>年度<select value={year} disabled={saving} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{value}年度</option>)}</select></label>
      <label>季節<select value={season} disabled={saving} onChange={event => setSeason(event.target.value)}>{CAMP_SEASONS.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    <div className="camp-training-tabs"><button disabled={saving} className={view === 'ranking' ? 'active' : ''} onClick={() => setView('ranking')}>ランキング</button>{role === 'admin' && <button disabled={saving} className={view === 'participants' ? 'active' : ''} onClick={() => setView('participants')}>参加者設定</button>}{role === 'admin' && <button disabled={saving} className={view === 'input' ? 'active' : ''} onClick={() => setView('input')}>データ入力</button>}</div>
    {message.text && <div role={message.type === 'error' ? 'alert' : 'status'} className={`camp-training-message ${message.type}`}>{message.text}</div>}
    {view === 'ranking' && <><div className="camp-training-switches">{[...CAMP_DAYS.map(String), 'total'].map(value => <button key={value} disabled={saving} className={rankingMode === value ? 'active' : ''} onClick={() => setRankingMode(value)}>{value === 'total' ? '総合集計' : `${value}日目`}</button>)}</div>{!loading && rows.length > 0 && renderTable(false)}</>}
    {view === 'participants' && role === 'admin' && <>{!loading && participants.length > 0 && <div className="camp-participant-list">{participants.map(student => <label key={student.studentId}><input type="checkbox" disabled={saving} checked={selectedIds.has(student.studentId)} onChange={() => setSelectedIds(current => { const next = new Set(current); if (next.has(student.studentId)) next.delete(student.studentId); else next.add(student.studentId); return next; })} /><span>{student.studentId}</span><span>{student.name}</span><span>{student.nameKana}</span><span>{student.school}</span></label>)}</div>}<button style={styles.doneBtn} disabled={saving || loading || loadFailed} onClick={saveParticipants}>{saving ? '保存中...' : '参加者を保存'}</button></>}
    {view === 'input' && role === 'admin' && <><div className="camp-training-switches">{CAMP_DAYS.map(value => <button key={value} disabled={saving} className={inputDay === value ? 'active' : ''} onClick={() => setInputDay(value)}>{value}日目</button>)}</div>{!loading && rows.length > 0 && renderTable(true)}<button style={styles.doneBtn} disabled={saving || loading || rows.length === 0} onClick={saveInput}>{saving ? '保存中...' : '入力データを保存'}</button></>}
    {loading && <div className="camp-training-state">読み込み中...</div>}
    {!loading && ((view === 'participants' && participants.length === 0) || (view !== 'participants' && rows.length === 0)) && !message.text && <div className="camp-training-state">対象データがありません。</div>}
  </section>;
}
