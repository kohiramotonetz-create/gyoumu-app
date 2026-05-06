// これは生徒が自分の学校進捗を選択し、講師へ報告するためのコンポーネントです。
import React, { useState } from 'react';
import FilterButtonGroup from './FilterButtonGroup'; // 共通ボタン部品

const SchoolProgressTracker = ({ 
  styles, 
  GAS_URL, 
  API_KEY, 
  schools = [],
  selectedGradeFilter, // 親(TeacherView等)から受け取った学年
  setSelectedGradeFilter,
  currentSubjects = ["国語", "数学", "英語", "理科", "社会"],
  schoolUnitMaster = [], // 外部CSVから読み込んだ単元マスタ
  selectedUnits = {},    // 現在選択されている単元の状態
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

  // 選択された単元をきれいに表示するロジック
  const getSelectedUnitNames = (subject, book) => {
    const selKey = `${subject}-${book}`;
    const unitIds = selectedUnits[selKey] || [];
    if (unitIds.length === 0) return <span style={{ color: '#999', fontSize: '0.85rem' }}>未選択</span>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
        {unitIds.map((id, i) => {
          const parts = id.split('-');
          return (
            <div key={i} style={{ 
              fontSize: '0.75rem', 
              backgroundColor: '#eef9f1', 
              padding: '4px 6px', 
              borderRadius: '4px', 
              border: '1px solid #c2e7cc',
              lineHeight: '1.3'
            }}>
              • {`${book} ${parts[0]} ${parts[3] || ""} ${parts[1]} ${parts[2]}`}
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
                      <td style={{ ...styles.td, border: '1px solid #ccc', textAlign: 'left', padding: '10px' }}>{book}</td>
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
            onClick={() => sendToGAS("saveSchoolProgress", "学校の進捗を送信しました！")} 
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