import { useMemo, useState } from 'react';
import axios from 'axios';

const API_TIMEOUT_MS = 15000;
const GRADE_OPTIONS = ['小４', '小５', '小６', '中１', '中２', '中３', '高１', '高２', '高３', '一貫中１', '一貫中２', '一貫中３'];

export default function SukimakunPermissionManager({
  GAS_URL,
  API_KEY,
  sessionToken,
  schools = [],
  styles,
  onSessionExpired
}) {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [query, setQuery] = useState('');
  const [contents, setContents] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [editingContentIds, setEditingContentIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [sessionExpired, setSessionExpired] = useState(false);

  const selectedStudent = students.find(student => student.userId === selectedStudentId) || null;
  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return students;
    return students.filter(student =>
      String(student.name || '').toLowerCase().includes(normalizedQuery) ||
      String(student.userId || '').toLowerCase().includes(normalizedQuery)
    );
  }, [students, query]);

  const postAction = async (action, payload = {}) => {
    const response = await axios.post(GAS_URL, JSON.stringify({
      action,
      apiKey: API_KEY,
      sessionToken,
      ...payload
    }), {
      headers: { 'Content-Type': 'text/plain' },
      timeout: API_TIMEOUT_MS
    });

    if (response.data?.result !== 'success') {
      const error = new Error(response.data?.message || '処理に失敗しました');
      error.code = response.data?.code;
      throw error;
    }
    return response.data;
  };

  const handleApiError = (error, fallbackMessage) => {
    if (error?.code === 'AUTHORIZATION_ERROR') {
      setSessionExpired(true);
      setStatus({ type: 'error', message: '管理セッションが期限切れです。再ログインしてください。' });
      return;
    }
    if (error?.code === 'ECONNABORTED') {
      setStatus({ type: 'error', message: '通信がタイムアウトしました。時間をおいて再度お試しください。' });
      return;
    }
    setStatus({ type: 'error', message: error?.message || fallbackMessage });
  };

  const fetchPermissions = async () => {
    if (!selectedSchool || !selectedGrade) {
      setStatus({ type: 'error', message: '校舎と学年を選択してください。' });
      return;
    }
    setLoading(true);
    setSessionExpired(false);
    setStatus({ type: '', message: '' });
    try {
      const data = await postAction('getSukimakunPermissionMatrix', {
        school: selectedSchool,
        grade: selectedGrade
      });
      setContents(data.contents || []);
      setStudents(data.students || []);
      setSelectedStudentId('');
      setEditingContentIds([]);
      setStatus({ type: 'success', message: `${(data.students || []).length}名の設定を取得しました。` });
    } catch (error) {
      handleApiError(error, '利用設定を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = student => {
    setSelectedStudentId(student.userId);
    setEditingContentIds([...(student.allowedContentIds || [])]);
    setStatus({ type: '', message: '' });
  };

  const toggleContent = contentId => {
    setEditingContentIds(current =>
      current.includes(contentId)
        ? current.filter(id => id !== contentId)
        : [...current, contentId]
    );
  };

  const savePermissions = async () => {
    if (!selectedStudent) return;
    if (!window.confirm(`${selectedStudent.name}さんのスキマ君利用設定を保存しますか？`)) return;
    setSaving(true);
    setStatus({ type: '', message: '' });
    try {
      const data = await postAction('updateSukimakunPermissions', {
        targetUserId: selectedStudent.userId,
        allowedContentIds: editingContentIds
      });
      setStudents(current => current.map(student =>
        student.userId === selectedStudent.userId
          ? { ...student, allowedContentIds: data.allowedContentIds || [], permissionsInitialized: true }
          : student
      ));
      setEditingContentIds(data.allowedContentIds || []);
      setStatus({ type: 'success', message: '利用設定を保存しました。' });
    } catch (error) {
      handleApiError(error, '利用設定を保存できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const panelStyle = { background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' };
  const statusStyle = status.type === 'error'
    ? { color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca' }
    : { color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0' };

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={styles.contentTitle}>⚙️ スキマ君利用設定</h2>
      <p style={{ color: '#555', marginBottom: '16px' }}>生徒ごとに利用できるスキマ君コンテンツを設定します。</p>

      <div style={{ ...panelStyle, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end', marginBottom: '16px' }}>
        <label>
          <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>校舎</span>
          <select value={selectedSchool} onChange={event => setSelectedSchool(event.target.value)} style={styles.select}>
            <option value="">選択してください</option>
            {[...new Set(schools)].filter(Boolean).map(schoolName => <option key={schoolName} value={schoolName}>{schoolName}</option>)}
          </select>
        </label>
        <label>
          <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>学年</span>
          <select value={selectedGrade} onChange={event => setSelectedGrade(event.target.value)} style={styles.select}>
            <option value="">選択してください</option>
            {GRADE_OPTIONS.map(grade => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </label>
        <button onClick={fetchPermissions} disabled={loading || sessionExpired} style={styles.doneBtn}>
          {loading ? '読み込み中...' : '生徒一覧を取得'}
        </button>
      </div>

      {status.message && <div role="status" style={{ ...statusStyle, padding: '10px', borderRadius: '6px', marginBottom: '16px' }}>{status.message}</div>}
      {sessionExpired && <button onClick={onSessionExpired} style={{ ...styles.doneBtn, marginBottom: '16px' }}>ログイン画面へ戻る</button>}

      {students.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(360px, 2fr)', gap: '16px', alignItems: 'start' }}>
          <div style={panelStyle}>
            <label>
              <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>生徒検索</span>
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="氏名またはID" style={{ ...styles.select, width: '100%', boxSizing: 'border-box' }} />
            </label>
            <div style={{ marginTop: '12px', maxHeight: '520px', overflowY: 'auto' }}>
              {filteredStudents.map(student => (
                <button
                  key={student.userId}
                  onClick={() => selectStudent(student)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px', marginBottom: '6px', cursor: 'pointer',
                    border: student.userId === selectedStudentId ? '2px solid #166534' : '1px solid #ddd',
                    borderRadius: '6px', background: student.userId === selectedStudentId ? '#f0fdf4' : '#fff'
                  }}
                >
                  <strong>{student.name}</strong> <span style={{ color: '#666' }}>({student.userId})</span>
                  {!student.permissionsInitialized && <div style={{ color: '#b45309', fontSize: '12px' }}>未設定（現在は全コンテンツ許可）</div>}
                </button>
              ))}
              {filteredStudents.length === 0 && <p style={{ color: '#666' }}>該当する生徒はいません。</p>}
            </div>
          </div>

          <div style={panelStyle}>
            {!selectedStudent ? (
              <p style={{ color: '#666' }}>設定する生徒を選択してください。</p>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>{selectedStudent.name}さんの利用コンテンツ</h3>
                <p style={{ color: '#666' }}>{selectedStudent.school}／{selectedStudent.grade}／ID: {selectedStudent.userId}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', margin: '16px 0' }}>
                  {contents.map(content => (
                    <label key={content.contentId} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', opacity: content.enabled ? 1 : 0.55 }}>
                      <input
                        type="checkbox"
                        checked={editingContentIds.includes(content.contentId)}
                        onChange={() => toggleContent(content.contentId)}
                        disabled={!content.enabled || saving}
                        style={{ marginRight: '8px' }}
                      />
                      {content.displayName}
                      {!content.enabled && <span style={{ color: '#b91c1c', marginLeft: '6px' }}>無効</span>}
                    </label>
                  ))}
                </div>
                <div style={{ marginBottom: '12px', color: '#555' }}>{editingContentIds.length}件を許可</div>
                <button onClick={savePermissions} disabled={saving || sessionExpired} style={styles.doneBtn}>
                  {saving ? '保存中...' : 'この生徒の設定を保存'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
