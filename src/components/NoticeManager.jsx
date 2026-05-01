import React from 'react';

const NoticeManager = ({ notices = [], styles }) => {
  return (
    <div>
      <h2 style={styles.contentTitle}>📢 お知らせ</h2>
      {notices.length === 0 ? (
        <div style={styles.emptyState}>
          現在、全体へのお知らせはありません。
        </div>
      ) : (
        <div style={styles.noticeList}>
          {notices.map((notice, index) => (
            <div key={index} style={styles.noticeCard}>
              <div style={styles.noticeDate}>{notice.date}</div>
              <div style={styles.noticeText}>{notice.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoticeManager;