import { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import SchoolSelect from './common/SchoolSelect.jsx';
import GradeSelect from './common/GradeSelect.jsx';
import { getSukimakunPresetContentIds, replaceStudentContentIds } from '../utils/sukimakunPermissions.js';
import { compareStudentsByKana } from '../utils/studentAccountOrdering.js';
import StudentProfileLink from './common/StudentProfileLink.jsx';

const READ_API_TIMEOUT_MS = 30000;
const WRITE_API_TIMEOUT_MS = 15000;
const READ_RETRY_LIMIT = 1;
const NAME_COLUMN_WIDTH = 180;
const ID_COLUMN_WIDTH = 130;

const getStudentDisplayName = student => String(student?.name || '').trim() || '氏名未登録';

const areSameContentIds = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every(contentId => rightSet.has(contentId));
};

export default function SukimakunPermissionManager({
  GAS_URL,
  API_KEY,
  sessionToken,
  assignedSchools = [],
  styles,
  onSessionExpired
}) {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [query, setQuery] = useState('');
  const [contents, setContents] = useState([]);
  const [students, setStudents] = useState([]);
  const [editingByStudentId, setEditingByStudentId] = useState({});
  const [rowStatusByStudentId, setRowStatusByStudentId] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [sessionExpired, setSessionExpired] = useState(false);
  const fetchInProgressRef = useRef(false);

  const activeContents = useMemo(() => contents
    .filter(content => content.enabled === true)
    .sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder)), [contents]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = !normalizedQuery ? students : students.filter(student =>
      String(student.name || '').toLowerCase().includes(normalizedQuery) ||
      String(student.userId || '').toLowerCase().includes(normalizedQuery)
    );
    return [...matches].sort(compareStudentsByKana);
  }, [students, query]);

  const postAction = async (action, payload = {}, timeout = WRITE_API_TIMEOUT_MS) => {
    const response = await axios.post(GAS_URL, JSON.stringify({
      action,
      apiKey: API_KEY,
      sessionToken,
      ...payload
    }), {
      headers: { 'Content-Type': 'text/plain' },
      timeout
    });

    if (!response.data || typeof response.data !== 'object') {
      const error = new Error('サーバーから正しい形式の応答を受信できませんでした。');
      error.code = 'INVALID_RESPONSE';
      throw error;
    }
    if (response.data.result !== 'success') {
      const error = new Error(response.data?.message || '処理に失敗しました');
      error.code = response.data?.code;
      error.isApiError = true;
      throw error;
    }
    return response.data;
  };

  const getApiErrorMessage = (error, fallbackMessage) => {
    if (error?.code === 'AUTHORIZATION_ERROR') {
      setSessionExpired(true);
      setStatus({ type: 'error', message: '管理セッションが期限切れです。再ログインしてください。' });
      return '管理セッションが期限切れです。';
    }
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
      return '通信がタイムアウトしました。時間をおいて再度お試しください。';
    }
    if (error?.code === 'INVALID_RESPONSE') {
      return 'サーバーから正しい応答を受信できませんでした。再度お試しください。';
    }
    if (error?.code === 'ERR_NETWORK' || !error?.response) {
      return 'ネットワーク通信に失敗しました。接続を確認して再度お試しください。';
    }
    return error?.message || fallbackMessage;
  };

  const shouldRetryRead = error => !error?.isApiError &&
    error?.code !== 'AUTHORIZATION_ERROR' &&
    (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT' || error?.code === 'ERR_NETWORK');

  const fetchPermissionMatrix = async grade => {
    for (let attempt = 0; attempt <= READ_RETRY_LIMIT; attempt++) {
      try {
        return await postAction('getSukimakunPermissionMatrix', {
          school: selectedSchool,
          grade
        }, READ_API_TIMEOUT_MS);
      } catch (error) {
        if (attempt >= READ_RETRY_LIMIT || !shouldRetryRead(error)) throw error;
        setStatus({ type: 'loading', message: '通信を再試行しています...' });
      }
    }
  };

  const fetchPermissions = async () => {
    if (fetchInProgressRef.current) return;
    if (!selectedSchool || selectedGrades.length === 0) {
      setStatus({ type: 'error', message: '校舎と学年を選択してください。' });
      return;
    }
    fetchInProgressRef.current = true;
    setLoading(true);
    setSessionExpired(false);
    setStatus({ type: '', message: '' });
    try {
      const responses = [];
      for (let index = 0; index < selectedGrades.length; index++) {
        try {
          responses.push(await fetchPermissionMatrix(selectedGrades[index]));
        } catch (error) {
          error.isPartialGradeFailure = selectedGrades.length > 1;
          error.failedGrade = selectedGrades[index];
          throw error;
        }
      }
      const nextContents = Array.isArray(responses[0]?.contents) ? responses[0].contents : [];
      const getContentSignature = data => JSON.stringify((data.contents || []).map(content => content.contentId).sort());
      const contentSignature = getContentSignature({ contents: nextContents });
      if (responses.some(data => getContentSignature(data) !== contentSignature)) {
        throw new Error('学年ごとのコンテンツ一覧が一致しません。');
      }
      const studentMap = new Map();
      responses.forEach(data => {
        (Array.isArray(data.students) ? data.students : []).forEach(student => studentMap.set(student.userId, student));
      });
      const nextStudents = [...studentMap.values()];
      const activeContentIds = new Set(nextContents.filter(content => content.enabled === true).map(content => content.contentId));
      setContents(nextContents);
      setStudents(nextStudents);
      setEditingByStudentId(Object.fromEntries(nextStudents.map(student => [
        student.userId,
        (student.allowedContentIds || []).filter(contentId => activeContentIds.has(contentId))
      ])));
      setRowStatusByStudentId({});
      setStatus({
        type: 'success',
        message: nextStudents.length > 0
          ? `${nextStudents.length}名の設定を取得しました。`
          : '対象となる生徒がいません。'
      });
    } catch (error) {
      const message = error?.code === 'AUTHORIZATION_ERROR'
        ? getApiErrorMessage(error, '利用設定を取得できませんでした。')
        : error?.isPartialGradeFailure
          ? `${error.failedGrade}の情報を取得できませんでした。再度お試しください。`
          : getApiErrorMessage(error, '利用設定を取得できませんでした。');
      setStatus({ type: 'error', message });
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
    }
  };

  const toggleContent = (studentId, contentId) => {
    setEditingByStudentId(current => {
      const currentIds = current[studentId] || [];
      return {
        ...current,
        [studentId]: currentIds.includes(contentId)
          ? currentIds.filter(id => id !== contentId)
          : [...currentIds, contentId]
      };
    });
    setRowStatusByStudentId(current => ({ ...current, [studentId]: { type: '', message: '' } }));
  };

  const applyModePreset = (studentId, modeKey, modeLabel) => {
    const presetContentIds = getSukimakunPresetContentIds(activeContents, modeKey);
    setEditingByStudentId(current => replaceStudentContentIds(current, studentId, presetContentIds));
    setRowStatusByStudentId(current => ({
      ...current,
      [studentId]: { type: 'preset', message: `${modeLabel}を適用しました。内容を確認して「保存」を押してください。` }
    }));
  };

  const savePermissions = async student => {
    const studentId = student.userId;
    const editingContentIds = editingByStudentId[studentId] || [];
    const displayName = getStudentDisplayName(student);
    if (!window.confirm(`${displayName}さんのスキマ君利用設定を保存しますか？`)) return;

    setRowStatusByStudentId(current => ({ ...current, [studentId]: { type: 'saving', message: '保存中...' } }));
    try {
      const data = await postAction('updateSukimakunPermissions', {
        targetUserId: studentId,
        allowedContentIds: editingContentIds
      });
      const savedContentIds = Array.isArray(data.allowedContentIds) ? data.allowedContentIds : editingContentIds;
      setStudents(current => current.map(currentStudent =>
        currentStudent.userId === studentId
          ? { ...currentStudent, allowedContentIds: savedContentIds, permissionsInitialized: true }
          : currentStudent
      ));
      setEditingByStudentId(current => ({ ...current, [studentId]: savedContentIds }));
      setRowStatusByStudentId(current => ({ ...current, [studentId]: { type: 'success', message: '保存しました' } }));
    } catch (error) {
      setRowStatusByStudentId(current => ({
        ...current,
        [studentId]: { type: 'error', message: getApiErrorMessage(error, '保存できませんでした。') }
      }));
    }
  };

  const panelStyle = { background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' };
  const statusStyle = status.type === 'error'
    ? { color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca' }
    : { color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0' };
  const headerCellStyle = {
    zIndex: 10,
    minWidth: '132px',
    maxWidth: '180px',
    height: '68px',
    padding: '8px',
    borderRight: '1px solid #d1d5db',
    borderBottom: '2px solid #cbd5e1',
    background: '#f1f5f9',
    color: '#334155',
    fontSize: '12px',
    lineHeight: 1.35,
    textAlign: 'center',
    whiteSpace: 'normal',
    verticalAlign: 'middle',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={styles.contentTitle}>⚙️ スキマ君利用設定</h2>
      <p style={{ color: '#555', marginBottom: '16px' }}>生徒ごとに利用できるスキマ君コンテンツを設定します。</p>

      <div style={{ ...panelStyle, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end', marginBottom: '16px' }}>
        <label>
          <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>校舎</span>
          <SchoolSelect value={selectedSchool} onChange={event => setSelectedSchool(event.target.value)} assignedSchools={assignedSchools} style={styles.select} />
        </label>
        <label>
          <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>学年</span>
          <GradeSelect value={selectedGrades} onChange={setSelectedGrades} style={styles.select} />
        </label>
        <button onClick={fetchPermissions} disabled={loading || sessionExpired} style={styles.doneBtn}>
          {loading ? '読み込み中...' : '生徒一覧を取得'}
        </button>
        <label style={{ flex: '1 1 240px', minWidth: '220px' }}>
          <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>生徒検索</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="氏名またはID" style={{ ...styles.select, width: '100%', boxSizing: 'border-box' }} />
        </label>
      </div>

      {status.message && <div role="status" style={{ ...statusStyle, padding: '10px', borderRadius: '6px', marginBottom: '16px' }}>{status.message}</div>}
      {sessionExpired && <button onClick={onSessionExpired} style={{ ...styles.doneBtn, marginBottom: '16px' }}>ログイン画面へ戻る</button>}

      {students.length > 0 && (
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', color: '#475569', fontSize: '13px', borderBottom: '1px solid #e2e8f0' }}>
            表示 {filteredStudents.length}名／全{students.length}名 ・ 編集対象 {activeContents.length}コンテンツ
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%', background: '#fff' }}>
              <thead>
                <tr>
                  <th style={{ ...headerCellStyle, position: 'sticky', left: 0, zIndex: 30, minWidth: `${NAME_COLUMN_WIDTH}px`, width: `${NAME_COLUMN_WIDTH}px`, textAlign: 'left' }}>生徒名</th>
                  <th style={{ ...headerCellStyle, position: 'sticky', left: `${NAME_COLUMN_WIDTH}px`, zIndex: 30, minWidth: `${ID_COLUMN_WIDTH}px`, width: `${ID_COLUMN_WIDTH}px` }}>生徒ID</th>
                  <th style={{ ...headerCellStyle, width: '210px', minWidth: '210px', maxWidth: '210px' }}>モード一括設定</th>
                  {activeContents.map(content => (
                    <th key={content.contentId} title={content.displayName} style={headerCellStyle}>{content.displayName}</th>
                  ))}
                  <th style={{ ...headerCellStyle, minWidth: '170px' }}>保存</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => {
                  const editingContentIds = editingByStudentId[student.userId] || [];
                  const rowStatus = rowStatusByStudentId[student.userId] || { type: '', message: '' };
                  const isSaving = rowStatus.type === 'saving';
                  const isDirty = !areSameContentIds(editingContentIds, student.allowedContentIds || []);
                  const needsSave = isDirty || !student.permissionsInitialized;
                  const rowBackground = student.permissionsInitialized ? '#fff' : '#fffbeb';
                  return (
                    <tr key={student.userId} style={{ height: '58px', background: rowBackground }}>
                      <td style={{ position: 'sticky', left: 0, zIndex: 5, width: `${NAME_COLUMN_WIDTH}px`, minWidth: `${NAME_COLUMN_WIDTH}px`, padding: '8px 10px', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #e5e7eb', background: rowBackground, boxSizing: 'border-box' }}>
                        <div style={{ fontWeight: 'bold', color: student.name ? '#1f2937' : '#9a3412' }}><StudentProfileLink userId={student.userId} source="sukimakun-permissions">{getStudentDisplayName(student)}</StudentProfileLink></div>
                        {!student.permissionsInitialized && <span style={{ display: 'inline-block', marginTop: '3px', padding: '2px 6px', borderRadius: '999px', background: '#fef3c7', color: '#92400e', fontSize: '11px' }}>未設定・現在は全許可</span>}
                      </td>
                      <td style={{ position: 'sticky', left: `${NAME_COLUMN_WIDTH}px`, zIndex: 5, width: `${ID_COLUMN_WIDTH}px`, minWidth: `${ID_COLUMN_WIDTH}px`, padding: '8px', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #e5e7eb', background: rowBackground, color: '#64748b', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}>
                        {student.userId}
                      </td>
                      <td style={{ width: '210px', minWidth: '210px', maxWidth: '210px', padding: '7px 8px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'center', verticalAlign: 'middle', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => applyModePreset(student.userId, 'juniorHighMode', '中学生モード')} disabled={isSaving || sessionExpired} style={{ ...styles.doneBtn, width: 'auto', flex: '1 1 90px', margin: 0, padding: '6px 8px', fontSize: '12px', whiteSpace: 'nowrap' }}>中学生モード</button>
                          <button type="button" onClick={() => applyModePreset(student.userId, 'highSchoolMode', '高校生モード')} disabled={isSaving || sessionExpired} style={{ ...styles.doneBtn, width: 'auto', flex: '1 1 90px', margin: 0, padding: '6px 8px', fontSize: '12px', whiteSpace: 'nowrap' }}>高校生モード</button>
                        </div>
                        {rowStatus.type === 'preset' && <div role="status" style={{ marginTop: '4px', color: '#b45309', fontSize: '11px', lineHeight: 1.35 }}>{rowStatus.message}</div>}
                      </td>
                      {activeContents.map(content => (
                        <td key={content.contentId} style={{ minWidth: '132px', padding: '8px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'center', verticalAlign: 'middle', boxSizing: 'border-box' }}>
                          <input
                            type="checkbox"
                            aria-label={`${getStudentDisplayName(student)}の${content.displayName}`}
                            checked={editingContentIds.includes(content.contentId)}
                            onChange={() => toggleContent(student.userId, content.contentId)}
                            disabled={isSaving || sessionExpired}
                            style={{ width: '18px', height: '18px', cursor: isSaving || sessionExpired ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                      ))}
                      <td style={{ minWidth: '170px', padding: '7px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button onClick={() => savePermissions(student)} disabled={isSaving || sessionExpired || !needsSave} style={{ ...styles.doneBtn, padding: '7px 14px', opacity: !needsSave ? 0.55 : 1 }}>
                          {isSaving ? '保存中...' : '保存'}
                        </button>
                        {isDirty && !isSaving && <div style={{ marginTop: '3px', color: '#b45309', fontSize: '11px', fontWeight: 'bold' }}>未保存の変更</div>}
                        {rowStatus.message && rowStatus.type !== 'preset' && !isDirty && (
                          <div role="status" style={{ marginTop: '3px', color: rowStatus.type === 'error' ? '#b91c1c' : rowStatus.type === 'success' ? '#166534' : '#475569', fontSize: '11px' }}>
                            {rowStatus.message}
                          </div>
                        )}
                        {rowStatus.type === 'error' && isDirty && <div role="alert" style={{ marginTop: '3px', color: '#b91c1c', fontSize: '11px' }}>{rowStatus.message}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredStudents.length === 0 && <p style={{ color: '#666', padding: '16px' }}>該当する生徒はいません。</p>}
        </div>
      )}
    </div>
  );
}
