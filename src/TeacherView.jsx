import { useState, useEffect } from 'react'
import axios from 'axios'

export default function TeacherView({ userName, role, handleLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false); // メニューの開閉
  const [activeContent, setActiveContent] = useState('notifications'); // 現在表示中の中身

  // メニュー項目の定義（roleによって中身を変える）
  const menuItems = [
    { id: 'notifications', label: '通知履歴', icon: '🔔', roles: ['teacher', 'admin'] },
    { id: 'student-check', label: '担任生徒チェック', icon: '📈', roles: ['teacher', 'admin'] },
    { id: 'shift', label: '講師シフト管理', icon: '📅', roles: ['admin'] }, // 社員のみ
    { id: 'payment', label: '月謝・入金管理', icon: '💰', roles: ['admin'] }, // 社員のみ
  ];

  // 自分の権限で見れる項目だけを抽出
  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div style={styles.container}>
      {/* --- ヘッダー (緑) --- */}
      <header style={styles.header}>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={styles.menuBtn}>☰</button>
        <div style={styles.headerTitle}>【業務メニュー】{userName} 先生</div>
        <div style={styles.refreshIcon}>🔄</div>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* --- サイドバーメニュー (三本線で開閉) --- */}
        {isMenuOpen && (
          <>
            <div style={styles.sidebar}>
              <div style={styles.sidebarHeader}>機能一覧</div>
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  style={styles.menuItem(activeContent === item.id)}
                  onClick={() => { setActiveContent(item.id); setIsMenuOpen(false); }}
                >
                  <span style={{ marginRight: '10px' }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
              <div style={styles.logoutItem} onClick={handleLogout}>🚪 ログアウト</div>
            </div>
            {/* 背景クリックで閉じるためのオーバーレイ */}
            <div style={styles.overlay} onClick={() => setIsMenuOpen(false)} />
          </>
        )}

        {/* --- メインコンテンツエリア --- */}
        <main style={styles.main}>
          {activeContent === 'notifications' && (
            <div>
              <h2 style={{ borderBottom: '2px solid #27ae60', paddingBottom: '10px' }}>🔔 通知履歴</h2>
              {/* ここに以前作った通知リストのロジックを入れる */}
              <p>現在の依頼状況がここに表示されます...</p>
            </div>
          )}
          {activeContent === 'student-check' && <div>担任生徒の進捗画面（制作中）</div>}
          {activeContent === 'shift' && <div>【社員限定】シフト管理画面</div>}
        </main>
      </div>

      {/* --- フッター (緑) --- */}
      <footer style={styles.footer}>
        <div style={styles.homeIcon}>🏠<br/><span style={{fontSize:'10px'}}>HOME</span></div>
        <div style={styles.version}>Ver.2.1.1</div>
      </footer>
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', overflow: 'hidden' },
  header: { background: '#132c4a', color: '#fff', height: '50px', display: 'flex', alignItems: 'center', padding: '0 15px', justifyContent: 'space-between', borderBottom: '4px solid #27ae60' },
  menuBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' },
  headerTitle: { fontSize: '14px', fontWeight: 'bold' },
  refreshIcon: { fontSize: '20px', cursor: 'pointer' },
  
  sidebar: { position: 'absolute', top: 0, left: 0, width: '250px', height: '100%', background: '#fff', boxShadow: '2px 0 10px rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', flexDirection: 'column' },
  sidebarHeader: { background: '#132c4a', color: '#fff', padding: '15px', fontWeight: 'bold', textAlign: 'center' },
  menuItem: (isActive) => ({ padding: '15px 20px', borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: isActive ? '#f0f9f4' : '#fff', color: isActive ? '#27ae60' : '#333', fontWeight: isActive ? 'bold' : 'normal' }),
  logoutItem: { marginTop: 'auto', padding: '15px 20px', borderTop: '1px solid #eee', color: '#e74c3c', cursor: 'pointer' },
  overlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', zIndex: 999 },

  main: { flex: 1, padding: '20px', overflowY: 'auto' },

  footer: { background: '#132c4a', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderTop: '4px solid #27ae60' },
  homeIcon: { color: '#ff007f', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold' },
  version: { position: 'absolute', right: '10px', bottom: '5px', color: '#fff', fontSize: '10px' }
};