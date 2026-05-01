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
        </div>
      )}
    </div>
   </div>
  );
};

export default SupportManager;