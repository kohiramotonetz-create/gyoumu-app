import React from 'react';

const TestReviewDetailModal = ({ student, testName, year, onClose }) => {
  if (!student) return null;

  const subjectMap = {
    japanese: "国語",
    math: "数学",
    english: "英語",
    science: "理科",
    social: "社会"
  };

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#fff', width: '90%', maxWidth: '850px', maxHeight: '85vh',
          borderRadius: '8px', padding: '24px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '15px', right: '20px', border: 'none',
            background: 'none', fontSize: '24px', cursor: 'pointer', color: '#666'
          }}
        >
          ×
        </button>

        {/* モーダルヘッダー */}
        <div style={{ borderBottom: '2px solid #166534', paddingBottom: '10px', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#166534' }}>
            【{student.school}】{student.name} さん （{student.grade}）
          </h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
            対象テスト: {testName} ({year})
          </p>
        </div>

        {/* 各科目の詳細表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {Object.keys(subjectMap).map((key) => {
            const subData = student.subjects?.[key];
            return (
              <div key={key} style={{ border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
                {/* 科目名ヘッダー */}
                <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #ddd', color: '#334155' }}>
                  📚 {subjectMap[key]}
                </div>
                {/* 3項目の一覧内容 */}
                <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', backgroundColor: '#fff' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold', marginBottom: '4px' }}>▼ 点につながったこと（成果）</div>
                    <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: subData?.good ? '#333' : '#999' }}>
                      {subData?.good ? subData.good : "（未入力）"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 'bold', marginBottom: '4px' }}>▼ 点につながらなかったこと（改善）</div>
                    <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: subData?.bad ? '#333' : '#999' }}>
                      {subData?.bad ? subData.bad : "（未入力）"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 'bold', marginBottom: '4px' }}>▼ 次回の定期テストに向けて</div>
                    <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: subData?.next ? '#333' : '#999' }}>
                      {subData?.next ? subData.next : "（未入力）"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 下部閉じるボタン */}
        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 24px', backgroundColor: '#64748b', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestReviewDetailModal;