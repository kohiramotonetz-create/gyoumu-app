import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';

const KoToreProgressTracker = ({ styles, GAS_URL, API_KEY, schools = [] }) => {
  const [selected, setSelected] = useState({ school: '', grade: '', subject: '', textName: '' });
  const [allCsvRows, setAllCsvRows] = useState([]); 
  const [availableTexts, setAvailableTexts] = useState([]); 
  const [tableData, setTableData] = useState({ headers: [], matrix: [] });
  const [loading, setLoading] = useState(false);

  const grades = ["小４", "小５", "小６", "中１", "中２", "中３", "高１", "高２", "高３"];
  const subjects = ["国語", "数学", "英語", "理科", "社会"];

  // 1. units.csv の読み込み
  useEffect(() => {
    const loadCsv = async () => {
      try {
        const res = await fetch('/units.csv');
        const text = await res.text();
        // 改行とカンマで分割。空行を除外。
        const rows = text.split(/\r?\n/)
          .filter(line => line.trim() !== "")
          .map(r => r.split(',').map(cell => cell.trim()));
        setAllCsvRows(rows);
      } catch (e) { console.error("CSV読み込み失敗"); }
    };
    loadCsv();
  }, []);

  // 2. 学年・科目が選ばれたら、テキスト名リストを更新
  useEffect(() => {
    if (selected.grade && selected.subject && allCsvRows.length > 0) {
      const texts = allCsvRows
        .slice(1)
        .filter(r => r[0] === selected.grade && r[1] === selected.subject)
        .map(r => r[2]) // 3列目がテキスト名
        .filter((value, index, self) => value && self.indexOf(value) === index);
      
      setAvailableTexts(texts);
      setSelected(prev => ({ ...prev, textName: '' })); 
    }
  }, [selected.grade, selected.subject, allCsvRows]);

  // ★重要：描画に使用する単元リストを定義（ここが定義されていないのがエラーの原因）
  const selectedUnits = useMemo(() => {
    if (!selected.grade || !selected.subject || !selected.textName || allCsvRows.length === 0) {
      return [];
    }
    return allCsvRows
      .slice(1)
      .filter(r => 
        r[0] === selected.grade && 
        r[1] === selected.subject && 
        r[2] === selected.textName
      )
      .map((r, index) => ({

        chapter: r[3] || "", // 章
        unit: r[4] || "",    // 単元
        page: r[5] || ""     // ページ
      }));
  }, [selected.grade, selected.subject, selected.textName, allCsvRows]);

  const fetchMatrix = async () => {
    if (!selected.school || !selected.grade || !selected.subject || !selected.textName) {
      return alert("条件をすべて選択してください");
    }
    setLoading(true);
    try {
      // GAS側には「ページ番号」の配列を送る（判定用）
      const masterUnits = selectedUnits.map(u => u.page);

      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "getKoToreProgressMatrix",
        apiKey: API_KEY,
        school: selected.school,
        grade: selected.grade,
        subject: selected.subject,
        textName: selected.textName, // 追加：GAS側のフィルタリング用
        masterUnits: masterUnits 
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      if (response.data.result === "success") {
        setTableData(response.data);
      }
    } catch (e) { alert("通信エラー"); }
    setLoading(false);
  };

  const thBase = { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '8px', fontSize: '11px', textAlign: 'center' };
  const stickyHead = { ...thBase, position: 'sticky', top: 0, zIndex: 10 };
  const stickyCol = { position: 'sticky', backgroundColor: '#fff', border: '1px solid #ddd', padding: '8px', zIndex: 5, fontSize: '12px' };

  // --- レイアウト固定用の設定 ---
  const SCHOOL_COL_WIDTH = 80; // 校舎列の幅(px)
  const NAME_COL_WIDTH = 120;  // 名前列の幅(px)
  const ROW_HEIGHT = 45; // 各段の高さを45pxに固定する

  // 共通のセルスタイル
  const cellBase = {
    border: '1px solid #ddd',
    padding: '4px 8px', // パディングを少し詰める
    textAlign: 'center',
    backgroundColor: '#fff',
    fontSize: '12px'
  };

  // ヘッダー共通スタイル
  const headerBase = {
    ...cellBase,
    position: 'sticky',
    backgroundColor: '#f0fdf4', // 薄い緑
    color: '#166534',
    zIndex: 10,
    whiteSpace: 'normal',
    wordBreak: 'break-all',
    height: `${ROW_HEIGHT}px`, // 高さを固定
  };

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={styles.contentTitle}>🏋️ 個トレ進捗チェック</h2>
      
      {/* 選択フォームエリア */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select style={styles.select} value={selected.school} onChange={e => setSelected({...selected, school: e.target.value})}>
          <option value="">校舎選択</option>
          {schools.filter(s => s !== 'すべて').map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select style={styles.select} value={selected.grade} onChange={e => setSelected({...selected, grade: e.target.value})}>
          <option value="">学年</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <select style={styles.select} value={selected.subject} onChange={e => setSelected({...selected, subject: e.target.value})}>
          <option value="">科目</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select style={styles.select} value={selected.textName} onChange={e => setSelected({...selected, textName: e.target.value})} disabled={availableTexts.length === 0}>
          <option value="">テキスト名選択</option>
          {availableTexts.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <button onClick={fetchMatrix} style={{...styles.doneBtn, backgroundColor: '#22c55e'}} disabled={loading}>
          {loading ? '読込中...' : '表示更新'}
        </button>
      </div>

      {/* マトリックス表示エリア */}
      {tableData.matrix.length > 0 && (
        <div style={{ 
          overflow: 'auto', 
          maxHeight: '75vh', 
          border: '1px solid #22c55e',
          position: 'relative' 
        }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content' }}>
            <thead>
              {/* --- 1段目: 連番 + 章名 --- */}
              <tr>
                <th rowSpan="3" style={{ 
                  ...headerBase, 
                  left: 0, 
                  top: 0, 
                  zIndex: 30, // 左上角（校舎）は最前面
                  width: `${SCHOOL_COL_WIDTH}px`,
                  minWidth: `${SCHOOL_COL_WIDTH}px`
                }}>校舎</th>
                <th rowSpan="3" style={{ 
                  ...headerBase, 
                  left: `${SCHOOL_COL_WIDTH}px`, 
                  top: 0, 
                  zIndex: 30, // 左上角（名前）も最前面
                  width: `${NAME_COL_WIDTH}px`,
                  minWidth: `${NAME_COL_WIDTH}px`
                }}>名前</th>
                {selectedUnits.map((item, index) => (
                  <th key={`chap-${index}`} style={{ 
                    ...headerBase, 
                    top: 0, 
                    minWidth: '100px',
                    fontSize: '14px',
                    fontWeight: 'bold' 
                  }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: 'normal' }}>{item.index}</div>
                    <div>{item.chapter}</div>
                  </th>
                ))}
              </tr>
              
              {/* --- 2段目: 単元名 --- */}
              <tr>
                {selectedUnits.map((item, index) => (
                  <th key={`unit-${index}`} style={{ 
                    ...headerBase, 
                    top: '55px', // 章の行の高さ分ずらす（適宜調整）
                    minWidth: '100px',
                    fontSize: '14px' 
                  }}>
                    {item.unit}
                  </th>
                ))}
              </tr>

              {/* --- 3段目: ページ数 --- */}
              <tr>
                {selectedUnits.map((item, index) => (
                  <th key={`page-${index}`} style={{ 
                    ...headerBase, 
                    top: '100px', // 上2段分ずらす（適宜調整）
                    backgroundColor: '#f9fafb',
                    fontSize: '11px',
                    fontWeight: 'normal',
                    color: '#444'
                  }}>
                    {item.page}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableData.matrix.map((row, i) => (
                <tr key={i}>
                  {/* 校舎列固定 */}
                  <td style={{ 
                    ...cellBase, 
                    position: 'sticky', 
                    left: 0, 
                    zIndex: 5,
                    width: `${SCHOOL_COL_WIDTH}px`
                  }}>{row.school}</td>
                  
                  {/* 名前列固定（校舎列の幅分ずらす） */}
                  <td style={{ 
                    ...cellBase, 
                    position: 'sticky', 
                    left: `${SCHOOL_COL_WIDTH}px`, 
                    zIndex: 5,
                    width: `${NAME_COL_WIDTH}px`,
                    textAlign: 'left'
                  }}>{row.name}</td>
                  
                  {/* チェックボックス列 */}
                  {row.completions.map((done, j) => (
                    <td key={j} style={{ ...cellBase, minWidth: '55px' }}>
                      {done ? 
                        <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '16px' }}>☑</span> : 
                        <span style={{ color: '#000000' }}>□</span>
                      }
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