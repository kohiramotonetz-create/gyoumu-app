import { useState } from 'react'
import axios from 'axios'
import Login from './Login'
import TeacherView from './TeacherView'
import StudentView from './StudentView'
import './App.css'

// 環境変数からGAS의 URLを取得
const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  // --- 状態管理 ---
  const [step, setStep] = useState('login'); // login, change-password, menu
  const [role, setRole] = useState('');      // admin, teacher, student
  const [grade, setGrade] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [school, setSchool] = useState('');  // 校舎情報
  const [unit, setUnit] = useState('');    // ★ ユニット情報を追加
  const [loading, setLoading] = useState(false);

  // --- ★ ユニット名をCSVから探し出す関数 ---
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
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "login", 
        userId, 
        password 
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        const fetchedSchool = response.data.school;
        
        // GASから返ってきた情報を各ステートに保存
        setUserName(response.data.name);
        setRole(response.data.role);
        setGrade(response.data.grade);
        setSchool(fetchedSchool);

        // ★ ログイン成功直後にユニットを判別する
        const detectedUnit = await getUnitFromCSV(fetchedSchool);
        setUnit(detectedUnit);

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

  // --- ログアウト処理 ---
  const handleLogout = () => {
    setStep('login');
    setRole('');
    setUserId('');
    setPassword('');
    setUserName('');
    setGrade('');
    setSchool('');
    setUnit(''); // ★ ユニットもクリア
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
          
          {/* --- A. 生徒レイヤー --- */}
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

          {/* --- B. 講師・社員レイヤー --- */}
          {(role === 'teacher' || role === 'admin') && (
            <div className="view-container">
              {/* ★ 赤枠（admin-special-menu）を廃止しました */}

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

      {/* パスワード変更画面 */}
      {step === 'change-password' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>パスワード変更</h2>
          <p>初期パスワードを変更してください（未実装）</p>
          <button onClick={() => setStep('menu')}>スキップしてメニューへ</button>
        </div>
      )}
    </div>
  );
}

export default App;