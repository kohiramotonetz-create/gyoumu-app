//各種パスワードを管理するコンポーネントです。社員・講師・教室用のパスワードと、生徒用の作成ルールを表示します。

import React from 'react';
import { externalServiceAccounts, studentAccountRules } from '../constants/data';

const PasswordManager = ({ styles }) => {
  return (
    <div style={styles.passwordContainer}>
      <h2 style={styles.contentTitle}>🔑 各種パスワード一覧</h2>
      
      <h3 style={{ marginTop: '20px', color: '#27ae60' }}>■ 社員・講師・教室用</h3>
      <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>サービス名/校舎</th>
              <th style={styles.th}>ログインID</th>
              <th style={styles.th}>パスワード</th>
            </tr>
          </thead>
          <tbody>
            {externalServiceAccounts.map((acc, i) => (
              <tr key={i} style={styles.tr}>
                <td style={styles.td}>
                  {acc.url ? (
                    <a href={acc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#27ae60', textDecoration: 'underline' }}>
                      {acc.service}
                    </a>
                  ) : (
                    acc.school
                  )}
                </td>
                <td style={styles.td}>{acc.userId || acc.id}</td>
                <td style={styles.td}>{acc.pass || acc.password || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: '20px', color: '#27ae60' }}>■ 生徒用作成ルール</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.th}>サービス</th>
              <th style={styles.th}>IDルール</th>
              <th style={styles.th}>PASSルール</th>
              <th style={styles.th}>作成者</th>
            </tr>
          </thead>
          <tbody>
            {studentAccountRules.map((rule, i) => (
              <tr key={i} style={styles.tr}>
                <td style={styles.td}>
                  {rule.url ? (
                    <a href={rule.url} target="_blank" rel="noopener noreferrer" style={{ color: '#27ae60', textDecoration: 'underline' }}>
                      {rule.service}
                    </a>
                  ) : (
                    rule.service
                  )}
                </td>
                <td style={styles.td}>{rule.userId}</td>
                <td style={styles.td}>{rule.pass}</td>
                <td style={styles.td}>{rule.creator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PasswordManager;