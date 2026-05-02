import React, { useState } from 'react';
import axios from 'axios';

const AccountGenerator = ({ styles, GAS_URL, API_KEY, schools }) => {
  const [accountType, setAccountType] = useState('teacher');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [grade, setGrade] = useState(''); // 初期値を空にする

  // 学年リストの定義
  const gradeOptions = ["小４", "小５", "小６", "中１", "中２", "中３", "一貫中１","一貫中２","一貫中３", "高１", "高２", "高３"];

  // パスワード自動計算
  const getAutoPassword = () => {
    if (accountType === 'teacher') return '1234';
    return userId ? `netzs${userId}` : '';
  };

  // ID入力時のバリデーション
  const handleIdChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 6) {
      setUserId(value);
    }
  };

  // アカウント発行処理
  const handleCreate = async () => {
    // 1. 未入力チェック（生徒の場合は学年も必須）
    const isGradeMissing = accountType === 'student' && !grade;
    if (!userId || !userName || !selectedSchool || isGradeMissing) {
      return alert("全ての項目を入力してください");
    }

    // 2. 6桁チェック
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
        setGrade(''); // リセット
      }
    } catch (e) {
      alert("作成に失敗しました");
    }
  };

  // --- スタイル定義 ---
  const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3d3d3d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    textAlign: 'center',
    color: '#adb5bd',
    fontSize: '0.9rem',
    marginBottom: '8px',
    marginTop: '20px'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ ...styles.contentTitle, textAlign: 'center', marginBottom: '30px' }}>
        <span style={{ marginRight: '10px' }}>👤</span>新規アカウント発行
      </h2>
      
      {/* アカウント種類選択 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '10px' }}>
        <span style={{ color: '#adb5bd' }}>アカウント種類</span>
        <label style={{ color: accountType === 'teacher' ? '#acc017' : '#adb5bd', cursor: 'pointer' }}>
          <input type="radio" name="type" value="teacher" checked={accountType === 'teacher'} 
            onChange={() => setAccountType('teacher')} /> 講師
        </label>
        <label style={{ color: accountType === 'student' ? '#3498db' : '#adb5bd', cursor: 'pointer' }}>
          <input type="radio" name="type" value="student" checked={accountType === 'student'} 
            onChange={() => setAccountType('student')} /> 生徒
        </label>
      </div>

      {/* 所属校舎 */}
      <label style={labelStyle}>所属校舎</label>
      <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} style={inputStyle}>
        <option value="">選択してください</option>
        {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* 氏名 */}
      <label style={labelStyle}>氏名</label>
      <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} style={inputStyle} placeholder="ネッツ 太郎" />

      {/* 学年ステータス（氏名の次に追加） */}
      {accountType === 'student' && (
        <>
          <label style={labelStyle}>学年</label>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} style={inputStyle}>
            <option value="">学年を選択してください</option>
            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </>
      )}

      {/* ID入力欄 */}
      <label style={labelStyle}>ID (半角数字6桁)</label>
      <input 
        type="text" 
        inputMode="numeric"
        value={userId} 
        onChange={handleIdChange}
        placeholder={accountType === 'teacher' ? "講師番号を入力" : "生徒番号を入力"}
        style={{
          ...inputStyle,
          border: userId.length > 0 && userId.length !== 6 ? '1px solid #e74c3c' : 'none',
        }}
      />

      {/* パスワード */}
      <label style={labelStyle}>パスワード</label>
      <input 
        type="text" 
        value={getAutoPassword()} 
        readOnly 
        style={{ 
          ...inputStyle, 
          backgroundColor: '#eeeeee',
          color: '#888888',
          border: '1px solid #ccc',
          cursor: 'not-allowed'
        }}
      />
      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>
        ※パスワードは自動設定されます
      </div>

      <button onClick={handleCreate} style={{ ...styles.doneBtn, width: '100%', marginTop: '40px', padding: '15px', fontSize: '1.1rem' }}>
        アカウントを発行する
      </button>
    </div>
  );
};

export default AccountGenerator;