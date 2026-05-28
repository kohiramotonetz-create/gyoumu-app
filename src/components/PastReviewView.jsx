// src/components/PastReviewView.jsx （完全版）
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PastReviewView = ({ styles, GAS_URL, API_KEY, userId }) => {
  const [years, setYears] = useState([]); 
  const [testOptions, setTestOptions] = useState([]); 
  
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  
  const [displayReviewData, setDisplayReviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const subjectMap = {
    japanese: "国語",
    math: "数学",
    english: "英語",
    science: "理科",
    social: "社会"
  };

  useEffect(() => {
    const fetchFilterOptions = async () => {
      setLoading(true);
      try {
        const response = await axios.post(GAS_URL, JSON.stringify({
          action: "getStudentTestReviewOptions",
          apiKey: API_KEY,
          userId: userId
        }), { headers: { 'Content-Type': 'text/plain' } });
        
        if (response.data.result === "success") {
          const availableYears = response.data.years || [];
          const availableTests = response.data.tests || [];
          
          setYears(availableYears);
          setTestOptions(availableTests);

          // 💡 GASがタイムスタンプから計算して返してくれた実際の年度を初期値にセット
          if (availableYears.length > 0) setSelectedYear(availableYears[0]);
          if (availableTests.length > 0) setSelectedTest(availableTests[0]);
        }
      } catch (e) {
        console.error("振り返り選択肢の取得失敗", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFilterOptions();
  }, [userId, GAS_URL, API_KEY]);

  const handleFetchReviewDetail = async () => {
    if (!selectedYear || !selectedTest) {
      return alert("年度とテストカテゴリを選択してください");
    }
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "getStudentSpecificReview",
        apiKey: API_KEY,
        userId: userId,
        year: selectedYear,
        testName: selectedTest
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setDisplayReviewData(response.data.reviewData);
        setHasSearched(true);
      }
    } catch (e) {
      alert("振り返りデータの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '10px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={styles.contentTitle}>📖 過去の振り返り確認</h2>
      
      {/* フィルタエリア */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>年度：</span>
            <select 
              style={{ ...styles.select, width: '150px', padding: '5px' }} 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
              disabled={loading || years.length === 0}
            >
              {years.length === 0 ? <option value="">データなし</option> : years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>テスト：</span>
            <select 
              style={{ ...styles.select, width: '280px', padding: '5px' }} 
              value={selectedTest} 
              onChange={e => setSelectedTest(e.target.value)}
              disabled={loading || testOptions.length === 0}
            >
              {testOptions.length === 0 ? <option value="">データなし</option> : testOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button 
            onClick={handleFetchReviewDetail} 
            style={{ ...styles.doneBtn, padding: '6px 24px', backgroundColor: '#fff', color: '#1d4ed8', border: '1px solid #1d4ed8', height: '36px' }}
            disabled={loading || years.length === 0 || testOptions.length === 0}
          >
            {loading ? "読み込み中..." : "表示"}
          </button>
        </div>
      </div>

      {/* 結果表示メインエリア */}
      {hasSearched && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* テスト全体の振り返り */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #166534', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ backgroundColor: '#eef9f1', padding: '10px 15px', fontWeight: 'bold', fontSize: '15px', borderBottom: '1px solid #166534', color: '#166534' }}>
              📊 テスト全体の振り返り
            </div>
            <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', backgroundColor: '#fff' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold', marginBottom: '6px' }}>✅ テスト全体を振り返ってよかったこと</div>
                <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: displayReviewData?.details?.good ? '#333' : '#999', lineHeight: '1.5' }}>
                  {displayReviewData?.details?.good ? displayReviewData.details.good : "（未入力）"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 'bold', marginBottom: '6px' }}>⚠️ テスト全体を振り返っての改善点</div>
                <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: displayReviewData?.details?.bad ? '#333' : '#999', lineHeight: '1.5' }}>
                  {displayReviewData?.details?.bad ? displayReviewData.details.bad : "（未入力）"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 'bold', marginBottom: '6px' }}>🎯 次回に向けて</div>
                <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: displayReviewData?.details?.next ? '#333' : '#999', lineHeight: '1.5' }}>
                  {displayReviewData?.details?.next ? displayReviewData.details.next : "（未入力）"}
                </div>
              </div>
            </div>
          </div>

          {/* 各科目ごとの振り返り */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: '5px 0 0 0', fontSize: '15px', color: '#334155', borderLeft: '4px solid #64748b', paddingLeft: '8px' }}>
              📚 各科目ごとの振り返り
            </h3>
            
            {Object.keys(subjectMap).map((key) => {
              const subData = displayReviewData?.subjects?.[key];
              return (
                <div key={key} style={{ border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #ddd', color: '#334155' }}>
                    ● {subjectMap[key]}
                  </div>
                  <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', backgroundColor: '#fff' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold', marginBottom: '4px' }}>▼ 点につながったこと（成果）</div>
                      <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: subData?.good ? '#333' : '#999', lineHeight: '1.4' }}>
                        {subData?.good ? subData.good : "（未入力）"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 'bold', marginBottom: '4px' }}>▼ 点につながらなかったこと（改善）</div>
                      <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: subData?.bad ? '#333' : '#999', lineHeight: '1.4' }}>
                        {subData?.bad ? subData.bad : "（未入力）"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 'bold', marginBottom: '4px' }}>▼ 次回の定期テストに向けて</div>
                      <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: subData?.next ? '#333' : '#999', lineHeight: '1.4' }}>
                        {subData?.next ? subData.next : "（未入力）"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
};

export default PastReviewView;