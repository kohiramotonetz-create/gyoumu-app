// 生徒：学校進捗（過去入力のページ自動✅表示対応完全版）

import React from 'react';
import FilterButtonGroup from './FilterButtonGroup'; // 共通ボタン部品

const SchoolProgressTracker = ({ 
  styles, 
  GAS_URL, 
  API_KEY, 
  schools = [],
  selectedGradeFilter, // 親(StudentView)から受け取った学年
  setSelectedGradeFilter,
  currentSubjects = ["国語", "数学", "英語", "理科", "社会"],
  schoolUnitMaster = [], // 外部CSVから読み込んだ単元マスタ
  selectedUnits = {},    // 現在新規に選択されている単元の状態
  completedPages = [],   // 親から受け取る過去完了データ配列 (例: ["newhorizon1p12", "tokyoshosekip20-27"])
  openUnitModal,        // 単元選択モーダルを開く関数
  sendToGAS             // 最終的な報告を送信する関数
}) => {
  
  const gradeOptions = ['中１', '中２', '中３'];

  // 教科ごとに紐づくテキスト（教科書名）を取得するロジック
  const getBooksBySubject = (subject) => {
    const books = schoolUnitMaster
      .filter(d => d.科目?.trim() === subject && d.学年?.includes(selectedGradeFilter))
      .map(d => d.テキスト名?.trim())
      .filter((v, i, a) => v && a.indexOf(v) === i);
    return books.length > 0 ? books : ["教科書未設定"];
  };

  // 💡【修正】対象のデータ項目が、過去の「テキスト名＋ページ」の履歴と一致するかを正確に判定する
  const isPageCompleted = (d) => {
    if (!d.ページ || d.ページ.trim() === "") return false;
    
    const textName = d.テキスト名?.trim() || "";
    const page = d.ページ?.trim() || "";
    
    // スペース、ドットを消して小文字化し、モーダル側・GAS側と同一の判定基準にする
    const target = `${textName}${page}`.toLowerCase().replace(/[\.\s]/g, "");
    
    return completedPages.includes(target);
  };

  // 【修正】対象の教科・教科書に属するマスタ項目の中に、1つでも過去入力(完了)の単元があるか判定する
  const hasCompletedUnit = (subject, book) => {
    return schoolUnitMaster.some(d => {
      const isSubMatch = d.科目?.trim() === subject;
      const isGrdMatch = d.学年?.includes(selectedGradeFilter);
      const isTxtMatch = d.テキスト名?.trim() === book;
      // 単元項目（d）を丸ごと渡して「テキスト名＋ページ」で照合
      return isSubMatch && isGrdMatch && isTxtMatch && isPageCompleted(d);
    });
  };

  // 選択された単元をきれいに表示するロジック（新規選択分のみをクリーンに表示）
  const getSelectedUnitNames = (subject, book) => {
    const selKey = `${subject}-${book}`;
    const unitIds = selectedUnits[selKey] || [];
    
    if (unitIds.length === 0) {
      return <span style={{ color: '#999', fontSize: '0.85rem' }}>未選択</span>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
        {unitIds.map((id, i) => {
          const parts = id.split('-'); // 0:章, 1:単元, 2:ページ
          const chapter = parts[0] || "";
          const unitName = parts[1] || "";
          const pageStr = parts[2] || "";

          return (
            <div key={i} style={{ 
              fontSize: '0.75rem', 
              backgroundColor: '#eef9f1', 
              padding: '4px 6px', 
              borderRadius: '4px', 
              border: '1px solid #c2e7cc',
              lineHeight: '1.3',
              color: '#333'
            }}>
              • {`${book} ${chapter} ${unitName} ${pageStr}`}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.contentArea}>
      <h1 style={styles.mainTitle}>🏫 学校進捗報告</h1>
      
      {/* 学年選択：FilterButtonGroupを適用 */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center' }}>
        <FilterButtonGroup 
          label="学年"
          options={gradeOptions}
          selected={selectedGradeFilter}
          onSelect={setSelectedGradeFilter}
          isMultiple={false}
        />
      </div>

      <div style={styles.progressTableWrapper}>
        <table style={{ ...styles.progressTable, borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={{ ...styles.th, width: '15%' }}>教科</th>
              <th style={{ ...styles.th, width: '25%' }}>教科書</th>
              <th style={{ ...styles.th, width: '45%' }}>進捗(単元)</th> 
              <th style={{ ...styles.th, width: '15%' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {currentSubjects.map((sub, idx) => {
              const books = getBooksBySubject(sub);
              return (
                <React.Fragment key={idx}>
                  {books.map((book, bIdx) => (
                    <tr key={`${idx}-${bIdx}`} style={styles.tr}>
                      {bIdx === 0 && (
                        <td rowSpan={books.length} style={{ ...styles.tdSubject, border: '1px solid #ccc', backgroundColor: '#f9f9f9', verticalAlign: 'middle' }}>
                          {sub}
                        </td>
                      )}
                      <td style={{ ...styles.td, border: '1px solid #ccc', textAlign: 'left', padding: '10px' }}>
                        {book}
                        {/* この教科書（テキスト名）に合致する過去入力があれば緑のチェックを出す */}
                        {hasCompletedUnit(sub, book) && (
                          <span style={{ color: '#22c55e', marginLeft: '6px', fontWeight: 'bold' }} title="過去に入力履歴あり">✅</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, border: '1px solid #ccc', padding: '8px', verticalAlign: 'top' }}>
                        {getSelectedUnitNames(sub, book)}
                      </td>
                      <td style={{ ...styles.td, border: '1px solid #ccc', textAlign: 'center' }}>
                        <button style={{ ...styles.selectBtn, padding: '6px 12px' }} onClick={() => openUnitModal(sub, book)}>
                          選択
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={() => sendToGAS("saveSchoolProgress", "学校の進捗を送信しました！")} // 【バグ修正】個トレ側への誤送信を防ぐため saveSchoolProgress に固定
            style={{ ...styles.submitProgressBtn, backgroundColor: '#27ae60', width: '250px' }}
          >
            学校進捗を報告する
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchoolProgressTracker;