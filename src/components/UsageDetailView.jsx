//生徒の学習履歴を詳細に表示するコンポーネント

import React, { useState, useMemo } from 'react';

const UsageDetailView = ({ student, onBack, styles }) => {
  const [selectedApp, setSelectedApp] = useState('すべて');
  const [period, setPeriod] = useState('1ヶ月');

  // 1. その生徒が履歴を持っているアプリ名だけを抽出
  const practicedApps = useMemo(() => {
    return Object.keys(student.usageData).filter(appName => {
      return student.usageData[appName] && student.usageData[appName].length > 0;
    });
  }, [student]);

  // 2. 履歴データの生成とフィルタリング
  const allHistory = useMemo(() => {
    let history = [];
    const now = new Date().getTime();
    
    const periodMs = {
      '1ヶ月': 30 * 24 * 60 * 60 * 1000,
      '2ヶ月': 60 * 24 * 60 * 60 * 1000,
      '3ヶ月': 90 * 24 * 60 * 60 * 1000,
      '全期間': Infinity
    }[period];

    practicedApps.forEach(appName => {
      if (selectedApp !== 'すべて' && appName !== selectedApp) return;
      
      const logs = student.usageData[appName];
      logs.forEach(log => {
        if (period === '全期間' || (now - log.rawDate) <= periodMs) {
          history.push(log);
        }
      });
    });

    return history.sort((a, b) => b.rawDate - a.rawDate);
  }, [student, practicedApps, selectedApp, period]);

  return (
    <div>
      <button onClick={onBack} style={{ ...styles.backBtn, marginBottom: '15px', backgroundColor: '#666' }}>← 一覧に戻る</button>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 20px 0', borderBottom: '2px solid #166534', paddingBottom: '10px' }}>
          {student.name} さんの学習タイムライン
        </h3>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>実施済みアプリ</label>
            <select value={selectedApp} onChange={e => setSelectedApp(e.target.value)} style={{ ...styles.select, width: '180px' }}>
              <option value="すべて">すべてのアプリ</option>
              {practicedApps.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>表示期間</label>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...styles.select, width: '120px' }}>
              <option value="1ヶ月">1ヶ月</option>
              <option value="2ヶ月">2ヶ月</option>
              <option value="3ヶ月">3ヶ月</option>
              <option value="全期間">全期間</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#eee', fontSize: '13px' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>学習日時</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>アプリ名</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>出題範囲</th>
                {/* 💡 変更箇所：ヘッダーに回答モードを追加 */}
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>回答モード</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>正答数</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>総数</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>正答率</th>
              </tr>
            </thead>
            <tbody>
              {allHistory.map((log, i) => {
                const percent = log.total > 0 ? Math.round((log.score / log.total) * 100) : 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{log.date}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {log.appName}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#555' }}>{log.range}</td>
                    {/* 💡 変更箇所：セルに回答モード（log.mode）を表示 */}
                    <td style={{ padding: '12px', fontSize: '14px', color: '#555' }}>{log.mode || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{log.score}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{log.total}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ color: percent >= 80 ? '#c62828' : '#333', fontWeight: 'bold' }}>
                        {percent}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {allHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>該当日時の履歴はありません</div>
        )}
      </div>
    </div>
  );
};

export default UsageDetailView;