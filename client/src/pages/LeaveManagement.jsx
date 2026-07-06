import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LeaveApplyForm from '../components/leave/LeaveApplyForm';
import LeaveHistoryTable from '../components/leave/LeaveHistoryTable';
import ManagerLeaveQueue from '../components/leave/ManagerLeaveQueue';
import HRLeaveQueue from '../components/leave/HRLeaveQueue';
import PermissionApplyForm from '../components/permission/PermissionApplyForm';
import PermissionHistoryTable from '../components/permission/PermissionHistoryTable';
import ManagerPermissionQueue from '../components/permission/ManagerPermissionQueue';

export default function LeaveManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('apply');
  const [category, setCategory] = useState('leave'); // 'leave' | 'special' | 'permission'
  const [refreshKey, setRefreshKey] = useState(0);

  // FIX: this previously checked user?.role against 'manager'/'admin'/'hr',
  // but your actual user object (per Sidebar.jsx) uses role === 'HR' plus
  // a separate isManager boolean — so these tabs likely never appeared
  // for real users. Matching the real shape now.
  const isManager = !!user?.isManager;
  const isHR = user?.role === 'HR';

  const isPermission = category === 'permission';
  // Permission is single-stage (Employee -> Manager, final) — there is no
  // HR stage for it, so the HR tab never applies when this category is selected.
  const showHRTab = isHR && !isPermission;

  const handleCategoryChange = (next) => {
    setCategory(next);
    if (next === 'permission' && tab === 'hr') setTab('apply'); // that tab won't exist anymore
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <ul className="nav nav-tabs">
          <li className="nav-item"><button className={`nav-link ${tab === 'apply' ? 'active' : ''}`} onClick={() => setTab('apply')}>Apply</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Requests</button></li>
          {isManager && <li className="nav-item"><button className={`nav-link ${tab === 'manager' ? 'active' : ''}`} onClick={() => setTab('manager')}>Manager Queue</button></li>}
          {showHRTab && <li className="nav-item"><button className={`nav-link ${tab === 'hr' ? 'active' : ''}`} onClick={() => setTab('hr')}>HR Queue</button></li>}
        </ul>

        <select className="form-select w-auto" value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
          <option value="leave">Leave</option>
          <option value="special">Special Leave</option>
          <option value="permission">Permission</option>
        </select>
      </div>

      {isPermission ? (
        <>
          {tab === 'apply' && <PermissionApplyForm onApplied={() => setRefreshKey((k) => k + 1)} />}
          {tab === 'my' && <PermissionHistoryTable refreshKey={refreshKey} />}
          {tab === 'manager' && isManager && <ManagerPermissionQueue />}
        </>
      ) : (
        <>
          {tab === 'apply' && <LeaveApplyForm category={category} onApplied={() => setRefreshKey((k) => k + 1)} />}
          {tab === 'my' && <LeaveHistoryTable category={category} refreshKey={refreshKey} />}
          {tab === 'manager' && isManager && <ManagerLeaveQueue category={category} />}
          {tab === 'hr' && isHR && <HRLeaveQueue category={category} />}
        </>
      )}
    </div>
  );
}