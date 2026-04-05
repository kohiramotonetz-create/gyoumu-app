import { useState } from 'react'
import axios from 'axios'
import Login from './Login'
import TeacherView from './TeacherView'
import StudentView from './StudentView'
import './App.css'

// 環境変数からGASのURLを取得
const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  // --- 状態管理 ---
  const [step, setStep] = useState('login'); // login, change-password, menu
  const [role, setRole] = useState('');      // admin, teacher, student
  const [grade, setGrade] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ログイン処理 ---
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
        setRole(response.data.role);   // ここに 'admin', 'teacher', 'student' が入る
        setGrade(response.data.grade);

        if (response.data.isInitial) {
          setStep('change-password');
        } else {
          setStep('menu');
        }
      } else {
        alert("認証に失敗しました。");
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

      {/* 2. メニュー画面（3つのレイヤーで分岐） */}
      {step === 'menu' && (
        <div className="main-layout">
          
          {/* --- A. 生徒レイヤー --- */}
          {role === 'student' && (
            <StudentView 
              userName={userName} 
              grade={grade} 
              handleLogout={handleLogout} 
            />
          )}

          {/* --- B. 講師レイヤー --- */}
          {role === 'teacher' && (
            <TeacherView 
              userName={userName} 
              handleLogout={handleLogout} 
            />
          )}

          {/* --- C. 社員・スタッフレイヤー（講師の機能 ＋ 社員専用機能） --- */}
          {role === 'admin' && (
            <div className="admin-container">
              <div className="admin-special-menu" style={{ backgroundColor: '#fdf2f2', padding: '15px', borderRadius: '8px', border: '2px solid #f87171', marginBottom: '20px' }}>
                <h2 style={{ color: '#b91c1c', marginTop: 0 }}>🛡️ 社員・スタッフ専用ツール</h2>
                <div className="admin-buttons" style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => alert('講師のシフト・給与管理画面へ')}>講師シフト管理</button>
                  <button onClick={() => alert('月謝・入金管理画面へ')}>月謝管理</button>
                  <button onClick={() => alert('全生徒・全講師のログを確認')}>全ログ閲覧</button>
                </div>
              </div>
              
              {/* 社員は「講師の画面」もそのまま使えるように、TeacherViewを再利用 */}
              <div className="teacher-view-wrapper" style={{ opacity: 0.9 }}>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>※以下、講師用メニューも操作可能です</p>
                <TeacherView 
                  userName={userName} 
                  handleLogout={handleLogout} 
                />
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default App;