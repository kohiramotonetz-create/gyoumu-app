import { useState } from 'react';
import AccountRegistration from './AccountRegistration.jsx';
import StudentAccountList from './StudentAccountList.jsx';
import StaffAccountList from './StaffAccountList.jsx';
import './AccountManagement.css';

function AccountIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}

export default function AccountManagement(props) {
  const isAdmin = props.role === 'admin';
  const [tab, setTab] = useState('students');
  const [dirty, setDirty] = useState(false);
  const tabs = [
    { id: 'students', label: '生徒情報' },
    ...(isAdmin ? [{ id: 'staff', label: '講師情報' }, { id: 'registration', label: '新規アカウント' }] : []),
  ];

  const selectTab = nextTab => {
    if (nextTab === tab) return;
    if (dirty && !window.confirm('保存されていない変更があります。タブを切り替えますか？')) return;
    setDirty(false);
    setTab(nextTab);
  };

  return <div className="account-management">
    <header className="account-page-header">
      <span className="account-page-header__icon"><AccountIcon /></span>
      <div><h1>アカウント管理</h1><p>アカウント情報の確認・編集・管理ができます</p></div>
    </header>
    <div className="account-tabs" role="tablist" aria-label="アカウント管理">
      {tabs.map(item => <button
        key={item.id}
        id={`account-tab-${item.id}`}
        type="button"
        role="tab"
        aria-selected={tab === item.id}
        aria-controls={`account-panel-${item.id}`}
        tabIndex={tab === item.id ? 0 : -1}
        onClick={() => selectTab(item.id)}
      >{item.label}</button>)}
    </div>
    <div id={`account-panel-${tab}`} role="tabpanel" aria-labelledby={`account-tab-${tab}`}>
      {tab === 'students' ? <StudentAccountList {...props} onCreate={isAdmin ? () => selectTab('registration') : undefined} onDirtyChange={setDirty} /> : null}
      {tab === 'staff' && isAdmin ? <StaffAccountList {...props} onCreate={() => selectTab('registration')} onDirtyChange={setDirty} /> : null}
      {tab === 'registration' && isAdmin ? <AccountRegistration {...props} onDirtyChange={setDirty} /> : null}
    </div>
  </div>;
}
