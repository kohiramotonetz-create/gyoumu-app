// 講師：アカウント管理（新規発行・アカウント一括削除）

import React, { useState } from 'react';
import axios from 'axios';

const AccountGenerator = ({ styles, GAS_URL, API_KEY, schools }) => {
  // 操作モードの管理 ('create' = 発行, 'delete' = 削除)
  const [mode, setMode] = useState('create');

  // --- 【発行モード用】State ---
  const [accountType, setAccountType] = useState('teacher');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [grade, setGrade] = useState('');

  // --- 【削除モード用】State ---
  const [delSchool, setDelSchool] = useState('');
  const [delGrades, setDelGrades] = useState([]); // 学年の複数選択用
  const [accountList, setAccountList] = useState([]); // 検索結果のリスト
  const [selectedIds, setSelectedIds] = useState([]); // チェックされたIDの配列
  const [listLoading, setListLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 学年リストの定義
  const gradeOptions = ["小４", "小５", "小６", "中１", "中２", "中３", "高１", "高２", "高３", "一貫中１","一貫中２","一貫中３"];

  // パスワード自動計算（発行用）
  const getAutoPassword = () => {
    if (accountType === 'teacher') return '1234';
    return userId ? `netzs${userId}` : '';
  };

  // ID入力制限（半角数字6桁）
  const handleIdChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 6) {
      setUserId(value);
    }
  };

  // 削除用：学年ボタンのトグル処理
  const toggleDelGrade = (g) => {
    setDelGrades(prev => 
      prev.includes(g) ? prev.filter(item => item !== g) : [...prev, g]
    );
  };

  // ① アカウント発行処理
  const handleCreate = async () => {
    const isGradeMissing = accountType === 'student' && !grade;
    if (!userId || !userName || !selectedSchool || isGradeMissing) {
      return alert("全ての項目を入力してください");
    }
    if (userId.length !== 6) {
      return alert("IDは必ず半角数字6桁で入力してください");
    }

    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "createAccount",
        apiKey: API_KEY,
        school: selectedSchool,
        userId: userId,
        userName: userName,
        grade: accountType === 'teacher' ? '-' : grade,
        password: getAutoPassword(),
        role: accountType
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        alert(`${userName} さんのアカウントを作成しました。`);
        setUserId('');
        setUserName('');
        setGrade('');
      }
    } catch (e) {
      alert("作成に失敗しました");
    }
  };

  // 💡 ② 削除用：アカウント一覧の検索取得
  const fetchAccountsForDelete = async () => {
    if (!delSchool || delGrades.length === 0) {
      return alert("校舎と学年を選択してください");
    }
    setListLoading(true);
    setSelectedIds([]); // 選択クリア
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "getAccountsForDelete", // 後ほどGAS側に追加するアクション名
        apiKey: API_KEY,
        school: delSchool,
        grades: delGrades
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setAccountList(response.data.accounts);
        setHasSearched(true);
      }
    } catch (e) {
      alert("アカウントリストの取得に失敗しました");
    } finally {
      setListLoading(false);
    }
  };

  // 💡 ③ 削除用：チェックボックス選択処理
  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 💡 ④ アカウント一括削除実行
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      return alert("削除するアカウントをチェックしてください");
    }

    // チェックされた生徒・講師の名前をリスト化
    const targetNames = accountList
      .filter(acc => selectedIds.includes(acc.userId))
      .map(acc => `・【${acc.grade}】${acc.name} (${acc.userId})`)
      .join('\n');

    // 画像の仕様通り、ポップアップで名前の一覧を提示して確認アラートを出す
    const isConfirmed = window.confirm(
      `以下のカウントを完全に削除しますか？\n\n${targetNames}\n\n※この操作は取り消せません。`
    );
    if (!isConfirmed) return;

    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "deleteAccountsBulk", // 複数一括削除用アクション
        apiKey: API_KEY,
        userIds: selectedIds // 配列で一括送信
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        alert("選択したアカウントの削除が完了しました。");
        // リストを再更新
        fetchAccountsForDelete();
      } else {
        alert(response.data.message || "削除に失敗しました");
      }
    } catch (e) {
      alert("通信エラーにより削除に失敗しました");
    }
  };

  // --- スタイル定義 ---
  const inputStyle = {
    width: '100%', padding: '12px', backgroundColor: '#3d3d3d', color: '#ffffff',
    border: 'none', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block', textAlign: 'center', color: '#adb5bd', fontSize: '0.9rem',
    marginBottom: '8px', marginTop: '20px'
  };

  const tabButtonStyle = (isActive) => ({
    flex: 1, padding: '10px', cursor: 'pointer', border: 'none', fontSize: '0.95rem',
    fontWeight: 'bold', backgroundColor: isActive ? '#166534' : '#333333',
    color: '#ffffff', transition: '0.2s', borderRadius: '4px'
  });

  return (
    <div style={{ padding: '20px', width: '100%', maxWidth: mode === 'delete' ? '1000px' : '600px', margin: '0 auto' }}>
      <h2 style={{ ...styles.contentTitle, textAlign: 'center', marginBottom: '20px' }}>
        <span style={{ marginRight: '10px' }}>👤</span>アカウント管理
      </h2>
      
      {/* モード（発行／削除）切り替えタブ */}
      <div style={{ display: 'flex', backgroundColor: '#222', padding: '4px', borderRadius: '6px', marginBottom: '30px', gap: '4px', maxWidth: '600px', margin: '0 auto 30px auto' }}>
        <button onClick={() => setMode('create')} style={tabButtonStyle(mode === 'create')}>➕ 新規アカウント発行</button>
        <button onClick={() => setMode('delete')} style={tabButtonStyle(mode === 'delete')}>🗑️ アカウント一覧削除</button>
      </div>

      {/* ＝ 1. アカウント発行モード ＝ */}
      {mode === 'create' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '10px' }}>
            <span style={{ color: '#adb5bd' }}>アカウント種類</span>
            <label style={{ color: accountType === 'teacher' ? '#acc017' : '#adb5bd', cursor: 'pointer' }}>
              <input type="radio" name="type" value="teacher" checked={accountType === 'teacher'} onChange={() => setAccountType('teacher')} /> 講師
            </label>
            <label style={{ color: accountType === 'student' ? '#3498db' : '#adb5bd', cursor: 'pointer' }}>
              <input type="radio" name="type" value="student" checked={accountType === 'student'} onChange={() => setAccountType('student')} /> 生徒
            </label>
          </div>

          <label style={labelStyle}>所属校舎</label>
          <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} style={inputStyle}>
            <option value="">選択してください</option>
            {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label style={labelStyle}>氏名</label>
          <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} style={inputStyle} placeholder="ネッツ 太郎" />

          {accountType === 'student' && (
            <>
              <label style={labelStyle}>学年</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} style={inputStyle}>
                <option value="">学年を選択してください</option>
                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </>
          )}

          <label style={labelStyle}>ID (半角数字6桁)</label>
          <input type="text" inputMode="numeric" value={userId} onChange={handleIdChange} placeholder={accountType === 'teacher' ? "講師番号を入力" : "生徒番号を入力"}
            style={{ ...inputStyle, border: userId.length > 0 && userId.length !== 6 ? '1px solid #e74c3c' : 'none' }} />

          <label style={labelStyle}>パスワード</label>
          <input type="text" value={getAutoPassword()} readOnly style={{ ...inputStyle, backgroundColor: '#eeeeee', color: '#888888', border: '1px solid #ccc', cursor: 'not-allowed' }} />
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>※パスワードは自動設定されます</div>

          <button onClick={handleCreate} style={{ ...styles.doneBtn, width: '100%', marginTop: '40px', padding: '15px', fontSize: '1.1rem' }}>アカウントを発行する</button>
        </div>
      )}

      {/* ＝ 2. アカウント削除モード（画像UIの再現） ＝ */}
      {mode === 'delete' && (
        <div>
          {/* 写真のフィルタエリアを完全に再現 */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ width: '60px', fontWeight: 'bold', color: '#666' }}>校舎：</span>
              <select style={{ ...styles.select, backgroundColor: '#fff', color: '#333', border: '1px solid #ccc' }} value={delSchool} onChange={e => setDelSchool(e.target.value)}>
                <option value="">校舎選択</option>
                {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
              <span style={{ width: '60px', fontWeight: 'bold', paddingTop: '5px', color: '#666' }}>学年：</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', flex: 1 }}>
                {gradeOptions.map(g => (
                  <button key={g} onClick={() => toggleDelGrade(g)}
                    style={{
                      padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                      backgroundColor: delGrades.includes(g) ? '#166534' : '#fff',
                      color: delGrades.includes(g) ? '#fff' : '#166534',
                      border: '1px solid #166534', transition: '0.2s'
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={fetchAccountsForDelete} style={{ ...styles.doneBtn, width: '200px', backgroundColor: '#166534', color: '#fff' }} disabled={listLoading}>
                {listLoading ? "読み込み中..." : "表示更新"}
              </button>
            </div>
          </div>

          {/* 検索結果テーブル */}
          {hasSearched && (
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {accountList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>該当するアカウントが見つかりません。</div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto', maxHeight: '50vh', border: '1px solid #ddd' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px', color: '#333' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '10px', border: '1px solid #ddd', width: '40px', textAlign: 'center' }}>選択</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd' }}>校舎名</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd' }}>生徒番号</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd' }}>名前</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd' }}>学年</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountList.map((acc) => (
                          <tr key={acc.userId} style={{ borderBottom: '1px solid #ddd', backgroundColor: selectedIds.includes(acc.userId) ? '#f0fdf4' : '#fff' }}>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                              <input type="checkbox" checked={selectedIds.includes(acc.userId)} onChange={() => handleSelectRow(acc.userId)} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>{acc.school}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{acc.userId}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>{acc.name}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{acc.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 一括削除実行ボタン */}
                  <div style={{ textAlign: 'right', marginTop: '15px' }}>
                    <button onClick={handleDeleteSelected} style={{ ...styles.doneBtn, backgroundColor: '#b91c1c', color: '#fff', border: 'none', padding: '10px 20px' }}>
                      ❌ 選択したアカウントを削除する ({selectedIds.length}件)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountGenerator;