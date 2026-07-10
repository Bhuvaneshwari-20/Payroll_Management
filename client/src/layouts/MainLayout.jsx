import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Footer from '../components/Footer';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';
import useForcePasswordChange from '../utils/useForcePasswordChange';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Runs once per authenticated session, on every protected page —
  const { mustChange, employeeCode, checked, clear } = useForcePasswordChange();

  return (
    <div className={`kr-wrapper ${sidebarOpen ? '' : 'kr-sidebar-collapsed'}`}>
      <Sidebar />
      <div className="kr-main">
        <Topbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <div className="p-4" id="kr-content">
          <Outlet />
        </div>
        <Footer />
      </div>

      {checked && mustChange && (
        <ForcePasswordChangeModal
          employeeCode={employeeCode}
          onSuccess={clear}
        />
      )}
    </div>
  );
}