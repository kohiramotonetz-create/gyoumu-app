import { lazy, Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import axios from 'axios'
import PasswordManager from './components/PasswordManager.jsx'
import { styles } from './styles/teacherViewStyles.js'
import TestReviewManager from './components/TestReviewManager.jsx'
import NoticeManager from './components/NoticeManager.jsx'
import AccountManagement from './components/AccountManagement.jsx'
import SchoolProgressTracker from './components/SchoolProgressManager.jsx'
import AppUsageTracker from './components/AppUsageTracker.jsx'
import SukimakunPermissionManager from './components/SukimakunPermissionManager.jsx'
import CampTrainingManager from './components/CampTrainingManager.jsx'
import OneToOneProgressManager from './components/OneToOneProgressManager.jsx'
import AcademicResultsManager from './components/AcademicResultsManager.jsx'
import VersionLabel from './components/common/VersionLabel.jsx'
import StudentProfileView from './components/StudentProfileView.jsx'
import { ALL_SCHOOLS } from './constants/organization.js'
import { parseStudentProfileHash } from './utils/studentProfileNavigation.js'
import HomeDashboard, { Icon } from './components/HomeDashboard.jsx'
import TeacherHomeProgressStudentList from './components/TeacherHomeProgressStudentList.jsx'
import './TeacherView.css'

const KoToreMenu = lazy(() => import('./components/KoToreMenu.jsx'))
const KotoreAdminWorkspace = lazy(() => import('./components/KotoreAdminWorkspace.jsx'))

const GAS_URL = import.meta.env.VITE_GAS_URL;
const API_KEY = import.meta.env.VITE_API_KEY;
const CAMP_MENU_ITEM = { id: 'camp-training', label: '合宿メニュー', icon: '🏕️' };
const WIDE_CONTENT_IDS = new Set([
  'app-usage',
  'school-progress',
  'one-to-one-progress',
  'academic-results',
  'create-account',
  'camp-training',
  'test-review-check',
  'sukimakun-permissions',
  'notifications',
  'kotore-admin',
  'home-progress-list',
]);
const MENU_ICON_NAMES = {
  home: 'home', notices: 'megaphone', notifications: 'target', 'app-usage': 'clipboard',
  'school-progress': 'school', 'one-to-one-progress': 'chart', 'create-account': 'user', passwords: 'key',
  manual: 'book', 'takamatsu-staff': 'building', 'test-review-check': 'clipboard', 'kotore-admin': 'settings',
  'sukimakun-permissions': 'settings', 'academic-results': 'chart', 'camp-training': 'alert'
};
const MENU_ICON_PATHS = {
  home:<><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></>, target:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M15 9l6-6M17 3h4v4"/></>, school:<><path d="M3 10 12 5l9 5-9 5z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 10v6"/></>, user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>, key:<><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 4l3 3M14 6l3 3"/></>, book:<><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 3zM20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 3z"/></>, building:<><path d="M4 21V4h12v17M16 9h4v12M8 8h4M8 12h4M8 16h4M2 21h20"/></>, settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>
};
function NavIcon({ id }) {
  const name = MENU_ICON_NAMES[id];
  return MENU_ICON_PATHS[name] ? <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{MENU_ICON_PATHS[name]}</svg> : <Icon name={name || 'clipboard'} size={22}/>;
}

// 【修正箇所】引数に「school」を正しく追加して受け取れるようにする
export default function TeacherView({ userName, role, unit, school, assignedSchools, sessionToken, handleLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1200);
  const [activeContent, setActiveContent] = useState('home');
  const [profileRoute, setProfileRoute] = useState(() => parseStudentProfileHash(window.location.hash));
  const [notificationRefresh, setNotificationRefresh] = useState(null);
  const [homeProgressData, setHomeProgressData] = useState(null);
  const [homeProgressStatus, setHomeProgressStatus] = useState('behind');
  const [homeProgressState, setHomeProgressState] = useState({ loaded: false, loading: false, refreshing: false, error: '', data: null, updatedAt: null });
  const schools = ALL_SCHOOLS;
  const availableAssignedSchools = useMemo(() => Array.isArray(assignedSchools) && assignedSchools.length > 0
    ? assignedSchools
    : school ? [school] : [], [assignedSchools, school]);
  const timeoutRef = useRef(null);
  const homeProgressRequestRef = useRef(false);
  const homeProgressOwnerRef = useRef(sessionToken);

  const loadHomeProgress = useCallback(async () => {
    if (homeProgressRequestRef.current) return;
    const requestOwner = sessionToken;
    homeProgressRequestRef.current = true;
    setHomeProgressState(current => ({ ...current, loading: !current.data, refreshing: Boolean(current.data), error: '' }));
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'getTeacherHomeProgressSummary', apiKey: API_KEY, sessionToken }), { headers: { 'Content-Type': 'text/plain' }, timeout: 30000 });
      if (response.data?.result !== 'success') {
        const error = new Error(response.data?.message || '進捗状況を取得できませんでした');
        error.code = response.data?.code;
        throw error;
      }
      if (homeProgressOwnerRef.current !== requestOwner) return;
      const updatedAt = new Date();
      setHomeProgressState({ loaded: true, loading: false, refreshing: false, error: '', data: response.data, updatedAt });
      setHomeProgressData(response.data);
    } catch (error) {
      if (homeProgressOwnerRef.current !== requestOwner) return;
      if (error.code === 'AUTHORIZATION_ERROR') {
        handleLogout();
        return;
      }
      setHomeProgressState(current => ({ ...current, loaded: Boolean(current.data), loading: false, refreshing: false, error: '進捗状況を取得できませんでした' }));
    } finally {
      if (homeProgressOwnerRef.current === requestOwner) homeProgressRequestRef.current = false;
    }
  }, [handleLogout, sessionToken]);

  useEffect(() => {
    if (homeProgressOwnerRef.current === sessionToken) return;
    homeProgressOwnerRef.current = sessionToken;
    homeProgressRequestRef.current = false;
    setHomeProgressState({ loaded: false, loading: false, refreshing: false, error: '', data: null, updatedAt: null });
    setHomeProgressData(null);
  }, [sessionToken]);

  useEffect(() => {
    const canLoad = ['admin', 'head-teacher', 'teacher'].includes(role) && Array.isArray(availableAssignedSchools);
    if (!canLoad) {
      setHomeProgressState(current => current.error
        ? current
        : { ...current, loaded: false, loading: false, refreshing: false, error: '進捗状況を取得できませんでした' });
      return;
    }
    if (!homeProgressState.loaded && !homeProgressState.loading && !homeProgressState.error) loadHomeProgress();
  }, [availableAssignedSchools, homeProgressState.error, homeProgressState.loaded, homeProgressState.loading, loadHomeProgress, role]);

  useEffect(() => {
    const syncHash = () => {
      const route = parseStudentProfileHash(window.location.hash);
      setProfileRoute(route);
      if (!route && window.history.state?.studentProfileSource) setActiveContent(window.history.state.studentProfileSource);
    };
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: 'getNotifications', apiKey: API_KEY, unit }), {
        headers: { 'Content-Type': 'text/plain' },
      });
      if (response.data?.result !== 'success') throw new Error(response.data?.message || '更新失敗');
      setNotificationRefresh({ id: Date.now(), notifications: Array.isArray(response.data.notifications) ? response.data.notifications : [], error: '' });
    } catch {
      setNotificationRefresh({ id: Date.now(), notifications: null, error: '依頼を取得できませんでした' });
      console.error('更新失敗');
    }
  };

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

  const baseMenuItems = [
    { id: 'notices', label: 'お知らせ', icon: '📢' },
    { id: 'notifications', label: '個トレメニュー', icon: '🎯' },
    { id: 'app-usage', label: 'アプリ利用チェック', icon: '📱' },
    { id: 'school-progress', label: '学校進捗チェック', icon: '🏫' },
    { id: 'one-to-one-progress', label: '1対1進捗チェック', icon: '🤝' },
  ];

  const adminMenuItems = [
    { id: 'create-account', label: 'アカウント管理', icon: '👤' },
    { id: 'passwords', label: '各種パスワード', icon: '🔑' },
    { id: 'kotore-admin', label: '個トレコンテンツ管理', icon: '⚙️', adminOnly: true },
    { id: 'manual', label: 'スタッフマニュアル', icon: '📖', isLink: true, url: 'https://morning-hoverfly-7d7.notion.site/22187fb597ea8051a617cc4850365bd9?pvs=74' }, 
    { id: 'takamatsu-staff', label: '高松スタッフ(SharePoint)', icon: '🏢', isLink: true, url: 'https://edunetz.sharepoint.com/sites/takamatustaff/SitePages/CollabHome.aspx?ga=1' },
    { id: 'test-review-check', label: 'テスト振り返り確認', icon: '📝' },
    { id: 'sukimakun-permissions', label: 'スキマ君利用設定', icon: '⚙️', adminOnly: true },
    { id: 'academic-results', label: '学校成績管理', icon: '📊', adminOnly: true },
  ];

  const menuItems = useMemo(() => {
    if (role === 'admin') {
      return [...baseMenuItems, CAMP_MENU_ITEM, ...adminMenuItems];
    } else if (role === 'head-teacher') {
      const headTeacherExtensions = adminMenuItems.filter(item => item.id === 'create-account' || item.id === 'test-review-check');
      return [...baseMenuItems, CAMP_MENU_ITEM, ...headTeacherExtensions];
    }
    return baseMenuItems;
  }, [role]);

  const navSections = [
    { label:'日常業務', ids:['notifications','school-progress','app-usage','one-to-one-progress'] },
    { label:'季節業務', ids:['camp-training','test-review-check','academic-results'] },
    { label:'管理業務', ids:['create-account','sukimakun-permissions','passwords','kotore-admin'] },
    { label:'資料・情報', ids:['notices','manual','takamatsu-staff'] },
  ];
  const chooseContent = (item) => {
    if (item.isLink) window.open(item.url, '_blank');
    else { setActiveContent(item.id); if (profileRoute) window.location.hash = ''; }
    if (window.innerWidth < 1200) setIsSidebarOpen(false);
  };
  const openHomeProgressStatus = (status, data) => {
    setHomeProgressStatus(status);
    if (data) setHomeProgressData(data);
    setActiveContent('home-progress-list');
  };
  const handleMainKeyDown = (event) => {
    const scrollElement = event.currentTarget;
    const keyScroll = {
      ArrowDown: 48,
      ArrowUp: -48,
      PageDown: scrollElement.clientHeight * 0.8,
      PageUp: scrollElement.clientHeight * -0.8,
    };
    if (event.key in keyScroll) {
      event.preventDefault();
      scrollElement.scrollBy({ top: keyScroll[event.key] });
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      scrollElement.scrollTo({ top: event.key === 'Home' ? 0 : scrollElement.scrollHeight });
    }
  };
  const isWideContent = WIDE_CONTENT_IDS.has(activeContent);

  return (
    <div className="teacher-shell">
      <header className={`teacher-header ${!isSidebarOpen ? 'teacher-header--wide' : ''}`}>
        <div className="teacher-header__user">
          {(role === 'admin' || role === 'head-teacher') && <span className="teacher-role-badge">社員・スタッフ</span>}
          <span className="teacher-header__name">{userName} 先生</span>
          <button className="teacher-icon-button teacher-notification" onClick={fetchNotifications} aria-label="通知を更新"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button>
        </div>
      </header>
      {!isSidebarOpen && <button className="teacher-sidebar-reopen" onClick={() => setIsSidebarOpen(true)} aria-label="メニューを開く"><svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>}
      {isSidebarOpen && window.innerWidth < 1200 && <button className="teacher-overlay" onClick={() => setIsSidebarOpen(false)} aria-label="メニューを閉じる" />}
      <aside className={`teacher-sidebar ${!isSidebarOpen ? 'teacher-sidebar--closed' : ''}`}>
        <div className="teacher-brand">
          <button className="teacher-brand__menu" onClick={() => setIsSidebarOpen(false)} aria-label="メニューを閉じる"><svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
          <img src="/icon.png" alt="個トレ" />
        </div>
        <nav className="teacher-sidebar__nav" aria-label="メインメニュー">
          <button className="teacher-nav-home" onClick={() => chooseContent({id:'home'})}><NavIcon id="home"/>ホーム</button>
          {navSections.map(section => {
            const items = section.ids.map(id => menuItems.find(item => item.id === id)).filter(Boolean);
            return items.length > 0 && <section className="teacher-nav-section" key={section.label}><h2>{section.label}</h2>{items.map(item => <button key={item.id} className={`teacher-nav-item ${activeContent === item.id ? 'teacher-nav-item--active' : ''}`} onClick={() => chooseContent(item)}><NavIcon id={item.id}/><span>{item.label}</span></button>)}</section>
          })}
          <button className="teacher-logout" onClick={handleLogout}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 17l5-5-5-5M15 12H3M15 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5"/></svg>ログアウト</button>
          </nav>
      </aside>
        <main className={`teacher-main ${!isSidebarOpen ? 'teacher-main--wide' : ''}`} tabIndex="0" aria-label="メインコンテンツ" onKeyDown={handleMainKeyDown}>
          <div className={`teacher-content ${activeContent !== 'home' && !isWideContent ? 'teacher-content--legacy' : ''} ${isWideContent ? 'teacher-content--wide' : ''} ${profileRoute ? 'teacher-content--profile' : ''}`}>
            {profileRoute && <StudentProfileView userId={profileRoute.userId} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={handleLogout} onBack={() => { if (window.history.length > 1) window.history.back(); else window.location.hash = ''; }} />}
            {!profileRoute && <>
            {activeContent === 'home' && <HomeDashboard
              userName={userName}
              progressState={homeProgressState}
              onRefreshProgress={loadHomeProgress}
              onOpenProgressStatus={openHomeProgressStatus}
            />}
            {activeContent === 'home-progress-list' && <TeacherHomeProgressStudentList
              key={homeProgressStatus}
              data={homeProgressData}
              statusFilter={homeProgressStatus}
              onBack={() => setActiveContent('home')}
            />}
            {activeContent === 'notices' && (
              <NoticeManager notices={[]} styles={styles} />
            )}

            {activeContent === 'create-account' && (
              <AccountManagement
                styles={styles}
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                schools={schools}
                sessionToken={sessionToken}
                role={role}
              />
            )}

            {activeContent === 'notifications' && (
              <Suspense fallback={<div role="status">個トレメニューを読み込み中…</div>}><KoToreMenu
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                sessionToken={sessionToken}
                unit={unit}
                schools={schools}
                assignedSchools={availableAssignedSchools}
                styles={styles}
                notificationRefresh={notificationRefresh}
                onSessionExpired={handleLogout}
              /></Suspense>
            )}

            {activeContent === 'test-review-check' && (role === 'admin' || role === 'head-teacher') && (
              <TestReviewManager 
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                assignedSchools={availableAssignedSchools}
                styles={styles}
              />
            )}

            {activeContent === 'sukimakun-permissions' && role === 'admin' && (
              <SukimakunPermissionManager
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                sessionToken={sessionToken}
                assignedSchools={availableAssignedSchools}
                styles={styles}
                onSessionExpired={handleLogout}
              />
            )}

            {activeContent === 'academic-results' && role === 'admin' && (
              <AcademicResultsManager
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                sessionToken={sessionToken}
                assignedSchools={availableAssignedSchools}
                styles={styles}
                onSessionExpired={handleLogout}
              />
            )}

            {activeContent === 'camp-training' && (role === 'admin' || role === 'head-teacher') && (
              <CampTrainingManager
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                sessionToken={sessionToken}
                role={role}
                assignedSchools={availableAssignedSchools}
                styles={styles}
                onSessionExpired={handleLogout}
              />
            )}

            {activeContent === 'passwords' && (
              <PasswordManager GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} role={role} onSessionExpired={handleLogout} />
            )}

            {activeContent === 'kotore-admin' && role === 'admin' && (
              <Suspense fallback={<div role="status">管理者メニューを読み込み中…</div>}><KotoreAdminWorkspace role={role} GAS_URL={GAS_URL} API_KEY={API_KEY} sessionToken={sessionToken} onSessionExpired={handleLogout} /></Suspense>
            )}

            {activeContent === 'school-progress' && (
              <SchoolProgressTracker 
                styles={styles} 
                GAS_URL={GAS_URL} 
                API_KEY={API_KEY} 
                assignedSchools={availableAssignedSchools}
              />
            )}

            {activeContent === 'one-to-one-progress' && (
              <OneToOneProgressManager
                GAS_URL={GAS_URL}
                API_KEY={API_KEY}
                sessionToken={sessionToken}
                role={role}
                assignedSchools={availableAssignedSchools}
                styles={styles}
                onSessionExpired={handleLogout}
              />
            )}

            {activeContent === 'app-usage' && (
              <AppUsageTracker 
                styles={styles} 
                GAS_URL={GAS_URL}
                API_KEY={API_KEY} 
                assignedSchools={availableAssignedSchools}
              />
            )}
            </>}
          </div>
        </main>

      {activeContent !== 'home' && <VersionLabel />}
    </div>
  );
}
