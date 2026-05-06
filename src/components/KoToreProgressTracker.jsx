// 講師：個トレ進捗チェック

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import FilterButtonGroup from './FilterButtonGroup'; // 1. 共通部品をインポート

const KoToreProgressTracker = ({ styles, GAS_URL, API_KEY, schools = [] }) => {
  // 2. ステートを個別に管理するように修正
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedText, setSelectedText] = useState('');
  
  const [allCsvRows, setAllCsvRows] = useState([]); 
  const [availableTexts, setAvailableTexts] = useState([]); 
  const [tableData, setTableData] = useState({ headers: [], matrix: [] });
  const [loading, setLoading] = useState(false);

  const grades = ["小４", "小５", "小６", "中１", "中２", "中３", "高１", "高２", "高３"];
  const subjects = ["国語", "数学", "英語", "理科", "社会"];

  useEffect(() => {
    const loadCsv = async () => {
      try {
        const res = await fetch('/units.csv');
        const text = await res.text();
        const rows = text.split(/\r?\n/)
          .filter(line => line.trim() !== "")
          .map(r => r.split(',').map(cell => cell.trim()));
        setAllCsvRows(rows);
      } catch (e) { console.error("CSV読み込み失敗"); }
    };
    loadCsv();
  }, []);

  // 学年・科目が選ばれたらテキストリストを更新
  useEffect(() => {
    if (selectedGrade && selectedSubject && allCsvRows.length > 0) {
      const texts = allCsvRows
        .slice(1)
        .filter(r => r[0] === selectedGrade && r[1] === selectedSubject)
        .map(r => r[2])
        .filter((value, index, self) => value && self.indexOf(value) === index);
      
      setAvailableTexts(texts);
      setSelectedText(''); // 学年・科目が変わったらテキスト選択をクリア
    }
  }, [selectedGrade, selectedSubject, allCsvRows]);

  const selectedUnits = useMemo(() => {
    if (!selectedGrade || !selectedSubject || !selectedText || allCsvRows.length === 0) return [];
    return allCsvRows
      .slice(1)
      .filter(r => r[0] === selectedGrade && r[1] === selectedSubject && r[2] === selectedText)
      .map(r => ({ chapter: r[3] || "", unit: r[4] || "", page: r[5] || "" }));
  }, [selectedGrade, selectedSubject, selectedText, allCsvRows]);

  const fetchMatrix = async () => {
    if (!selectedSchool || !selectedGrade || !selectedSubject || !selectedText) {
      return alert("条件をすべて選択してください");
    }
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "getKoToreProgressMatrix",
        apiKey: API_KEY,
        school: selectedSchool,
        grade: selectedGrade,
        subject: selectedSubject,
        textName: selectedText,
        masterUnits: selectedUnits.map(u => u.page)
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      if (response.data.result === "success") setTableData(response.data);
    } catch (e) { alert("通信エラー"); }
    setLoading(false);
  };

  // スタイル設定
  const SCHOOL_COL_WIDTH = 80;
  const NAME_COL_WIDTH = 120;
  const ROW_HEIGHT = 45;
  const cellBase = { border: '1px solid #ddd', padding: '4px 8px', textAlign: 'center', backgroundColor: '#fff', fontSize: '12px' };
  const headerBase = { ...cellBase, position: 'sticky', backgroundColor: '#f0fdf4', color: '#166534', zIndex: 10, height: `${ROW_HEIGHT}px` };

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={styles.contentTitle}>🏋️ 個トレ進捗チェック</h2>
      
      {/* 選択フォームエリア：ボタンUIへ */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        
        {/* 校舎選択 */}
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ width: '60px', fontSize: '13px', fontWeight: 'bold' }}>校舎:</span>
          <select style={styles.select} value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
            <option value="">校舎選択</option>
            {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* 3. 共通部品の適用（学年：単一選択） */}
        <FilterButtonGroup 
          label="学年"
          options={grades}
          selected={selectedGrade}
          onSelect={setSelectedGrade}
          isMultiple={false}
        />

        {/* 4. 共通部品の適用（科目：単一選択） */}
        <FilterButtonGroup 
          label="科目"
          options={subjects}
          selected={selectedSubject}
          onSelect={setSelectedSubject}
          isMultiple={false}
        />

        {/* テキスト選択 */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ width: '60px', fontSize: '13px', fontWeight: 'bold' }}>教材:</span>
          <select 
            style={{ ...styles.select, flex: 1, maxWidth: '500px' }} 
            value={selectedText} 
            onChange={e => setSelectedText(e.target.value)} 
            disabled={availableTexts.length === 0}
          >
            <option value="">テキスト名を選択してください</option>
            {availableTexts.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button onClick={fetchMatrix} style={{...styles.doneBtn, backgroundColor: '#22c55e', width: '100%'}} disabled={loading}>
          {loading ? '読込中...' : '表示更新'}
        </button>
      </div>

      {/* マトリックス表示エリア（以前のテーブル構造を維持） */}
      {tableData.matrix.length > 0 && (
        <div style={{ overflow: 'auto', maxHeight: '70vh', border: '1px solid #22c55e' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content' }}>
            <thead>
              <tr>
                <th rowSpan="3" style={{ ...headerBase, left: 0, zIndex: 30, width: SCHOOL_COL_WIDTH }}>校舎</th>
                <th rowSpan="3" style={{ ...headerBase, left: SCHOOL_COL_WIDTH, zIndex: 30, width: NAME_COL_WIDTH }}>名前</th>
                {selectedUnits.map((item, idx) => (
                  <th key={idx} style={{ ...headerBase, top: 0, minWidth: '100px', fontSize: '13px', fontWeight: 'bold' }}>{item.chapter}</th>
                ))}
              </tr>
              <tr>
                {selectedUnits.map((item, idx) => (
                  <th key={idx} style={{ ...headerBase, top: '45px', minWidth: '100px', fontSize: '13px' }}>{item.unit}</th>
                ))}
              </tr>
              <tr>
                {selectedUnits.map((item, idx) => (
                  <th key={idx} style={{ ...headerBase, top: '90px', backgroundColor: '#f9fafb', fontSize: '11px', color: '#444' }}>{item.page}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.matrix.map((row, i) => (
                <tr key={i}>
                  <td style={{ ...cellBase, position: 'sticky', left: 0, zIndex: 5 }}>{row.school}</td>
                  <td style={{ ...cellBase, position: 'sticky', left: SCHOOL_COL_WIDTH, zIndex: 5, textAlign: 'left' }}>{row.name}</td>
                  {row.completions.map((done, j) => (
                    <td key={j} style={{ ...cellBase, minWidth: '55px' }}>
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

export default KoToreProgressTracker;