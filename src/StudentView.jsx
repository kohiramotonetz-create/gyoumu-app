import { useState, useEffect } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function StudentView({ userId, userName, grade, school, unit, handleLogout }) {
  const [myQueueNumber, setMyQueueNumber] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(''); 
  const [activeMenu, setActiveMenu] = useState('kodore');
  const [showCompleteMsg, setShowCompleteMsg] = useState(false); 
  const [lastStatus, setLastStatus] = useState(''); 

  // --- 進捗管理用ステート ---
  const [unitMaster, setUnitMaster] = useState([]); 
  const [selectedUnits, setSelectedUnits] = useState({}); // { "科目-テキスト": ["章-単元-ページ", ...] }
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [currentSelecting, setCurrentSelecting] = useState(null);

  // --- 1. 単元マスタ（CSV）の読み込み：【動いていたロジックを完全維持】 ---
  useEffect(() => {
    const loadUnitMaster = async () => {
      try {
        console.log("CSV読み込み開始...");
        const response = await fetch('/units.csv');
        if (!response.ok) throw new Error(`CSVファイルが見つかりません (Status: ${response.status})`);

        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(arrayBuffer);

        const rows = text.split(/\r?\n/).map(row => row.split(','));
        const headers = rows[0].map(h => h.trim());

        const data = rows.slice(1).filter(row => row.length >= 3).map(row => {
          let obj = {};
          headers.forEach((h, i) => {
            obj[h] = row[i] ? row[i].trim() : "";
          });
          return obj;
        });

        const filtered = data.filter(d => {
          const gStr = String(grade || "");
          return gStr.includes(d.学年);
        });

        console.log("全件数:", data.length, "フィルタ後:", filtered.length);
        setUnitMaster(filtered);

      } catch (e) {
        console.error("重大なエラー:", e);
        alert("データ読み込み失敗: " + e.message);
      }
    };
    loadUnitMaster();
  }, [grade]);

  // --- 通知・状態チェック (既存機能) ---
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

  const checkMyStatus = async () => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "getNotifications", unit }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        const myData = response.data.notifications.find(n => n.userId === userId && n.name === userName);
        if (myData) { setMyQueueNumber(myData.queueNumber); } 
        else { setMyQueueNumber(null); setShowCompleteMsg(false); setSubmittingStatus(''); }
      }
    } catch (e) { console.error("Update Error"); }
  };

  useEffect(() => {
    checkMyStatus();
    const timer = setInterval(checkMyStatus, 5000);
    return () => clearInterval(timer);
  }, []);

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
          <div style={styles.schoolInfo}><span style={styles.infoBadge}>{school} {grade}</span></div>
        </div>
        <nav style={styles.nav}>
          <button style={styles.navItem(activeMenu === 'kodore')} onClick={() => setActiveMenu('kodore')}>
            <span style={styles.navIcon}>🎯</span> 個トレサポート
          </button>
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
                    sub.texts.map((text, idx) => {
                      const selKey = `${sub.name}-${text}`;
                      return (
                        <tr key={selKey} style={styles.tr}>
                          {idx === 0 && <td rowSpan={sub.texts.length} style={styles.tdSubject}>{sub.name}</td>}
                          <td style={styles.tdText}>{text}</td>
                          <td style={styles.td}>
                            <button style={styles.selectBtn} onClick={() => { setCurrentSelecting({ subject: sub.name, text: text }); setShowUnitModal(true); }}>選択</button>
                          </td>
                          {/* メイン画面には単元名（IDの2番目の要素）だけを表示 */}
                          <td style={styles.tdUnitDisplay}>
                            {selectedUnits[selKey]?.map(id => id.split('-')[1]).join(', ') || ""}
                          </td>
                        </tr>
                      )
                    })
                  ))}
                </tbody>
              </table>
              <button style={styles.submitProgressBtn} onClick={() => alert("スプレッドシートへの送信は次回実装します！")}>進捗を送信する</button>
            </div>
          </div>
        )}

        {activeMenu === 'sukima' && <div style={styles.emptyContent}>スキマくん起動中...</div>}
        <div style={styles.loginInfoBar}>現在のログイン：{userName} さん（{grade}）</div>
      </main>

      {showUnitModal && (
        <div style={styles.overlay} onClick={() => setShowUnitModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{currentSelecting?.subject}：{currentSelecting?.text}</h3>
              <button style={styles.modalCloseX} onClick={() => setShowUnitModal(false)}>×</button>
            </div>
            <div style={styles.unitListScroll}>
              {Object.entries(
                unitMaster
                  .filter(d => d.科目.includes(currentSelecting?.subject) && d.テキスト名.includes(currentSelecting?.text))
                  .reduce((acc, cur) => {
                    const chapter = cur.章 || "その他";
                    if (!acc[chapter]) acc[chapter] = [];
                    acc[chapter].push(cur);
                    return acc;
                  }, {})
              ).map(([chapter, units]) => (
                <div key={chapter} style={styles.chapterGroup}>
                  <div style={styles.chapterTitle}>{chapter}</div>
                  {units.map((u, i) => {
                    const selKey = `${currentSelecting.subject}-${currentSelecting.text}`;
                    
                    // 重複回避用の固有ID生成（章-単元-ページ）
                    const unitUniqueId = `${u.章}-${u.単元}-${u.ページ}`;
                    const isChecked = (selectedUnits[selKey] || []).includes(unitUniqueId);
                    
                    return (
                      <label key={i} style={styles.unitRow}>
                        <span style={styles.unitNamePart}>{u.単元}</span>
                        <span style={styles.unitPagePart}>{u.ページ ? `p.${u.ページ}` : ""}</span>
                        <div style={styles.checkboxPart}>
                          <input type="checkbox" checked={isChecked} style={styles.checkbox} onChange={(e) => {
                            const currentArray = selectedUnits[selKey] || [];
                            const newArray = e.target.checked 
                              ? [...currentArray, unitUniqueId] 
                              : currentArray.filter(id => id !== unitUniqueId);
                            setSelectedUnits({ ...selectedUnits, [selKey]: newArray });
                          }}/>
                        </div>
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

const styles = {
  container: { height: '100vh', width: '100vw', display: 'flex', backgroundColor: '#eef2f5', position: 'fixed', top: 0, left: 0, overflow: 'hidden', fontFamily: '"Helvetica Neue", Arial, sans-serif' },
  sidebar: { width: '280px', backgroundColor: '#2c3e50', color: '#ecf0f1', display: 'flex', flexDirection: 'column', padding: '30px 20px', flexShrink: 0 },
  profileArea: { marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' },
  studentName: { fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '8px' },
  schoolInfo: { display: 'flex', alignItems: 'center' },
  infoBadge: { background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' },
  navItem: (isActive) => ({ background: isActive ? '#3498db' : 'none', color: '#fff', border: 'none', padding: '12px 15px', borderRadius: '8px', fontSize: '1.1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%' }),
  navIcon: { marginRight: '15px', fontSize: '1.2rem' },
  logoutBtn: { background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px', borderRadius: '4px', cursor: 'pointer', marginTop: 'auto' },
  main: { flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#f4f7f9' },
  contentArea: { maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' },
  mainTitle: { fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#333' },
  mainSubTitle: { fontSize: '1.2rem', color: '#666', marginBottom: '20px' },
  cardContainer: { width: '100%', display: 'flex', justifyContent: 'center', marginTop: '30px' },
  buttonGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', width: '100%', maxWidth: '800px' },
  btnMaru: (isS, isA) => ({ height: '220px', borderRadius: '30px', border: 'none', background: isS ? '#ccc' : (isA ? '#ffcc99' : 'linear-gradient(135deg, #e67e22, #f39c12)'), color: '#fff', fontSize: isS ? '1.2rem' : '1.6rem', fontWeight: 'bold', cursor: isA ? 'not-allowed' : 'pointer', padding: '20px', boxShadow: (isS || isA) ? 'none' : '0 8px 15px rgba(230,126,34,0.3)' }),
  btnQuestion: (isS, isA) => ({ height: '220px', borderRadius: '30px', border: 'none', background: isS ? '#ccc' : (isA ? '#b3e0ff' : 'linear-gradient(135deg, #3498db, #5dade2)'), color: '#fff', fontSize: isS ? '1.2rem' : '1.6rem', fontWeight: 'bold', cursor: isA ? 'not-allowed' : 'pointer', padding: '20px', boxShadow: (isS || isA) ? 'none' : '0 8px 15px rgba(52,152,219,0.3)' }),
  completeWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px' },
  requestStatusText: { fontSize: '1.8rem', fontWeight: 'bold', color: '#333', marginBottom: '20px' },
  completeMsgCard: { backgroundColor: '#fff', padding: '30px 20px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 15px 30px rgba(0,0,0,0.1)', border: '6px solid #3498db', width: '100%' },
  queueNumberSmall: { fontSize: '2.8rem', fontWeight: 'bold', color: '#3498db', margin: '15px 0' }, 
  waitingCard: { backgroundColor: '#fff', padding: '50px 40px', borderRadius: '30px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '6px solid #27ae60', width: '100%', maxWidth: '480px' },
  waitingTitle: { fontSize: '1.6rem', fontWeight: 'bold', color: '#27ae60', marginBottom: '15px' },
  queueNumber: { fontSize: '7rem', fontWeight: 'bold', color: '#333', lineHeight: 1 },
  waitingText: { marginTop: '30px', color: '#666', fontSize: '1.2rem' },
  loginInfoBar: { width: '100%', textAlign: 'center', background: '#fff', padding: '12px 20px', borderRadius: '12px', color: '#666', fontSize: '1rem', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginTop: 'auto', marginBottom: '20px' },
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
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '20px', width: '90%', maxWidth: '850px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', zIndex: 1001 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #3498db', paddingBottom: '10px' },
  modalTitle: { margin: 0, fontSize: '1.3rem', color: '#2c3e50', fontWeight: 'bold' },
  modalCloseX: { background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#bdc3c7', padding: '0 10px' },
  unitListScroll: { maxHeight: '65vh', overflowY: 'auto', paddingRight: '10px' },
  chapterGroup: { marginBottom: '25px', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' },
  chapterTitle: { fontWeight: 'bold', fontSize: '1rem', color: '#fff', backgroundColor: '#34495e', padding: '10px 15px', margin: 0 },
  unitRow: { display: 'flex', alignItems: 'center', padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #eee', backgroundColor: '#fff' },
  unitNamePart: { flex: 1, fontSize: '14px', color: '#333', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  unitPagePart: { width: '100px', textAlign: 'right', color: '#7f8c8d', fontSize: '13px', marginRight: '30px' },
  checkboxPart: { width: '30px', display: 'flex', justifyContent: 'center' },
  checkbox: { width: '24px', height: '24px', cursor: 'pointer', accentColor: '#3498db' },
  modalFooter: { marginTop: '20px', textAlign: 'center', paddingBottom: '10px' },
  confirmBtn: { padding: '14px 60px', background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(52,152,219,0.4)' },
  emptyContent: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '1.5rem', color: '#999' }
};