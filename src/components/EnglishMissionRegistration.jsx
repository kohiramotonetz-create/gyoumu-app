import { useEffect, useMemo, useRef, useState } from 'react';
import GradeSelect from './common/GradeSelect.jsx';
import { buildEnglishMissionWeeks, catalog, ENGLISH_MISSION_DUPLICATE_NOTICE, expandEnglishMissionRange, formatMissionPeriod, missionPeriod, newEnglishMissionWeek, resizeEnglishMissionWeeks, todayInTokyo, englishMissionTargetKey } from '../utils/englishMissionPlanning.js';
import './EnglishMissionRegistration.css';

function WeekEditor({ week, index, weekNumber = index + 1, startDate, onChange, confirm, disabled }) {
  const units = catalog.units.filter(unit => unit.grade === week.materialGrade);
  const unitNames = [...new Set(units.map(unit => unit.unit))];
  let selected = [], error = '', period = null;
  try { period = missionPeriod(startDate, index); } catch { /* The common date field reports this error. */ }
  if (week.startKey || week.endKey) {
    try { selected = expandEnglishMissionRange(week.startKey, week.endKey, week.materialGrade); } catch (caught) { error = caught.message; }
  }
  const startIndex = units.findIndex(unit => unit.key === week.startKey);
  const update = change => onChange({ ...week, ...change });
  const chooseGrade = async values => {
    if ((values[0] || '') === week.materialGrade) return;
    if (week.materialGrade && (week.startKey || week.endKey) && !(await confirm('教材学年を変更すると、この週の単元選択をクリアします。変更しますか？'))) return;
    update({ materialGrade: values[0] || '', startUnit: '', startKey: '', endUnit: '', endKey: '' });
  };
  const selector = (side, label) => {
    const isEnd = side === 'end', unitField = `${side}Unit`, keyField = `${side}Key`;
    return <fieldset className="english-mission-range"><legend>{label}</legend>
      <label>Unit<select aria-label={`第${weekNumber}週 ${label}Unit`} value={week[unitField]} disabled={disabled || !week.materialGrade} onChange={event => update({ [unitField]: event.target.value, [keyField]: '' })}>
        <option value="">選択してください</option>
        {unitNames.map(name => <option key={name} value={name} disabled={isEnd && startIndex >= 0 && units.findLastIndex(unit => unit.unit === name) < startIndex}>{name}</option>)}
      </select></label>
      <label>part・区分<select aria-label={`第${weekNumber}週 ${label}区分`} value={week[keyField]} disabled={disabled || !week[unitField]} onChange={event => update({ [keyField]: event.target.value })}>
        <option value="">選択してください</option>
        {units.filter(unit => unit.unit === week[unitField]).map(unit => <option key={unit.key} value={unit.key} disabled={isEnd && startIndex >= 0 && units.indexOf(unit) < startIndex}>{unit.section}</option>)}
      </select></label>
    </fieldset>;
  };
  return <article className="english-mission-week" aria-label={`第${weekNumber}週の設定`}>
    <header><h3>第{weekNumber}週</h3>{period && <p title={`${period.startDate} ～ ${period.endDate}`}>{formatMissionPeriod(period.startDate, period.endDate)}</p>}</header>
    {period && <dl className="english-mission-dates"><div><dt>開始日</dt><dd>{period.startDate}</dd></div><div><dt>終了日（自動）</dt><dd>{period.endDate}</dd></div></dl>}
    <label className="english-mission-grade">教材学年<GradeSelect value={week.materialGrade ? [week.materialGrade] : []} onChange={chooseGrade} disabled={disabled} includeGroups={false} allowedGrades={catalog.grades.map(g => g.grade)} /></label>
    <div className="english-mission-ranges">{selector('start', '開始')}{selector('end', '終了')}</div>
    {error && <p className="english-mission-validation" role="alert">{error}</p>}
    {selected.length ? <details className="english-mission-selected"><summary>{selected.length}単元・対象語句 {selected.reduce((sum, unit) => sum + unit.wordCount, 0)}件</summary><ol>{selected.map(unit => <li key={unit.key}>{unit.unit} {unit.section}<span>（{unit.wordCount}語句）</span></li>)}</ol></details> : !error && <p className="english-mission-hint">この週の教材学年と開始・終了単元を選択してください。</p>}
  </article>;
}

