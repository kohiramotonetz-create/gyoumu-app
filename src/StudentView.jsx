import { useState } from 'react'
import Kotore from './Kotore'
import SchoolProgress from './SchoolProgress'
import SukimaKun from './SukimaKun'

export default function StudentView({ userId, userName, grade, handleLogout }) {
  const [activeTab, setActiveTab] = useState('kotore');

  return (
    <div className="student-dashboard" style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden', // 画面全体のガタつき（二重スクロール）を防止
      position: 'fixed',  // iPadのブラウザ特有の挙動を抑え込む
      top: 0,
      left: 0
    }}>
      
      {/* --- 左側：サイドバー (固定) --- */}
      <aside style={{ 
        width: '240px', 
        minWidth: '240px', 
        background: '#2c3e50', 
        color: '#fff', 
        padding: '25px 20px', 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '40px', borderBottom: '1px solid #3e4f5f', paddingBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 5px 0', color: '#fff' }}>{userName} さん</h2>
          <div style={{ 
            fontSize: '0.85rem', 
            background: '#34495e', 
            display: 'inline-block', 
            padding: '2px 10px', 
            borderRadius: '4px',
            color: '#bdc3c7'
          }}>
            {grade}
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

        <button 
          onClick={handleLogout} 
          style={{ 
            marginTop: 'auto',
            background: 'transparent', 
            color: '#95a5a6', 
            border: '1px solid #455a64', 
            padding: '12px', 
            cursor: 'pointer',
            borderRadius: '8px',
            fontSize: '0.9rem',
            transition: '0.3s'
          }}
          onMouseOver={(e) => e.target.style.color = '#fff'}
          onMouseOut={(e) => e.target.style.color = '#95a5a6'}
        >
          ログアウト
        </button>
      </aside>

      {/* --- 右側：メインコンテンツ (ここだけスクロール) --- */}
      <main style={{ 
        flex: 1, 
        height: '100vh',
        backgroundColor: '#f5f7fa', 
        overflowY: 'auto', // コンテンツが溢れた時だけスクロール
        padding: '40px',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch' // iOS/iPadOSでのスクロールを滑らかにする
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {activeTab === 'kotore' && (
            <Kotore 
              userId={userId} 
              userName={userName} 
              grade={grade} 
            />
          )}
          {activeTab === 'progress' && <SchoolProgress />}
          {activeTab === 'sukima' && <SukimaKun />}
        </div>
      </main>

    </div>
  );
}

const tabStyle = (isActive) => ({
  padding: '16px 20px', 
  textAlign: 'left', 
  fontSize: '1.1rem', 
  fontWeight: isActive ? 'bold' : 'normal',
  cursor: 'pointer', 
  border: 'none', 
  borderRadius: '12px',
  backgroundColor: isActive ? '#3498db' : 'transparent', 
  color: isActive ? '#fff' : '#bdc3c7', 
  transition: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
});