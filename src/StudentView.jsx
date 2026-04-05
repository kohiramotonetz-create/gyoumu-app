import { useState } from 'react'
import Kotore from './Kotore'
import SchoolProgress from './SchoolProgress'
import SukimaKun from './SukimaKun'

export default function StudentView({ userName, grade, handleLogout }) {
  // 右側に何を表示するかを決める状態 (デフォルトは 'kotore')
  const [activeTab, setActiveTab] = useState('kotore');

  return (
    <div className="student-dashboard" style={{ display: 'flex', height: '100vh' }}>
      
      {/* --- 左側：サイドバー (約200px) --- */}
      <aside style={{ width: '220px', background: '#2c3e50', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{userName} さん</h2>
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{grade}</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button 
            onClick={() => setActiveTab('kotore')}
            style={tabStyle(activeTab === 'kotore')}
          >
            🎯 個トレ
          </button>
          <button 
            onClick={() => setActiveTab('progress')}
            style={tabStyle(activeTab === 'progress')}
          >
            🏫 学校の進度
          </button>
          <button 
            onClick={() => setActiveTab('sukima')}
            style={tabStyle(activeTab === 'sukima')}
          >
            ⚡ スキマくん
          </button>
        </nav>

        <button onClick={handleLogout} style={{ background: 'transparent', color: '#ecf0f1', border: '1px solid #7f8c8d', padding: '10px', cursor: 'pointer' }}>
          ログアウト
        </button>
      </aside>

      {/* --- 右側：メインコンテンツ (残り全部) --- */}
      <main style={{ flex: 1, padding: '30px', backgroundColor: '#f8f9fa', overflowY: 'auto' }}>
        {activeTab === 'kotore' && <Kotore />}
        {activeTab === 'progress' && <SchoolProgress />}
        {activeTab === 'sukima' && <SukimaKun />}
      </main>

    </div>
  );
}

// ボタンの見た目を整える関数
const tabStyle = (isActive) => ({
  padding: '15px',
  textAlign: 'left',
  fontSize: '1.1rem',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '8px',
  backgroundColor: isActive ? '#3498db' : 'transparent',
  color: '#fff',
  transition: '0.3s'
});