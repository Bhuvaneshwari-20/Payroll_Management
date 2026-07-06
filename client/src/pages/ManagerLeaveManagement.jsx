import { useState } from 'react';
import ManagerLeaveQueue from '../components/leave/ManagerLeaveQueue';
import ManagerPermissionQueue from '../components/permission/ManagerPermissionQueue';

export default function ManagerLeaveManagement() {
  const [tab, setTab] = useState('leave'); // 'leave' | 'special' | 'permission'

  return (
    <div>
      <h4 className="mb-3">Leave Management — Team Requests</h4>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'leave' ? 'active' : ''}`} onClick={() => setTab('leave')}>Leave Requests</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'special' ? 'active' : ''}`} onClick={() => setTab('special')}>Special Leave</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'permission' ? 'active' : ''}`} onClick={() => setTab('permission')}>Permission Requests</button></li>
      </ul>

      {tab === 'leave' && <ManagerLeaveQueue category="leave" />}
      {tab === 'special' && <ManagerLeaveQueue category="special" />}
      {tab === 'permission' && <ManagerPermissionQueue />}
    </div>
  );
}