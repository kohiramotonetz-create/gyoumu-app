import { useState } from 'react';

export default function Login({ userId, setUserId, password, setPassword, handleLogin }) {
  const [isProcessing, setIsProcessing] = useState(false);

  // --- ユニット名をCSVから探し出す関数 ---
  const getUnitFromCSV = async (targetSchool) => {
    try {
      const response = await fetch('/schools.csv');
      const text = await response.text();
      const rows = text.split('\n').map(row => row.trim()).filter(row => row !== "");
      
      // 2行目以降から校舎名が一致する行を探す
      for (let i = 1; i < rows.length; i++) {
        const [schoolName, unitName] = rows[i].split(',');
        if (schoolName === targetSchool) {
          return unitName; // 一致したらユニット名（高松など）を返す
        }
      }
    } catch (e) {
      console.error("ユニット情報の取得に失敗しました", e);
    }
    return ""; // 見つからない場合は空文字
  };

  const onLoginClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. まずは通常のログイン処理を実行して「校舎名」などのユーザー情報を取得
      // ※handleLoginが内部でAPIを叩き、成功時にユーザー情報を返す想定
      const userInfo = await handleLogin(); 

      // 2. ログイン成功時、userInfoの中に「school」があればCSVからユニットを特定
      if (userInfo && userInfo.school) {
        const unit = await getUnitFromCSV(userInfo.school);
        // ここで特定したユニット情報をアプリ全体で保持するように連携
        // (App.jsx側で setUser({...userInfo, unit}) するイメージ)
      }
    } catch (e) {
      console.error("ログインエラー", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>個別ミッショントレーニング</h1>
        
        <div style={styles.inputGroup}>
          <input 
            type="text" 
            placeholder="生徒番号" 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)} 
            style={styles.input}
          />
          <input 
            type="password" 
            placeholder="パスワード(初期:1234)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={styles.input}
          />
        </div>

        <button 
          onClick={onLoginClick} 
          style={styles.button}
          disabled={isProcessing}
          onMouseOver={(e) => e.target.style.opacity = '0.9'}
          onMouseOut={(e) => e.target.style.opacity = '1'}
        >
          {isProcessing ? "認証中..." : "ログイン"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: '#eef2f5', position: 'fixed', top: 0, left: 0, zIndex: 9999 },
  card: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '90%', maxWidth: '450px', textAlign: 'center' },
  title: { fontSize: '2rem', fontWeight: 'bold', marginBottom: '15px', color: '#000', letterSpacing: '1px', whiteSpace: 'nowrap' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' },
  input: { padding: '15px 20px', fontSize: '1rem', borderRadius: '10px', border: 'none', backgroundColor: '#3d3d3d', color: '#ffffff', outline: 'none' },
  button: { width: '100%', padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', color: '#ffffff', backgroundColor: '#1d72e8', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'opacity 0.2s' },
};