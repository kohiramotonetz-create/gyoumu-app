import { useState } from 'react'
import axios from 'axios'

// あなたのGASのウェブアプリURLをここに貼る
const GAS_URL = "YOUR_GAS_WEB_APP_URL"

function App() {
  const [step, setStep] = useState('login') // login, change-password, menu
  const [role, setRole] = useState('')      // teacher, student
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)

  // ログイン処理
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
        setRole(response.data.role); // GASから role: "teacher" か "student" が返ってくる想定

        if (response.data.isInitial) {
          setStep('change-password');
        } else {
          setStep('menu');
        }
      } else {
        alert("認証に失敗しました");
      }
    } catch (e) {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}

      {/* ログイン画面 */}
      {step === 'login' && (
        <div className="login-box">
          <h1>塾管理アプリ</h1>
          <input type="text" placeholder="ユーザーID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* メニュー画面（ここで分岐！） */}
      {step === 'menu' && (
        <div className="menu-container">
          <h2>こんにちは、{userName} {role === 'teacher' ? '先生' : 'さん'}</h2>
          
          {role === 'teacher' ? (
            <div className="teacher-section">
              <h3>【先生専用メニュー】</h3>
              <button>生徒一覧表示</button>
              <button>テスト作成</button>
              <button>成績入力</button>
            </div>
          ) : (
            <div className="student-section">
              <h3>【生徒専用メニュー】</h3>
              <button>テストを受ける</button>
              <button>自分の成績を見る</button>
            </div>
          )}
          <button onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}
    </div>
  )
}

export default App