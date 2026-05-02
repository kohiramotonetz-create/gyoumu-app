// これはテスト振り返りの管理コンポーネントです。講師が生徒の提出したテスト振り返りを確認するための画面で使用します。

import React from 'react';

const TestReviewManager = ({ 
  testReviews, 
  reviewLoading, 
  schools, 
  selectedSchool, 
  setSelectedSchool, 
  styles 
}) => {
  // フィルタリング処理をコンポーネント内で行うことで親の負担を減らす
  const filteredReviews = testReviews.filter(r => 
    selectedSchool === 'すべて' || r["校舎名を入力してください"] === selectedSchool
  );

  return (
    <div>
      <div style={styles.contentHeader}>
        <h2 style={styles.contentTitle}>📝 テスト振り返り確認</h2>
        <div style={styles.filterArea}>
          <label style={styles.label}>校舎フィルタ：</label>
          <select 
            style={styles.select} 
            value={selectedSchool} 
            onChange={(e) => setSelectedSchool(e.target.value)}
          >
            {schools.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        {reviewLoading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>読み込み中...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>日時</th>
                <th style={styles.th}>所属校舎</th>
                <th style={styles.th}>名前</th>
                <th style={styles.th}>よかったこと</th>
                <th style={styles.th}>改善点</th>
                <th style={styles.th}>次回に向けて</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    該当するデータがありません。
                  </td>
                </tr>
              ) : (
                filteredReviews.map((r, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>{r["タイムスタンプ"]}</td>
                    <td style={styles.td}>{r["校舎名を入力してください"]}</td>
                    <td style={styles.td}>{r["名前を入力してください"]}</td>
                    <td style={{ ...styles.td, whiteSpace: 'pre-wrap' }}>{r["よかったこと"]}</td>
                    <td style={{ ...styles.td, whiteSpace: 'pre-wrap' }}>{r["改善点"]}</td>
                    <td style={{ ...styles.td, whiteSpace: 'pre-wrap' }}>{r["次回に向けて"]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TestReviewManager;