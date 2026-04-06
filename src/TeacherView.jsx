import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
const modelAnswerBooks = [
  { id: 1, title: "中1 数学", cover: "/covers/math1.png", pdf: "/pdfs/math1.pdf" },
  { id: 2, title: "中2 数学", cover: "/covers/math2.png", pdf: "/pdfs/math2.pdf" },
  { id: 3, title: "中3 数学", cover: "/covers/math3.png", pdf: "/pdfs/math3.pdf" },
  // ... 本のデータを追加
];

const GAS_URL = import.meta.env.VITE_GAS_URL;

// 運営管理画面データ
  const adminAccountList = [
    { service: "atama＋ポータル", url: "https://api.atama.plus/portal/login/", id: "netz校舎番号4桁_admin", pass: "1TO1netz" },
    { service: "atama＋コーチ", url: "https://coach.atama.plus/public/login", id: "netzt講師番号6桁", pass: "講師番号2回" },
    { service: "aim@for school", url: "https://edunetzaim.teachers-web.jp/sign-in", id: "netz教室番号", pass: "1TO1netz" },
    { service: "駿台Diverseコーチ画面", url: "https://lms2.s-diverse.com/coach", id: "受講校舎番号4ケタ@edu-netz.com", pass: "coach00!" },
    { service: "情報AIドリル管理者用栗林", url: "https://drill-manager.lifeistech-lesson.jp/login", id: "KKS900148", pass: "u1UhZAHv" },
    { service: "情報AIドリル管理者用木太南", url: "https://drill-manager.lifeistech-lesson.jp/login", id: "KKS900150", pass: "3MNq6h4F" },
    { service: "情報AIドリル管理者用水田", url: "https://drill-manager.lifeistech-lesson.jp/login", id: "KKS900149", pass: "QZHUxf6M" },
    { service: "情報AIドリル管理者用番町", url: "https://drill-manager.lifeistech-lesson.jp/login", id: "KKS900147", pass: "p9HWdTHb" },
    { service: "Lepton (教室用)", url: "https://console.lepton-line.jp/login", id: "T00007134", pass: "netznetz" },
    { service: "四谷大塚テスト", url: "https://pos.yotsuyaotsuka.net/SSO2022/SSO2/toitsu_t/SSOLogin/SSOLogin", id: "栗林:T88790037 / 木太南:T88790093 / 水田:T88790063 / 番町:T88790131", pass: "netz" },
  ];

  // 生徒画面データ
  const studentAccountList = [
    { service: "atama＋", url: "https://student.atama.plus/", creator: "各教室", id: "netzs生徒番号6ケタ", pass: "誕生日4桁" },
    { service: "aim@", url: "https://www.aim-at.jp/sign-in", creator: "自動(毎日)", id: "netzs生徒番号6ケタ", pass: "netz生徒番号6ケタ" },
    { service: "駿台Diverse", url: "https://lms2.s-diverse.com/login", creator: "自動(毎日)", id: "生徒番号@edu-netz.com", pass: "-" },
    { service: "情報AIドリル", url: "https://drill.lifeistech-lesson.jp/", creator: "教務ユニット", id: "-", pass: "-" },
    { service: "KOOV (ロボプロ)", url: "https://www.koov.io/downloads", creator: "教務ユニット", id: "生徒番号6ケタ@netz", pass: "netz生徒番号6ケタ" },
    { service: "PROC (中プロ)", url: "https://account.sonyged.com/users/oauth/sign_in", creator: "教務ユニット", id: "生徒番号6ケタ@netz-proc", pass: "1TO1netz" },
  ];

