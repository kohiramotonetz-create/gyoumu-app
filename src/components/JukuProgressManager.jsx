// 生徒：個トレ進捗管理（過去入力の自動✅表示対応完全版）
import React from 'react';

const JukuProgressManager = ({ 
  currentSubjects, 
  selectedUnits, 
  openUnitModal, 
  sendToGAS, 
  unitMaster, // 個トレ用マスター
  grade, // ログイン時の学年
  completedPages = [], // 💡 親から受け取る過去完了データ配列 (例: ["数学iワークドリルp4"])
  styles 
}) => {
  
  // ログイン時の学年に基づいて、その教科のテキスト名をCSVから抽出する
  const getBooksBySubject = (subject) => {
    const books = unitMaster
      .filter(d => d.科目?.trim() === subject && d.学年?.includes(grade))
      .map(d => d.テキスト名?.trim())
      .filter((v, i, a) => v && a.indexOf(v) === i);
    return books.length > 0 ? books : ["テキスト未設定"];
  };

  // 💡 対象のデータ項目が、個トレの過去完了履歴（科目＋テキスト名＋ページ）と一致するか正確に判定する
  const isPageCompleted = (d) => {
    if (!d.ページ || d.ページ.trim() === "") return false;
    
    const subject = d.科目?.trim() || "";
    const textName = d.テキスト名?.trim() || "";
    const page = d.ページ?.trim() || "";
    
    // GAS側の仕様（getStudentKoToreProgress）に100%合わせるため
    // 「科目名 ＋ テキスト名 ＋ ページ」を結合し、スペース・ドットを消して小文字化
    const target = `${subject}${textName}${page}`.toLowerCase().replace(/[\.\s]/g, "");
    
    return completedPages.includes(target);
  };

  // 💡 対象の教科・テキストに属するマスタ項目の中に、1つでも過去入力（完了）の単元があるか判定する
  const hasCompletedUnit = (subject, book) => {
    return unitMaster.some(d => {
      const isSubMatch = d.科目?.trim() === subject;
      const isGrdMatch = d.学年?.includes(grade);
      const isTxtMatch = d.テキスト名?.trim() === book;
      return isSubMatch && isGrdMatch && isTxtMatch && isPageCompleted(d);
    });
  };

  // 選択された単元名を詳細に表示する（二重のp.を防止）
  const getSelectedUnitNames = (subject, book) => {
    const selKey = `${subject}-${book}`;
    const unitIds = selectedUnits[selKey] || [];
    if (unitIds.length === 0) return <span style={{ color: '#999', fontSize: '0.85rem' }}>未選択</span>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
        {unitIds.map((id, i) => {
          const parts = id.split('-');
          const chapter = parts[0] || "";
          const unitName = parts[1] || "";
          const page = parts[2] || "";
          const section = parts[3] || "";

          // 表示用：テキスト名 ＋ 章 ＋ 節 ＋ 単元 ＋ ページ
          const fullDisplayName = `${book} ${chapter}${section ? ` ${section}` : ""} ${unitName} ${page}`;

          return (
            <div key={i} style={{ 
              fontSize: '0.75rem', 
              backgroundColor: '#eef9f1', 
              padding: '4px 6px', 
              borderRadius: '4px', 
              border: '1px solid #c2e7cc',
              lineHeight: '1.3',
              wordBreak: 'break-all'
            }}>
              • {fullDisplayName}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.contentArea}>
      <h1 style={styles.mainTitle}>📈 個トレ進捗</h1>
      
      <div style={styles.progressTableWrapper}>
        <table style={{ ...styles.progressTable, borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={{ ...styles.th, width: '15%' }}>教科</th>
              <th style={{ ...styles.th, width: '25%' }}>テキスト名</th>
              <th style={{ ...styles.th, width: '45%' }}>選択した単元</th>
              <th style={{ ...styles.th, width: '15%' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {currentSubjects.map((sub, idx) => {
              const books = getBooksBySubject(sub);
              
              return (
                <React.Fragment key={idx}>
                  {books.map((book, bIdx) => {
                    return (
                      <tr key={`${idx}-${bIdx}`} style={styles.tr}>
                        {bIdx === 0 && (
                          <td 
                            rowSpan={books.length} 
                            style={{ ...styles.tdSubject, border: '1px solid #ccc', backgroundColor: '#f9f9f9', verticalAlign: 'middle' }}
                          >
                            {sub}
                          </td>
                        )}
                        <td style={{ ...styles.td, border: '1px solid #ccc', textAlign: 'left', padding: '10px' }}>
                          {book}
                          {/* 💡 過去の入力履歴（completedPages）にデータが存在すれば、画面初期表示から緑のチェック（✅）を表示 */}
                          {hasCompletedUnit(sub, book) && (
                            <span style={{ color: '#22c55e', marginLeft: '6px', fontWeight: 'bold' }} title="過去に入力履歴あり">✅</span>
                          )}
                        </td>
                        <td style={{ ...styles.td, border: '1px solid #ccc', padding: '8px', verticalAlign: 'top' }}>
                          {getSelectedUnitNames(sub, book)}
                        </td>
                        <td style={{ ...styles.td, border: '1px solid #ccc', textAlign: 'center' }}>
                          <button 
                            style={{ ...styles.selectBtn, padding: '6px 12px' }} 
                            onClick={() => openUnitModal(sub, book)}
                          >
                            選択
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button 
            onClick={() => sendToGAS("saveProgress", "個トレの進捗を送信しました！")} 
            style={{ ...styles.submitProgressBtn, width: '250px' }}
          >
            個トレ進捗を報告する
          </button>
        </div>
      </div>
    </div>
  );
};

export default JukuProgressManager;