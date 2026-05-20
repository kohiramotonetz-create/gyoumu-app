//アプリ利用チェックのコンポーネント

import React, { useState } from 'react';
import axios from 'axios';
import FilterButtonGroup from './FilterButtonGroup';
import UsageDetailView from './UsageDetailView.jsx';

const AppUsageTracker = ({ styles, GAS_URL, API_KEY, schools = [] }) => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState([]);
  const [tableData, setTableData] = useState({ apps: [], students: [] });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); 
  const [selectedStudent, setSelectedStudent] = useState(null);

  const grades = ["小４", "小５", "小６", "中１", "中２", "中３", "高１", "高２", "高３", "一貫中１", "一貫中２", "一貫中３"];

  const fetchUsage = async () => {
  if (!selectedSchool || selectedGrade.length === 0) return alert("校舎と学年を選択してください");
  setLoading(true);
  try {
    const response = await axios.post(GAS_URL, JSON.stringify({
      action: "getAppUsageMatrix", 
      apiKey: API_KEY,
      school: selectedSchool,
      grade: selectedGrade.join(',') // 💡 配列をカンマ区切りの文字列にしてGASへ送信
    }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        setTableData({
          apps: response.data.apps || [],
          students: response.data.students || []
        });
      } else {
        alert("GASエラー: " + response.data.message);
      }
    } catch (e) {
      alert("通信エラーが発生しました");
      console.error(e); 
    }
    setLoading(false);
  };

  // --- 確定版スタイル設定 ---
  const thBase = { backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #ddd', padding: '8px', fontSize: '12px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 };
  const tdBase = { border: '1px solid #ddd', padding: '8px', fontSize: '12px', textAlign: 'center', backgroundColor: '#fff', boxSizing: 'border-box' };

  const stickyCol1 = { ...tdBase, position: 'sticky', left: 0, zIndex: 5, width: '80px' };
  const stickyHead1 = { ...thBase, position: 'sticky', left: 0, zIndex: 11, width: '80px' };

  const stickyCol2 = { ...tdBase, position: 'sticky', left: '80px', zIndex: 5, width: '120px' };
  const stickyHead2 = { ...thBase, position: 'sticky', left: '80px', zIndex: 11, width: '120px' };

  const stickyCol3 = { ...tdBase, position: 'sticky', left: '200px', zIndex: 5, width: '80px' };
  const stickyHead3 = { ...thBase, position: 'sticky', left: '200px', zIndex: 11, width: '80px' };

  return (
    <div style={{ padding: '10px' }}>
      {viewMode === 'list' ? (
        <>
          <h2 style={styles.contentTitle}>📱 アプリ利用チェック</h2>

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ width: '60px', fontSize: '13px', fontWeight: 'bold' }}>校舎:</span>
              
              {/* 💡 個別校舎の選択のみに完全巻き戻し */}
              <select style={styles.select} value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
                <option value="">選択してください</option>
                {schools.filter(s => s !== 'すべて').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <FilterButtonGroup 
              label="学年" 
              options={grades} 
              selected={selectedGrade} 
              onSelect={setSelectedGrade} 
              isMultiple={true} // 💡 複数選択を有効化
            />

            <button onClick={fetchUsage} style={{ ...styles.doneBtn, width: '100%', marginTop: '10px', backgroundColor: '#166534' }} disabled={loading}>
              {loading ? '読込中...' : '表示更新'}
            </button>
          </div>

          {tableData.students && tableData.students.length > 0 && (
            <div style={{ overflow: 'auto', maxHeight: '70vh', border: '1px solid #ddd' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: 'max-content' }}>
                <thead>
                  <tr>
                    <th style={stickyHead1}>校舎</th>
                    <th style={stickyHead2}>名前</th>
                    <th style={stickyHead3}>学年</th>
                    {tableData.apps.map((appName, i) => (
                      <th key={i} style={{ ...thBase, minWidth: '130px', width: '130px' }}>{appName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.students.map((st, i) => (
                    <tr key={i}>
                      <td style={stickyCol1}>{st.school}</td>
                      <td 
                        style={{ ...stickyCol2, textAlign: 'left', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => {
                          setSelectedStudent(st);
                          setViewMode('detail');
                        }}
                      >
                        {st.name}
                      </td>
                      <td style={stickyCol3}>{st.grade}</td>
                      {tableData.apps.map((appName, j) => {
                        let logs = [];
                        if (st.usageData && st.usageData[appName]) {
                          logs = st.usageData[appName];
                        }

                        const hasLog = logs && Array.isArray(logs) && logs.length > 0;
                        const lastLog = hasLog ? logs[logs.length - 1] : null;

                        const displayDate = lastLog && lastLog.date ? lastLog.date : '-';
                        const displayScore = lastLog && lastLog.score !== "" && lastLog.score !== undefined ? lastLog.score : '-';
                        const displayTotal = lastLog && lastLog.total !== "" && lastLog.total !== undefined ? lastLog.total : '-';

                        return (
                          <td key={j} style={tdBase}>
                            {/* 上段：日付表示 */}
                            <div style={{ 
                              fontSize: '10px', 
                              color: '#888', 
                              borderBottom: '1px solid #eee', 
                              marginBottom: '2px',
                              paddingBottom: '2px',
                              whiteSpace: 'nowrap'
                            }}>
                              {displayDate}
                            </div>

                            {/* 下段：正解数 / 総数 */}
                            <div style={{ fontWeight: 'bold', color: '#166534' }}>
                              {displayScore !== '-' && displayTotal !== '-' ? `${displayScore} / ${displayTotal}` : '-'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <UsageDetailView 
          student={selectedStudent} 
          apps={tableData.apps} 
          onBack={() => setViewMode('list')}
          styles={styles}
        />
      )}
    </div>
  );
};

export default AppUsageTracker;