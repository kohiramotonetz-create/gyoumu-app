import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

// 引数に school を追加
export default function StudentView({ userId, userName, grade, school, handleLogout }) {
  const [myQueueNumber, setMyQueueNumber] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 通知を送信する処理 ---
  const sendNotification = async (status) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "sendNotification",
        userId: userId,
        userName: userName,
        grade: grade,
        school: school, // ★ App.jsxから受け取った校舎名をここで送信！
        status: status
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setMyQueueNumber(response.data.queueNumber);
        alert(`${status}の依頼を出しました（整理券：${response.data.queueNumber}番）`);
      }
    } catch (e) {
      alert("送信に失敗しました。電波の良い所で再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 自分の順番をチェックする処理（おまけ：最新の番号を追跡する場合） ---
  const checkMyStatus = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "getNotifications" 
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      if (response.data.result === "success") {
        // 自分のIDと名前が一致するデータを探して、最新の整理券番号を上書きする
        const myData = response.data.notifications.find(n => n.userId === userId && n.name === userName);
        if (myData) {
          setMyQueueNumber(myData.queueNumber);
        } else {
          setMyQueueNumber(null); // 対応が終わって消された場合
        }
      }
    } catch (e) { console.error("ステータス更新失敗"); }
  };

  useEffect(() => {
    // 5秒おきに自分の順番が繰り上がったか確認する
    const timer = setInterval(checkMyStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.schoolBadge}>{school}校</div>
        <div style={styles.userName}>{userName} さん</div>
        <button onClick={handleLogout} style={styles.logoutBtn}>ログアウト</button>
      </header>

      <main style={styles.main}>
        {myQueueNumber ? (
          <div style={styles.waitingCard}>
            <div style={styles.waitingTitle}>順番待ち中</div>
            <div style={styles.queueNumber}>{myQueueNumber}<span style={{fontSize:'1rem'}}>番目</span></div>
            <p style={styles.waitingText}>先生が呼ぶまで<br/>ワークを進めて待っていよう！</p>
          </div>
        ) : (
          <div style={styles.actionArea}>
            <h2 style={styles.title}>先生をよぶ</h2>
            <div style={styles.buttonGrid}>
              <button onClick={() => sendNotification("丸付け待ち")} style={styles.btnMaru}>
                <span style={styles.btnIcon}>📝</span><br/>丸付け
              </button>
              <button onClick={() => sendNotification("質問待ち")} style={styles.btnQuestion}>
                <span style={styles.btnIcon}>❓</span><br/>しつもん
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' },
  header: { background: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  schoolBadge: { background: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
  userName: { fontWeight: 'bold', fontSize: '1.1rem' },
  logoutBtn: { background: 'none', border: '1px solid #ccc', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem' },
  main: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  actionArea: { textAlign: 'center', width: '100%', maxWidth: '400px' },
  title: { marginBottom: '30px', color: '#333' },
  buttonGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  btnMaru: { height: '150px', borderRadius: '20px', border: 'none', background: '#e67e22', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 0 #d35400' },
  btnQuestion: { height: '150px', borderRadius: '20px', border: 'none', background: '#3498db', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 0 #2980b9' },
  btnIcon: { fontSize: '2.5rem' },
  waitingCard: { backgroundColor: '#fff', padding: '40px', borderRadius: '30px', textAlign: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', border: '4px solid #27ae60' },
  waitingTitle: { fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60', marginBottom: '10px' },
  queueNumber: { fontSize: '4rem', fontWeight: 'bold', color: '#333' },
  waitingText: { marginTop: '20px', color: '#666', lineHeight: '1.6' }
};