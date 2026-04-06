import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function StudentView({ userId, userName, grade, school, handleLogout }) {
  const [myQueueNumber, setMyQueueNumber] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState('kodore');
  const [showCompleteMsg, setShowCompleteMsg] = useState(false); 
  const [lastStatus, setLastStatus] = useState(''); 

  // --- 送信処理 ---
  const sendNotification = async (status) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setLastStatus(status === "丸付け待ち" ? "丸付け" : "質問");

    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "sendNotification", 
        userId: userId, userName: userName, grade: grade, school: school, status: status
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setMyQueueNumber(response.data.queueNumber);
        // ここではフラグを立てるだけ。タイマーは下の useEffect で管理。
        setShowCompleteMsg(true);
      }
    } catch (e) {
      alert("送信に失敗しました。");
      setIsSubmitting(false);
    }
  };

  // ★ 追加：メッセージが表示された「後」に5秒数えるロジック
  useEffect(() => {
    if (showCompleteMsg) {
      const timer = setTimeout(() => {
        setShowCompleteMsg(false);
        setIsSubmitting(false); // 5秒経過後に送信中状態を解除
      }, 5000); // 5000ms = 5秒
      return () => clearTimeout(timer);
    }
  }, [showCompleteMsg]);

  // --- 定期更新（順番待ち用） ---
  const checkMyStatus = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications" }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        const myData = response.data.notifications.find(n => n.userId === userId && n.name === userName);
        if (myData) { 
          setMyQueueNumber(myData.queueNumber); 
        } else { 
          setMyQueueNumber(null);
          setShowCompleteMsg(false); 
          setIsSubmitting(false);
        }
      }
    } catch (e) { console.error("更新失敗"); }
  };

  useEffect(() => {
    checkMyStatus();
    const timer = setInterval(checkMyStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.profileArea}>
          <div style={styles.studentName}>{userName} <span style={{fontSize:'0.9rem'}}>さん</span></div>
          <div style={styles.schoolInfo}>
            <span style={styles.infoBadge}>{school} {grade}</span>
          </div>
        </div>
        <nav style={styles.nav}>
          <button style={styles.navItem(activeMenu === 'kodore')} onClick={() => setActiveMenu('kodore')}>
            <span style={styles.navIcon}>🎯</span> 個トレ
          </button>
          <button style={styles.navItem(activeMenu === 'progress')} onClick={() => setActiveMenu('progress')}>
            <span style={styles.navIcon}>🏫</span> 学校の進度
          </button>
          <button style={styles.navItem(activeMenu === 'sukima')} onClick={() => setActiveMenu('sukima')}>
            <span style={styles.navIcon}>⚡</span> スキマくん
          </button>
        </nav>
        <button onClick={handleLogout} style={styles.logoutBtn}>ログアウト</button>
      </aside>

      <main style={styles.main}>
        {activeMenu === 'kodore' && (
          <div style={styles.contentArea}>
            <h1 style={styles.mainTitle}>🎯 個トレ・サポート</h1>
            
            {showCompleteMsg ? (
              <div style={styles.completeMsgCard}>
                <div style={styles.checkIcon}>✅</div>
                <h2 style={{margin: '10px 0'}}>{lastStatus}の依頼を出しました！</h2>
                <div style={styles.queueNumberSmall}>受付番号：{myQueueNumber}番</div>
                <p>そのまま少し待っていてね。</p>
              </div>
            ) : myQueueNumber ? (
              <div style={styles.waitingCard}>
                <div style={styles.waitingTitle}>順番待ち中</div>
                <div style={styles.queueNumber}>{myQueueNumber}<span style={{fontSize:'1.5rem'}}>番目</span></div>
                <p style={styles.waitingText}>先生が呼ぶまでワークを進めて待っていよう！</p>
              </div>
            ) : (
              <>
                <p style={styles.mainSubTitle}>先生に合図を送りたい方のボタンを押してね。</p>
                <div style={styles.buttonGrid}>
                  <button 
                    onClick={() => sendNotification("丸付け待ち")} 
                    style={styles.btnMaru(isSubmitting)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "送信中..." : <>📝<br/>丸付けお願いします！</>}
                  </button>
                  <button 
                    onClick={() => sendNotification("質問待ち")} 
                    style={styles.btnQuestion(isSubmitting)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "送信中..." : <>❓<br/>質問があります</>}
                  </button>
                </div>
              </>
            )}
            
            <div style={styles.loginInfoBar}>
              現在のログイン：{userName} さん（{grade}）
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  // スタイルは前回と同じ
  container: { height: '100vh', width: '100vw', display: 'flex', backgroundColor: '#eef2f5', position: 'fixed', top: 0, left: 0, overflow: 'hidden', fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", sans-serif' },
  sidebar: { width: '280px', backgroundColor: '#2c3e50', color: '#ecf0f1', display: 'flex', flexDirection: 'column', padding: '30px 20px', flexShrink: 0 },
  profileArea: { marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' },
  studentName: { fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  schoolInfo: { display: 'flex', alignItems: 'center' },
  infoBadge: { background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', color: '#ecf0f1' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' },
  navItem: (isActive) => ({ background: isActive ? '#3498db' : 'none', color: '#fff', border: 'none', padding: '12px 15px', borderRadius: '8px', fontSize: '1.1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background-color 0.2s' }),
  navIcon: { marginRight: '15px', fontSize: '1.2rem' },
  logoutBtn: { background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer', marginTop: 'auto' },
  main: { flex: 1, padding: '50px 40px', overflowY: 'auto', position: 'relative' },
  contentArea: { maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' },
  mainTitle: { fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#333', textAlign: 'center' },
  mainSubTitle: { fontSize: '1.2rem', color: '#666', marginBottom: '50px', textAlign: 'center' },
  buttonGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', width: '100%', maxWidth: '800px' },
  btnMaru: (isSubmitting) => ({ 
    height: '220px', borderRadius: '30px', border: 'none', 
    background: isSubmitting ? '#ccc' : 'linear-gradient(135deg, #e67e22, #f39c12)', 
    color: '#fff', fontSize: isSubmitting ? '1.2rem' : '1.6rem', fontWeight: 'bold', 
    cursor: isSubmitting ? 'not-allowed' : 'pointer', padding: '20px', lineHeight: '1.4', 
    boxShadow: isSubmitting ? 'none' : '0 8px 15px rgba(230,126,34,0.3)', transition: 'all 0.2s' 
  }),
  btnQuestion: (isSubmitting) => ({ 
    height: '220px', borderRadius: '30px', border: 'none', 
    background: isSubmitting ? '#ccc' : 'linear-gradient(135deg, #3498db, #5dade2)', 
    color: '#fff', fontSize: isSubmitting ? '1.2rem' : '1.6rem', fontWeight: 'bold', 
    cursor: isSubmitting ? 'not-allowed' : 'pointer', padding: '20px', lineHeight: '1.4', 
    boxShadow: isSubmitting ? 'none' : '0 8px 15px rgba(52,152,219,0.3)', transition: 'all 0.2s' 
  }),
  completeMsgCard: { backgroundColor: '#fff', padding: '40px', borderRadius: '30px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '6px solid #3498db', width: '100%', maxWidth: '500px' },
  checkIcon: { fontSize: '3rem' },
  queueNumberSmall: { fontSize: '2.5rem', fontWeight: 'bold', color: '#3498db', margin: '15px 0' },
  waitingCard: { backgroundColor: '#fff', padding: '60px 40px', borderRadius: '30px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '6px solid #27ae60', width: '100%', maxWidth: '500px' },
  waitingTitle: { fontSize: '1.6rem', fontWeight: 'bold', color: '#27ae60', marginBottom: '15px' },
  queueNumber: { fontSize: '7rem', fontWeight: 'bold', color: '#333', lineHeight: 1 },
  waitingText: { marginTop: '30px', color: '#666', lineHeight: '1.6', fontSize: '1.2rem' },
  loginInfoBar: { width: '100%', textAlign: 'center', background: '#fff', padding: '12px 20px', borderRadius: '12px', color: '#666', fontSize: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginTop: 'auto', marginBottom: '20px' },
};