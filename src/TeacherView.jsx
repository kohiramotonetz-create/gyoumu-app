import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function TeacherView({ userName, role, handleLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeContent, setActiveContent] = useState('notifications');
  const [notifications, setNotifications] = useState([]);

  // 通知取得ロジック
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

  const menuItems = [
    { id: 'notifications', label: '通知履歴', icon: '🔔', roles: ['teacher', 'admin'] },
    { id: 'student-check', label: '担任生徒チェック', icon: '📈', roles: ['teacher', 'admin'] },
    { id: 'shift', label: '講師シフト管理', icon: '📅', roles: ['admin'] },
    { id: 'payment', label: '月謝・入金管理', icon: '💰', roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div style={styles.container}>
      {/* --- ヘッダー (画面上端に固定) --- */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => setIsMenuOpen(true)} style={styles.menuBtn}>☰</button>
          <div style={styles.headerTitle}>【業務メニュー】{userName} 先生</div>
          <button onClick={fetchNotifications} style={styles.refreshIcon}>🔄</button>
        </div>
      </header>

      {/* --- メインコンテンツエリア --- */}
      <main style={styles.main}>
        {activeContent === 'notifications' && (
          <div style={styles.contentArea}>
            <h2 style={styles.contentTitle}>🔔 通知履歴</h2>
            {notifications.length === 0 ? (
              <div style={styles.emptyState}>現在、依頼はありません。</div>
            ) : (
              <div style={styles.grid}>
                {notifications.map((n, index) => (
                  <div key={index} style={styles.card(n.status)}>
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
        {activeContent !== 'notifications' && <div style={styles.contentArea}>制作中...</div>}
      </main>

      {/* --- サイドバー (オーバーレイ形式) --- */}
      {isMenuOpen && (
        <>
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>機能一覧</div>
            {filteredItems.map(item => (
              <div key={item.id} style={styles.menuItem(activeContent === item.id)} onClick={() => { setActiveContent(item.id); setIsMenuOpen(false); }}>
                <span style={{ marginRight: '10px' }}>{item.icon}</span>{item.label}
              </div>
            ))}
            <div style={styles.logoutItem} onClick={handleLogout}>🚪 ログアウト</div>
          </div>
          <div style={styles.overlay} onClick={() => setIsMenuOpen(false)} />
        </>
      )}

      {/* --- フッター (画面下端に固定) --- */}
      <footer style={styles.footer}>
        <div style={styles.homeIcon}>🏠<br/><span style={{fontSize:'10px'}}>HOME</span></div>
        <div style={styles.version}>Ver.2.1.1</div>
      </footer>
    </div>
  );
}

const styles = {
  container: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'fixed', top: 0, left: 0 },
  header: { background: '#001529', color: '#fff', height: '50px', borderBottom: '4px solid #27ae60', zIndex: 10 },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', height: '100%' },
  menuBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' },
  headerTitle: { fontSize: '16px', fontWeight: 'bold' },
  refreshIcon: { background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' },

  main: { flex: 1, backgroundColor: '#f0f2f5', overflowY: 'auto', padding: '20px' },
  contentArea: { maxWidth: '1000px', margin: '0 auto' },
  contentTitle: { borderBottom: '2px solid #27ae60', paddingBottom: '10px', marginBottom: '20px' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  card: (status) => ({ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', borderTop: `6px solid ${status === "丸付け待ち" ? '#e67e22' : '#3498db'}`, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }),
  cardTop: { display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '0.9rem', marginBottom: '10px' },
  gradeBadge: { background: '#34495e', color: '#fff', padding: '2px 8px', borderRadius: '4px' },
  cardBody: { textAlign: 'center', marginBottom: '15px' },
  studentName: { fontSize: '1.6rem', fontWeight: 'bold', display: 'block' },
  statusLabel: (status) => ({ display: 'inline-block', marginTop: '10px', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: status === "丸付け待ち" ? '#fff3e0' : '#e3f2fd', color: status === "丸付け待ち" ? '#e67e22' : '#3498db' }),
  doneBtn: { width: '100%', padding: '10px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '50px', color: '#999' },

  sidebar: { position: 'fixed', top: 0, left: 0, width: '280px', height: '100%', background: '#fff', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '2px 0 15px rgba(0,0,0,0.3)' },
  sidebarHeader: { background: '#001529', color: '#fff', padding: '15px', fontWeight: 'bold', textAlign: 'center' },
  menuItem: (isActive) => ({ padding: '15px 20px', borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: isActive ? '#f0f9f4' : '#fff', color: isActive ? '#27ae60' : '#333', fontWeight: isActive ? 'bold' : 'normal' }),
  logoutItem: { marginTop: 'auto', padding: '20px', borderTop: '1px solid #eee', color: '#e74c3c', cursor: 'pointer', textAlign: 'center' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 999 },

  footer: { background: '#001529', height: '60px', borderTop: '4px solid #27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  homeIcon: { color: '#ff007f', textAlign: 'center', fontWeight: 'bold' },
  version: { position: 'absolute', right: '10px', bottom: '5px', color: '#fff', fontSize: '10px' }
};