function WeekSummary({ week }) {
  const material = week.materials[0];
  const selected = material.unitKeys.map(key => catalog.units.find(unit => unit.key === key) || { key, unit: '', section: key });
  return <div className="english-mission-week-summary"><strong>第{week.weekNumber}週</strong><span title={`${week.startDate} ～ ${week.endDate}`}>{formatMissionPeriod(week.startDate, week.endDate)}</span><p>{material.materialGrade}{'　'}{selected[0].unit} {selected[0].section} ～ {selected.at(-1).unit} {selected.at(-1).section}</p><details><summary>選択単元 {selected.length}件・対象語句 {week.wordCount}件</summary><ol>{selected.map(unit => <li key={unit.key}>{unit.unit} {unit.section}</li>)}</ol></details></div>;
}

function MissionConfirmation({ message, week, onAnswer }) {
  const dialogRef = useRef(null);
  useEffect(() => { const dialog = dialogRef.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={dialogRef} className="english-mission-confirm" role="alertdialog" aria-labelledby="english-confirm-title" aria-describedby="english-confirm-message" onCancel={event => { event.preventDefault(); onAnswer(false); }}>
    <h3 id="english-confirm-title">確認</h3>
    <p id="english-confirm-message">{message}</p>
    {week && <><p>{week.target.attendingSchoolName}・{week.target.targetGrade}／英語</p><WeekSummary week={week} /></>}
    <div className="english-mission-actions">
      <button type="button" autoFocus onClick={() => onAnswer(false)}>キャンセル</button>
      <button type="button" className={week ? 'english-mission-danger-solid' : 'english-mission-primary'} onClick={() => onAnswer(true)}>{week ? '削除する' : 'OK'}</button>
    </div>
  </dialog>;
}

export default function EnglishMissionRegistration({ target, repository, localPreview = false }) {
  const [startDate, setStartDate] = useState(todayInTokyo);
  const [weeks, setWeeks] = useState(() => Array.from({ length: 4 }, () => newEnglishMissionWeek()));
  const [editing, setEditing] = useState(null), [editDraft, setEditDraft] = useState(null);
  const [review, setReview] = useState(null);
  const pendingKey = (localPreview ? 'english-mission-mock-pending:' : 'english-mission-gas-pending:') + englishMissionTargetKey(target);
  const [pending, setPending] = useState(() => { try { return JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch { return null; } });
  const retainPending = value => { setPending(value); try { if (value) sessionStorage.setItem(pendingKey, JSON.stringify({ target: value.target, operationId: value.operationId, mode: value.mode, missionId: value.missionId, expectedVersion: value.expectedVersion })); else sessionStorage.removeItem(pendingKey); } catch { /* The operation ID remains visible if browser storage is unavailable. */ } };
  const [confirmation, setConfirmation] = useState(null);
  const confirmationResolver = useRef(null), operationRef = useRef(false);
  useEffect(() => () => confirmationResolver.current?.(false), []);
  const confirm = (message, week) => new Promise(resolve => { confirmationResolver.current = resolve; setConfirmation({ message, week, resolve }); });
  const answerConfirmation = answer => { confirmation?.resolve(answer); confirmationResolver.current = null; setConfirmation(null); };
  const [registered, setRegistered] = useState([]), [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const draftResult = useMemo(() => {
    try {
      if (editing) { const week = buildEnglishMissionWeeks(editing.startDate, [editDraft])[0]; return { weeks: [{ ...week, weekNumber: editing.weekNumber, missionId: editing.missionId, expectedVersion: editing.version }], error: '' }; }
      return { weeks: buildEnglishMissionWeeks(startDate, weeks), error: '' };
    } catch (caught) { return { weeks: [], error: caught.message }; }
  }, [startDate, weeks, editing, editDraft]);
  const changeDraft = callback => { callback(); setReview(null); setNotice(''); setError(''); setConflicts([]); };
  const run = async callback => {
    if (operationRef.current) return;
    operationRef.current = true; setBusy(true); setError('');
    try { await callback(); } catch (caught) { setError(caught.code === 'LOCK_BUSY' ? '他の保存処理が実行中です。少し待ってから再試行してください。' : caught.message); setConflicts(caught.details?.conflicts || []); }
    finally { operationRef.current = false; setBusy(false); }
  };
  const reload = async () => { const result = await repository.list(target); const records = [...result.records, ...(result.relatedRecords || [])]; setRegistered(records); setLoaded(true); return records; };
  const resizeWeeks = async nextCount => {
    if (nextCount < weeks.length && weeks.slice(nextCount).some(week => week.materialGrade || week.startKey || week.endKey || week.startUnit || week.endUnit) && !(await confirm('削減する週の入力内容が失われます。週数を減らしますか？'))) return;
    changeDraft(() => setWeeks(resizeEnglishMissionWeeks(weeks, nextCount, () => true)));
  };
  const beginEdit = missionId => run(async () => {
    if ((editing || weeks.some(week => week.startKey || week.endKey)) && !(await confirm('入力中の内容は保存されません。登録済みの週を読み込みますか？'))) return;
    const current = (await reload()).find(item => item.missionId === missionId);
    if (!current) throw Error('登録内容が変わっています。一覧を再取得してください。');
    const m = current.materials[0], first = catalog.units.find(u => u.key === m.startUnitKey), last = catalog.units.find(u => u.key === m.endUnitKey);
    if (!first || !last || current.catalogVersion !== catalog.version) throw Error('登録済み教材の版を確認してください。');
    setEditing(current); setEditDraft({ ...newEnglishMissionWeek(), materialGrade: m.materialGrade, startKey: m.startUnitKey, endKey: m.endUnitKey, startUnit: first.unit, endUnit: last.unit });
    setReview(null); setNotice(''); setConflicts([]);
  });
  const prepare = () => run(async () => {
    setNotice(''); setConflicts([]);
    if (draftResult.error) throw Error(draftResult.error);
    const request = { target: editing?.target || target, weeks: draftResult.weeks, mode: editing ? 'update' : 'create', operationId: crypto.randomUUID() };
    const inspection = await repository.prepare(request);
    if (!inspection.canSave) { const error = new Error('登録期間が重複しています。指定した期間には、すでに英語ミッションが登録されています。新規登録はできません。登録済みミッションの内容を変更してください。'); error.details = inspection; try { await reload(); } catch { /* The conflict already identifies the affected registrations. */ } throw error; }
    setReview({ ...request, expectedRevision: inspection.revision, confirmationToken: inspection.confirmationToken, duplicates: inspection.duplicates });
  });
  const confirmSaved = async (result, request) => {
    const fresh = await repository.list(request.target);
    if (result.state !== 'COMMITTED' || result.operationId !== request.operationId || !result.records.length || result.records.some(saved => !fresh.records.some(record => record.missionId === saved.missionId && record.version >= saved.version))) throw Error('保存後の再取得で結果を確認できません。操作IDから状態を確認してください。');
    await reload(); retainPending(null); setReview(null); setEditing(null); setEditDraft(null);
    setNotice(`${result.records.length}週を${localPreview ? "ローカル" : "ミッション管理"}に${request.mode === 'update' ? '更新' : '登録'}し、再取得で確認しました。`);
  };
  const save = () => run(async () => {
    if (!review || pending) return;
    if (review.duplicates.length && !(await confirm(ENGLISH_MISSION_DUPLICATE_NOTICE))) { setReview(null); return; }
    const { duplicates, ...body } = review;
    const request = { ...body, duplicatesAcknowledged: duplicates.length > 0 };
    retainPending(request);
    let result;
    try { result = await (request.mode === 'update' ? repository.updateMission(request) : repository.saveBatch(request)); }
    catch (caught) {
      if (['TRANSPORT_UNKNOWN', 'OUTCOME_UNKNOWN', 'INVALID_RESPONSE'].includes(caught.code)) { setReview(null); throw caught; }
      retainPending(null); setReview(null); throw caught;
    }
    try { await confirmSaved(result, request); }
    catch { setReview(null); throw Error('保存後の確認が完了していません。操作IDから状態を確認してください。再登録は行わないでください。'); }
  });
  const confirmDeleted = async (result, request) => {
    const [record] = result.records;
    if (result.state !== 'COMMITTED' || result.operationId !== request.operationId || result.records.length !== 1
      || record.missionId !== request.missionId || record.status !== 'DELETED' || record.version !== request.expectedVersion + 1
      || englishMissionTargetKey(record.target) !== englishMissionTargetKey(request.target)) {
      throw Error('削除結果を確認できません。操作IDから状態を確認してください。');
    }
    const records = await reload();
    if (records.some(week => week.missionId === request.missionId)) {
      throw Error('削除後の一覧を確認できません。操作IDから状態を確認してください。');
    }
    retainPending(null);
    setReview(null);
    if (editing?.missionId === request.missionId) { setEditing(null); setEditDraft(null); }
    setConflicts([]);
    setNotice(`第${record.weekNumber}週を削除し、再取得で確認しました。`);
  };
  const deleteWeek = week => run(async () => {
    if (pending || !(await confirm('この週のミッションを削除しますか？', week))) return;
    const request = { target: week.target, missionId: week.missionId, expectedVersion: week.version, operationId: crypto.randomUUID() };
    const operation = { ...request, mode: 'delete' };
    setNotice('');
    retainPending(operation);
    let result;
    try { result = await repository.deleteMission(request); }
    catch (caught) {
      if (!['TRANSPORT_UNKNOWN', 'OUTCOME_UNKNOWN', 'INVALID_RESPONSE'].includes(caught.code)) retainPending(null);
      throw caught;
    }
    await confirmDeleted(result, operation);
  });
  const checkPending = () => run(async () => {
    const result = await repository.getOperationStatus({ target: pending.target, operationId: pending.operationId });
    if (result.state === 'COMMITTED') {
      if (pending.mode === 'delete') await confirmDeleted(result, pending);
      else await confirmSaved(result, pending);
    } else if (result.state === 'ABORTED') {
      if (pending.mode === 'delete') await reload();
      retainPending(null);
      setNotice(pending.mode === 'delete' ? '対象週の削除は確定していません。最新の一覧を取得しました。' : '全週とも有効化されていないことを確認しました。入力内容を再確認して登録できます。');
    }
    else setNotice(`保存状態：${result.state}。重複登録を避けるため再送せず、管理者に操作IDを伝えて状態確認を依頼してください。`);
  });
  const disabled = busy || Boolean(pending);
  return <section className="english-mission" aria-labelledby="english-mission-title" aria-busy={busy}>
    {confirmation && <MissionConfirmation message={confirmation.message} week={confirmation.week} onAnswer={answerConfirmation} />}
    <header className="english-mission-heading"><div><p className="english-mission-eyebrow">学校・学年別ミッション</p><h2 id="english-mission-title">英語ミッション設定</h2></div><span className="english-mission-mock-tag">{localPreview ? 'ローカル検証用' : '英語'}</span></header>
    <p className="english-mission-mock-notice">{!localPreview ? '学校・学年別に英語ミッションを保存します。' : 'このPCに保存します。ブラウザを閉じたりサーバーを再起動したりしても残る、検証用のデータです。'}</p>
    <p className="english-mission-hint">教科：英語。各週の教材学年は、対象生徒の学年に関係なく選択できます。</p>
    {error && <p role="alert" className="app-usage-error">{error}</p>}
    {conflicts.length > 0 && <div className="english-mission-conflicts"><p>重複する登録期間</p>{conflicts.map((c, i) => <p key={i}>{c.startDate} ～ {c.endDate}{c.missionId && <button type="button" disabled={disabled} onClick={() => beginEdit(c.missionId)}>この登録を編集</button>}</p>)}</div>}
    {notice && <p role="status" className="english-mission-success">{notice}</p>}
    {pending && <section className="english-mission-pending" role="status"><h3>{pending.mode === 'delete' ? '削除結果の確認' : '保存結果の確認'}</h3>{busy && <p>{pending.mode === 'delete' ? '削除処理中…' : '保存処理中…'}</p>}<p>状態が確定するまで新しい保存は行いません。時間がかかる場合は、この画面でお待ちください。</p><p className="english-mission-record-id">操作ID：{pending.operationId}</p><button type="button" disabled={busy} onClick={checkPending}>操作IDから保存状態を確認</button></section>}
    {!pending && (review ? <section className="english-mission-review" aria-labelledby="english-mission-review-title"><h3 id="english-mission-review-title">{editing ? '更新' : '登録'}内容の確認（{review.weeks.length}週）</h3><p>対象：{review.target.attendingSchoolName}・{review.target.targetGrade}／英語</p><details><summary>対象校舎範囲：{review.target.scopeSchools.length}校</summary><p>{review.target.scopeSchools.join('、')}</p></details>{review.weeks.map(week => <WeekSummary key={week.weekNumber} week={week} />)}<div className="english-mission-actions"><button type="button" disabled={busy} onClick={() => setReview(null)}>編集画面へ戻る</button><button type="button" className="english-mission-primary" disabled={busy} onClick={save}>{busy ? '保存処理中…' : editing ? '変更を保存' : 'まとめて登録'}</button></div></section>
      : <>{editing ? <section className="english-mission-edit-heading"><h3>登録済みの第{editing.weekNumber}週を編集</h3><p>実施期間は固定です。更新版：{editing.version}</p><details><summary>対象校舎範囲：{editing.target.scopeSchools.length}校</summary><p>{editing.target.scopeSchools.join('、')}</p></details><button type="button" disabled={busy} onClick={() => { setEditing(null); setEditDraft(null); setReview(null); setError(''); }}>編集をキャンセル</button><WeekEditor week={editDraft} index={0} weekNumber={editing.weekNumber} startDate={editing.startDate} disabled={disabled} confirm={confirm} onChange={value => changeDraft(() => setEditDraft(value))} /></section> : <><fieldset className="english-mission-common" disabled={disabled}><legend>共通設定</legend><label>第1週の開始日<input type="date" value={startDate} onInput={event => changeDraft(() => setStartDate(event.currentTarget.value))} onChange={event => changeDraft(() => setStartDate(event.target.value))} /></label><div><span className="english-mission-label">設定週数</span><div className="english-mission-counter"><button type="button" aria-label="設定週数を減らす" disabled={weeks.length <= 1} onClick={() => resizeWeeks(weeks.length - 1)}>−</button><output aria-label="設定週数">{weeks.length}週間</output><button type="button" aria-label="設定週数を増やす" onClick={() => resizeWeeks(weeks.length + 1)}>＋</button></div></div><p>開始日を含む7日間です。第2週以降の日程は自動設定されます。</p></fieldset>
        {weeks.map((week, index) => <WeekEditor key={week.draftId} week={week} index={index} startDate={startDate} disabled={disabled} confirm={confirm} onChange={value => changeDraft(() => setWeeks(current => current.map((item, i) => i === index ? value : item)))} />)}</>}
        <div className="english-mission-actions"><p className="english-mission-hint">同じ単元の復習登録は確認後に許可します。登録期間の重複は保存できません。</p><button type="button" className="english-mission-primary" disabled={disabled} onClick={prepare}>{editing ? '変更内容を確認' : '全週の登録内容を確認'}</button></div></>)}
    <section className="english-mission-registered" aria-labelledby="english-mission-registered-title"><header><h3 id="english-mission-registered-title">{localPreview ? 'ローカル登録済みミッション' : '登録済みミッション'}</h3><button type="button" disabled={busy} onClick={() => run(reload)}>登録済みを取得</button></header>{!loaded ? <p>「登録済みを取得」で、現在の権限で閲覧できる登録を確認できます。</p> : registered.length === 0 ? <p>{localPreview ? 'この対象グループのローカル登録はありません。' : 'この対象グループの登録はありません。'}</p> : registered.map(week => <article key={week.missionId}><WeekSummary week={week} /><details><summary>対象校舎範囲：{week.target.scopeSchools.length}校</summary><p>{week.target.scopeSchools.join('、')}</p></details><p>更新日時：{new Date(week.updatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}／更新版：{week.version}</p><p className="english-mission-record-id">登録ID：{week.missionId}</p><div className="english-mission-row-actions">
      <button type="button" disabled={disabled} onClick={() => beginEdit(week.missionId)}>第{week.weekNumber}週を編集</button>
      <button type="button" className="english-mission-danger" disabled={disabled} aria-label={`第${week.weekNumber}週を削除（${week.startDate}）`} onClick={() => deleteWeek(week)}>削除</button>
    </div></article>)}</section>
  </section>;
}
