// 講師：テスト振り返り一覧チェック
import React, { useState } from 'react';
import axios from 'axios';
// 別ファイルに切り出した詳細モーダルをインポート
import TestReviewDetailModal from './TestReviewDetailModal.jsx'; 

const TestReviewManager = ({ styles, GAS_URL, API_KEY, schools = [] }) => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrades, setSelectedGrades] = useState([]); // 複数選択用
  const [selectedTest, setSelectedTest] = useState('2学期中間／前期期末');
  const [selectedYear, setSelectedYear] = useState('2026年度');
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // 選択された生徒の詳細情報をモーダルに渡すためのState
  const [selectedStudent, setSelectedStudent] = useState(null);

  const years = ["2024年度", "2025年度", "2026年度"];
  
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

  // GASからのデータ取得処理
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

  // 💡 提出判定：18項目すべてに文字が入力されているかチェックする関数
  const checkAllFilled = (row) => {
    // 1. 全体総括の3項目チェック
    if (!row.details?.good?.trim()) return false;
    if (!row.details?.bad?.trim()) return false;
    if (!row.details?.next?.trim()) return false;

    // 2. 5教科 × 3項目のチェック
    const subjects = ['japanese', 'math', 'english', 'science', 'social'];
    for (const sub of subjects) {
      const subData = row.subjects?.[sub];
      if (!subData?.good?.trim()) return false;
      if (!subData?.bad?.trim()) return false;
      if (!subData?.next?.trim()) return false;
    }

    // すべてをクリアしたら真の「提出済（true）」とする
    return true;
  };

  // 固定列の正確な横幅
  const SCHOOL_COL_WIDTH = 80;
  const NAME_COL_WIDTH = 110;
  const GRADE_COL_WIDTH = 70; 

  // ヘッダー共通スタイル
  const headerBase = {
    position: 'sticky', backgroundColor: '#f8f9fa', 
    border: '1px solid #ddd', padding: '8px', zIndex: 30, fontSize: '12px',
    textAlign: 'center', verticalAlign: 'middle'
  };

  // データ行の左固定3列に適用する共通スタイル
  const stickyCellBase = {
    position: 'sticky',
    backgroundColor: '#fff',
    zIndex: 20, 
    border: '1px solid #ddd',
    padding: '8px'
  };

  // 教科の提出判定ヘルパー（文字が入っていれば✓マーク、無ければハイフン）
  const renderCheck = (text) => {
    if (text && text.trim() !== "") {
      return <span style={{ color: '#166534', fontWeight: 'bold', fontSize: '14px' }}>✓</span>;
    }
    return <span style={{ color: '#ccc' }}>-</span>;
  };

  return (
    <div style={{ padding: '10px', width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      <h2 style={styles.contentTitle}>📝 テスト振り返り状況確認</h2>

      {/* フィルタエリア */}
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

        {/* テスト区分ボタン */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
          <span style={{ width: '60px', fontWeight: 'bold', paddingTop: '5px' }}>テスト：</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', flex: 1 }}>
            {testOptions.map((t, idx) => (
              <button
                key={t}
                onClick={() => setSelectedTest(t)}
                style={{
                  padding: '10px 15px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  backgroundColor: selectedTest === t ? '#166534' : '#fff',
                  color: selectedTest === t ? '#fff' : '#333',
                  borderRight: idx !== testOptions.length - 1 ? '1px solid #ccc' : 'none',
                  borderBottom: '1px solid #ccc',
                  fontWeight: selectedTest === t ? 'bold' : 'normal',
                  flex: '1 1 auto', textAlign: 'center', transition: 'background-color 0.2s'
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
        <div style={{ overflow: 'auto', maxHeight: '78vh', border: '1px solid #ddd', width: '100%', backgroundColor: '#fff' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content' }}>
            <thead>
              {/* ヘッダー 1段目 */}
              <tr>
                <th rowSpan="2" style={{ ...headerBase, top: 0, left: 0, zIndex: 40, width: SCHOOL_COL_WIDTH }}>校舎名</th>
                <th rowSpan="2" style={{ ...headerBase, top: 0, left: SCHOOL_COL_WIDTH, zIndex: 40, width: NAME_COL_WIDTH }}>生徒名</th>
                <th rowSpan="2" style={{ ...headerBase, top: 0, left: SCHOOL_COL_WIDTH + NAME_COL_WIDTH, zIndex: 40, width: GRADE_COL_WIDTH }}>学年</th>
                <th rowSpan="2" style={{ ...headerBase, top: 0, width: '60px' }}>全提出</th>
                <th rowSpan="2" style={{ ...headerBase, top: 0, width: '200px' }}>テスト全体を振り返ってよかったこと</th>
                <th rowSpan="2" style={{ ...headerBase, top: 0, width: '200px' }}>テスト全体を振り返っての改善点</th>
                <th rowSpan="2" style={{ ...headerBase, top: 0, width: '200px' }}>次回に向けて</th>
                
                <th colSpan="3" style={{ ...headerBase, top: 0, backgroundColor: '#f1f5f9' }}>国語</th>
                <th colSpan="3" style={{ ...headerBase, top: 0, backgroundColor: '#f1f5f9' }}>数学</th>
                <th colSpan="3" style={{ ...headerBase, top: 0, backgroundColor: '#f1f5f9' }}>英語</th>
                <th colSpan="3" style={{ ...headerBase, top: 0, backgroundColor: '#f1f5f9' }}>理科</th>
                <th colSpan="3" style={{ ...headerBase, top: 0, backgroundColor: '#f1f5f9' }}>社会</th>
              </tr>
              {/* ヘッダー 2段目 */}
              <tr>
                {[...Array(5)].map((_, idx) => (
                  <React.Fragment key={idx}>
                    <th style={{ ...headerBase, top: '33px', width: '45px', fontSize: '11px' }}>よかったこと</th>
                    <th style={{ ...headerBase, top: '33px', width: '45px', fontSize: '11px' }}>改善点</th>
                    <th style={{ ...headerBase, top: '33px', width: '45px', fontSize: '11px' }}>次回に向けて</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => {
                // 💡 各行ごとに、全項目入力が終わっているかを厳密に判定
                const isFullySubmitted = checkAllFilled(row);

                return (
                  <tr key={i}>
                    <td style={{ ...stickyCellBase, left: 0 }}>{row.school}</td>
                    
                    {/* 💡 18項目すべて埋まっている場合のみ、名前を青文字リンク化してポップアップ可能にする */}
                    <td 
                      style={{ 
                        ...stickyCellBase, 
                        left: SCHOOL_COL_WIDTH,
                        color: isFullySubmitted ? '#1d4ed8' : '#333', 
                        textDecoration: isFullySubmitted ? 'underline' : 'none', 
                        cursor: isFullySubmitted ? 'pointer' : 'default',
                        fontWeight: isFullySubmitted ? 'bold' : 'normal'
                      }}
                      onClick={() => isFullySubmitted && setSelectedStudent(row)}
                    >
                      {row.name}
                    </td>
                    
                    <td style={{ ...stickyCellBase, left: SCHOOL_COL_WIDTH + NAME_COL_WIDTH, textAlign: 'center' }}>{row.grade}</td>
                    
                    {/* 💡 18項目すべて埋まっている場合のみ ✅ マークを表示 */}
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                      {isFullySubmitted ? <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✅</span> : <span style={{ color: '#ccc' }}>未</span>}
                    </td>

                    {/* 全体の総括 */}
                    <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{row.details.good}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{row.details.bad}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{row.details.next}</td>

                    {/* 各教科の入力有無チェックマーク */}
                    {/* 国語 */}
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.japanese?.good)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.japanese?.bad)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.japanese?.next)}</td>
                    {/* 数学 */}
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.math?.good)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.math?.bad)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.math?.next)}</td>
                    {/* 英語 */}
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.english?.good)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.english?.bad)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.english?.next)}</td>
                    {/* 理科 */}
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.science?.good)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.science?.bad)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.science?.next)}</td>
                    {/* 社会 */}
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.social?.good)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.social?.bad)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{renderCheck(row.subjects?.social?.next)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 詳細モーダルコンポーネント */}
      <TestReviewDetailModal 
        student={selectedStudent} 
        testName={selectedTest}
        year={selectedYear}
        onClose={() => setSelectedStudent(null)} 
      />
    </div>
  );
};

export default TestReviewManager;