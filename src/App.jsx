import { useState } from 'react'
import axios from 'axios'
import './App.css' // スタイルを適用する場合

// Vercelや.env.localからGASのURLを自動読み込み
const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  // --- 状態管理 (ステート) ---
  const [step, setStep] = useState('login');      // login, change-password, menu
  const [role, setRole] = useState('');           // teacher, student
  const [grade, setGrade] = useState('');         // 中1, 中2...
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState(''); // パスワード変更用
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  // --- 1. ログイン処理 ---
  const handleLogin = async () => {
    if (!userId || !password) return alert("IDとパスワードを入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "login", 
        userId, 
        password 
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setUserName(response.data.name);
        setRole(response.data.role);
        setGrade(response.data.grade);

        // 初回フラグがTRUEならパスワード変更画面へ、そうでなければメニューへ
        if (response.data.isInitial) {
          setStep('change-password');
        } else {
          setStep('menu');
        }
      } else {
        alert("認証に失敗しました。IDまたはパスワードを確認してください。");
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました。GASのURLやデプロイ設定を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. パスワード変更処理 ---
  const handleChangePassword = async () => {
    if (!newPassword) return alert("新しいパスワードを入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "changePassword", 
        userId, 
        newPassword 
      }), { headers: { 'Content-Type': 'text/plain' } });

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

  // --- 3. ログアウト処理 ---
  const handleLogout = () => {
    setStep('login');
    setUserId('');
    setPassword('');
    setNewPassword('');
    setRole('');
    setGrade('');
  };

  // --- 画面表示 (レンダリング) ---
  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}

      {/* A. ログイン画面 */}
      {step === 'login' && (
        <div className="login-box">
          <h1>塾管理アプリ</h1>
          <div className="input-group">
            <input type="text" placeholder="ユーザーID" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* B. パスワード変更画面 */}
      {step === 'change-password' && (
        <div className="login-box">
          <h2>🔐 パスワード変更</h2>
          <p>初回ログインのため、新しいパスワードを設定してください。</p>
          <input type="password" placeholder="新しいパスワード" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleChangePassword}>変更して開始</button>
        </div>
      )}

      {/* C. メニュー画面（先生・生徒で条件分岐） */}
      {step === 'menu' && (
        <div className="menu-container">
          <header>
            <h2>こんにちは、{userName} {role === 'teacher' ? '先生' : 'さん'}</h2>
            {role === 'student' && <p className="grade-badge">{grade}</p>}
          </header>
          
          <div className="content-area">
            {role === 'teacher' ? (
              <div className="teacher-section">
                <h3>【先生専用メニュー】</h3>
                <div className="button-grid">
                  <button onClick={() => alert('生徒一覧機能は開発中です')}>生徒一覧表示</button>
                  <button onClick={() => alert('テスト作成機能は開発中です')}>テスト作成</button>
                  <button onClick={() => alert('成績入力機能は開発中です')}>成績入力</button>
                </div>
              </div>
            ) : (
              <div className="student-section">
                <h3>【生徒専用メニュー】</h3>
                <div className="button-grid">
                  <button onClick={() => alert('テスト機能は開発中です')}>テストを受ける</button>
                  <button onClick={() => alert('成績機能は開発中です')}>自分の成績を見る</button>
                </div>
              </div>
            )}
          </div>
          
          <footer style={{ marginTop: '20px' }}>
            <button className="logout-btn" onClick={handleLogout}>ログアウト</button>
          </footer>
        </div>
      )}
    </div>
  )
}

export default App