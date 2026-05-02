　// これは学校ごとの進捗状況を表示するコンポーネントです。

import React, { useState, useMemo } from 'react';
import axios from 'axios';

const SchoolProgressTracker = ({ styles, GAS_URL, API_KEY, schools = [] }) => {
  const [selected, setSelected] = useState({ school: '', grade: '', subject: '' });
  const [tableData, setTableData] = useState({ headers: [], matrix: [] });
  const [loading, setLoading] = useState(false);

  // 学年と科目のリスト
  const grades = ["小４", "小５", "小６", "中１", "中２", "中３", "高１", "高２", "高３"];
  const subjects = ["国語", "数学", "英語", "理科", "社会"];

  // ヘッダーを【章】【節】単元名 p.ページ に分解
  const parsedHeaders = useMemo(() => {
  return tableData.headers.map(h => {
    const [chapter, section, unit, page] = h.split('|');
    return { chapter, section, unit, page, full: h };
  });
}, [tableData.headers]);

  // 章や節が「いくつ連続しているか」を計算（colspan用）
  const getSpans = (key) => {
    const spans = [];
    let count = 0;
    for (let i = 0; i < parsedHeaders.length; i++) {
      count++;
      // 次の要素と値が違うか、最後のエレメントなら確定
      if (i === parsedHeaders.length - 1 || parsedHeaders[i][key] !== parsedHeaders[i + 1][key]) {
        spans.push({ label: parsedHeaders[i][key], span: count });
        count = 0;
      }
    }
    return spans;
  };

  const fetchMatrix = async () => {
    if (!selected.school || !selected.grade || !selected.subject) return alert("条件をすべて選択してください");
    setLoading(true);
    try {
      // CSV読み込み
      const csvRes = await fetch('/school_units.csv');
      const csvText = await csvRes.text();
      const rows = csvText.split(/\r?\n/).map(r => r.split(',').map(cell => cell.trim()));
      
      // --- fetchMatrix 内の単元リスト作成部分の修正案 ---
      const masterUnits = rows.slice(1)
      .filter(r => r.length > 5 && r[0].includes(selected.grade) && r[1] === selected.subject)
      .map(r => {
        // 列ごとに役割を固定して、区切り文字「|」で繋ぐ（後で確実に分解するため）
        const chapter = r[3] || " "; // 4列目: 章
        const section = r[4] || " "; // 5列目: 節
        const unit    = r[5] || " "; // 6列目: 単元
        const page    = r[6] || " "; // 7列目: ページ
     return `${chapter}|${section}|${unit}|${page}`;
     });

      // GASへ通信
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "getSchoolProgressMatrix",
        apiKey: API_KEY,
        school: selected.school,
        grade: selected.grade,
        subject: selected.subject,
        masterUnits: masterUnits 
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      if (response.data.result === "success") {
        setTableData(response.data);
      } else {
        alert("GASエラー: " + response.data.message);
      }
    } catch (e) {
      alert("通信エラー: " + e.message);
    }
    setLoading(false);
  };

  // スタイル定義
  const thBase = { backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #ddd', padding: '8px', fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap' };
  const stickyHead = { ...thBase, position: 'sticky', top: 0, zIndex: 10 };
  const stickyCol = { position: 'sticky', backgroundColor: '#fff', border: '1px solid #ddd', padding: '8px', zIndex: 5, fontSize: '12px' };

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={styles.contentTitle}>🏫 学校進捗チェック</h2>
      
      {/* 選択メニューエリア */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select 
          style={styles.select} 
          value={selected.school} 
          onChange={e => setSelected({...selected, school: e.target.value})}
        >
          <option value="">校舎選択</option>
          {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select 
          style={styles.select} 
          value={selected.grade} 
          onChange={e => setSelected({...selected, grade: e.target.value})}
        >
          <option value="">学年</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <select 
          style={styles.select} 
          value={selected.subject} 
          onChange={e => setSelected({...selected, subject: e.target.value})}
        >
          <option value="">科目</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button onClick={fetchMatrix} style={styles.doneBtn} disabled={loading}>
          {loading ? '読込中...' : '表示更新'}
        </button>
      </div>

      {/* テーブルエリア */}
      {tableData.headers.length > 0 && (
        <div style={{ overflow: 'auto', maxHeight: '80vh', border: '1px solid #444', backgroundColor: '#333' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', backgroundColor: '#fff' }}>
            <thead>
              {/* 1段目：章 */}
              <tr>
                <th rowSpan="4" style={{ ...stickyHead, left: 0, zIndex: 11, minWidth: '80px' }}>校舎</th>
                <th rowSpan="4" style={{ ...stickyHead, left: '80px', zIndex: 11, minWidth: '120px' }}>名前</th>
                {getSpans('chapter').map((s, i) => (
                  <th key={i} colSpan={s.span} style={thBase}>{s.label}</th>
                ))}
              </tr>
              {/* 2段目：節 */}
              <tr>
                {getSpans('section').map((s, i) => (
                  <th key={i} colSpan={s.span} style={thBase}>{s.label}</th>
                ))}
              </tr>
              {/* 3段目：単元名 */}
              <tr>
                {parsedHeaders.map((h, i) => (
                  <th key={i} style={{ ...thBase, minWidth: '100px', maxWidth: '150px', whiteSpace: 'normal' }}>{h.unit}</th>
                ))}
              </tr>
              {/* 4段目：ページ */}
              <tr>
                {parsedHeaders.map((h, i) => (
                  <th key={i} style={thBase}>{h.page}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.matrix.map((row, i) => (
                <tr key={i}>
                  <td style={{ ...stickyCol, left: 0 }}>{selected.school}</td>
                  <td style={{ ...stickyCol, left: '80px' }}>{row.name}</td>
                  {row.completions.map((done, j) => (
                    <td key={j} style={{ border: '1px solid #ddd', textAlign: 'center', padding: '8px', minWidth: '45px' }}>
                      {done ? <span style={{ color: '#30e410', fontWeight: 'bold' }}>☑</span> : <span style={{ color: '#000000' }}>□</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SchoolProgressTracker;