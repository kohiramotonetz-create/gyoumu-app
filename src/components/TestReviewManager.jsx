//講師：テスト振り返り一覧チェック

import React, { useState, useMemo } from 'react';
import axios from 'axios';

const TestReviewManager = ({ styles, GAS_URL, API_KEY, schools = [] }) => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrades, setSelectedGrades] = useState([]); // 複数選択用
  const [selectedTest, setSelectedTest] = useState('2学期中間／前期期末');
  const [selectedYear, setSelectedYear] = useState('2026年度');
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const years = ["2024年度", "2025年度", "2026年度"];
  
  // 写真に基づいた学年リスト
  const gradeOptions = [
    "中１", "中２", "中３", "高校受験", "一貫中１", "一貫中２", "一貫中３",
    "高１", "高２", "高３", "大学受験",
    "小１", "小２", "小３", "小４", "小５", "小６", "受験小１", "受験小２", "受験小３", "受験小４", "受験小５", "受験小６"
  ];

  const testOptions = [
    "１学期中間", "１学期期末／前期中間", "２学期中間／前期期末", 
    "２学期期末／後期中間", "学年末／後期期末", "実力テスト、模試など上記以外のテスト"
  ];

  // 学年ボタンの切り替えロジック
  const toggleGrade = (grade) => {
    setSelectedGrades(prev => 
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const fetchReviews = async () => {
    if (!selectedSchool || selectedGrades.length === 0) {
      return alert("校舎と学年を選択してください");
    }
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "getTestReviewMatrix",
        apiKey: API_KEY,
        school: selectedSchool,
        grades: selectedGrades,
        testName: selectedTest,
        year: selectedYear
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setMatrix(response.data.matrix);
        setHasSearched(true);
      }
    } catch (e) {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // スタイル設定（個トレのstickyロジックを継承）
  const SCHOOL_COL_WIDTH = 80;
  const NAME_COL_WIDTH = 120;
  const headerBase = {
    position: 'sticky', top: 0, backgroundColor: '#f8f9fa', 
    border: '1px solid #ddd', padding: '10px', zIndex: 10, fontSize: '13px'
  };

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={styles.contentTitle}>📝 テスト振り返り状況確認</h2>

      {/* フィルタエリア (写真のUI再現) */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ width: '60px', fontWeight: 'bold' }}>年度：</span>
          <select style={styles.select} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ width: '60px', fontWeight: 'bold' }}>教室：</span>
          <select style={styles.select} value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
            <option value="">校舎選択</option>
            {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* 学年選択ボタン群 */}
        <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
          <span style={{ width: '60px', fontWeight: 'bold', paddingTop: '5px' }}>学年：</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', flex: 1 }}>
            <button 
              onClick={() => setSelectedGrades([])}
              style={{ padding: '4px 8px', border: '1px solid #1d4ed8', color: '#1d4ed8', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              全OFF
            </button>
            {gradeOptions.map(g => (
              <button
                key={g}
                onClick={() => toggleGrade(g)}
                style={{
                  padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                  backgroundColor: selectedGrades.includes(g) ? '#166534' : '#fff',
                  color: selectedGrades.includes(g) ? '#fff' : '#166534',
                  border: '1px solid #166534', transition: '0.2s'
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* テスト区分ボタン：1段にまとめ、選択色を濃くする */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
          <span style={{ width: '60px', fontWeight: 'bold', paddingTop: '5px' }}>テスト：</span>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', // 横幅がいっぱいになったら自然に折り返し
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            overflow: 'hidden',
            flex: 1 
          }}>
            {testOptions.map((t, idx) => (
              <button
                key={t}
                onClick={() => setSelectedTest(t)}
                style={{
                  padding: '10px 15px', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '12px',
                  // ① 選択時の背景色を濃い緑(#166534)に、文字を白に
                  backgroundColor: selectedTest === t ? '#166534' : '#fff',
                  color: selectedTest === t ? '#fff' : '#333',
                  // ボタン間の区切り線
                  borderRight: idx !== testOptions.length - 1 ? '1px solid #ccc' : 'none',
                  borderBottom: '1px solid #ccc', // 折り返した時のための下線
                  fontWeight: selectedTest === t ? 'bold' : 'normal',
                  flex: '1 1 auto', // ボタンの幅を内容に合わせつつ広がる
                  textAlign: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={fetchReviews} 
            style={{ ...styles.doneBtn, width: '200px', backgroundColor: '#fff', color: '#1d4ed8', border: '1px solid #1d4ed8' }}
            disabled={loading}
          >
            {loading ? "読み込み中..." : "生徒表示"}
          </button>
        </div>
      </div>

      {/* 結果テーブル */}
      {hasSearched && (
        <div style={{ overflow: 'auto', maxHeight: '60vh', border: '1px solid #ddd' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content' }}>
            <thead>
              <tr>
                <th style={{ ...headerBase, left: 0, zIndex: 20, width: SCHOOL_COL_WIDTH }}>校舎</th>
                <th style={{ ...headerBase, left: SCHOOL_COL_WIDTH, zIndex: 20, width: NAME_COL_WIDTH }}>生徒名</th>
                <th style={{ ...headerBase, width: '60px', textAlign: 'center' }}>提出</th>
                <th style={{ ...headerBase, width: '250px' }}>よかったこと</th>
                <th style={{ ...headerBase, width: '250px' }}>改善点</th>
                <th style={{ ...headerBase, width: '250px' }}>次回に向けて</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 5 }}>{row.school}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', position: 'sticky', left: SCHOOL_COL_WIDTH, backgroundColor: '#fff', zIndex: 5 }}>{row.name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                    {row.isSubmitted ? <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✅</span> : <span style={{ color: '#ccc' }}>未</span>}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{row.details.good}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{row.details.bad}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{row.details.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestReviewManager;