import { useState, useEffect } from 'react';
import axios from 'axios';
import { styles } from './styles/studentViewStyles.js';
import SupportManager from './components/SupportManager.jsx';
import JukuProgressManager from './components/JukuProgressManager.jsx';
import SchoolProgressManager from './components/SchoolProgressTracker.jsx';
// 新設した子コンポーネントをインポート
import UnitSelectionModal from './components/UnitSelectionModal.jsx';

const GAS_URL = import.meta.env.VITE_GAS_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export default function StudentView({ userId, userName, grade, school, unit, handleLogout }) {
  // --- 1. ヘルパー関数 ---
  const toFullWidth = (str) => {
    if (!str) return "";
    return str.replace(/[0-9]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
  };

  // --- 2. ステート定義 ---
  const [myQueueNumber, setMyQueueNumber] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(''); 
  const [activeMenu, setActiveMenu] = useState('schoolProgress');
  const [showCompleteMsg, setShowCompleteMsg] = useState(false); 
  const [lastStatus, setLastStatus] = useState(''); 

  const [unitMaster, setUnitMaster] = useState([]); 
  const [schoolUnitMaster, setSchoolUnitMaster] = useState([]); 
  const [selectedUnits, setSelectedUnits] = useState({}); 
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [currentSelecting, setCurrentSelecting] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSukimaLoading, setIsSukimaLoading] = useState(false);

  // 学校進捗用の学年フィルタ
  const [selectedGradeFilter, setSelectedGradeFilter] = useState(toFullWidth(grade));

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showTestReviewModal, setShowTestReviewModal] = useState(false);
  const FORMS_URL = "https://forms.office.com/Pages/ResponsePage.aspx?id=tUqCmPV9f0WIdtp-hcoEEFd4aKrZ3TpOss8BjKXR7gZURDA3Sk5RWUFQSVlZVzZPUkRGQjk1S0NKSi4u";

  const [myReviews, setMyReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [displayGrade, setDisplayGrade] = useState(toFullWidth(grade));
  const [completedPages, setCompletedPages] = useState([]);

  // --- 3. データ取得ロジック ---
  const fetchCompletedUnits = async () => {
    try {
      // 表示中のメニュー（schoolProgress か progress か）によって呼び出すGASアクションを分岐
      const currentAction = activeMenu === 'schoolProgress' 
        ? "getStudentSchoolProgress" 
        : "getStudentKoToreProgress";

      const response = await axios.post(GAS_URL, JSON.stringify({
        action: currentAction, // 動的に切り替え
        apiKey: API_KEY,
        userId: userId
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      if (response.data.result === "success") {
        setCompletedPages(response.data.completedPages || []);
      }
    } catch (e) {
      console.error("過去の進捗データ取得失敗", e);
    }
  };

  // メニューが「学校進捗」または「個トレ進捗」に切り替わったタイミングでそれぞれ実行
  useEffect(() => {
    if (activeMenu === 'schoolProgress' || activeMenu === 'progress') {
      fetchCompletedUnits();
    }
  }, [activeMenu]);

  const getTestReviewUrl = () => {
    const baseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSepwM3x5Plgv9RmTi4G2gt3JTjc3Ind4vYRULTYZQClkR2B4g/viewform";
    const entryIds = { school: "entry.1139171339", id: "entry.198493856", name: "entry.219162238" };
    const params = new URLSearchParams();
    params.append(entryIds.school, school);
    params.append(entryIds.id, userId);
    params.append(entryIds.name, userName);
    params.append("embedded", "true");
    return `${baseUrl}?${params.toString()}`;
  };

  const getScoreFormUrl = () => {
    const baseUrl = "https://forms.office.com/Pages/ResponsePage.aspx?id=tUqCmPV9f0WIdtp-hcoEEFd4aKrZ3TpOss8BjKXR7gZURDA3Sk5RWUFQSVlZVzZPUkRGQjk1S0NKSi4u";
    const params = new URLSearchParams();
    const formIds = {
      school: "r2a6664ae6c9c4d128691b1f012cb9fd1", 
      name: "r0cc2105a35e64631a6382d01ec26b41a"     
    };

    if (school) params.append(formIds.school, school.trim());
    if (userName) params.append(formIds.name, userName.trim());
    
    return `${baseUrl}&${params.toString()}`;
  };

  useEffect(() => {
    const loadCSVs = async () => {
      try {
        const resJuku = await fetch('/units.csv');
        const textJuku = new TextDecoder('utf-8').decode(await resJuku.arrayBuffer());
        setUnitMaster(parseCSV(textJuku));
        const resSchool = await fetch('/school_units.csv');
        if (resSchool.ok) {
          const textSchool = new TextDecoder('utf-8').decode(await resSchool.arrayBuffer());
          setSchoolUnitMaster(parseCSV(textSchool));
        }
      } catch (e) { console.error("CSV読み込みエラー:", e); }
    };
    loadCSVs();
  }, []);

  const parseCSV = (text) => {
    const rows = text.split(/\r?\n/).map(row => row.split(','));
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).filter(row => row.length >= 3).map(row => {
      let obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ? row[i].trim() : ""; });
      return obj;
    });
  };

  const fetchMyReviews = async () => {
    setReviewLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "getMyReviews", apiKey: API_KEY, userId: userId
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") setMyReviews(response.data.reviews);
    } catch (e) { console.error("振り返り取得失敗", e); }
    finally { setReviewLoading(false); }
  };

  useEffect(() => { if (showReviewModal) fetchMyReviews(); }, [showReviewModal]);

  // --- 4. アクションハンドラ ---
  const sendToGAS = async (action, successMsg) => {
    const progressData = Object.keys(selectedUnits).map(key => {
      const [subject, text] = key.split('-');
      const unitDetails = selectedUnits[key].map(id => {
        const parts = id.split('-');
        const page = parts.slice(2).join('-');
        return `${text} ${page}`;
      }).join(', ');
      return { subject, text, units: unitDetails };
    }).filter(item => item.units !== "");

    if (progressData.length === 0) return alert("単元が選択されていません。");
    if (!window.confirm("送信してもよろしいですか？")) return;

    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action, apiKey: API_KEY, userId, userName, grade, school, progressData
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") { 
        alert(successMsg); 
        setSelectedUnits({}); 
        fetchCompletedUnits(); 
      }
    } catch (e) { alert("送信エラー"); }
  };

  const sendNotification = async (statusType) => {
    if (submittingStatus) return;
    setSubmittingStatus(statusType);
    try {
      let statusText = "";
      if (statusType === 'maru') statusText = "丸付け待ち";
      else if (statusType === 'question' || statusType === 'shitsumon') statusText = "質問待ち";
      else if (statusType === 'giveup') statusText = "SOS(ギブアップ)";

      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "sendNotification", apiKey: API_KEY, userId, userName, grade, school, status: statusText, unit
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setMyQueueNumber(response.data.queueNumber);
        setShowCompleteMsg(true);
        
        let lastStatusText = "";
        if (statusType === 'maru') lastStatusText = "丸付け";
        else if (statusType === 'question' || statusType === 'shitsumon') lastStatusText = "質問";
        else if (statusType === 'giveup') lastStatusText = "ギブアップ"; 
        
        setLastStatus(lastStatusText);
      }
    } catch (e) { 
      alert("送信失敗"); 
      setSubmittingStatus(''); 
    }
  };
  
  const openSukimaKun = async () => {
    if (isSukimaLoading) return;
    setIsSukimaLoading(true); 

    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "issueToken", apiKey: API_KEY, userId: userId
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        const token = response.data.token;
        const SUKIMA_URL = "https://student-app-nu-lyart.vercel.app/";      
        const targetUrl = `${SUKIMA_URL}?uid=${userId}&tk=${token}`;
        window.open(targetUrl, '_blank');
      } else {
        alert("連携に失敗しました: " + response.data.message);
      }
    } catch (e) {
      console.error("スキマ君連携エラー:", e);
      alert("エラーが発生しました。");
    } finally {
      setIsSukimaLoading(false); 
    }
  };

  useEffect(() => {
    const check = async () => {
      try {
        const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications", apiKey: API_KEY, unit }), { headers: { 'Content-Type': 'text/plain' } });
        if (response.data.result === "success") {
          const myData = response.data.notifications.find(n => n.userId === userId);
          if (myData) setMyQueueNumber(myData.queueNumber);
          else { setMyQueueNumber(null); setShowCompleteMsg(false); setSubmittingStatus(''); }
        }
      } catch (e) {}
    };
    check();
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [userId, unit]);

  const openUnitModal = (subject, text) => {
    setCurrentSelecting({ subject, text });
    setShowUnitModal(true);
  };

  const jukuSubjectList = ['国語', '数学', '英語', '理科', '社会'];
  const schoolSubjectList = ['国語', '数学', '英語', '理科', '社会'];

  const isSchoolMode = activeMenu === 'schoolProgress';
  const currentMaster = isSchoolMode ? schoolUnitMaster : unitMaster;
  
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>☰</button>
        <div style={styles.headerTitle}>ネッツ生徒用システム</div>
        <div style={styles.headerUserInfo}>{userName} さん（{toFullWidth(grade)}）</div>
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar(isSidebarOpen)}>
          <div style={styles.profileArea}>
            <div style={styles.studentName}>{userName} <span style={{fontSize:'0.8rem'}}>さん</span></div>
            <div style={styles.schoolInfo}><span style={styles.infoBadge}>{school} {toFullWidth(grade)}</span></div>
          </div>
          <nav style={styles.nav}>
            <button style={styles.navItem(activeMenu === 'kodore')} onClick={() => setActiveMenu('kodore')}>🎯 個トレサポート</button>
            <button style={styles.navItem(activeMenu === 'progress')} onClick={() => {setActiveMenu('progress'); setSelectedUnits({}); setDisplayGrade(toFullWidth(grade));}}>📈 個トレ進捗</button>
            <button style={styles.navItem(activeMenu === 'schoolProgress')} onClick={() => {setActiveMenu('schoolProgress'); setSelectedUnits({}); setSelectedGradeFilter(toFullWidth(grade)); setDisplayGrade(toFullWidth(grade));}}>🏫 学校進捗</button>
            <button style={{...styles.navItem(false),opacity: isSukimaLoading ? 0.6 : 1,cursor: isSukimaLoading ? 'wait' : 'pointer' }} onClick={openSukimaKun} disabled={isSukimaLoading}>{isSukimaLoading ? "⏳ 読み込み中..." : "✨ スキマ君を起動"}</button>
            <button style={styles.navItem(false)} onClick={() => setShowScoreModal(true)}>📝 点数回収</button>
            <button style={styles.navItem(false)} onClick={() => setShowTestReviewModal(true)}>📝 テスト振り返り</button>
            <button style={styles.navItem(false)} onClick={() => setShowReviewModal(true)}>📖 過去の振り返りを確認</button>
          </nav>
          <button onClick={handleLogout} style={styles.logoutBtn}>ログアウト</button>
        </aside>

        <main style={styles.main}>
          {/* 1. 個トレサポート (kodore) */}
          {activeMenu === 'kodore' && (
            <SupportManager 
              unit={unit}
              userName={userName}
              userId={userId}
              grade={grade}
              school={school}
              myQueueNumber={myQueueNumber}
              submittingStatus={submittingStatus}
              showCompleteMsg={showCompleteMsg}
              lastStatus={lastStatus}
              sendNotification={sendNotification}
              styles={styles}
            />
          )}

          {/* 2. 個トレ進捗 (progress) */}
          {activeMenu === 'progress' && (
            <JukuProgressManager 
              currentSubjects={jukuSubjectList}
              selectedUnits={selectedUnits}
              openUnitModal={openUnitModal}
              sendToGAS={sendToGAS}
              unitMaster={unitMaster}
              grade={grade}
              styles={styles}
            />
          )}
       
          {/* 3. 学校進捗 (schoolProgress) */}
          {activeMenu === 'schoolProgress' && (
            <SchoolProgressManager 
              currentSubjects={schoolSubjectList}
              selectedUnits={selectedUnits}
              completedPages={completedPages} 
              openUnitModal={openUnitModal}
              sendToGAS={sendToGAS}
              schoolUnitMaster={schoolUnitMaster}
              selectedGradeFilter={selectedGradeFilter}
              setSelectedGradeFilter={setSelectedGradeFilter}
              styles={styles}
            />
          )}
        </main> 
      </div>

      {/* --- モーダル・ポップアップ類 --- */}

      {/* 共通の単元選択モーダル（新設子コンポーネントへの移行完了） */}
      <UnitSelectionModal
        showUnitModal={showUnitModal}
        setShowUnitModal={setShowUnitModal}
        currentSelecting={currentSelecting}
        isSchoolMode={isSchoolMode}
        selectedGradeFilter={selectedGradeFilter}
        setSelectedGradeFilter={setSelectedGradeFilter}
        currentMaster={currentMaster}
        selectedUnits={selectedUnits}
        setSelectedUnits={setSelectedUnits}
        completedPages={completedPages}
        styles={styles}
      />

      {/* 2. 過去の振り返り確認モーダル */}
      {showReviewModal && (
        <div style={styles.overlay} onClick={() => setShowReviewModal(false)}>
          <div style={{...styles.modalContent, maxWidth: '600px'}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📖 過去の振り返り</h3>
              <button style={styles.modalCloseX} onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div style={{...styles.unitListScroll, padding: '15px'}}>
              {reviewLoading ? (
                <p style={{textAlign: 'center', padding: '20px'}}>読み込み中...</p>
              ) : myReviews.length === 0 ? (
                <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>まだデータがありません。</p>
              ) : (
                myReviews.map((r, i) => (
                  <div key={i} style={styles.reviewCard}>
                    <div style={styles.reviewDate}>📅 {r["タイムスタンプ"]}</div>
                    <div style={styles.reviewSection}>
                      <strong style={{color: '#27ae60'}}>✅ よかったこと</strong>
                      <div style={styles.reviewText}>{r["よかったこと"]}</div>
                    </div>
                    <div style={styles.reviewSection}>
                      <strong style={{color: '#e67e22'}}>⚠️ 改善点</strong>
                      <div style={styles.reviewText}>{r["改善点"]}</div>
                    </div>
                    <div style={styles.reviewSection}>
                      <strong style={{color: '#2980b9'}}>🎯 次回に向けて</strong>
                      <div style={styles.reviewText}>{r["次回に向けて"]}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. 点数回収ポップアップ */}
      {showScoreModal && (
        <div style={styles.overlay} onClick={() => setShowScoreModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📝 点数回収アンケート</h3>
              <button style={styles.modalCloseX} onClick={() => setShowScoreModal(false)}>×</button>
            </div>
            <div style={styles.unitListScroll}>
              <iframe 
                src={getScoreFormUrl()} 
                style={{ width: '100%', height: '70vh', border: 'none' }} 
                title="Score Form"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. テスト振り返りポップアップ */}
      {showTestReviewModal && (
        <div style={styles.overlay} onClick={() => setShowTestReviewModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📝 テスト振り返りアンケート</h3>
              <button style={styles.modalCloseX} onClick={() => setShowTestReviewModal(false)}>×</button>
            </div>
            <div style={styles.unitListScroll}>
              <iframe 
                src={getTestReviewUrl()} 
                style={{ width: '100%', height: '75vh', border: 'none' }} 
                title="Test Review Form" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}