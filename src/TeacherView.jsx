import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import ModelAnswerShelf from './components/ModelAnswerShelf.jsx'
import PasswordManager from './components/PasswordManager.jsx'
import { styles } from './styles/teacherViewStyles.js'
import NotificationManager from './components/NotificationManager.jsx'
import TestReviewManager from './components/TestReviewManager.jsx'
import NoticeManager from './components/NotificationManager.jsx'
import AccountGenerator from './components/AccountGenerator.jsx'
import SchoolProgressTracker from './components/SchoolProgressManager.jsx'
import KoToreProgressTracker from './components/KoToreProgressTracker.jsx'
import AppUsageTracker from './components/AppUsageTracker.jsx'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const API_KEY = import.meta.env.VITE_API_KEY;
const APP_VERSION = "3.3.1";

// 【修正箇所】引数に「school」を正しく追加して受け取れるようにする
export default function TeacherView({ userName, role, unit, school, handleLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeContent, setActiveContent] = useState('notices');
  const [notifications, setNotifications] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('すべて');
  const [openPdf, setOpenPdf] = useState(null);
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

  const fetchNotifications = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "getNotifications", 
        apiKey: API_KEY,
        unit: unit 
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") setNotifications(response.data.notifications);
    } catch (e) { console.error("更新失敗"); }
  };

  const handleStart = async (qNum) => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "startSupport", 
        apiKey: API_KEY, 
        unit: unit,
        queueNumber: qNum
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      if (response.data.result === "success") {
        fetchNotifications();
      }
    } catch (e) { alert("対応開始に失敗しました"); }
  };

  const handleComplete = async (userId, targetName, qNum) => {
    try {
      await axios.post(GAS_URL, JSON.stringify({ 
        action: "deleteNotification", 
        apiKey: API_KEY, 
        userId, 
        userName: targetName, 
        unit: unit,
        queueNumber: qNum
      }), { headers: { 'Content-Type': 'text/plain' } });
      fetchNotifications();
    } catch (e) { alert("削除失敗"); }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 5000);
    return () => clearInterval(timer);
  }, []);

  const baseMenuItems = [
    { id: 'notices', label: 'お知らせ', icon: '📢' },
    { id: 'notifications', label: '個トレメニュー', icon: '🎯' },
    { id: 'app-usage', label: 'アプリ利用チェック', icon: '📱' },
    { id: 'kotore-progress', label: '個トレ進捗チェック', icon: '🏋️' },
    { id: 'school-progress', label: '学校進捗チェック', icon: '🏫' },
  ];

  const adminMenuItems = [
    { id: 'create-account', label: 'アカウント管理', icon: '👤' },
    { id: 'passwords', label: '各種パスワード', icon: '🔑' },
    { id: 'manual', label: 'スタッフマニュアル', icon: '📖', isLink: true, url: 'https://morning-hoverfly-7d7.notion.site/22187fb597ea8051a617cc4850365bd9?pvs=74' }, 
    { id: 'takamatsu-staff', label: '高松スタッフ(SharePoint)', icon: '🏢', isLink: true, url: 'https://edunetz.sharepoint.com/sites/takamatustaff/SitePages/CollabHome.aspx?ga=1' },
    { id: 'model-answer', label: '個トレ２（模範解答）', icon: '✅' },
    { id: 'test-review-check', label: 'テスト振り返り確認', icon: '📝' },
  ];

  const menuItems = useMemo(() => {
    if (role === 'admin') {
      return [...baseMenuItems, ...adminMenuItems];
    } else if (role === 'head-teacher') {
      const headTeacherExtensions = adminMenuItems.filter(item => item.id === 'create-account' || item.id === 'test-review-check');
      return [...baseMenuItems, ...headTeacherExtensions];
    }
    return baseMenuItems;
  }, [role]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.menuBtn}>☰</button>
          
          {/* 【完全修正】三項演算子を撤廃し、バッジ形式に一本化 */}
          <div style={styles.headerTitle}>
            {(role === 'admin' || role === 'head-teacher') && (
              <span style={styles.adminLabel}>社員・スタッフ</span>
            )}
            【業務メニュー】{userName} 先生
          </div>
          
          <button onClick={fetchNotifications} style={styles.refreshIcon}>🔄</button>
        </div>
      </header>

      <div style={styles.body}>
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

        <main style={styles.main}>
          <div style={styles.contentArea}>
            {activeContent === 'notices' && (
              <NoticeManager notices={[]} styles={styles} />
            )}

            {activeContent === 'create-account' && (
              <AccountGenerator 
                styles={styles}
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                schools={schools}
              />
            )}

            {activeContent === 'notifications' && (
              <NotificationManager 
                notifications={notifications}
                schools={schools}
                selectedSchool={selectedSchool}
                setSelectedSchool={setSelectedSchool}
                handleStart={handleStart}
                handleComplete={handleComplete}
                styles={styles}
              />
            )}

            {activeContent === 'test-review-check' && (role === 'admin' || role === 'head-teacher') && (
              <TestReviewManager 
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                schools={schools}
                styles={styles}
              />
            )}

            {activeContent === 'passwords' && (
              <PasswordManager styles={styles} />
            )}

            {activeContent === 'model-answer' && (
              <ModelAnswerShelf setOpenPdf={setOpenPdf} styles={styles} />
            )}

            {activeContent === 'school-progress' && (
              <SchoolProgressTracker 
                styles={styles} 
                GAS_URL={GAS_URL} 
                API_KEY={API_KEY} 
                schools={schools} 
              />
            )}

            {activeContent === 'kotore-progress' && (
               <KoToreProgressTracker 
                styles={styles} 
                GAS_URL={GAS_URL} 
                API_KEY={API_KEY} 
                schools={schools} 
              />
            )}

            {activeContent === 'app-usage' && (
              <AppUsageTracker 
                styles={styles} 
                GAS_URL={GAS_URL}
                API_KEY={API_KEY} 
                schools={schools} 
              />
            )}
          </div>
        </main>
      </div>

      {openPdf && (
        <div style={styles.modalOverlay} onClick={() => setOpenPdf(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setOpenPdf(null)}>×</button>
            <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
              <iframe src={openPdf} style={{ width: '100%', height: '100%', minHeight: '1000px', border: 'none' }} title="PDF Viewer" />
            </div>
            <button onClick={() => window.open(openPdf, '_blank')} style={styles.modalFullBtn}>全画面で開く ↗</button>
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <div style={styles.homeIcon}>
          🏠<br/>
          <span style={{fontSize:'10px'}}>HOME</span>
        </div>
        <div style={styles.version}>Ver.{APP_VERSION}</div>
      </footer>
    </div>
  );
}