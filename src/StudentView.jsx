import { useState, useEffect } from 'react'
import axios from 'axios'
import Papa from 'papaparse' // CSV解析用

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function StudentView({ userId, userName, grade, school, unit, handleLogout }) {
  const [myQueueNumber, setMyQueueNumber] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(''); 
  const [activeMenu, setActiveMenu] = useState('kodore'); // 初期はサポート画面
  const [showCompleteMsg, setShowCompleteMsg] = useState(false); 
  const [lastStatus, setLastStatus] = useState(''); 

  // --- ★ 個トレ進捗用のステート追加 ---
  const [unitMaster, setUnitMaster] = useState([]); // 単元マスタ
  const [selectedUnits, setSelectedUnits] = useState({}); // { "科目-テキスト": "選択された単元名" }
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [currentSelecting, setCurrentSelecting] = useState(null);

  // --- ★ 単元マスタ（CSV）の読み込み ---
  useEffect(() => {
    const loadUnitMaster = async () => {
      try {
        const response = await fetch('/units.csv');
        const text = await response.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          // loadUnitMaster 内の filter 部分を修正
　　　　　complete: (results) => {
  　　　　　const cleanedData = results.data.map(row => {
    　　　　const newRow = {};
    for (let key in row) {
      newRow[key.trim()] = row[key] ? String(row[key]).trim() : "";
    }
    return newRow;
  });

  // ここを修正：grade（木太南 中1）の中に、d.学年（中1）が含まれているかチェック
  const filtered = cleanedData.filter(d => {
    if (!d.学年 || !grade) return false;
    return grade.includes(d.学年); 
  });
  
  console.log("フィルタ後のデータ数:", filtered.length);
  setUnitMaster(filtered);
}
        });
      } catch (e) { console.error("マスタ読み込み失敗"); }
    };
    loadUnitMaster();
  }, [grade]);

  // --- 通知送信ロジック（既存） ---
  const sendNotification = async (statusType) => {
    if (submittingStatus) return;
    setSubmittingStatus(statusType);
    const statusText = statusType === 'maru' ? "丸付け待ち" : "質問待ち";
    setLastStatus(statusType === 'maru' ? "丸付け" : "質問");
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "sendNotification", userId, userName, grade, school, status: statusText, unit
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        setMyQueueNumber(response.data.queueNumber);
        setShowCompleteMsg(true);
      }
    } catch (e) { alert("送信失敗"); setSubmittingStatus(''); }
  };

  // --- 状態チェック（既存） ---
  const checkMyStatus = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications", unit }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        const myData = response.data.notifications.find(n => n.userId === userId && n.name === userName);
        if (myData) { setMyQueueNumber(myData.queueNumber); } 
        else { setMyQueueNumber(null); setShowCompleteMsg(false); setSubmittingStatus(''); }
      }
    } catch (e) { console.error("更新失敗"); }
  };

  useEffect(() => {
    checkMyStatus();
    const timer = setInterval(checkMyStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  // --- 表示する科目とテキストの定義 ---
  const subjectList = [
    { name: '国語', texts: ['iワークドリル', 'iワークプラス'] },
    { name: '数学', texts: ['iワークドリル', 'iワークプラス'] },
    { name: '英語', texts: ['iワークプラス'] },
    { name: '理科', texts: ['iワークノート', 'iワークプラス'] },
    { name: '社会', texts: ['地理ノート', '地理プラス', '歴史ノート', '歴史プラス'] },
  ];

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.profileArea}>
          <div style={styles.studentName}>{userName} <span style={{fontSize:'0.9rem'}}>さん</span></div>
          <div style={styles.schoolInfo}>
            <span style={styles.infoBadge}>{school} {grade}</span>
          </div>
        </div>
        <nav style={styles.nav}>
          {/* ★ 名称を「個トレサポート」に変更 */}
          <button style={styles.navItem(activeMenu === 'kodore')} onClick={() => setActiveMenu('kodore')}>
            <span style={styles.navIcon}>🎯</span> 個トレサポート
          </button>
          {/* ★ 「学校の進度」を「個トレ進捗」に変更 */}
          <button style={styles.navItem(activeMenu === 'progress')} onClick={() => setActiveMenu('progress')}>
            <span style={styles.navIcon}>📈</span> 個トレ進捗
          </button>
          <button style={styles.navItem(activeMenu === 'sukima')} onClick={() => setActiveMenu('sukima')}>
            <span style={styles.navIcon}>⚡</span> スキマくん
          </button>
        </nav>
        <button onClick={handleLogout} style={styles.logoutBtn}>ログアウト</button>
      </aside>

      <main style={styles.main}>
        {/* --- 🎯 個トレサポート（旧個トレ） --- */}
        {activeMenu === 'kodore' && (
          <div style={styles.contentArea}>
            <h1 style={styles.mainTitle}>🎯 個トレ・サポート</h1>
            <p style={styles.mainSubTitle}>先生に合図を送りたい方のボタンを押してね。</p>
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
                  <button onClick={() => sendNotification('maru')} style={styles.btnMaru(submittingStatus === 'maru', !!submittingStatus)} disabled={!!submittingStatus}>
                    {submittingStatus === 'maru' ? "送信中..." : <>📝<br/>丸付けお願いします！</>}
                  </button>
                  <button onClick={() => sendNotification('question')} style={styles.btnQuestion(submittingStatus === 'question', !!submittingStatus)} disabled={!!submittingStatus}>
                    {submittingStatus === 'question' ? "送信中..." : <>❓<br/>質問があります</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 📈 個トレ進捗登録（新規追加） --- */}
        {activeMenu === 'progress' && (
          <div style={styles.contentArea}>
            <h1 style={styles.mainTitle}>📈 個トレ進捗登録</h1>
            <p style={styles.mainSubTitle}>今日やった単元を教えてね。</p>
            
            <div style={styles.progressTableWrapper}>
              <table style={styles.progressTable}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>科目</th>
                    <th style={styles.th}>テキスト</th>
                    <th style={styles.th}>選択</th>
                    <th style={styles.th}>実施単元</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectList.map((sub) => (
                    sub.texts.map((text, idx) => (
                      <tr key={`${sub.name}-${text}`} style={styles.tr}>
                        {idx === 0 && <td rowSpan={sub.texts.length} style={styles.tdSubject}>{sub.name}</td>}
                        <td style={styles.tdText}>{text}</td>
                        <td style={styles.td}>
                          <button 
                            style={styles.selectBtn}
                            onClick={() => {
                              setCurrentSelecting({ subject: sub.name, text: text });
                              setShowUnitModal(true);
                            }}
                          >選択</button>
                        </td>
                        <td style={styles.tdUnitDisplay}>
                          {selectedUnits[`${sub.name}-${text}`] || ""}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
              <button style={styles.submitProgressBtn} onClick={() => alert("スプレッドシートへの送信は次で実装します！")}>
                進捗を送信する
              </button>
            </div>
          </div>
        )}

        {activeMenu === 'sukima' && <div style={styles.emptyContent}>スキマくん起動中...</div>}

        <div style={styles.loginInfoBar}>
          現在のログイン：{userName} さん（{grade}）
        </div>
      </main>

      {/* --- 単元選択ポップアップ（モーダル） --- */}
      {showUnitModal && (
          <div style={styles.overlay} onClick={() => setShowUnitModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              {currentSelecting?.subject}：{currentSelecting?.text}
              </h3>
              <p style={{color:'red'}}>マスタ総数: {unitMaster.length}件 / 検索条件: {currentSelecting?.subject} - {currentSelecting?.text}</p>

            <button style={styles.modalCloseX} onClick={() => setShowUnitModal(false)}>×</button>
      </div>

      <div style={styles.unitListScroll}>
        {/* 章ごとにグループ化して表示 */}
        {Object.entries(
          unitMaster
            .filter(d => d.科目.includes(currentSelecting?.subject) && d.テキスト名 === currentSelecting?.text)
            .reduce((acc, cur) => {
              if (!acc[cur.章]) acc[cur.章] = [];
              acc[cur.章].push(cur);
              return acc;
            }, {})
        ).map(([chapter, units]) => (
          <div key={chapter} style={styles.chapterGroup}>
            <div style={styles.chapterTitle}>{chapter}</div>
            {units.map((u, i) => {
              const key = `${u.科目}-${u.テキスト名}-${u.章}-${u.単元}`;
              const isChecked = (selectedUnits[`${u.科目}-${u.テキスト名}`] || []).includes(u.単元);
              
              return (
                <label key={i} style={styles.unitLabel}>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    style={styles.checkbox}
                    onChange={(e) => {
                      const currentArray = selectedUnits[`${u.科目}-${u.テキスト名}`] || [];
                      let newArray;
                      if (e.target.checked) {
                        newArray = [...currentArray, u.単元];
                      } else {
                        newArray = currentArray.filter(name => name !== u.単元);
                      }
                      setSelectedUnits({
                        ...selectedUnits,
                        [`${u.科目}-${u.テキスト名}`]: newArray
                      });
                    }}
                  />
                  <span style={styles.unitNameText}>
                    {u.単元} {u.ページ ? `(p.${u.ページ})` : ""}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      <div style={styles.modalFooter}>
        <button style={styles.confirmBtn} onClick={() => setShowUnitModal(false)}>選択を確定する</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

// styles に追加が必要なもののみ記述（既存のものは維持）
const styles = {
  // --- 共通・レイアウト ---
  container: { height: '100vh', width: '100vw', display: 'flex', backgroundColor: '#eef2f5', position: 'fixed', top: 0, left: 0, overflow: 'hidden', fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", sans-serif' },
  sidebar: { width: '280px', backgroundColor: '#2c3e50', color: '#ecf0f1', display: 'flex', flexDirection: 'column', padding: '30px 20px', flexShrink: 0 },
  profileArea: { marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' },
  studentName: { fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '8px', whiteSpace: 'nowrap' },
  schoolInfo: { display: 'flex', alignItems: 'center' },
  infoBadge: { background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', color: '#ecf0f1' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' },
  navItem: (isActive) => ({ background: isActive ? '#3498db' : 'none', color: '#fff', border: 'none', padding: '12px 15px', borderRadius: '8px', fontSize: '1.1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%' }),
  navIcon: { marginRight: '15px', fontSize: '1.2rem' },
  logoutBtn: { background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px', borderRadius: '4px', cursor: 'pointer', marginTop: 'auto' },
  main: { flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#f4f7f9' },
  contentArea: { maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' },
  mainTitle: { fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#333' },
  mainSubTitle: { fontSize: '1.2rem', color: '#666', marginBottom: '20px' },
  
  // --- 個トレサポート画面 ---
  cardContainer: { width: '100%', display: 'flex', justifyContent: 'center', marginTop: '30px' },
  buttonGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', width: '100%', maxWidth: '800px' },
  btnMaru: (isSubmitting, isAnySubmitting) => ({ height: '220px', borderRadius: '30px', border: 'none', background: isSubmitting ? '#ccc' : (isAnySubmitting ? '#ffcc99' : 'linear-gradient(135deg, #e67e22, #f39c12)'), color: '#fff', fontSize: isSubmitting ? '1.2rem' : '1.6rem', fontWeight: 'bold', cursor: isAnySubmitting ? 'not-allowed' : 'pointer', padding: '20px', lineHeight: '1.4', boxShadow: (isSubmitting || isAnySubmitting) ? 'none' : '0 8px 15px rgba(230,126,34,0.3)' }),
  btnQuestion: (isSubmitting, isAnySubmitting) => ({ height: '220px', borderRadius: '30px', border: 'none', background: isSubmitting ? '#ccc' : (isAnySubmitting ? '#b3e0ff' : 'linear-gradient(135deg, #3498db, #5dade2)'), color: '#fff', fontSize: isSubmitting ? '1.2rem' : '1.6rem', fontWeight: 'bold', cursor: isAnySubmitting ? 'not-allowed' : 'pointer', padding: '20px', lineHeight: '1.4', boxShadow: (isSubmitting || isAnySubmitting) ? 'none' : '0 8px 15px rgba(52,152,219,0.3)' }),
  completeWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px' },
  requestStatusText: { fontSize: '1.8rem', fontWeight: 'bold', color: '#333', marginBottom: '20px', textAlign: 'center', marginTop: 0 },
  completeMsgCard: { backgroundColor: '#fff', padding: '30px 20px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 15px 30px rgba(0,0,0,0.1)', border: '6px solid #3498db', width: '100%', marginTop: 0 },
  queueNumberSmall: { fontSize: '2.8rem', fontWeight: 'bold', color: '#3498db', margin: '15px 0' }, 
  waitingCard: { backgroundColor: '#fff', padding: '50px 40px', borderRadius: '30px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '6px solid #27ae60', width: '100%', maxWidth: '480px' },
  waitingTitle: { fontSize: '1.6rem', fontWeight: 'bold', color: '#27ae60', marginBottom: '15px' },
  queueNumber: { fontSize: '7rem', fontWeight: 'bold', color: '#333', lineHeight: 1 },
  waitingText: { marginTop: '30px', color: '#666', lineHeight: '1.6', fontSize: '1.2rem' },
  loginInfoBar: { width: '100%', textAlign: 'center', background: '#fff', padding: '12px 20px', borderRadius: '12px', color: '#666', fontSize: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginTop: 'auto', marginBottom: '20px' },

  // --- 個トレ進捗画面 ---
  progressTableWrapper: { width: '100%', backgroundColor: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  progressTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px' },
  tableHeader: { backgroundColor: '#f8f9fa' },
  th: { padding: '12px', borderBottom: '2px solid #eee', textAlign: 'left', color: '#666' },
  tr: { borderBottom: '1px solid #eee' },
  tdSubject: { padding: '15px', fontWeight: 'bold', borderRight: '1px solid #eee', width: '80px' },
  tdText: { padding: '15px', color: '#444' },
  td: { padding: '10px' },
  tdUnitDisplay: { padding: '15px', color: '#3498db', fontSize: '0.8rem', maxWidth: '300px', wordBreak: 'break-all' },
  selectBtn: { padding: '8px 15px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  submitProgressBtn: { width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  
  // --- モーダル（ポップアップ） ---
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '20px', width: '90%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', zIndex: 1001 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #3498db', paddingBottom: '10px' },
  modalTitle: { margin: 0, fontSize: '1.2rem', color: '#2c3e50' },
  modalCloseX: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' },
  unitListScroll: { maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' },
  chapterGroup: { marginBottom: '20px', backgroundColor: '#f9f9f9', borderRadius: '10px', padding: '10px' },
  chapterTitle: { fontWeight: 'bold', fontSize: '0.9rem', color: '#e67e22', marginBottom: '8px', borderLeft: '4px solid #e67e22', paddingLeft: '8px' },
  unitLabel: { display: 'flex', alignItems: 'center', padding: '8px 5px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '13px', fontFamily: 'monospace', whiteSpace: 'nowrap' },
  checkbox: { marginRight: '10px', width: '18px', height: '18px' },
  unitNameText: { color: '#333', letterSpacing: '-0.5px' },
  modalFooter: { marginTop: '20px', textAlign: 'center' },
  confirmBtn: { padding: '12px 40px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(52,152,219,0.3)' },
  emptyContent: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '1.5rem', color: '#999' }
};