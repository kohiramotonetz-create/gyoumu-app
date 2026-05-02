// これは生徒側のサポート依頼管理コンポーネントです。生徒が丸付けや質問、ギブアップの依頼を出すときに使用します。

import React from 'react';

const SupportManager = ({ 
  showCompleteMsg, 
  lastStatus, 
  myQueueNumber, 
  submittingStatus, 
  sendNotification, 
  styles 
}) => {
  return (
    <div style={styles.contentArea}>
      {/* 常に表示されるタイトル */}
      <h1 style={styles.mainTitle}>🎯 個トレサポート</h1>

      <div style={styles.cardContainer}>
      {showCompleteMsg ? (
        <div style={styles.completeWrapper}>
          <h2 style={styles.requestStatusText}>{lastStatus}の依頼を出しました！</h2>
          <div style={styles.completeMsgCard}>
            <div style={styles.queueNumberSmall}>受付番号：{myQueueNumber}番</div>
            <p style={{ fontSize: '1rem', color: '#666', margin: 0 }}>そのまま少し待っていてね。</p>
          </div>
        </div>
      ) : myQueueNumber ? (
        <div style={styles.waitingCard}>
          <div style={styles.waitingTitle}>順番待ち中</div>
          <div style={styles.queueNumber}>{myQueueNumber}<span style={{ fontSize: '1.5rem' }}>番目</span></div>
          <p style={styles.waitingText}>先生が呼ぶまでワークを進めて待っていよう！</p>
        </div>
      ) : (
        <div style={styles.buttonGrid}>
          <button 
            onClick={() => sendNotification('maru')} 
            style={styles.btnMaru(submittingStatus === 'maru', !!submittingStatus)} 
            disabled={!!submittingStatus}
          >
            📝<br/>丸付けお願いします！
          </button>
          <button 
            onClick={() => sendNotification('question')} 
            style={styles.btnQuestion(submittingStatus === 'question', !!submittingStatus)} 
            disabled={!!submittingStatus}
          >
            ❓<br/>質問があります
          </button>

          {/* --- ここから追加 --- */}
          <button 
            onClick={() => sendNotification('giveup')} 
            style={styles.btnGiveUp ? styles.btnGiveUp(submittingStatus === 'giveup', !!submittingStatus) : {
              ...styles.btnQuestion(submittingStatus === 'giveup', !!submittingStatus),
              backgroundColor: submittingStatus === 'giveup' ? '#c0392b' : '#e74c3c' // 赤系の色
            }} 
            disabled={!!submittingStatus}
          >
            🏳<br/>ギブアップ…。
          </button>
        </div>
      )}
    </div>
   </div>
  );
};

export default SupportManager;