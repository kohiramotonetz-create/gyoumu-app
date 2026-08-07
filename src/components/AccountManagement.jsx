import { useState } from 'react';
import AccountGenerator from './AccountGenerator.jsx';
import AccountRegistration from './AccountRegistration.jsx';
import StudentAccountList from './StudentAccountList.jsx';

export default function AccountManagement(props) {
  const [tab, setTab] = useState('registration');
  const tabs = [{ id: 'students', label: '生徒一覧' }, { id: 'staff', label: '講師一覧' }, { id: 'registration', label: '新規登録' }, { id: 'legacy', label: '既存画面' }];
  return <div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>{tabs.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} style={{ ...props.styles.doneBtn, background: tab === item.id ? '#166534' : '#64748b' }}>{item.label}</button>)}</div>{tab === 'students' ? <StudentAccountList {...props} /> : tab === 'registration' ? (props.role === 'admin' ? <AccountRegistration {...props} /> : <div style={{ background: '#fff', padding: 24 }}>新規登録は管理者のみ利用できます。</div>) : tab === 'legacy' ? <AccountGenerator styles={props.styles} GAS_URL={props.GAS_URL} API_KEY={props.API_KEY} schools={props.schools} /> : <div style={{ background: '#fff', padding: 24 }}>この一覧はIssue-004の次段階で実装します。既存機能は「既存画面」から利用できます。</div>}</div>;
}
