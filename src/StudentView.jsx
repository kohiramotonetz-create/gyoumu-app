import { useState, useEffect } from 'react';
import axios from 'axios';
import { styles } from './styles/studentViewStyles.js';
import SupportManager from './components/SupportManager.jsx';
import JukuProgressManager from './components/JukuProgressManager.jsx';
import SchoolProgressManager from './components/SchoolProgressManager.jsx';

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
  const [activeMenu, setActiveMenu] = useState('kodore');
  const [showCompleteMsg, setShowCompleteMsg] = useState(false); 
  const [lastStatus, setLastStatus] = useState(''); 

  const [unitMaster, setUnitMaster] = useState([]); 
  const [schoolUnitMaster, setSchoolUnitMaster] = useState([]); 
  const [selectedUnits, setSelectedUnits] = useState({}); 
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [currentSelecting, setCurrentSelecting] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 学校進捗用の学年フィルタ
  const [selectedGradeFilter, setSelectedGradeFilter] = useState(toFullWidth(grade));

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showTestReviewModal, setShowTestReviewModal] = useState(false);
  const FORMS_URL = "https://forms.cloud.microsoft/r/iChtRk7Hsh";

  const [myReviews, setMyReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [displayGrade, setDisplayGrade] = useState(toFullWidth(grade));

  // --- 3. データ取得ロジック ---
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

      // スプレッドシートへ送る「単元」情報を「テキスト名＆ページ」の連結にする
    const unitDetails = selectedUnits[key].map(id => {
      const [chapter, section, page] = id.split('-');
      // 例: "学校ワーク p.12" のような形式
      return `${text} ${page}`; }).join(', ');
      return { subject, text, units: unitDetails };
    }).filter(item => item.units !== "");

    if (progressData.length === 0) return alert("単元が選択されていません。");
    if (!window.confirm("送信してもよろしいですか？")) return;

    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action, apiKey: API_KEY, userId, userName, grade, school, progressData
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") { alert(successMsg); setSelectedUnits({}); }
    } catch (e) { alert("送信エラー"); }
  };

  const sendNotification = async (statusType) => {
    if (submittingStatus) return;
    setSubmittingStatus(statusType);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "sendNotification", apiKey: API_KEY, userId, userName, grade, school, 
        status: statusType === 'maru' ? "丸付け待ち" : "質問待ち", unit
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        setMyQueueNumber(response.data.queueNumber);
        setShowCompleteMsg(true);
        setLastStatus(statusType === 'maru' ? "丸付け" : "質問");
      }
    } catch (e) { alert("送信失敗"); setSubmittingStatus(''); }
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
// 1. 教科リストの定義（これが不足しているためエラーになっています）
  const jukuSubjectList = ['国語', '数学', '英語', '理科', '社会'];
  const schoolSubjectList = ['国語', '数学', '英語', '理科', '社会'];

  // 2. モード判定の定義
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

      {/* 1. 単元選択モーダル (個トレ・学校進捗 共通) */}
      {showUnitModal && (
        <div style={styles.overlay} onClick={() => setShowUnitModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {currentSelecting?.subject} 単元選択（表示中：{selectedGradeFilter}）
              </h3>
              <button style={styles.modalCloseX} onClick={() => setShowUnitModal(false)}>×</button>
            </div>

            {/* 学校進捗モードの時だけ学年切り替えタブを表示 */}
            {isSchoolMode && (
              <div style={styles.filterBar}>
                {['中１', '中２', '中３'].map(g => (
                  <button 
                    key={g} 
                    style={styles.gradeTab(selectedGradeFilter === g)}
                    onClick={() => setSelectedGradeFilter(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            <div style={styles.unitListScroll}>
              <table style={styles.unitTable}>
                <thead>
                  <tr style={styles.modalThRow}>
                    <th style={styles.modalTh}>教科</th>
                    <th style={styles.modalTh}>テキスト名</th>
                    <th style={styles.modalTh}>章・節</th>
                    <th style={styles.modalTh}>単元名</th>
                    <th style={styles.modalTh}>ページ</th>
                    <th style={styles.modalTh}>選択</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredUnits = currentMaster.filter(d => {
                      // 教科の基本一致
                      const isSubMatch = d.科目?.trim() === currentSelecting?.subject;
                      // 選択中の学年フィルタに一致するか
                      const isGrdMatch = d.学年?.includes(selectedGradeFilter);
                      
                      let isTxtMatch = true;
                      // 学校進捗の場合
                      if (isSchoolMode) {
                        if (currentSelecting?.subject === '社会') {
                          // 社会は歴史・地理・公民すべて出すためテキスト名チェックをスキップ
                          isTxtMatch = true;
                        } else {
                          // 社会以外も学校進捗は「学年内の全テキスト」を出す（テキスト名不問）
                          isTxtMatch = true;
                        }
                      } else {
                        // 個トレモードの場合は厳密にテキスト名をチェック
                        if (currentSelecting?.text) {
                          isTxtMatch = d.テキスト名?.trim() === currentSelecting?.text;
                        }
                      }

                      const hasContent = (d.単元 && d.単元.trim() !== "") || (d.節 && d.節.trim() !== "");
                      return isSubMatch && isGrdMatch && isTxtMatch && hasContent;
                    });

                    return filteredUnits.map((u, i) => {
                      // 選択状態を保持するためのキー。学校進捗でもテキストごとに保存されるように設定
                      const selKey = `${u.科目}-${u.テキスト名}`;
                      const unitId = `${u.章}-${u.単元}-${u.ページ}`;
                      const isChecked = (selectedUnits[selKey] || []).includes(unitId);

                      return (
                        <tr key={i} style={styles.modalTr}>
                          <td style={styles.modalTdUnit}>{u.科目}</td>
                          <td style={styles.modalTdUnit}>{u.テキスト名}</td>
                          <td style={styles.modalTdMerge}>{u.章}{u.節 ? ` / ${u.節}` : ""}</td>
                          <td style={styles.modalTdUnit}>{u.単元}</td>
                          <td style={styles.modalTdPage}>{u.ページ ? `${u.ページ}` : ""}</td>
                          <td style={styles.modalTdCheck}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={(e) => {
                                const curArr = selectedUnits[selKey] || [];
                                const newArr = e.target.checked ? [...curArr, unitId] : curArr.filter(id => id !== unitId);
                                setSelectedUnits({ ...selectedUnits, [selKey]: newArr });
                              }}
                            />
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.confirmBtn} onClick={() => setShowUnitModal(false)}>選択を確定する</button>
            </div>
          </div>
        </div>
      )}

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
              <iframe src={FORMS_URL} style={{ width: '100%', height: '70vh', border: 'none' }} title="Score Form"/>
            </div>
          </div>
        </div>
      )}

      {/* 4. テスト振り返りポップアップ (Google Forms) */}
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