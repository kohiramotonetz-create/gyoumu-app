import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

// --- modelAnswerBooks, adminAccountList, studentAccountList, GAS_URL は既存の定義をそのまま使用してください ---

export default function TeacherView({ userName, role, unit, handleLogout }) {
  // --- 1. ステート定義 ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeContent, setActiveContent] = useState('notices');
  const [notifications, setNotifications] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('すべて');
  const [selectedGrade, setSelectedGrade] = useState('中1'); // 模範解答で使用
  const [openPdf, setOpenPdf] = useState(null);               // 模範解答で使用
  const [testReviews, setTestReviews] = useState([]);         // 振り返りデータ
  const [reviewLoading, setReviewLoading] = useState(false);

  // テスト振り返りスプレッドシートのCSV公開URL
  const REVIEW_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR1UirqKscX46PAd069V9bXq8Dt1q4R5SF0wCAo4E-FEWdNp4iv1-FZ9Zw3yXoCgFv2gLNAZrA5dvCq/pub?gid=1791584663&single=true&output=csv";

  // --- 2. 自動ログアウト・校舎読み込み ---
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

  // --- 3. 通知取得・完了ロジック ---
  const fetchNotifications = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications", apiKey: import.meta.env.VITE_API_KEY, unit: unit }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") setNotifications(response.data.notifications);
    } catch (e) { console.error("更新失敗"); }
  };

  const handleComplete = async (userId, targetName) => {
    try {
      await axios.post(GAS_URL, JSON.stringify({ action: "deleteNotification", apiKey: import.meta.env.VITE_API_KEY, userId, userName: targetName, unit: unit }), { headers: { 'Content-Type': 'text/plain' } });
      fetchNotifications();
    } catch (e) { alert("削除失敗"); }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- 4. テスト振り返りデータ取得 (admin限定) ---
  useEffect(() => {
    if (activeContent === 'test-review-check' && role === 'admin') {
      const fetchReviews = async () => {
        setReviewLoading(true);
        try {
          const response = await fetch(REVIEW_CSV_URL);
          const text = await response.text();
          const rows = text.split(/\r?\n/).map(row => row.split(','));
          const headers = rows[0].map(h => h.trim());
          const data = rows.slice(1).filter(row => row.length > 1).map(row => {
            let obj = {};
            headers.forEach((h, i) => { obj[h] = row[i] ? row[i].trim() : ""; });
            return obj;
          });
          setTestReviews(data);
        } catch (e) {
          console.error("振り返りデータの取得に失敗しました");
        } finally {
          setReviewLoading(false);
        }
      };
      fetchReviews();
    }
  }, [activeContent, role]);

  // --- 5. メニュー定義 ---
  const baseMenuItems = [
    { id: 'notices', label: 'お知らせ', icon: '📢' },
    { id: 'notifications', label: '個トレメニュー', icon: '🎯' },
    { id: 'app-usage', label: 'アプリ利用チェック', icon: '📱' },
    { id: 'school-progress', label: '学校進捗チェック', icon: '🏫' },
  ];

  const adminMenuItems = [
    { id: 'passwords', label: '各種パスワード', icon: '🔑' },
    { id: 'manual', label: 'スタッフマニュアル', icon: '📖', isLink: true, url: 'https://morning-hoverfly-7d7.notion.site/22187fb597ea8051a617cc4850365bd9?pvs=74' }, 
    { id: 'takamatsu-staff', label: '高松スタッフ(SharePoint)', icon: '🏢', isLink: true, url: 'https://edunetz.sharepoint.com/sites/takamatustaff/SitePages/CollabHome.aspx?ga=1' },
    { id: 'model-answer', label: '個トレ２（模範解答）', icon: '✅' },
    { id: 'test-review-check', label: 'テスト振り返り確認', icon: '📝' },
  ];

  const menuItems = role === 'admin' ? [...baseMenuItems, ...adminMenuItems] : baseMenuItems;
  const filteredNotifications = notifications.filter(n => selectedSchool === 'すべて' || n.school === selectedSchool);

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.menuBtn}>☰</button>
          <div style={styles.headerTitle}>
            {role === 'admin' && <span style={styles.adminLabel}>社員・スタッフ</span>}
            【業務メニュー】{userName} 先生
          </div>
          <button onClick={fetchNotifications} style={styles.refreshIcon}>🔄</button>
        </div>
      </header>

      <div style={styles.body}>
        {/* サイドバー */}
        <aside style={styles.sidebar(isSidebarOpen)}>
          <div style={styles.sidebarHeader}>機能一覧</div>
          <nav style={styles.nav}>
            {menuItems.map(item => (
              <div 
                key={item.id} 
                style={styles.menuItem(activeContent === item.id)} 
                onClick={() => { 
                  if (item.isLink) { window.open(item.url, '_blank'); } 
                  else { setActiveContent(item.id); }
                }}
              >
                <span style={{ marginRight: '10px' }}>{item.icon}</span>{item.label}
              </div>
            ))}
          </nav>
          <div style={styles.logoutItem} onClick={handleLogout}>🚪 ログアウト</div>
        </aside>

        {/* メインコンテンツ */}
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

            {/* 3. テスト振り返り確認 (admin限定) */}
            {activeContent === 'test-review-check' && role === 'admin' && (
              <div>
                <div style={styles.contentHeader}>
                  <h2 style={styles.contentTitle}>📝 テスト振り返り確認</h2>
                  <div style={styles.filterArea}>
                    <label style={styles.label}>校舎フィルタ：</label>
                    <select style={styles.select} value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)}>
                      {schools.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={styles.tableWrapper}>
                  {reviewLoading ? (
                    <p style={{textAlign:'center', padding:'20px'}}>読み込み中...</p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.th}>日時</th>
                          <th style={styles.th}>所属校舎</th>
                          <th style={styles.th}>名前</th>
                          <th style={styles.th}>よかったこと</th>
                          <th style={styles.th}>改善点</th>
                          <th style={styles.th}>次回に向けて</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testReviews
                          .filter(r => selectedSchool === 'すべて' || r["校舎名を入力してください"] === selectedSchool)
                          .map((r, i) => (
                            <tr key={i} style={styles.tr}>
                              <td style={styles.td}>{r["タイムスタンプ"]}</td>
                              <td style={styles.td}>{r["校舎名を入力してください"]}</td>
                              <td style={styles.td}>{r["名前を入力してください"]}</td>
                              <td style={{...styles.td, whiteSpace: 'pre-wrap'}}>{r["よかったこと"]}</td>
                              <td style={{...styles.td, whiteSpace: 'pre-wrap'}}>{r["改善点"]}</td>
                              <td style={{...styles.td, whiteSpace: 'pre-wrap'}}>{r["次回に向けて"]}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

          　{/* 4. 各種パスワード */}
            {activeContent === 'passwords' && (
              <div style={styles.passwordContainer}>
                <h2 style={styles.contentTitle}>🔑 各種パスワード一覧</h2>
                
                <h3 style={{marginTop: '20px', color: '#27ae60'}}>■ 社員・講師用アカウント</h3>
                <div style={{overflowX: 'auto', marginBottom: '30px'}}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>講師名</th>
                        <th style={styles.th}>ログインID</th>
                        <th style={styles.th}>パスワード</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminAccountList.map((acc, i) => (
                        <tr key={i} style={styles.tr}>
                          <td style={styles.td}>{acc.userName}</td>
                          <td style={styles.td}>{acc.userId}</td>
                          <td style={styles.td}>{acc.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 style={{marginTop: '20px', color: '#27ae60'}}>■ 生徒用アカウント</h3>
                <div style={{overflowX: 'auto'}}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>生徒名</th>
                        <th style={styles.th}>ログインID</th>
                        <th style={styles.th}>パスワード</th>
                        <th style={styles.th}>校舎</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAccountList.map((acc, i) => (
                        <tr key={i} style={styles.tr}>
                          <td style={styles.td}>{acc.userName}</td>
                          <td style={styles.td}>{acc.userId}</td>
                          <td style={styles.td}>{acc.password}</td>
                          <td style={styles.td}>{acc.school}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. 個トレ2 (模範解答) */}
            {activeContent === 'model-answer' && (
              <div style={styles.bookshelfContainer}>
                <h2 style={styles.contentTitle}>📚 個トレ2 模範解答</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center' }}>
                  {['中1', '中2', '中3'].map(g => (
                    <button 
                      key={g} 
                      onClick={() => setSelectedGrade(g)}
                      style={{
                        padding: '10px 24px', borderRadius: '25px', border: 'none',
                        backgroundColor: selectedGrade === g ? '#3e2723' : '#fff',
                        color: selectedGrade === g ? '#fff' : '#3e2723',
                        fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div style={styles.bookshelf}>
                  {modelAnswerBooks
                    .filter(book => book.grade === selectedGrade)
                    .map((book) => (
                      <div key={book.id} style={styles.bookWrapper} onClick={() => setOpenPdf(book.pdf)}>
                        <div style={styles.bookCover}>
                          <img 
                            src={book.cover} alt={book.title} style={styles.coverImage} 
                            onError={(e) => { e.target.src = "https://via.placeholder.com/100x140?text=No+Image"; }}
                          />
                        </div>
                        <div style={styles.bookTitle}>{book.title}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {(activeContent === 'app-usage' || activeContent === 'school-progress') && (
              <div style={styles.emptyState}>制作中...</div>
            )}
          </div>
        </main>
      </div>

      {/* PDFモーダル */}
      {openPdf && (
        <div style={styles.modalOverlay} onClick={() => setOpenPdf(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setOpenPdf(null)}>×</button>
            <div style={{ width: '100%', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <iframe src={openPdf} style={{ width: '100%', height: '100%', minHeight: '1000px', border: 'none' }} title="PDF Viewer" />
            </div>
            <button onClick={() => window.open(openPdf, '_blank')} style={styles.modalFullBtn}>全画面で開く ↗</button>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer style={styles.footer}>
        <div style={styles.homeIcon}>🏠<br/><span style={{fontSize:'10px'}}>HOME</span></div>
        <div style={styles.version}>Ver.2.1.3</div>
      </footer>
    </div>
  );
}

const styles = {
  // --- 既存の styles (container, header, sidebar, table, bookshelf 等) をすべて維持 ---
  container: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'fixed', top: 0, left: 0 },
  header: { background: '#27ae60', color: '#fff', height: '50px', zIndex: 1000, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', height: '100%' },
  menuBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: '5px' },
  headerTitle: { fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  adminLabel: { backgroundColor: '#ffd700', color: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '900' },
  refreshIcon: { background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  sidebar: (isOpen) => ({ width: isOpen ? '260px' : '0px', backgroundColor: '#fff', color: '#333', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.3s ease', flexShrink: 0, borderRight: isOpen ? '1px solid #eee' : 'none', boxShadow: isOpen ? '2px 0 5px rgba(0,0,0,0.05)' : 'none' }),
  sidebarHeader: { background: '#f8f9fa', color: '#666', padding: '15px', fontWeight: 'bold', textAlign: 'center', fontSize: '14px', borderBottom: '1px solid #eee', minWidth: '260px' },
  nav: { flex: 1, overflowY: 'auto', minWidth: '260px' },
  menuItem: (isActive) => ({ padding: '15px 20px', borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: isActive ? '#f0f9f4' : '#fff', color: isActive ? '#27ae60' : '#333', fontWeight: isActive ? 'bold' : 'normal', display: 'flex', alignItems: 'center' }),
  logoutItem: { padding: '20px', borderTop: '1px solid #eee', color: '#e74c3c', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold', minWidth: '260px' },
  main: { flex: 1, backgroundColor: '#f0f2f5', overflowY: 'auto', padding: '30px 20px' },
  contentArea: { maxWidth: '1000px', margin: '0 auto' },
  contentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #27ae60', paddingBottom: '10px' },
  contentTitle: { margin: 0, color: '#333' },
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
  footer: { background: '#27ae60', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: '#fff' },
  homeIcon: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  version: { position: 'absolute', right: '10px', bottom: '5px', color: '#fff', fontSize: '10px' },
  passwordContainer: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '600px' },
  tableHeaderRow: { backgroundColor: '#f8f9fa' },
  th: { border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', color: '#495057', fontWeight: 'bold' },
  td: { border: '1px solid #dee2e6', padding: '12px', color: '#333', verticalAlign: 'middle' },
  tr: { borderBottom: '1px solid #eee' },
  bookshelfContainer: { backgroundColor: '#d2b48c', padding: '40px 20px', borderRadius: '16px', minHeight: '80vh', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)' },
  bookshelf: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '40px 20px', padding: '20px' },
  bookWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' },
  bookCover: { width: '100px', height: '140px', backgroundColor: '#fff', borderRadius: '4px 8px 8px 4px', boxShadow: '5px 5px 15px rgba(0,0,0,0.3)', overflow: 'hidden', borderLeft: '4px solid rgba(0,0,0,0.1)' },
  coverImage: { width: '100%', height: '100%', objectFit: 'cover' },
  bookTitle: { marginTop: '10px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', color: '#3e2723', backgroundColor: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: '4px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalContent: { position: 'relative', width: '95%', height: '90%', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' },
  closeBtn: { position: 'absolute', top: '10px', right: '20px', fontSize: '30px', background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 2001 },
  modalFullBtn: { position: 'absolute', bottom: '15px', right: '15px', padding: '8px 15px', backgroundColor: 'rgba(39, 174, 96, 0.8)', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '12px' },
};