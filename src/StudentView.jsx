import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

// props: userId, userName, grade, school, handleLogout
export default function StudentView({ userId, userName, grade, school, handleLogout }) {
  const [myQueueNumber, setMyQueueNumber] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState('kodore'); //kodore, progress, sukima

  // --- 通知を送信する処理 ---
  const sendNotification = async (status) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "sendNotification", userId: userId, userName: userName, grade: grade, school: school, status: status
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setMyQueueNumber(response.data.queueNumber);
      }
    } catch (e) {
      alert("送信に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 自分の順番をチェックする処理 ---
  const checkMyStatus = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications" }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        const myData = response.data.notifications.find(n => n.userId === userId && n.name === userName);
        if (myData) { setMyQueueNumber(myData.queueNumber); } 
        else { setMyQueueNumber(null); }
      }
    } catch (e) { console.error("ステータス更新失敗"); }
  };

  useEffect(() => {
    checkMyStatus();
    const timer = setInterval(checkMyStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.container}>
      {/* --- 1. 左側サイドバー --- */}
      <aside style={styles.sidebar}>
        <div style={styles.profileArea}>
          {/* 指定通り：上に生徒名 */}
          <div style={styles.studentName}>{userName} <span style={{fontSize:'0.9rem'}}>さん</span></div>
          {/* 指定通り：下に「学校名 学年」を半角スペースをあけて表示 */}
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

      {/* --- 2. 右側メインエリア --- */}
      <main style={styles.main}>
        {activeMenu === 'kodore' && (
          <div style={styles.contentArea}>
            <h1 style={styles.mainTitle}>🎯 個トレ・サポート</h1>
            <p style={styles.mainSubTitle}>先生に合図を送りたい方のボタンを押してね。</p>

            {myQueueNumber ? (
              {/* 順番待ち画面（これまでのロジックを維持） */}
              <div style={styles.waitingCard}>
                <div style={styles.waitingTitle}>順番待ち中</div>
                <div style={styles.queueNumber}>{myQueueNumber}<span style={{fontSize:'1.5rem'}}>番目</span></div>
                <p style={styles.waitingText}>先生が呼ぶまでワークを進めて待っていよう！</p>
              </div>
            ) : (
              {/* ボタン選択画面（デザインをスクショに合わせる） */}
              <div style={styles.buttonGrid}>
                <button onClick={() => sendNotification("丸付け待ち")} style={styles.btnMaru}>
                  📝<br/>丸付けお願いします！
                </button>
                <button onClick={() => sendNotification("質問待ち")} style={styles.btnQuestion}>
                  ❓<br/>質問があります
                </button>
              </div>
            )}
            
            {/* 下部のログイン情報表示エリア */}
            <div style={styles.loginInfoBar}>
              現在のログイン：{userName} さん（{grade}）
            </div>
          </div>
        )}

        {activeMenu === 'progress' && <div style={styles.emptyContent}>🏫 学校の進度確認画面（制作中）</div>}
        {activeMenu === 'sukima' && <div style={styles.emptyContent}>⚡ スキマくん（制作中）</div>}
      </main>
    </div>
  );
}

const styles = {
  // 画面全体のレイアウト
  container: { 
    height: '100vh', 
    width: '100vw', 
    display: 'flex', 
    backgroundColor: '#eef2f5', 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    overflow: 'hidden',
    fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", sans-serif'
  },

  // --- サイドバースタイル ---
  sidebar: { 
    width: '280px', 
    backgroundColor: '#2c3e50', // 濃紺
    color: '#ecf0f1', 
    display: 'flex', 
    flexDirection: 'column', 
    padding: '30px 20px', 
    flexShrink: 0 
  },
  // 左上のプロファイルエリア（指定表示の場所）
  profileArea: { 
    marginBottom: '40px', 
    borderBottom: '1px solid rgba(255,255,255,0.1)', 
    paddingBottom: '20px' 
  },
  studentName: { 
    fontSize: '1.4rem', 
    fontWeight: 'bold', 
    marginBottom: '8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  schoolInfo: { display: 'flex', alignItems: 'center' },
  // 学校名と学年をバッジ風に（白半透明）
  infoBadge: { 
    background: 'rgba(255,255,255,0.15)', 
    padding: '4px 10px', 
    borderRadius: '4px', 
    fontSize: '0.85rem', 
    color: '#ecf0f1' 
  },

  // ナビゲーションメニュー
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' },
  navItem: (isActive) => ({
    background: isActive ? '#3498db' : 'none', // 選択中は水色
    color: '#fff',
    border: 'none',
    padding: '12px 15px',
    borderRadius: '8px',
    fontSize: '1.1rem',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s',
  }),
  navIcon: { marginRight: '15px', fontSize: '1.2rem' },
  logoutBtn: { background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer', marginTop: 'auto' },

  // --- メインエリアスタイル ---
  main: { flex: 1, padding: '50px 40px', overflowY: 'auto', position: 'relative' },
  contentArea: { maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' },
  
  mainTitle: { fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#333', textAlign: 'center' },
  mainSubTitle: { fontSize: '1.2rem', color: '#666', marginBottom: '50px', textAlign: 'center' },

  // ボタン Grid（スクショの配置に合わせる）
  buttonGrid: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: '40px', 
    width: '100%', 
    maxWidth: '800px',
    marginBottom: 'auto' // 下部のバーを押し出すため
  },
  // 丸付けボタン（オレンジ系）
  btnMaru: { 
    height: '220px', 
    borderRadius: '30px', 
    border: 'none', 
    background: 'linear-gradient(135deg, #e67e22, #f39c12)', // グラデーション
    color: '#fff', 
    fontSize: '1.6rem', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    padding: '20px',
    lineHeight: '1.4',
    boxShadow: '0 8px 15px rgba(230,126,34,0.3)', // オレンジの影
    transition: 'transform 0.1s',
  },
  // 質問ボタン（水色系）
  btnQuestion: { 
    height: '220px', 
    borderRadius: '30px', 
    border: 'none', 
    background: 'linear-gradient(135deg, #3498db, #5dade2)',
    color: '#fff', 
    fontSize: '1.6rem', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    padding: '20px',
    lineHeight: '1.4',
    boxShadow: '0 8px 15px rgba(52,152,219,0.3)', // 水色の影
    transition: 'transform 0.1s',
  },

  // 順番待ち画面（サイドバーレイアウト用に調整）
  waitingCard: { backgroundColor: '#fff', padding: '60px 40px', borderRadius: '30px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '6px solid #27ae60', marginBottom: 'auto' },
  waitingTitle: { fontSize: '1.6rem', fontWeight: 'bold', color: '#27ae60', marginBottom: '15px' },
  queueNumber: { fontSize: '7rem', fontWeight: 'bold', color: '#333', lineHeight: 1 },
  waitingText: { marginTop: '30px', color: '#666', lineHeight: '1.6', fontSize: '1.2rem' },

  // 下部のログイン情報バー
  loginInfoBar: { 
    width: '100%', 
    textAlign: 'center', 
    background: '#fff', 
    padding: '12px 20px', 
    borderRadius: '12px', 
    color: '#666', 
    fontSize: '1rem', 
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    marginTop: '40px' 
  },
  
  emptyContent: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '1.5rem', color: '#999' }
};