import { useState } from 'react'
import axios from 'axios'

const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function Kotore({ userId, userName, grade }) {
  // sending の初期値を null (何も送っていない状態) にする
  const [sending, setSending] = useState(null);

  const sendCall = async (type) => {
    if (sending) return; // 何か送信中なら反応しない
    
    setSending(type); // 'check' または 'question' をセット

    const statusLabel = type === 'check' ? "丸付け待ち" : "質問あり";

    try {
      await axios.post(GAS_URL, JSON.stringify({ 
        action: "sendNotification", 
        userId: userId, 
        userName: userName,
        grade: grade,
        status: statusLabel 
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      alert(`${statusLabel}として先生に合図を送りました！`);
    } catch (e) {
      alert("通信エラーが起きました。");
    } finally {
      setSending(null); // 送信が終わったら null に戻す
    }
  };

  return (
    <div className="kotore-container" style={{ padding: '40px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎯 個トレ・サポート</h2>
      <p style={{ color: '#666', fontSize: '1.2rem', marginBottom: '40px' }}>
        先生に合図を送りたい方のボタンを押してね。
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
        {/* 丸付け依頼ボタン */}
        <button 
          onClick={() => sendCall('check')} 
          disabled={sending !== null} // 何か送信中なら両方無効化（二重送信防止）
          style={callButtonStyle(sending === 'check' ? '#ccc' : '#e67e22')}
        >
          {sending === 'check' ? "送信中..." : "✋ 丸付けお願いします！"}
        </button>

        {/* 質問ボタン */}
        <button 
          onClick={() => sendCall('question')} 
          disabled={sending !== null} 
          style={callButtonStyle(sending === 'question' ? '#ccc' : '#3498db')}
        >
          {sending === 'question' ? "送信中..." : "🤔 質問があります"}
        </button>
      </div>

      <div style={{ marginTop: '60px', padding: '20px', backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee', display: 'inline-block' }}>
        <p style={{ margin: 0 }}>現在のログイン：<strong>{userName} さん（{grade}）</strong></p>
      </div>
    </div>
  );
}

const callButtonStyle = (color) => ({
  width: '320px',
  height: '200px',
  fontSize: '1.6rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  backgroundColor: color,
  color: 'white',
  border: 'none',
  borderRadius: '24px',
  boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
  transition: '0.3s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});