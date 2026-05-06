//講師：学校進捗管理

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import FilterButtonGroup from './FilterButtonGroup'; // 共通部品を必ずインポート

const SchoolProgressManager = ({ styles, GAS_URL, API_KEY, schools = [] }) => {
  // 状態管理を個別にしてFilterButtonGroupに対応させる
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

  const thBase = { backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #ddd', padding: '8px', fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap' };
  const stickyHead = { ...thBase, position: 'sticky', top: 0, zIndex: 10 };
  const stickyCol = { position: 'sticky', backgroundColor: '#fff', border: '1px solid #ddd', padding: '8px', zIndex: 5, fontSize: '12px' };

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={styles.contentTitle}>🏫 学校進捗チェック</h2>
      
      {/* 他の画面と共通のカードデザイン */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        
        {/* 校舎：セレクトボックス */}
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ width: '60px', fontSize: '13px', fontWeight: 'bold' }}>校舎:</span>
          <select style={styles.select} value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
            <option value="">校舎選択</option>
            {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* 学年：共通ボタン部品 */}
        <FilterButtonGroup 
          label="学年"
          options={grades}
          selected={selectedGrade}
          onSelect={setSelectedGrade}
          isMultiple={false}
        />

        {/* 科目：共通ボタン部品 */}
        <FilterButtonGroup 
          label="科目"
          options={subjects}
          selected={selectedSubject}
          onSelect={setSelectedSubject}
          isMultiple={false}
        />

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={fetchMatrix} 
            style={{ ...styles.doneBtn, width: '100%', backgroundColor: '#166534', color: '#fff' }} 
            disabled={loading}
          >
            {loading ? '読込中...' : '表示更新'}
          </button>
        </div>
      </div>

      {/* テーブル表示エリア */}
      {tableData.headers.length > 0 && (
        <div style={{ overflow: 'auto', maxHeight: '70vh', border: '1px solid #ddd' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', backgroundColor: '#fff' }}>
            <thead>
              <tr>
                <th rowSpan="4" style={{ ...stickyHead, left: 0, zIndex: 11, minWidth: '80px' }}>校舎</th>
                <th rowSpan="4" style={{ ...stickyHead, left: '80px', zIndex: 11, minWidth: '120px' }}>名前</th>
                {getSpans('chapter').map((s, i) => (
                  <th key={i} colSpan={s.span} style={thBase}>{s.label}</th>
                ))}
              </tr>
              <tr>{getSpans('section').map((s, i) => (<th key={i} colSpan={s.span} style={thBase}>{s.label}</th>))}</tr>
              <tr>{parsedHeaders.map((h, i) => (<th key={i} style={{ ...thBase, minWidth: '100px', maxWidth: '150px', whiteSpace: 'normal' }}>{h.unit}</th>))}</tr>
              <tr>{parsedHeaders.map((h, i) => (<th key={i} style={thBase}>{h.page}</th>))}</tr>
            </thead>
            <tbody>
              {tableData.matrix.map((row, i) => (
                <tr key={i}>
                  <td style={{ ...stickyCol, left: 0 }}>{selectedSchool}</td>
                  <td style={{ ...stickyCol, left: '80px' }}>{row.name}</td>
                  {row.completions.map((done, j) => (
                    <td key={j} style={{ border: '1px solid #ddd', textAlign: 'center', padding: '8px', minWidth: '45px' }}>
                      {done ? <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '16px' }}>☑</span> : <span style={{ color: '#ccc' }}>□</span>}
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