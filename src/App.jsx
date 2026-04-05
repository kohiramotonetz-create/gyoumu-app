import { useState } from 'react'
import axios from 'axios'
import Login from './Login'
import TeacherView from './TeacherView'
import StudentView from './StudentView'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  const [step, setStep] = useState('login');
  const [role, setRole] = useState('');
  const [grade, setGrade] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "login", userId, password }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        setUserName(response.data.name);
        setRole(response.data.role);
        setGrade(response.data.grade);
        setStep('menu');
      } else {
        alert("認証失敗");
      }
    } catch (e) {
      alert("通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { setStep('login'); setRole(''); };

  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}

      {step === 'login' && (
        <Login userId={userId} setUserId={setUserId} password={password} setPassword={setPassword} handleLogin={handleLogin} />
      )}

      {step === 'menu' && (
        role === 'teacher' 
          ? <TeacherView userName={userName} handleLogout={handleLogout} />
          : <StudentView userName={userName} grade={grade} handleLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;