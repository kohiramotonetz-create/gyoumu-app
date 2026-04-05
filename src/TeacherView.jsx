import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function TeacherView({ userName, role, handleLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // デフォルト画面を「お知らせ」に設定
  const [activeContent, setActiveContent] = useState('notices');
  const [notifications, setNotifications] = useState([]);

  // 通知取得ロジック（個トレメニュー用）
  const fetchNotifications = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications" }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") setNotifications(response.data.notifications);
    } catch (e) { console.error("更新失敗"); }
  };

  const handleComplete = async (userId, targetName) => {
    try {
      await axios.post(GAS_URL, JSON.stringify({ action: "deleteNotification", userId, userName: targetName }), { headers: { 'Content-Type': 'text/plain' } });
      fetchNotifications();
    } catch (e) { alert("削除失敗"); }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- 講師用メニューの定義 ---
  const menuItems = [
    { id: 'notices', label: 'お知らせ', icon: '📢' },
    { id: 'notifications', label: '個トレメニュー', icon: '🎯' },
    { id: 'app-usage', label: 'アプリ利用チェック', icon: '📱' },
    { id: 'school-progress', label: '学校進捗チェック', icon: '🏫' },
  ];

  return (
    <div style={styles.container}>
      {/* --- ヘッダー --- */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => setIsMenuOpen(true)} style={styles.menuBtn}>☰</button>
          <div style={styles.headerTitle}>【業務メニュー】{userName} 先生</div>
          <button onClick={fetchNotifications} style={styles.refreshIcon}>🔄</button>
        </div>
      </header>

      {/* --- メインコンテンツエリア --- */}
      <main style={styles.main}>
        <div style={styles.contentArea}>
          
          {/* 1. お知らせ画面 */}
          {activeContent === 'notices' && (
            <div>
              <h2 style={styles.contentTitle}>📢 お知らせ</h2>
              <div style={styles.emptyState}>現在、全体へのお知らせはありません。</div>
            </div>
          )}

          {/* 2. 個トレメニュー（これまでの通知履歴） */}
          {activeContent === 'notifications' && (
            <div>
              <h2 style={styles.contentTitle}>🎯 個トレメニュー (通知履歴)</h2>
              {notifications.length === 0 ? (
                <div style={styles.emptyState}>現在、依頼はありません。</div>
              ) : (
                <div style={styles.grid}>
                  {notifications.map((n, index) => (
                    <div key={index} style={styles.card(n.status)}>
                      <div style={styles.queueBadge}>{n.queueNumber}</div>
                      <div style={styles.cardTop}>
                        <span>{n.time}</span>
                        <span style={styles.gradeBadge}>{n.grade}</span>
                      </div>
                      <div style={styles.cardBody}>
                        <span style={styles.studentName}>{n.name} <small>さん</small></span>
                        <div style={styles.statusLabel(n.status)}>{n.status}</div>
                      </div>
                      <button onClick={() => handleComplete(n.userId, n.name)} style={styles.doneBtn}>対応完了</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. アプリ利用チェック */}
          {activeContent === 'app-usage' && (
            <div>
              <h2 style={styles.contentTitle}>📱 アプリ利用チェック</h2>
              <div style={styles.emptyState}>生徒のアプリログイン状況などを確認できます（制作中）</div>
            </div>
          )}

          {/* 4. 学校進捗チェック */}
          {activeContent === 'school-progress' && (
            <div>
              <h2 style={styles.contentTitle}>🏫 学校進捗チェック</h2>
              <div style={styles.emptyState}>各生徒の学校の進度を確認できます（制作中）</div>
            </div>
          )}

        </div>
      </main>

      {/* --- サイドバー --- */}
      {isMenuOpen && (
        <>
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>機能一覧</div>
            {menuItems.map(item => (
              <div 
                key={item.id} 
                style={styles.menuItem(activeContent === item.id)} 
                onClick={() => { setActiveContent(item.id); setIsMenuOpen(false); }}
              >
                <span style={{ marginRight: '10px' }}>{item.icon}</span>{item.label}
              </div>
            ))}
            <div style={styles.logoutItem} onClick={handleLogout}>🚪 ログアウト</div>
          </div>
          <div style={styles.overlay} onClick={() => setIsMenuOpen(false)} />
        </>
      )}

      {/* --- フッター --- */}
      <footer style={styles.footer}>
        <div style={styles.homeIcon}>🏠<br/><span style={{fontSize:'10px'}}>HOME</span></div>
        <div style={styles.version}>Ver.2.1.1</div>
      </footer>
    </div>
  );
}

const styles = {
  container: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'fixed', top: 0, left: 0 },
  header: { background: '#27ae60', color: '#fff', height: '50px', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', height: '100%' },
  menuBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' },
  headerTitle: { fontSize: '16px', fontWeight: 'bold' },
  refreshIcon: { background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' },

  main: { flex: 1, backgroundColor: '#f0f2f5', overflowY: 'auto', padding: '30px 20px' },
  contentArea: { maxWidth: '1000px', margin: '0 auto' },
  contentTitle: { borderBottom: '2px solid #27ae60', paddingBottom: '10px', marginBottom: '30px', color: '#333' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' },
  card: (status) => ({ 
    position: 'relative', 
    backgroundColor: '#fff', 
    borderRadius: '12px', 
    padding: '20px', 
    borderTop: `6px solid ${status === "丸付け待ち" ? '#e67e22' : '#3498db'}`, 
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)' 
  }),
  queueBadge: { position: 'absolute', top: '-15px', left: '-15px', width: '40px', height: '40px', backgroundColor: '#333', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', zIndex: 5, border: '2px solid #fff' },
  cardTop: { display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '0.9rem', marginBottom: '10px' },
  gradeBadge: { background: '#34495e', color: '#fff', padding: '2px 8px', borderRadius: '4px' },
  cardBody: { textAlign: 'center', marginBottom: '15px' },
  studentName: { fontSize: '1.6rem', fontWeight: 'bold', display: 'block' },
  statusLabel: (status) => ({ display: 'inline-block', marginTop: '10px', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: status === "丸付け待ち" ? '#fff3e0' : '#e3f2fd', color: status === "丸付け待ち" ? '#e67e22' : '#3498db' }),
  doneBtn: { width: '100%', padding: '10px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '100px 20px', color: '#999', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #ccc' },

  sidebar: { position: 'fixed', top: 0, left: 0, width: '280px', height: '100%', background: '#fff', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '2px 0 15px rgba(0,0,0,0.3)' },
  sidebarHeader: { background: '#27ae60', color: '#fff', padding: '15px', fontWeight: 'bold', textAlign: 'center' },
  menuItem: (isActive) => ({ padding: '15px 20px', borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: isActive ? '#f0f9f4' : '#fff', color: isActive ? '#27ae60' : '#333', fontWeight: isActive ? 'bold' : 'normal' }),
  logoutItem: { marginTop: 'auto', padding: '20px', borderTop: '1px solid #eee', color: '#e74c3c', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 999 },

  footer: { background: '#27ae60', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: '#fff' },
  homeIcon: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  version: { position: 'absolute', right: '10px', bottom: '5px', color: '#fff', fontSize: '10px' }
};