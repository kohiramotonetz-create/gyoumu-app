// 講師：学校進捗管理 (スクロール完全固定・多段固定バグ修正版)

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import FilterButtonGroup from './FilterButtonGroup'; 

const SchoolProgressManager = ({ styles, GAS_URL, API_KEY, schools = [], unitOptions = [] }) => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [tableData, setTableData] = useState({ headers: [], matrix: [] });
  const [loading, setLoading] = useState(false);

  const grades = ["小４", "小５", "小６", "中１", "中２", "中３", "高１", "高２", "高３"];
  const subjects = ["国語", "数学", "英語", "理科", "社会"];

  const parsedHeaders = useMemo(() => {
    return tableData.headers.map(h => {
      const [chapter, section, unit, page] = h.split('|');
      return { chapter, section, unit, page, full: h };
    });
  }, [tableData.headers]);

  const getSpans = (key) => {
    const spans = [];
    let count = 0;
    for (let i = 0; i < parsedHeaders.length; i++) {
      count++;
      if (i === parsedHeaders.length - 1 || parsedHeaders[i][key] !== parsedHeaders[i + 1][key]) {
        spans.push({ label: parsedHeaders[i][key], span: count });
        count = 0;
      }
    }
    return spans;
  };

  const fetchMatrix = async () => {
    if (!selectedSchool || !selectedGrade || !selectedSubject) return alert("条件をすべて選択してください");
    setLoading(true);
    try {
      const csvRes = await fetch('/school_units.csv');
      const csvText = await csvRes.text();
      const rows = csvText.split(/\r?\n/).map(r => r.split(',').map(cell => cell.trim()));
      
      const masterUnits = rows.slice(1)
        .filter(r => r.length > 5 && r[0].includes(selectedGrade) && r[1] === selectedSubject)
        .map(r => {
          const chapter = r[3] || " ";
          const section = r[4] || " ";
          const unit    = r[5] || " ";
          const page    = r[6] || " ";
          return `${chapter}|${section}|${unit}|${page}`;
        });

      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "getSchoolProgressMatrix",
        apiKey: API_KEY,
        school: selectedSchool,
        grade: selectedGrade,
        subject: selectedSubject,
        masterUnits: masterUnits 
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      if (response.data.result === "success") {
        setTableData(response.data);
      }
    } catch (e) {
      alert("通信エラー");
    }
    setLoading(false);
  };

  // 💡 【超重要】多段固定のためのスタイル設計
  const thBase = { 
    backgroundColor: '#f8f9fa', 
    color: '#333', 
    border: '1px solid #ddd', 
    padding: '6px 8px', 
    fontSize: '11px', 
    textAlign: 'center', 
    whiteSpace: 'nowrap',
    position: 'sticky', // 基本すべて固定配置化
    boxSizing: 'border-box'
  };

  // 左側固定列の基本幅
  const SCHOOL_COL_WIDTH = 80;
  const NAME_COL_WIDTH = 120;

  // データ行（tbody）の左側2列のスクロール固定スタイル
  const stickyColSchool = { 
    position: 'sticky', 
    left: 0, 
    backgroundColor: '#fff', 
    border: '1px solid #ddd', 
    padding: '8px', 
    zIndex: 5, 
    fontSize: '12px',
    width: `${SCHOOL_COL_WIDTH}px`,
    minWidth: `${SCHOOL_COL_WIDTH}px`
  };

  const stickyColName = { 
    position: 'sticky', 
    left: `${SCHOOL_COL_WIDTH}px`, // 80px右にずらして固定
    backgroundColor: '#fff', 
    border: '1px solid #ddd', 
    padding: '8px', 
    zIndex: 5, 
    fontSize: '12px',
    width: `${NAME_COL_WIDTH}px`,
    minWidth: `${NAME_COL_WIDTH}px`
  };

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={styles.contentTitle}>🏫 学校進捗チェック</h2>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {/* 校舎選択 */}
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ width: '60px', fontSize: '13px', fontWeight: 'bold' }}>校舎:</span>
          <select style={styles.select} value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
            <option value="">選択してください</option>
            <optgroup label="ーー ユニット一括表示 ーー">
              {unitOptions.map(u => <option key={u} value={u}>{u}（全校舎一括）</option>)}
            </optgroup>
            <optgroup label="ーー 個別校舎絞り込み ーー">
              {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          </select>
        </div>

        <FilterButtonGroup label="学年" options={grades} selected={selectedGrade} onSelect={setSelectedGrade} isMultiple={false} />
        <FilterButtonGroup label="科目" options={subjects} selected={selectedSubject} onSelect={setSelectedSubject} isMultiple={false} />

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={fetchMatrix} style={{ ...styles.doneBtn, width: '100%', backgroundColor: '#166534', color: '#fff' }} disabled={loading}>
            {loading ? '読込中...' : '表示更新'}
          </button>
        </div>
      </div>

      {/* テーブル表示エリア */}
      {tableData.headers.length > 0 && (
        <div style={{ overflow: 'auto', maxHeight: '72vh', border: '1px solid #ddd', borderRadius: '4px' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', backgroundColor: '#fff' }}>
            <thead>
              {/* 1行目: 大章 (chapter) 固定位置 top: 0 */}
              <tr style={{ height: '35px' }}>
                <th rowSpan="4" style={{ ...thBase, top: 0, left: 0, zIndex: 20, width: `${SCHOOL_COL_WIDTH}px`, minWidth: `${SCHOOL_COL_WIDTH}px`, backgroundColor: '#f1f5f9' }}>校舎</th>
                <th rowSpan="4" style={{ ...thBase, top: 0, left: `${SCHOOL_COL_WIDTH}px`, zIndex: 20, width: `${NAME_COL_WIDTH}px`, minWidth: `${NAME_COL_WIDTH}px`, backgroundColor: '#f1f5f9' }}>名前</th>
                {getSpans('chapter').map((s, i) => (
                  <th key={i} colSpan={s.span} style={{ ...thBase, top: 0, zIndex: 10, backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.label}</th>
                ))}
              </tr>
              {/* 2行目: 節 (section) 固定位置 top: 35px */}
              <tr style={{ height: '35px' }}>
                {getSpans('section').map((s, i) => (
                  <th key={i} colSpan={s.span} style={{ ...thBase, top: '35px', zIndex: 10, backgroundColor: '#f8fafc' }}>{s.label}</th>
                ))}
              </tr>
              {/* 3行目: ページ内容 (unit) 固定位置 top: 70px */}
              <tr style={{ height: '45px' }}>
                {parsedHeaders.map((h, i) => (
                  <th key={i} style={{ ...thBase, top: '70px', zIndex: 10, minWidth: '110px', maxWidth: '160px', whiteSpace: 'normal', backgroundColor: '#fff' }}>{h.unit}</th>
                ))}
              </tr>
              {/* 4行目: ページ番号 (page) 固定位置 top: 115px */}
              <tr style={{ height: '30px' }}>
                {parsedHeaders.map((h, i) => (
                  <th key={i} style={{ ...thBase, top: '115px', zIndex: 10, backgroundColor: '#f8fafc', color: '#64748b' }}>{h.page}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.matrix.map((row, i) => (
                <tr key={i} style={{ height: '40px' }}>
                  {/* 左側2列のスクロール固定スタイルを適用 */}
                  <td style={stickyColSchool}>
                    {row.school && !row.school.includes('U') ? row.school : (row.school || selectedSchool)}
                  </td>
                  <td style={stickyColName}>{row.name}</td>
                  {row.completions.map((done, j) => (
                    <td key={j} style={{ border: '1px solid #ddd', textAlign: 'center', padding: '4px', minWidth: '45px', boxSizing: 'border-box' }}>
                      {done ? <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '15px' }}>☑</span> : <span style={{ color: '#ccc' }}>□</span>}
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

export default SchoolProgressManager;