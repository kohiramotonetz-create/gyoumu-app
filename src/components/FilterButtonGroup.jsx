//　ボタンのグループを表示する汎用コンポーネント

import React from 'react';

/**
 * 汎用フィルタボタン群コンポーネント
 * @param {string} label - 左側に表示するラベル（学年、科目など）
 * @param {Array} options - 表示する選択肢の配列
 * @param {string|Array} selected - 現在選択されている値（単一なら文字列、複数なら配列）
 * @param {function} onSelect - ボタンが押された時の処理
 * @param {boolean} isMultiple - 複数選択モードかどうか
 */
const FilterButtonGroup = ({ label, options, selected, onSelect, isMultiple = false }) => {
  
  const isSelected = (option) => {
    return isMultiple ? selected.includes(option) : selected === option;
  };

  const handleClick = (option) => {
    if (isMultiple) {
      // 複数選択の場合：すでにあれば削除、なければ追加
      const next = selected.includes(option)
        ? selected.filter(item => item !== option)
        : [...selected, option];
      onSelect(next);
    } else {
      // 単一選択の場合：そのまま値をセット
      onSelect(option);
    }
  };

  const btnBaseStyle = (active) => ({
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    backgroundColor: active ? '#166534' : '#fff',
    color: active ? '#fff' : '#166534',
    border: '1px solid #166534',
    transition: '0.2s',
    minWidth: '60px'
  });

  return (
    <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
      <span style={{ width: '60px', fontWeight: 'bold', fontSize: '13px', paddingTop: '5px' }}>
        {label}:
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
        {isMultiple && (
          <button 
            onClick={() => onSelect([])}
            style={{ ...btnBaseStyle(false), color: '#1d4ed8', border: '1px solid #1d4ed8' }}
          >
            全OFF
          </button>
        )}
        {options.map(option => (
          <button
            key={option}
            onClick={() => handleClick(option)}
            style={btnBaseStyle(isSelected(option))}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterButtonGroup;