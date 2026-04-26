import { useState } from 'react'
import axios from 'axios'
import Login from './Login'
import TeacherView from './TeacherView'
import StudentView from './StudentView'
import './App.css'

// 環境変数からGASのURLを取得
const GAS_URL = import.meta.env.VITE_GAS_URL;
const API_KEY = import.meta.env.VITE_API_KEY; // ← これを追加

function App() {
  // --- 状態管理 ---
  const [step, setStep] = useState('login'); // login, change-password, menu
  const [role, setRole] = useState('');      // admin, teacher, student
  const [grade, setGrade] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState(''); // ★ 新規パスワード用
  const [userName, setUserName] = useState('');
  const [school, setSchool] = useState('');  // 校舎情報
  const [unit, setUnit] = useState('');    
  const [loading, setLoading] = useState(false);

  // --- ★ パスワード強度チェック関数 ---
  const isStrongPassword = (pw) => {
    // 半角大文字、小文字、数字を各1文字以上含み、8文字以上
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(pw);
  };

  // --- ユニット名をCSVから探し出す関数 ---
  const getUnitFromCSV = async (targetSchool) => {
    try {
      const response = await fetch('/schools.csv');
      const text = await response.text();
      const rows = text.split('\n').map(row => row.trim()).filter(row => row !== "");
      
      for (let i = 1; i < rows.length; i++) {
        const [schoolName, unitName] = rows[i].split(',');
        if (schoolName === targetSchool) {
          return unitName;
        }
      }
    } catch (e) {
      console.error("ユニット情報の取得に失敗しました", e);
    }
    return "";
  };

  // --- ログイン処理 ---
  const handleLogin = async () => {
    if (!userId || !password) return alert("IDとパスワードを入力してください");
    setLoading(true);
    
    try {
      // 1. apiKeyを含めたpayloadを作成
      const payload = { 
        apiKey: API_KEY, 
        action: "login", 
        userId, 
        password 
      };

      const response = await axios.post(GAS_URL, JSON.stringify(payload), { // ← payload を使う！
  　　headers: { 'Content-Type': 'text/plain' } 
});

      if (response.data.result === "success") {
        const fetchedSchool = response.data.school;
        setUserName(response.data.name);
        setRole(response.data.role);
        setGrade(response.data.grade);
        setSchool(fetchedSchool);

        const detectedUnit = await getUnitFromCSV(fetchedSchool);
        setUnit(detectedUnit);

        // GASからの isInitial (I列) フラグで分岐
        if (response.data.isInitial) {
          setStep('change-password');
        } else {
          setStep('menu');
        }
      } else {
        alert("認証に失敗しました。");
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  // --- ★ パスワード変更処理 ---
  const handleChangePassword = async () => {
    if (!isStrongPassword(newPassword)) {
      alert("パスワードが条件を満たしていません。\n・8文字以上\n・大文字、小文字、数字を各1文字以上含める");
      return;
    }

    setLoading(true);
    try {

      // 1. apiKeyを含めたpayloadを作成
      const payload = { 
        apiKey: API_KEY, 
        action: "changePassword", 
        userId, 
        newPassword 
      };
      
      const response = await axios.post(GAS_URL, JSON.stringify(payload), { // ← payload を使う！
  　　headers: { 'Content-Type': 'text/plain' } 
　　　});

      if (response.data.result === "success") {
        alert("パスワードを更新しました。");
        setStep('menu');
      } else {
        alert("更新に失敗しました。");
      }
    } catch (e) {
      alert("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  // --- ログアウト処理 ---
  const handleLogout = () => {
    setStep('login');
    setRole('');
    setUserId('');
    setPassword('');
    setNewPassword('');
    setUserName('');
    setGrade('');
    setSchool('');
    setUnit('');
  };

  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}

      {/* 1. ログイン画面 */}
      {step === 'login' && (
        <Login 
          userId={userId} setUserId={setUserId} 
          password={password} setPassword={setPassword} 
          handleLogin={handleLogin} 
        />
      )}

      {/* 2. メニュー画面 */}
      {step === 'menu' && (
        <div className="main-layout">
          {role === 'student' && (
            <StudentView 
              userId={userId} 
              userName={userName} 
              grade={grade} 
              school={school} 
              unit={unit} 
              handleLogout={handleLogout} 
            />
          )}
          {(role === 'teacher' || role === 'admin') && (
            <div className="view-container">
              <TeacherView 
                userName={userName} 
                role={role} 
                unit={unit} 
                handleLogout={handleLogout} 
              />
            </div>
          )}
        </div>
      )}

      {/* ★ 3. パスワード変更画面（スキマくん準拠・強化版） */}
      {step === 'change-password' && (
        <div className="login-box">
          <h2>パスワード変更</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
            初期パスワードから変更してください。<br />
            <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
              ※8文字以上、英大文字・小文字・数字を<br />各1文字以上含めてください。
            </span>
          </p>
          <input 
            type="password" 
            placeholder="新しいパスワード" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            className="q-input"
            style={{ marginBottom: '10px' }}
          />
          {newPassword && !isStrongPassword(newPassword) && (
            <p style={{ color: 'red', fontSize: '11px', marginBottom: '10px' }}>条件を満たしていません</p>
          )}
          <button 
            onClick={handleChangePassword}
            disabled={!isStrongPassword(newPassword)}
            className="nav-btn"
          >
            変更して開始
          </button>
        </div>
      )}
    </div>
  );
}

export default App;