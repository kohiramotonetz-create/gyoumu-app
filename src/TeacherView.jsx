import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function TeacherView({ userName, handleLogout }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 通知一覧を取得する関数 ---
  const fetchNotifications = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "getNotifications" 
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      if (response.data.result === "success") {
        setNotifications(response.data.notifications);
      }
    } catch (e) {
      console.error("通知の取得に失敗しました");
    }
  };

  // --- 対応完了（削除）処理 ---
  const handleComplete = async (userId, targetName) => {
    try {
      await axios.post(GAS_URL, JSON.stringify({ 
        action: "deleteNotification",
        userId: userId,
        userName: targetName
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      // 成功したら一覧を再取得
      fetchNotifications();
    } catch (e) {
      alert("削除に失敗しました");
    }
  };

  // --- 初回ロード ＆ 5秒おきに自動更新 ---
  useEffect(() => {
    fetchNotifications(); // 初回
    const timer = setInterval(fetchNotifications, 5000); // 5秒おき
    return () => clearInterval(timer); // 画面を閉じたらタイマー停止
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>👨‍🏫 講師用ダッシュボード</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>担当：{userName} 先生</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>ログアウト</button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>✋ 丸付け・質問 依頼一覧</h2>
            <button onClick={fetchNotifications} style={styles.refreshBtn}>🔄 手動更新</button>
          </div>

          {notifications.length === 0 ? (
            <div style={styles.emptyState}>現在、依頼はありません。平和です。</div>
          ) : (
            <div style={styles.list}>
              {notifications.map((n, index) => (
                <div key={index} style={n.status === "丸付け待ち" ? styles.cardCheck : styles.cardQuestion}>
                  <div style={styles.cardInfo}>
                    <span style={styles.time}>{n.time}</span>
                    <span style={styles.grade}>{n.grade}</span>
                    <span style={styles.name}>{n.name} さん</span>
                    <span style={styles.statusBadge(n.status)}>{n.status}</span>
                  </div>
                  <button 
                    onClick={() => handleComplete(n.userId, n.name)}
                    style={styles.doneBtn}
                  >
                    対応完了
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// --- スタイル定義 ---
const styles = {
  container: { height: '100vh', backgroundColor: '#f0f2f5', display: 'flex', flexDirection: 'column' },
  header: { background: '#fff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  title: { fontSize: '1.4rem', margin: 0, color: '#1a73e8' },
  logoutBtn: { padding: '8px 16px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' },
  main: { flex: 1, padding: '30px', overflowY: 'auto' },
  section: { maxWidth: '1000px', margin: '0 auto' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  refreshBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #1a73e8', color: '#1a73e8', borderRadius: '4px', cursor: 'pointer' },
  emptyState: { padding: '50px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', color: '#999' },
  list: { display: 'flex', flexDirection: 'column', gap: '15px' },
  cardCheck: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', 
    backgroundColor: '#fff', borderLeft: '10px solid #e67e22', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' 
  },
  cardQuestion: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', 
    backgroundColor: '#fff', borderLeft: '10px solid #3498db', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' 
  },
  cardInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
  time: { color: '#999', fontSize: '0.9rem', width: '60px' },
  grade: { background: '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' },
  name: { fontSize: '1.2rem', fontWeight: 'bold' },
  statusBadge: (status) => ({
    padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
    backgroundColor: status === "丸付け待ち" ? '#fff3e0' : '#e3f2fd',
    color: status === "丸付け待ち" ? '#e67e22' : '#3498db',
  }),
  doneBtn: { padding: '10px 20px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
};