import { useState } from 'react'
import axios from 'axios'

// 環境変数からGASのURLを取得
const GAS_URL = import.meta.env.VITE_GAS_URL;

export default function Kotore({ userId, userName, grade }) {
  const [sending, setSending] = useState(false);

  // --- 先生に通知を送るメイン関数 ---
  const sendCall = async () => {
    // 連続クリック防止
    if (sending) return;
    
    setSending(true);
    try {
      // GASの action: "sendNotification" を呼び出す
      await axios.post(GAS_URL, JSON.stringify({ 
        action: "sendNotification", 
        userId: userId, 
        userName: userName,
        grade: grade // 学年も一緒に送ることで先生が判別しやすくなる
      }), { headers: { 'Content-Type': 'text/plain' } });
      
      alert("先生に合図を送りました！そのまま座って待っていてね。");
    } catch (e) {
      console.error(e);
      alert("通信エラーが起きました。もう一度ボタンを押してみてね。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="kotore-container" style={{ padding: '40px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>🎯 個トレ・サポート</h2>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        解き終わったら下のボタンを押してね。先生の画面に君の名前が表示されるよ。
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
        {/* 丸付け依頼ボタン */}
        <button 
          onClick={sendCall} 
          disabled={sending}
          style={callButtonStyle(sending ? '#ccc' : '#e67e22')}
        >
          {sending ? "送信中..." : "✋ 丸付けお願いします！"}
        </button>

        {/* 質問ボタン（予備） */}
        <button 
          onClick={() => alert('先生が呼びにくるまで待ってね')} 
          style={callButtonStyle('#3498db')}
        >
          🤔 質問があります
        </button>
      </div>

      <div style={{ marginTop: '50px', padding: '20px', backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
        <p>現在のログイン情報：<strong>{userName} さん（{grade}）</strong></p>
      </div>
    </div>
  );
}

// ボタンの共通スタイル
const callButtonStyle = (color) => ({
  width: '280px',
  height: '180px',
  fontSize: '1.5rem',
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
});