export default function TeacherView({ userName, role, unit, handleLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeContent, setActiveContent] = useState('notices');
  const [notifications, setNotifications] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('すべて');

  // --- 自動ログアウト（無操作15分） ---
  const timeoutRef = useRef(null);
  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const TIMEOUT_DURATION = 900000;
    timeoutRef.current = setTimeout(() => {
      alert("15分間操作がなかったため、自動的にログアウトしました。");
      handleLogout();
    }, TIMEOUT_DURATION);
  };

  useEffect(() => {
    resetTimer();
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleUserActivity = () => resetTimer();
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, []);

  // --- 校舎リスト読み込み ---
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const response = await fetch('/schools.csv');
        const text = await response.text();
        const rows = text.split('\n').map(row => row.trim()).filter(row => row !== "");
        const schoolNames = rows.slice(1).map(row => row.split(',')[0]);
        setSchools(['すべて', ...schoolNames]);
      } catch (e) { console.error("校舎リスト読み込み失敗"); }
    };
    loadSchools();
  }, []);

  // --- 通知取得・完了ロジック ---
  const fetchNotifications = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications", unit: unit }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") setNotifications(response.data.notifications);
    } catch (e) { console.error("更新失敗"); }
  };

  const handleComplete = async (userId, targetName) => {
    try {
      await axios.post(GAS_URL, JSON.stringify({ action: "deleteNotification", userId, userName: targetName, unit: unit }), { headers: { 'Content-Type': 'text/plain' } });
      fetchNotifications();
    } catch (e) { alert("削除失敗"); }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredNotifications = notifications.filter(n => {
    if (selectedSchool === 'すべて') return true;
    return n.school === selectedSchool;
  });

  // --- ★ ② メニュー項目の動的生成 ---
  const baseMenuItems = [
    { id: 'notices', label: 'お知らせ', icon: '📢' },
    { id: 'notifications', label: '個トレメニュー', icon: '🎯' },
    { id: 'app-usage', label: 'アプリ利用チェック', icon: '📱' },
    { id: 'school-progress', label: '学校進捗チェック', icon: '🏫' },
  ];

  const adminMenuItems = [
    { id: 'passwords', label: '各種パスワード', icon: '🔑' },
    { id: 'manual', label: 'スタッフマニュアル', icon: '📖', isLink: true, url: 'https://morning-hoverfly-7d7.notion.site/22187fb597ea8051a617cc4850365bd9?pvs=74' }, // notionスタッフマニュアル
    { id: 'takamatsu-staff', label: '高松スタッフ(SharePoint)', icon: '🏢',isLink: true, url: 'https://edunetz.sharepoint.com/sites/takamatustaff/SitePages/CollabHome.aspx?ga=1' },
    { id: 'model-answer', label: '個トレ２（模範解答）', icon: '✅' },
  ];

  const menuItems = role === 'admin' ? [...baseMenuItems, ...adminMenuItems] : baseMenuItems;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => setIsMenuOpen(true)} style={styles.menuBtn}>☰</button>
          {/* ★ ① ヘッダー表記の変更 */}
          <div style={styles.headerTitle}>
            {role === 'admin' && <span style={styles.adminLabel}>社員・スタッフ</span>}
            【業務メニュー】{userName} 先生
          </div>
          <button onClick={fetchNotifications} style={styles.refreshIcon}>🔄</button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.contentArea}>
          
          {/* 1. お知らせ */}
          {activeContent === 'notices' && (
            <div>
              <h2 style={styles.contentTitle}>📢 お知らせ</h2>
              <div style={styles.emptyState}>現在、全体へのお知らせはありません。</div>
            </div>
          )}

          {/* 2. 個トレメニュー */}
          {activeContent === 'notifications' && (
            <div>
              <div style={styles.contentHeader}>
                <h2 style={styles.contentTitle}>🎯 個トレメニュー</h2>
                <div style={styles.filterArea}>
                  <label style={styles.label}>校舎選択：</label>
                  <select style={styles.select} value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)}>
                    {schools.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {filteredNotifications.length === 0 ? (
                <div style={styles.emptyState}>{selectedSchool === 'すべて' ? "現在、依頼はありません。" : `${selectedSchool}校の依頼はありません。`}</div>
              ) : (
                <div style={styles.grid}>
                  {filteredNotifications.map((n, index) => (
                    <div key={index} style={styles.card(n.status)}>
                      <div style={styles.queueBadge}>{n.queueNumber}</div>
                      <div style={styles.cardTop}><span>{n.time}</span><span style={styles.gradeBadge}>{n.grade}</span></div>
                      <div style={styles.cardBody}><span style={styles.studentName}>{n.name} <small>さん</small></span><div style={styles.statusLabel(n.status)}>{n.status}</div></div>
                      <button onClick={() => handleComplete(n.userId, n.name)} style={styles.doneBtn}>対応完了</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ★ 3. 各種パスワード画面（画像のデザインを反映） */}
          {activeContent === 'passwords' && (
            <div style={styles.passwordContainer}>
              <h2 style={styles.contentTitle}>🔑 各種パスワード一覧</h2>

              {/* 1-1. 運営管理画面一覧 */}
              <h3 style={styles.tableTitle}>1-1. 運営管理画面一覧</h3>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>ログインURL</th>
                      <th style={styles.th}>ログインID</th>
                      <th style={styles.th}>パスワード</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminAccountList.map((item, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                            {item.service} 🔗
                          </a>
                        </td>
                        <td style={styles.td}>{item.id}</td>
                        <td style={styles.td}><code style={styles.tableCode}>{item.pass}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 1-2. 生徒画面一覧 */}
              <h3 style={styles.tableTitle}>1-2. 生徒画面一覧</h3>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>ログインURL</th>
                      <th style={styles.th}>アカウント作成者</th>
                      <th style={styles.th}>ログインID</th>
                      <th style={styles.th}>パスワード</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAccountList.map((item, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                            {item.service} 🔗
                          </a>
                        </td>
                        <td style={styles.td}>{item.creator}</td>
                        <td style={styles.td}>{item.id}</td>
                        <td style={styles.td}><code style={styles.tableCode}>{item.pass}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. 個トレ2（模範解答）本棚 */}
          {activeContent === 'model-answer' && (
            <div style={styles.bookshelfContainer}>
              <h2 style={styles.contentTitle}>📚 個トレ2 模範解答</h2>
              
              <div style={styles.bookshelf}>
                {modelAnswerBooks.map((book) => (
                  <div key={book.id} style={styles.bookWrapper} onClick={() => window.open(book.pdf, '_blank')}>
                    <div style={styles.bookCover}>
                      <img src={book.cover} alt={book.title} style={styles.coverImage} />
                    </div>
                    <div style={styles.bookTitle}>{book.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. 残りの「制作中」メニュー */}
          {(activeContent === 'app-usage' || activeContent === 'school-progress') && (
            <div style={styles.emptyState}>制作中...</div>
          )}
        </div>
      </main>

      {isMenuOpen && (
        <>
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>機能一覧</div>
            {menuItems.map(item => (
              <div 
                key={item.id} 
                style={styles.menuItem(activeContent === item.id)} 
                onClick={() => { 
                  if (item.isLink) {
                    window.open(item.url, '_blank');
                  } else {
                    setActiveContent(item.id); 
                  }
                  setIsMenuOpen(false); 
                }}
              >
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
        <div style={styles.version}>Ver.2.1.3</div>
      </footer>
    </div>
  );
}

const styles = {
  // --- 既存のスタイル ---
  container: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'fixed', top: 0, left: 0 },
  header: { background: '#27ae60', color: '#fff', height: '50px', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', height: '100%' },
  menuBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' },
  headerTitle: { fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  // ★ ① 社員・スタッフ用ラベルのスタイル
  adminLabel: { backgroundColor: '#ffd700', color: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '900' },
  refreshIcon: { background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' },
  main: { flex: 1, backgroundColor: '#f0f2f5', overflowY: 'auto', padding: '30px 20px' },
  contentArea: { maxWidth: '1000px', margin: '0 auto' },
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
  version: { position: 'absolute', right: '10px', bottom: '5px', color: '#fff', fontSize: '10px' },
  bookshelfContainer: {
    backgroundColor: '#d2b48c', // 木の色（タン）
    padding: '40px 20px',
    borderRadius: '16px',
    minHeight: '80vh',
    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)'
  },
  bookshelf: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '40px 20px',
    padding: '20px'
  },
  bookWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  bookCover: {
    width: '100px',
    height: '140px',
    backgroundColor: '#fff',
    borderRadius: '4px 8px 8px 4px', // 本の背表紙側を少し丸める
    boxShadow: '5px 5px 15px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    borderLeft: '4px solid rgba(0,0,0,0.1)' // 本の厚み感
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  bookTitle: {
    marginTop: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#3e2723',
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: '2px 6px',
    borderRadius: '4px'
  },
};