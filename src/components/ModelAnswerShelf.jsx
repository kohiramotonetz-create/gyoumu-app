// src/components/ModelAnswerShelf.jsx
import React, { useState } from 'react';
import { modelAnswerBooks } from '../constants/data';

const ModelAnswerShelf = ({ setOpenPdf, styles }) => {
  const [selectedGrade, setSelectedGrade] = useState('中1');

  return (
    <div style={styles.bookshelfContainer}>
      <h2 style={styles.contentTitle}>📚 個トレ2 模範解答</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center' }}>
        {['中1', '中2', '中3'].map(g => (
          <button 
            key={g} 
            onClick={() => setSelectedGrade(g)}
            style={{
              padding: '10px 24px', borderRadius: '25px', border: 'none',
              backgroundColor: selectedGrade === g ? '#3e2723' : '#fff',
              color: selectedGrade === g ? '#fff' : '#3e2723',
              fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {g}
          </button>
        ))}
      </div>
      <div style={styles.bookshelf}>
        {modelAnswerBooks
          .filter(book => book.grade === selectedGrade)
          .map((book) => (
            <div key={book.id} style={styles.bookWrapper} onClick={() => setOpenPdf(book.pdf)}>
              <div style={styles.bookCover}>
                <img 
                  src={book.cover} 
                  alt={book.title} 
                  style={styles.coverImage} 
                  onError={(e) => { e.target.src = "https://via.placeholder.com/100x140?text=No+Image"; }}
                />
              </div>
              <div style={styles.bookTitle}>{book.title}</div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ModelAnswerShelf;