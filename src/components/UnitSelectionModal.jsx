import React from 'react';

export default function UnitSelectionModal({
  showUnitModal,
  setShowUnitModal,
  currentSelecting,
  isSchoolMode,
  selectedGradeFilter,
  setSelectedGradeFilter,
  currentMaster,
  selectedUnits,
  setSelectedUnits,
  completedPages,
  styles
}) {
  if (!showUnitModal) return null;

// UnitSelectionModal.jsx 内の 過去の提出済み判定ロジック（修正）
  const isPageCompleted = (u) => {
    if (!u.ページ || u.ページ.trim() === "") return false;
    
    const subject = u.科目?.trim() || "";
    const textName = u.テキスト名?.trim() || "";
    const page = u.ページ?.trim() || "";
    
    if (isSchoolMode) {
      // 🏫 学校進捗モード：「テキスト名 + ページ」で判定
      const targetSchool = `${textName}${page}`.toLowerCase().replace(/[\.\s]/g, "");
      return completedPages.includes(targetSchool);
    } else {
      // 🎯 個トレ進捗モード：「科目 + テキスト名 + ページ」で厳密に判定
      // 例: "数学" + "iワークドリル" + "p.4" -> "数学iワークドリルp4"
      const targetKoTore = `${subject}${textName}${page}`.toLowerCase().replace(/[\.\s]/g, "");
      return completedPages.includes(targetKoTore);
    }
  };

  // 2. フィルタリング処理
  const filteredUnits = currentMaster.filter(d => {
    const isSubMatch = d.科目?.trim() === currentSelecting?.subject;
    const isGrdMatch = d.学年?.includes(selectedGradeFilter);
    let isTxtMatch = true;
    if (!isSchoolMode && currentSelecting?.text) {
      isTxtMatch = d.テキスト名?.trim() === currentSelecting?.text;
    }
    const hasContent = (d.単元 && d.単元.trim() !== "") || (d.節 && d.節.trim() !== "");
    return isSubMatch && isGrdMatch && isTxtMatch && hasContent;
  });

  // 3. セル結合(rowSpan)のための計算
  const calculateSpans = (data) => {
    const chapterSpans = new Array(data.length).fill(0);
    const sectionSpans = new Array(data.length).fill(0);
    
    let i = 0;
    while (i < data.length) {
      let j = i;
      while (j < data.length && data[j].章 === data[i].章) {
        j++;
      }
      chapterSpans[i] = j - i;
      
      let k = i;
      while (k < j) {
        let l = k;
        while (l < j && data[l].節 === data[k].節) {
          l++;
        }
        sectionSpans[k] = l - k;
        k = l;
      }
      i = j;
    }
    return { chapterSpans, sectionSpans };
  };

  const { chapterSpans, sectionSpans } = calculateSpans(filteredUnits);

  // 4. 動的スタイル（過去完了分はグレーアウト）
  const tdStyle = (isPastDone) => ({ 
    border: '1.5px solid #0a0a0a', 
    padding: '10px 8px', 
    backgroundColor: isPastDone ? '#f1f5f9' : '#fff',
    verticalAlign: 'middle',
    fontSize: '13px',
    boxSizing: 'border-box',
    color: isPastDone ? '#94a3b8' : '#000'
  });

  return (
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
          <table style={{ 
              ...styles.unitTable, 
              borderCollapse: 'collapse', 
              borderSpacing: 0,          
              width: '100%',
              border: '1px solid #ddd'   
            }}>
            <thead>
              <tr style={styles.modalThRow}>
                <th style={styles.modalTh}>章</th>
                <th style={styles.modalTh}>節</th>
                <th style={styles.modalTh}>単元名</th>
                <th style={styles.modalTh}>ページ</th>
                <th style={styles.modalTh}>選択</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map((u, i) => {
                const selKey = `${u.科目}-${u.テキスト名}`;
                const unitId = `${u.章}-${u.単元}-${u.ページ}`;
                
                // 【修正】単元オブジェクト(u)ごと渡して「テキスト名＋ページ」で完了判定
                const isPastDone = isPageCompleted(u);
                const isChecked = (selectedUnits[selKey] || []).includes(unitId);

                return (
                  <tr key={i} style={styles.modalTr}>
                    {/* 章 */}
                    {chapterSpans[i] > 0 && (
                      <td 
                        rowSpan={chapterSpans[i]} 
                        style={{ 
                          ...styles.modalTdMerge, 
                          ...tdStyle(isPastDone), 
                          textAlign: 'center', 
                          fontWeight: 'bold', 
                          backgroundColor: isPastDone ? '#e2e8f0' : '#f8f9fa', 
                          color: isPastDone ? '#94a3b8' : '#000' 
                        }}
                      >
                        {u.章}
                      </td>
                    )}
                    {/* 節 */}
                    {sectionSpans[i] > 0 && (
                      <td 
                        rowSpan={sectionSpans[i]} 
                        style={{ 
                          ...styles.modalTdMerge, 
                          ...tdStyle(isPastDone), 
                          textAlign: 'center', 
                          backgroundColor: isPastDone ? '#e2e8f0' : '#f8f9fa', 
                          color: isPastDone ? '#94a3b8' : '#000' 
                        }}
                      >
                        {u.節}
                      </td>
                    )}
                    {/* 単元名 */}
                    <td style={{ ...styles.modalTdUnit, ...tdStyle(isPastDone) }}>
                      {isPastDone && <span style={{ color: '#22c55e', marginRight: '6px', fontWeight: 'bold' }}>✅</span>}
                      {u.単元}
                    </td>
                    {/* ページ */}
                    <td style={{ ...styles.modalTdPage, ...tdStyle(isPastDone), textAlign: 'center' }}>
                      {u.ページ || ""}
                    </td>
                    {/* 選択（チェックボックスの制御） */}
                    <td style={{ ...styles.modalTdCheck, ...tdStyle(isPastDone), textAlign: 'center' }}>
                      {isPastDone ? (
                        <input 
                          type="checkbox" 
                          checked={true} 
                          disabled={true} 
                          style={{ cursor: 'not-allowed' }} 
                        />
                      ) : (
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={(e) => {
                            const curArr = selectedUnits[selKey] || [];
                            const newArr = e.target.checked ? [...curArr, unitId] : curArr.filter(id => id !== unitId);
                            setSelectedUnits({ ...selectedUnits, [selKey]: newArr });
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.confirmBtn} onClick={() => setShowUnitModal(false)}>選択を確定する</button>
        </div>
      </div>
    </div>
  );
}