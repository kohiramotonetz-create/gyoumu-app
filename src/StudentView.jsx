import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function StudentView({ userId, userName, grade, school, unit, handleLogout }) {
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

  // サイドバー開閉（講師用と同じく、デフォルトは開いた状態）
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toFullWidth = (str) => {
    if (!str) return "";
    return str.replace(/[0-9]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
  };

  const [displayGrade, setDisplayGrade] = useState(toFullWidth(grade));

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

  const sendToGAS = async (action, successMsg) => {
    const progressData = Object.keys(selectedUnits).map(key => {
      const [subject, text] = key.split('-');
      const unitNames = selectedUnits[key].map(id => id.split('-')[1]).join(', ');
      return { subject, text, units: unitNames };
    }).filter(item => item.units !== "");
    if (progressData.length === 0) return alert("単元が選択されていません。");
    if (!window.confirm("送信してもよろしいですか？")) return;
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action, apiKey: import.meta.env.VITE_API_KEY,
        userId, userName, grade, school, progressData
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") { alert(successMsg); setSelectedUnits({}); }
    } catch (e) { alert("送信エラー"); }
  };

  const sendNotification = async (statusType) => {
    if (submittingStatus) return;
    setSubmittingStatus(statusType);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "sendNotification", apiKey: import.meta.env.VITE_API_KEY,
        userId, userName, grade, school, status: statusType === 'maru' ? "丸付け待ち" : "質問待ち", unit
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
        const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications", apiKey: import.meta.env.VITE_API_KEY, unit }), { headers: { 'Content-Type': 'text/plain' } });
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

  const jukuSubjectList = ['国語', '数学', '英語', '理科', '社会'];
  const schoolSubjectList = ['国語', '数学', '英語', '理科', '社会'];
  const isSchoolMode = activeMenu === 'schoolProgress';
  const currentMaster = isSchoolMode ? schoolUnitMaster : unitMaster;
  const currentSubjects = isSchoolMode ? schoolSubjectList : jukuSubjectList;

  return (
    <div style={styles.container}>
      {/* --- ヘッダー（講師用と同様の構成） --- */}
      <header style={styles.header}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>☰</button>
        <div style={styles.headerTitle}>個別ミッショントレーニング</div>
        <div style={styles.headerUserInfo}>{userName} さん（{toFullWidth(grade)}）</div>
      </header>

      <div style={styles.body}>
        {/* --- サイドバー --- */}
        <aside style={styles.sidebar(isSidebarOpen)}>
          <div style={styles.profileArea}>
            <div style={styles.studentName}>{userName} <span style={{fontSize:'0.8rem'}}>さん</span></div>
            <div style={styles.schoolInfo}><span style={styles.infoBadge}>{school} {toFullWidth(grade)}</span></div>
          </div>
          <nav style={styles.nav}>
            <button style={styles.navItem(activeMenu === 'kodore')} onClick={() => setActiveMenu('kodore')}>🎯 個トレサポート</button>
            <button style={styles.navItem(activeMenu === 'progress')} onClick={() => {setActiveMenu('progress'); setSelectedUnits({}); setDisplayGrade(toFullWidth(grade));}}>📈 個トレ進捗</button>
            <button style={styles.navItem(activeMenu === 'schoolProgress')} onClick={() => {setActiveMenu('schoolProgress'); setSelectedUnits({}); setDisplayGrade(toFullWidth(grade));}}>🏫 学校進捗</button>
          </nav>
          <button onClick={handleLogout} style={styles.logoutBtn}>ログアウト</button>
        </aside>

        {/* --- メインコンテンツ --- */}
        <main style={styles.main}>
          {activeMenu === 'kodore' && (
            <div style={styles.contentArea}>
              <h1 style={styles.mainTitle}>🎯 個トレ・サポート</h1>
              {/* サポート内容 ... */}
              <div style={styles.cardContainer}>
                {showCompleteMsg ? (
                  <div style={styles.completeWrapper}>
                    <h2 style={styles.requestStatusText}>{lastStatus}の依頼を出しました！</h2>
                    <div style={styles.completeMsgCard}>
                      <div style={styles.queueNumberSmall}>受付番号：{myQueueNumber}番</div>
                      <p style={{fontSize:'1rem', color:'#666', margin: 0}}>そのまま少し待っていてね。</p>
                    </div>
                  </div>
                ) : myQueueNumber ? (
                  <div style={styles.waitingCard}>
                    <div style={styles.waitingTitle}>順番待ち中</div>
                    <div style={styles.queueNumber}>{myQueueNumber}<span style={{fontSize:'1.5rem'}}>番目</span></div>
                    <p style={styles.waitingText}>先生が呼ぶまでワークを進めて待っていよう！</p>
                  </div>
                ) : (
                  <div style={styles.buttonGrid}>
                    <button onClick={() => sendNotification('maru')} style={styles.btnMaru(submittingStatus === 'maru', !!submittingStatus)} disabled={!!submittingStatus}>📝<br/>丸付けお願いします！</button>
                    <button onClick={() => sendNotification('question')} style={styles.btnQuestion(submittingStatus === 'question', !!submittingStatus)} disabled={!!submittingStatus}>❓<br/>質問があります</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeMenu === 'progress' || activeMenu === 'schoolProgress') && (
            <div style={styles.contentArea}>
              <h1 style={styles.mainTitle}>{isSchoolMode ? "🏫 学校進捗登録" : "📈 個トレ進捗登録"}</h1>
              {isSchoolMode ? (
                <div style={styles.filterBar}>
                  <span style={{marginRight:'10px', fontWeight:'bold'}}>表示する学年:</span>
                  {['中１', '中２', '中３'].map(g => (
                    <button key={g} onClick={() => { setDisplayGrade(g); setSelectedUnits({}); }} style={styles.gradeTab(displayGrade === g)}>{g}</button>
                  ))}
                </div>
              ) : <p style={styles.mainSubTitle}>{toFullWidth(grade)} の教材を表示しています。</p>}

              <div style={styles.progressTableWrapper}>
                <table style={styles.progressTable}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>科目</th><th style={styles.th}>テキスト</th><th style={styles.th}>選択</th><th style={styles.th}>実施単元</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSubjects.map((subName) => {
                      const availableTexts = [...new Set(
                        currentMaster.filter(d => {
                          const isSubMatch = d.科目 === subName;
                          const targetGrd = isSchoolMode ? displayGrade : toFullWidth(grade);
                          const isGrdMatch = d.学年.includes(targetGrd);
                          return isSubMatch && isGrdMatch;
                        }).map(d => d.テキスト名)
                      )].filter(t => t !== "");
                      return availableTexts.map((textName, idx) => {
                        const selKey = `${subName}-${textName}`;
                        return (
                          <tr key={selKey} style={styles.tr}>
                            {idx === 0 && <td rowSpan={availableTexts.length} style={styles.tdSubject}>{subName}</td>}
                            <td style={styles.tdText}>{textName}</td>
                            <td style={styles.td}><button style={styles.selectBtn} onClick={() => { setCurrentSelecting({ subject: subName, text: textName }); setShowUnitModal(true); }}>選択</button></td>
                            <td style={styles.tdUnitDisplay}>{selectedUnits[selKey]?.map(id => id.split('-')[1]).join(', ') || ""}</td>
                          </tr>
                        )
                      })
                    })}
                  </tbody>
                </table>
                <button style={styles.submitProgressBtn} onClick={() => sendToGAS(isSchoolMode ? "saveSchoolProgress" : "saveProgress", "保存しました！")}>進捗を送信する</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- モーダル --- */}
      {showUnitModal && (
        <div style={styles.overlay} onClick={() => setShowUnitModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{currentSelecting?.subject}：{currentSelecting?.text} ({isSchoolMode ? displayGrade : toFullWidth(grade)})</h3>
              <button style={styles.modalCloseX} onClick={() => setShowUnitModal(false)}>×</button>
            </div>
            <div style={styles.unitListScroll}>
              <table style={styles.unitTable}>
                <thead>
                  <tr style={styles.modalThRow}>
                    <th style={styles.modalTh}>章</th><th style={styles.modalTh}>節</th><th style={styles.modalTh}>単元</th><th style={styles.modalTh}>ページ</th><th style={styles.modalTh}>□</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredUnits = currentMaster.filter(d => {
                      const isSubMatch = d.科目?.trim() === currentSelecting?.subject;
                      const isTxtMatch = d.テキスト名?.trim() === currentSelecting?.text;
                      const hasContent = (d.単元 && d.単元.trim() !== "") || (d.節 && d.節.trim() !== "");
                      const targetGrd = isSchoolMode ? displayGrade : toFullWidth(grade);
                      const isGrdMatch = d.学年.includes(targetGrd);
                      return isSubMatch && isTxtMatch && isGrdMatch && hasContent;
                    });
                    const rows = [];
                    for (let i = 0; i < filteredUnits.length; i++) {
                      const u = filteredUnits[i];
                      const selKey = `${currentSelecting.subject}-${currentSelecting.text}`;
                      const unitId = `${u.章}-${u.単元}-${u.ページ}`;
                      const isChecked = (selectedUnits[selKey] || []).includes(unitId);
                      let chSpan = (i === 0 || filteredUnits[i - 1].章 !== u.章) ? 1 : 0;
                      if (chSpan === 1) { for (let j = i + 1; j < filteredUnits.length && filteredUnits[j].章 === u.章; j++) chSpan++; }
                      let seSpan = (i === 0 || filteredUnits[i - 1].節 !== u.節 || filteredUnits[i - 1].章 !== u.章) ? 1 : 0;
                      if (seSpan === 1) { for (let j = i + 1; j < filteredUnits.length && filteredUnits[j].節 === u.節 && filteredUnits[j].章 === u.章; j++) seSpan++; }
                      rows.push(
                        <tr key={i} style={styles.modalTr}>
                          {chSpan > 0 && <td rowSpan={chSpan} style={styles.modalTdMerge}>{u.章}</td>}
                          {seSpan > 0 && <td rowSpan={seSpan} style={styles.modalTdMerge}>{u.節}</td>}
                          <td style={styles.modalTdUnit}>{u.単元}</td>
                          <td style={styles.modalTdPage}>{u.ページ ? `(p.${u.ページ})` : ""}</td>
                          <td style={styles.modalTdCheck}>
                            <input type="checkbox" checked={isChecked} style={styles.checkbox} onChange={(e) => {
                              const curArr = selectedUnits[selKey] || [];
                              const newArr = e.target.checked ? [...curArr, unitId] : curArr.filter(id => id !== unitId);
                              setSelectedUnits({ ...selectedUnits, [selKey]: newArr });
                            }}/>
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
            <div style={styles.modalFooter}><button style={styles.confirmBtn} onClick={() => setShowUnitModal(false)}>選択を確定する</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f7f9', position: 'fixed', top: 0, left: 0, overflow: 'hidden', fontFamily: '"Helvetica Neue", Arial, sans-serif' },
  header: { height: '60px', backgroundColor: '#2c3e50', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 1000, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  hamburgerBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', marginRight: '20px' },
  headerTitle: { fontSize: '1.2rem', fontWeight: 'bold', flex: 1 },
  headerUserInfo: { fontSize: '0.9rem', color: '#bdc3c7' },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  sidebar: (isOpen) => ({ width: isOpen ? '260px' : '0px', backgroundColor: '#34495e', color: '#ecf0f1', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.3s ease', flexShrink: 0 }),
  profileArea: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', minWidth: '260px' },
  studentName: { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' },
  schoolInfo: { display: 'flex', alignItems: 'center' },
  infoBadge: { background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px', minWidth: '260px' },
  navItem: (isActive) => ({ background: isActive ? '#3498db' : 'none', color: '#fff', border: 'none', padding: '12px 15px', borderRadius: '6px', fontSize: '1rem', textAlign: 'left', cursor: 'pointer', width: '100%' }),
  logoutBtn: { background: 'rgba(231, 76, 60, 0.2)', border: 'none', color: '#e74c3c', padding: '10px', cursor: 'pointer', margin: '10px', borderRadius: '6px' },
  main: { flex: 1, padding: '30px', overflowY: 'auto', position: 'relative' },
  contentArea: { maxWidth: '1000px', margin: '0 auto' },
  mainTitle: { fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px', color: '#2c3e50', textAlign: 'center' },
  mainSubTitle: { fontSize: '1.1rem', color: '#7f8c8d', marginBottom: '20px', textAlign: 'center' },
  cardContainer: { display: 'flex', justifyContent: 'center', marginTop: '20px' },
  buttonGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', width: '100%', maxWidth: '700px' },
  btnMaru: (isS, isA) => ({ height: '180px', borderRadius: '20px', border: 'none', background: isS ? '#ccc' : (isA ? '#ffcc99' : 'linear-gradient(135deg, #e67e22, #f39c12)'), color: '#fff', fontSize: '1.4rem', fontWeight: 'bold', cursor: isA ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }),
  btnQuestion: (isS, isA) => ({ height: '180px', borderRadius: '20px', border: 'none', background: isS ? '#ccc' : (isA ? '#b3e0ff' : 'linear-gradient(135deg, #3498db, #5dade2)'), color: '#fff', fontSize: '1.4rem', fontWeight: 'bold', cursor: isA ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }),
  completeWrapper: { textAlign: 'center' },
  requestStatusText: { fontSize: '1.5rem', color: '#2c3e50', marginBottom: '15px' },
  completeMsgCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '15px', border: '4px solid #3498db' },
  queueNumberSmall: { fontSize: '2rem', color: '#3498db', fontWeight: 'bold' },
  waitingCard: { backgroundColor: '#fff', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '5px solid #27ae60' },
  waitingTitle: { color: '#27ae60', fontSize: '1.4rem', marginBottom: '10px' },
  queueNumber: { fontSize: '5rem', fontWeight: 'bold' },
  waitingText: { marginTop: '20px', color: '#666' },
  progressTableWrapper: { backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  progressTable: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' },
  th: { padding: '12px', textAlign: 'left', color: '#495057' },
  tr: { borderBottom: '1px solid #eee' },
  tdSubject: { padding: '15px', fontWeight: 'bold', borderRight: '1px solid #eee' },
  tdText: { padding: '15px' },
  td: { padding: '10px' },
  tdUnitDisplay: { padding: '15px', color: '#3498db', fontSize: '0.85rem' },
  selectBtn: { padding: '6px 12px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  submitProgressBtn: { width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
  filterBar: { marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gradeTab: (active) => ({ padding: '8px 18px', margin: '0 5px', borderRadius: '20px', border: 'none', backgroundColor: active ? '#3498db' : '#dfe6e9', color: active ? '#fff' : '#636e72', cursor: 'pointer', fontWeight: 'bold' }),
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '20px', width: '95%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #3498db', paddingBottom: '10px', marginBottom: '15px' },
  modalTitle: { margin: 0, color: '#2c3e50' },
  modalCloseX: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#ccc' },
  unitListScroll: { flex: 1, overflowY: 'auto' },
  unitTable: { width: '100%', borderCollapse: 'collapse' },
  modalTh: { border: '1px solid #333', padding: '8px', backgroundColor: '#f8f9fa' },
  modalTdMerge: { border: '1px solid #333', padding: '10px', textAlign: 'center', fontWeight: 'bold' },
  modalTdUnit: { border: '1px solid #333', padding: '10px' },
  modalTdPage: { border: '1px solid #333', padding: '10px', textAlign: 'center', color: '#7f8c8d' },
  modalTdCheck: { border: '1px solid #333', padding: '10px', textAlign: 'center' },
  modalFooter: { marginTop: '15px', textAlign: 'center' },
  confirmBtn: { padding: '12px 40px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' },
};