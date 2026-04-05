import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function TeacherView({ userName, role, handleLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeContent, setActiveContent] = useState('notices');
  const [notifications, setNotifications] = useState([]);
  
  // 校舎選択用のステート
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('すべて');

  // --- 校舎リスト(CSV)を読み込む ---
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const response = await fetch('/schools.csv');
        const text = await response.text();
        const rows = text.split('\n').map(row => row.trim()).filter(row => row !== "");
        // ヘッダーを除いた2行目以降を取得
        const schoolList = rows.slice(1);
        setSchools(['すべて', ...schoolList]);
      } catch (e) {
        console.error("校舎リストの読み込みに失敗しました");
      }
    };
    loadSchools();
  }, []);

  // --- 通知取得ロジック ---
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

  // --- 表示する通知をフィルタリング ---
  // (注: GAS側の「通知」シートに校舎情報の列があることが前提です。
  //  もし現在ない場合は、通知表示のみを出し分けるか、シート構成の調整が必要です)
  const filteredNotifications = notifications.filter(n => {
    if (selectedSchool === 'すべて') return true;
    return n.school === selectedSchool; // GASから返るデータに school が含まれている場合
  });

  const menuItems = [
    { id: 'notices', label: 'お知らせ', icon: '📢' },
    { id: 'notifications', label: '個トレメニュー', icon: '🎯' },
    { id: 'app-usage', label: 'アプリ利用チェック', icon: '📱' },
    { id: 'school-progress', label: '学校進捗チェック', icon: '🏫' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => setIsMenuOpen(true)} style={styles.menuBtn}>☰</button>
          <div style={styles.headerTitle}>【業務メニュー】{userName} 先生</div>
          <button onClick={fetchNotifications} style={styles.refreshIcon}>🔄</button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.contentArea}>
          
          {activeContent === 'notices' && (
            <div>
              <h2 style={styles.contentTitle}>📢 お知らせ</h2>
              <div style={styles.emptyState}>現在、全体へのお知らせはありません。</div>
            </div>
          )}

          {activeContent === 'notifications' && (
            <div>
              <div style={styles.contentHeader}>
                <h2 style={styles.contentTitle}>🎯 個トレメニュー</h2>
                {/* 校舎選択セレクトボックス */}
                <div style={styles.filterArea}>
                  <label style={styles.label}>校舎選択：</label>
                  <select 
                    style={styles.select} 
                    value={selectedSchool} 
                    onChange={(e) => setSelectedSchool(e.target.value)}
                  >
                    {schools.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {filteredNotifications.length === 0 ? (
                <div style={styles.emptyState}>
                  {selectedSchool === 'すべて' ? "現在、依頼はありません。" : `${selectedSchool}校の依頼はありません。`}
                </div>
              ) : (
                <div style={styles.grid}>
                  {filteredNotifications.map((n, index) => (
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

          {activeContent === 'app-usage' && <div style={styles.emptyState}>制作中...</div>}
          {activeContent === 'school-progress' && <div style={styles.emptyState}>制作中...</div>}
        </div>
      </main>

      {/* サイドバーとフッターは変更なしのため省略（既存のものを使用） */}
      {isMenuOpen && (
        <>
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>機能一覧</div>
            {menuItems.map(item => (
              <div key={item.id} style={styles.menuItem(activeContent === item.id)} onClick={() => { setActiveContent(item.id); setIsMenuOpen(false); }}>
                <span style={{ marginRight: '10px' }}>{item.icon}</span>{item.label}
              </div>
            ))}
            <div style={styles.logoutItem} onClick={handleLogout}>🚪 ログアウト</div>
          </div>
          <div style={styles.overlay} onClick={() => setIsMenuOpen(false)} />
        </>
      )}
      <footer style={styles.footer}>
        <div style={styles.homeIcon}>🏠<br/><span style={{fontSize:'10px'}}>HOME</span></div>
        <div style={styles.version}>Ver.2.1.2</div>
      </footer>
    </div>
  );
}

const styles = {
  // ...既存のスタイル...
  container: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'fixed', top: 0, left: 0 },
  header: { background: '#27ae60', color: '#fff', height: '50px', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', height: '100%' },
  menuBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' },
  headerTitle: { fontSize: '16px', fontWeight: 'bold' },
  refreshIcon: { background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' },
  main: { flex: 1, backgroundColor: '#f0f2f5', overflowY: 'auto', padding: '30px 20px' },
  contentArea: { maxWidth: '1000px', margin: '0 auto' },
  
  // 新規追加・調整スタイル
  contentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #27ae60', paddingBottom: '10px' },
  contentTitle: { margin: 0, color: '#333', border: 'none' },
  filterArea: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff', padding: '5px 15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  label: { fontSize: '14px', fontWeight: 'bold', color: '#666' },
  select: { padding: '8px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' },
  card: (status) => ({ position: 'relative', backgroundColor: '#fff', borderRadius: '12px', padding: '20px', borderTop: `6px solid ${status === "丸付け待ち" ? '#e67e22' : '#3498db'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }),
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