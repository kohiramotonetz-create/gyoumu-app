import { useState } from 'react'
import axios from 'axios'

// 環境変数からGASのURLを取得
const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function Kotore({ userId, userName, grade }) {
  const [sending, setSending] = useState(false);

  // --- 先生に通知を送るメイン関数 (typeで内容を分ける) ---
  const sendCall = async (type) => {
    // 連続クリック防止
    if (sending) return;
    
    setSending(true);

    // typeによって送る文字を変える
    const statusLabel = type === 'check' ? "丸付け待ち" : "質問あり";

    try {
      // GASの action: "sendNotification" を呼び出す
      await axios.post(GAS_URL, JSON.stringify({ 
        action: "sendNotification", 
        userId: userId, 
        userName: userName,
        grade: grade,
        status: statusLabel // ★ ここで「丸付け待ち」か「質問あり」をGASに送る
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      alert(`${statusLabel}として先生に合図を送りました！そのまま座って待っていてね。`);
    } catch (e) {
      console.error(e);
      alert("通信エラーが起きました。もう一度ボタンを押してみてね。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="kotore-container" style={{ padding: '40px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎯 個トレ・サポート</h2>
      <p style={{ color: '#666', fontSize: '1.2rem', marginBottom: '40px' }}>
        先生に合図を送りたい方のボタンを押してね。
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
        {/* 丸付け依頼ボタン (type: 'check') */}
        <button 
          onClick={() => sendCall('check')} 
          disabled={sending}
          style={callButtonStyle(sending ? '#ccc' : '#e67e22')}
        >
          {sending ? "送信中..." : "✋ 丸付けお願いします！"}
        </button>

        {/* 質問ボタン (type: 'question') */}
        <button 
          onClick={() => sendCall('question')} 
          disabled={sending}
          style={callButtonStyle(sending ? '#ccc' : '#3498db')}
        >
          {sending ? "送信中..." : "🤔 質問があります"}
        </button>
      </div>

      <div style={{ marginTop: '60px', padding: '20px', backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee', display: 'inline-block' }}>
        <p style={{ margin: 0 }}>現在のログイン：<strong>{userName} さん（{grade}）</strong></p>
      </div>
    </div>
  );
}

// ボタンの共通スタイル
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
  transition: 'transform 0.1s, background-color 0.3s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: '1.4'
});